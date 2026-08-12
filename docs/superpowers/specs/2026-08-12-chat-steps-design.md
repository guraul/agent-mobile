# 阶段 1 设计：消息展示改造（不 merge 独立气泡 + 过程旁白）

> 日期：2026-08-12
> 范围：agent-mobile 聊天界面（`agent-mobile-app`）
> 目标：把"同轮 assistant step 合并成单个气泡"改为"每条 step 独立呈现 + 过程旁白化"

## 背景与动机

opencode 把一次 assistant 回复拆成多条 `message`（step-start / reasoning / tool / text / step-finish）。当前 `message-merging.ts` 的 `mergeMessages` 把同轮 assistant step 合并成单个气泡：文本 `\n\n` 拼接、工具调用折叠成列表，reasoning 与 step-start/finish 被丢弃。

用户期望 Telegram 风格的**过程流**：每条 step 独立呈现，过程消息（思考/工具/开始/完成）以小字号旁白显示，工具调用只显示调用了哪个工具，最终文本为主气泡。保留现有空气泡过滤逻辑。

## 范围界定

**本阶段（阶段 1）仅做纯前端消息展示改造**：

- ✅ 不 merge：每条 step 独立呈现
- ✅ 过程 step 旁白化（思考中… / 工具调用中… / 开始执行… / 完成）
- ✅ 工具 step 只显示工具名
- ✅ 紧凑聚簇：同轮 step 紧挨排列，共用 Pulse 标签
- ✅ 保留现有空气泡过滤逻辑
- ❌ 本阶段**不做** chunk 打字机效果（阶段 2 配合中间层一起做）
- ❌ 本阶段**不改**中间层、不动 opencode 直连架构

**打字机（Part B）+ 中间层（Part C）为阶段 2，另行规划。**

## 目标架构

```
SSE (message.updated / message.part.updated / message.removed)
  → message-reducer 增量 patch（按 step 粒度）
  → message-merging 输出 DisplayStep[]
  → ChatPanel FlatList 渲染
  → MessageBubble / StepChip 按 kind 渲染
```

## 数据结构设计（`message-merging.ts`）

新增 `DisplayStep` 联合类型，替代 `DisplayMessage`：

```ts
export type DisplayStep =
  | { kind: "user";       id: string; text: string; createdAt: number }
  | { kind: "step-start"; id: string; createdAt: number }        // 旁白：开始执行…
  | { kind: "reasoning";  id: string; createdAt: number }        // 旁白：思考中…
  | { kind: "tool";       id: string; tool: string; status?: string; createdAt: number }  // 旁白：工具(x)调用中…
  | { kind: "text";       id: string; text: string; createdAt: number }  // 主气泡
  | { kind: "step-finish";id: string; createdAt: number }        // 旁白：完成
```

### `mergeMessages` 逻辑改造

- 按 **user 消息分轮**：user step 是轮次边界，其后的 assistant step 属于同一轮。
- 同轮内各 assistant step **展开为独立 `DisplayStep`**，保持原始顺序。
- 输出按 `createdAt` 升序（与现有一致）。
- **保留现有过滤**：无文本且无工具的空 part 不生成 step（等价于现有 `filter(m => m.text || m.tools)` 的语义，只是作用对象从 message 变为 part）。空 `step-start`/`step-finish`/`reasoning` 虽无文本，但作为过程旁白**仍应生成 step**（它们承载"开始/思考/完成"信息）。仅真正无意义的空 part 被过滤。

### 消息到 step 的映射

| opencode message/part | DisplayStep |
|-----------------------|-------------|
| `message.info.role === "user"` | `{ kind: "user", text }` |
| part `type: "text"` | `{ kind: "text", text }` |
| part `type: "reasoning"` | `{ kind: "reasoning" }`（仅旁白，不显示原文） |
| part `type: "tool"` | `{ kind: "tool", tool: part.tool }` |
| part `type: "step-start"` | `{ kind: "step-start" }` |
| part `type: "step-finish"` | `{ kind: "step-finish" }` |
| part `type: "snapshot"` / `"agent"` / `"file"` | 过滤（沿用现状） |

> 一条 message 可能含多个 part（如 step-start + reasoning + text + step-finish）。映射时按 part 粒度输出多个 step，保持 part 出现顺序。

## 渲染设计（`MessageBubble.tsx` + 新增 StepChip）

### 组件拆分

- `MessageBubble` 保留，负责 user / text 两种正常气泡（现有样式）。
- 新增轻量 `StepChip` 组件：渲染过程旁白（小字号 caption，灰色，带图标可选）。

### 过程旁白文案

| kind | 文案 |
|------|------|
| `step-start` | "开始执行…" |
| `reasoning` | "思考中…" |
| `tool` | "工具({tool})调用中…" |
| `step-finish` | "完成" |

### 紧凑聚簇

- 同轮（user 消息之间）的 step 紧挨排列：**紧凑行间距**，共用 Pulse 标签（每个轮次顶部一个标签）。
- 不同轮之间留更大间距（`marginBottom` 较大）。
- FlatList 中每个 `DisplayStep` 是一个 item，但通过 `item.kind` 和轮次边界控制间距。

## 数据流与增量（`ChatPanel.tsx` + `message-reducer.ts`）

- `recomputeDisplay` 调用新的 `mergeMessages`，输出 `DisplayStep[]`。
- SSE 增量（`applyMessageUpdated` / `applyPartUpdated` / `applyMessageRemoved`）需适配 step 粒度：
  - `applyPartUpdated`：定位到目标 message 的对应 part step，upsert 之。
  - `applyMessageUpdated`：新消息插入 placeholder（沿用现有按时间戳插入）。
  - `applyMessageRemoved`：删除该消息对应的所有 step。
- 本阶段保持增量 patch 语义正确即可，不做打字机（阶段 2 优化推送粒度）。

## 边界与风险

1. **SSE 增量 patch 改造成 step 粒度**是主要工作量，需保证流式过程中 step 顺序稳定。
2. **现有单测需更新**：
   - `message-merging.test.ts`：断言从"合并气泡"改为"独立 step 序列"。
   - `order-sim.test.ts`：模拟完整 SSE 链路，验证 step 顺序。
   - `message-reducer.test.ts`：适配 step 粒度 patch。
3. **多 part 单 message**：一条消息含多个 part 时的 step 拆分需测试覆盖。
4. 阶段 1 不改中间层，手机端仍直连 opencode。

## 测试计划

- 单测：`message-merging.test.ts`（step 展开/过滤/轮次分组）、`message-reducer.test.ts`（step 粒度 patch）、`order-sim.test.ts`（SSE 链路顺序）。
- E2E（Playwright，`test/` 目录）：打开 sheet → 触发含工具调用的回复 → 校验过程旁白 + 主气泡渲染顺序。

## 验收标准

1. 一条含工具调用的 assistant 回复，手机端显示为：思考中… → 工具(x)调用中… → 主文本气泡 → 完成 的独立 step 流。
2. 不同轮次之间间距明显大于同轮 step 间距（紧凑聚簇生效）。
3. 无文本无工具的空 step 不显示（过滤保留）。
4. 现有"实时更新"、"顺序正确"行为不回归。
5. `tsc --noEmit` 通过。
