# ZCode 风格聊天弹框实施计划（新旧并存 + 一键回退）

> 日期：2026-08-30
> 参考：ZCode Web Remote Control 手机页面截图（zcode.z.ai/remote/v4）
> 策略：**现有弹框一行不动**，新建 `src/components/chat/zcode/` 目录放全部新组件，`index.tsx` 常量开关切换，false 一行回退。
> 状态：未实施（本文档仅为实施记录/计划）

## 背景与参考对照

参考截图（ZCode Web Remote）元素 ↔ 本方案实现点：

| 截图元素 | 实现点 | 采纳 |
|---|---|---|
| 头部：← + 会话标题「任务会话」 | ProjectChatZ header 显示 `session.title` | ✅ |
| 「思考 · 持续了几秒」可折叠步骤行 | StepRow（折叠/展开 + 运行状态） | ✅（真实时长不做，见下） |
| 用户/回复气泡下「复制」+ 时间 | MessageBubbleZ actions 行 | ✅ |
| 「已停止」状态行 | ChatPanelZ ListFooter 状态行 | ✅ |
| 圆角输入栏 + 图标化按钮 | ChatPanelZ 输入区重排 | ✅ |
| 「更改 +3942 -0」diff 统计条 | opencode 无现成 diff 统计接口 | ❌ 不采纳 |
| 消息点赞/踩 | 无后端承接 | ❌ 不采纳 |
| 步骤真实时长 | DisplayStep 只有 createdAt，无结束时间戳 | ❌ 不做（本地计时 hack 刷新即失真） |

## 总体策略

```
现有（零改动，回退目标）
  index.tsx ──► ProjectChat ──► ChatPanel ──► MessageBubble ──► StepChip

新增（zcode 风格）
  index.tsx ──► ProjectChatZ ──► ChatPanelZ ──► MessageBubbleZ ──► StepRow
                  (src/components/chat/zcode/ 目录)

共享数据层（唯一触碰的现有文件）
  services/message-merging.ts  ← 增量加 2 个可选字段（旧组件不读，零影响）
  services/message-reducer.ts / opencode-events.ts / config 等完全不动
```

- **切换开关**：`src/app/(tabs)/index.tsx` 顶部 `const USE_ZCODE_CHAT_SHEET = true;`，三元渲染新旧 ProjectChat。回退 = 改 false。
- **fork 声明**：ChatPanelZ / ProjectChatZ 文件头注明 `fork of ChatPanel.tsx @ <commit>`。代价：SSE/typewriter 层的后续修复需双改（在 chat.md 知识库标注）。
- ChatPanelZ 覆盖范围提示：`SessionPanel.tsx` 也用 ChatPanel——本方案不影响它（旧组件未动）。

## Global Constraints

- Expo SDK 57：新依赖用 `npx expo install`；改 agent-mobile-app 代码前读 `https://docs.expo.dev/versions/v57.0.0/`
- 每步验证：`pnpm exec tsc --noEmit`；纯逻辑改动同步 `pnpm test`
- 颜色/字号/间距全部走 `src/theme/`；勿改 `StatusType` 取值
- **红线（fork 时必须原样保留）**：打字机 `revealChars` 逐字揭示 + FlatList `extraData={revealChars}`；消息 chronological 语义（插入以 `time.created` 为准）；轮询兜底与打字机不同时启用；`mergeMessages` 的 text step id 是打字机 key，不可变

---

### Task 0: 新增依赖 expo-clipboard

```bash
cd agent-mobile-app && npx expo install expo-clipboard
```
- SDK 57 会装匹配版本；web 静态版 + Expo Go 均可用。

---

### Task 1: message-merging.ts 数据扩展 + 单测

**Files:** Modify `src/services/message-merging.ts` / `src/services/message-merging.test.ts`

DisplayStep 扩展（只增可选字段，旧组件不读）：
```ts
| { kind: "reasoning"; id: string; text?: string; createdAt: number }
| { kind: "tool"; id: string; tool: string; status?: string; inputSummary?: string; createdAt: number }
```

实现：
```ts
// tool.input 是 unknown（命令字符串或参数对象）；压成一行摘要供折叠行/展开区使用
function summarizeInput(input: unknown): string | undefined {
  if (input == null) return undefined;
  const s = typeof input === "string" ? input : (() => {
    try { return JSON.stringify(input); } catch { return String(input); }
  })();
  const line = s.replace(/\s+/g, " ").trim();
  return line ? (line.length > 200 ? line.slice(0, 200) + "…" : line) : undefined;
}
```
- tool 分支：`inputSummary: summarizeInput((part as {input?: unknown}).input)`
- reasoning 分支：`text: (part as {text?: string}).text ?? ""`（空串也存，展开区判空）
- 类型守卫 `isToolPart` 加 `input?: unknown`，`isReasoningPart` 加 `text?: string`

测试新增 4 例：tool input 为 string / object / 缺失；reasoning text 透传。跑 `pnpm test -- src/services/message-merging.test.ts`。

---

### Task 2: zcode/StepRow.tsx（可折叠步骤行）

**Files:** Create `src/components/chat/zcode/StepRow.tsx`

```tsx
type ProcessStep = Extract<DisplayStep, { kind: "reasoning" } | { kind: "tool" }>;

export function StepRow({ step }: { step: ProcessStep }) {
  const [open, setOpen] = useState(false);
  const running = step.kind === "tool" && (step.status === "running" || step.status === "pending");
  const detail = step.kind === "reasoning" ? step.text : step.inputSummary;
  const label = step.kind === "reasoning" ? "思考" : step.tool;
  const icon = step.kind === "reasoning" ? Brain : Terminal;   // lucide
  return (
    <View style={s.wrap}>
      <Pressable onPress={() => detail && setOpen(!open)} style={s.row} accessibilityLabel={`步骤 ${label}`}>
        <Icon icon={running ? Loader : icon} size="xs" color={running ? "accent" : "muted"} />
        <Text variant="caption" color={running ? "body" : "muted"} numberOfLines={1} style={s.label}>
          {label}{step.kind === "tool" && step.inputSummary ? ` · ${step.inputSummary}` : ""}
        </Text>
        {running ? (
          <Text variant="caption" color="muted">进行中</Text>
        ) : detail ? (
          <Icon icon={open ? ChevronDown : ChevronRight} size="xs" color="muted" />
        ) : null}
      </Pressable>
      {open && detail ? (
        <View style={s.detail}>
          <Text variant={step.kind === "tool" ? "monoCaption" : "caption"} color="muted">{detail}</Text>
        </View>
      ) : null}
    </View>
  );
}
// s.wrap: marginBottom xxs; s.row: flexDirection row, gap xs, paddingVertical xxs, alignItems center
// s.label: flex 1; s.detail: backgroundColor surface[1], radius.sm, padding sm, marginTop xxs
```

要点：
- running 判定只对 tool（reasoning part 无 status；reasoning 恒可展开看正文）
- 时长不做（对照表已确认）；对齐 ZCode 观感靠 icon+label+状态
- MessageBubbleZ 内 dispatch 到 StepRow（Task 3），旧 `StepChip.tsx` 文件不删（旧弹框还用）

---

### Task 3: zcode/MessageBubbleZ.tsx（气泡 + 复制 + 时间戳）

**Files:** Create `src/components/chat/zcode/MessageBubbleZ.tsx`

以 `MessageBubble.tsx` 为底复制，改动：
1. `import * as Clipboard from "expo-clipboard";`
2. actions 行组件（user 与 assistant 复用）：
```tsx
function Actions({ text, createdAt }: { text: string; createdAt: number }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const time = new Date(createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={s.actions}>  {/* flexDirection row, gap sm, marginTop xxs, opacity 0.8 */}
      <Pressable onPress={copy} accessibilityLabel="复制消息" style={s.actionBtn}>
        <Icon icon={copied ? Check : Copy} size="xs" color={copied ? "success" : "muted"} />
      </Pressable>
      <Text variant="caption" color="muted">{time}</Text>
    </View>
  );
}
```
3. user 气泡：actions 行放气泡**下**（右对齐 `alignItems: flex-end`）
4. assistant 气泡：actions 行放气泡下（左对齐）
5. reasoning/tool → `<StepRow step={step} />`（替换 StepChip）；error 保持无 actions
6. **复制全文**：复制 `step.text`（气泡内是打字机 slice 后的展示，step 本体是全文，不受影响）
7. 保留 `React.memo`

---

### Task 4: zcode/ChatPanelZ.tsx（fork 主面板）

**Files:** Create `src/components/chat/zcode/ChatPanelZ.tsx`

从 `ChatPanel.tsx` 整文件复制（941 行），文件头加注释：
```ts
// Fork of src/components/chat/ChatPanel.tsx (ZCode 风格渲染层改造)。
// 数据逻辑（SSE 订阅/reducer/typewriter/pagination/agents+model prefs）与上游保持一致，
// 上游修复需手动同步；回退开关在 src/app/(tabs)/index.tsx USE_ZCODE_CHAT_SHEET。
```

改动点（只列 diff，其余原样）：

1. **renderItem**：`MessageBubble` → `MessageBubbleZ`（import 路径换相对 `../MessageBubble` 的 zcode 版）。`isTurnStart` 间距逻辑、`revealChars` slice、`extraData` **原样保留**。
2. **状态行**（ListFooterComponent）：
```tsx
const [abortedAt, setAbortedAt] = useState<number | null>(null);
// abort() 成功后 setAbortedAt(Date.now())；doSend 发出新消息时 setAbortedAt(null)
const ListFooter = sending ? (
  <View style={s.statusRow}>   {/* row, gap xs, paddingVertical sm */}
    <Icon icon={Loader} size="xs" color="accent" />
    <Text variant="caption" color="muted">运行中…</Text>
  </View>
) : abortedAt ? (
  <View style={s.statusRow}>
    <Text variant="caption" color="muted">已停止</Text>
  </View>
) : null;
// FlatList 加 ListFooterComponent={ListFooter}
```
3. **输入区重排**（对齐截图）：
   - agentRow pills 保留在输入框上方，pill 内加小图标：agent pill `Bot`、model pill `Cpu`（lucide，size xs, muted）
   - 输入框：`borderRadius: radius.full`、`backgroundColor: colors.surface[1]`、最小高 44、`paddingHorizontal: spacing.md`（替换现在的高 40 直角框；web `lineHeight` 同步调整）
   - 发送/停止钮：40×40 `borderRadius: radius.full` accent 底（现状已近似，统一圆角即可）
   - Mic 占位钮保留（仍 Alert "Coming soon."）
4. **不动的**：SSE 订阅（238-345）、reducer 调用、`revealChars`/`nextRevealChars`、滚动粘底（593-608）、分页、pending question/permission 两个 BottomSheet、model picker BottomSheet、agents+prefs 初始化（396-461）。

---

### Task 5: zcode/ProjectChatZ.tsx（弹框壳 + header）

**Files:** Create `src/components/chat/zcode/ProjectChatZ.tsx`

从 `ProjectChat.tsx` 复制，改动：

1. header（现 87-99 行）：
```tsx
<View style={s.headerRow}>
  <IconButton icon={ArrowLeft} onPress={onBack} accessibilityLabel="返回" testID="zcode-sheet-back" />
  <View style={s.titleWrap}>   {/* flex1, alignItems center */}
    <Text variant="bodyStrong" color="ink" numberOfLines={1}>
      {session ? (session.title?.trim() || "新会话") : projectPath.split("/").filter(Boolean).pop()}
    </Text>
    <Text variant="caption" color="muted" numberOfLines={1}>{projectPath.split("/").filter(Boolean).pop()}</Text>
  </View>
  <IconButton icon={Layers} onPress={() => setPickerOpen(true)} accessibilityLabel="切换会话" />
</View>
```
- `session` 已在 resolve 流程中持有（sessionLabel 换成完整对象透传）
- 手搓 Pressable 换现成 `IconButton`（components/index.ts 已导出）
2. 主体 `<ChatPanelZ key={session.id} sessionID={session.id} />`
3. 会话切换 BottomSheet（132-169）原样保留

---

### Task 6: index.tsx 开关

**Files:** Modify `src/app/(tabs)/index.tsx`（唯一触碰的现有 UI 文件，仅 2 行）

```tsx
import { ProjectChat } from "@/components/chat/ProjectChat";
import { ProjectChatZ } from "@/components/chat/zcode/ProjectChatZ";   // 新增

// ZCode 风格弹框开关：false 一行回退旧弹框（src/components/chat/ProjectChat.tsx，零改动保留）
const USE_ZCODE_CHAT_SHEET = true;

// 原 357-369 行 BottomSheet 内：
{activeProject && (USE_ZCODE_CHAT_SHEET
  ? <ProjectChatZ projectPath={activeProject.projectPath} onBack={() => setActiveProject(null)} />
  : <ProjectChat projectPath={activeProject.projectPath} onBack={() => setActiveProject(null)} />)}
```

---

### Task 7: 验证 + 知识库

```bash
cd agent-mobile-app
pnpm exec tsc --noEmit && pnpm test          # merging 新用例 + 无回归
pnpm lint                                     # 基线本就红，不新增即可
EXPO_PUBLIC_OPENCODE_URL=http://106.13.181.13:19234 pnpm exec expo export --platform web --clear
systemctl restart serve-9928                  # 部署验证（当前 serve-9928 在跑）
```

Playwright 验收（复用 `test/me-auth-e2e.mjs` 的登录模式）：
- 打开项目弹框 → `zcode-sheet-back` 可见、header 显示会话标题
- 有 reasoning/tool 步骤时：StepRow 点击展开/收起
- 气泡下复制按钮存在 → 点击后 `Clipboard` 内容 == 消息全文（页面内二次验证可选）
- 发消息 → footer "运行中…"；abort → "已停止"
- 截图存 `test/zcode-sheet-*.png`

知识库：`docs/knowledge-base/modules/chat.md` 增补「zcode 风格弹框（并存）」小节——组件树、开关位置、fork 双维护提醒；INDEX.md 核心功能清单加一行。

---

## 验收清单

- [ ] 旧弹框回归：`USE_ZCODE_CHAT_SHEET=false` 时行为与现在完全一致（旧组件零 diff 可证）
- [ ] 新弹框三 Card 对齐截图：header 会话标题 / 可折叠步骤行 / 复制 + 时间戳
- [ ] 状态行：发送中"运行中…"、中止后"已停止"
- [ ] 打字机不回归：流式回复仍逐字揭示、无整块弹出
- [ ] tsc 0 错误；vitest 全过（含 merging 新用例）
- [ ] 知识库已同步

## 回退路径

1. 首选：`USE_ZCODE_CHAT_SHEET = false`（一行，立即回旧弹框）
2. 彻底移除：删 `src/components/chat/zcode/` + index.tsx 两行 + merging 的可选字段可保留（无害）
3. git 层面：整功能独立 commit，`git revert <hash>` 即净回退

## 风险与备注

- **fork 双维护**：ChatPanelZ 复制了 941 行面板，上游 ChatPanel 的修复（SSE/reducer 层）需手动同步——在两个文件头与 chat.md 都标注。若日后 zcode 版稳定转正，可反向替换并删除旧文件。
- **message-merging 是唯一共享改动**：只增可选字段，旧 StepChip 不读 → 旧行为不变。若连这个也不想要，StepRow 展开区将没有思考正文/命令摘要数据（只有折叠外观），Task 1 可跳过，其余不受影响。
- expo-clipboard 是新增依赖：按强制规定用 `npx expo install`，勿手改版本号。
