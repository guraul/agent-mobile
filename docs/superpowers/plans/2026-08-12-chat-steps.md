# 阶段 1：不 merge 独立气泡 + 过程旁白 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 agent-mobile 聊天界面的"同轮 assistant step 合并成单个气泡"改为"每条 step 独立呈现 + 过程旁白化"，实现 Telegram 风格的过程流。

**Architecture:** 只改渲染层。`message-reducer.ts` 与 `ChatPanel` 内部状态保持 `OpenCodeMessage[]` 不变；将 `message-merging.ts` 的 `mergeMessages` 输出从 `DisplayMessage[]`（合并气泡）改为 `DisplayStep[]`（独立 step 序列），并让 `MessageBubble` 与 `ChatPanel` 适配新结构。过程 step（思考/工具/开始/完成）以小字号旁白（StepChip）显示。

**Tech Stack:** React Native (Expo 57) / TypeScript / react-native-markdown-display / lucide-react-native / vitest / Playwright (E2E)

## Global Constraints

- 项目位于 `agent-mobile-app/`，工作目录命令均在 `agent-mobile-app/` 下执行。
- 包管理器：`pnpm`。单测命令：`pnpm test`（vitest）。类型检查：`pnpm exec tsc --noEmit`。
- 不改 `message-reducer.ts`（内部状态仍为 `OpenCodeMessage[]`）。
- 保留现有空气泡过滤语义（见 spec）。
- 本阶段不实现打字机、不引入中间层。
- 遵循现有代码风格：无新增注释（除非必要），TypeScript 严格类型。

---

### Task 1: 重构 `mergeMessages` 输出为 `DisplayStep[]`

**Files:**
- Modify: `agent-mobile-app/src/services/message-merging.ts`
- Test: `agent-mobile-app/src/services/message-merging.test.ts`

**Interfaces:**
- Consumes: `OpenCodeMessage`, `OpenCodePart`（来自 `./opencode-client`）
- Produces:
  ```ts
  export type DisplayStep =
    | { kind: "user";        id: string; text: string; createdAt: number }
    | { kind: "step-start";  id: string; createdAt: number }
    | { kind: "reasoning";   id: string; createdAt: number }
    | { kind: "tool";        id: string; tool: string; status?: string; createdAt: number }
    | { kind: "text";        id: string; text: string; createdAt: number }
    | { kind: "step-finish"; id: string; createdAt: number };

  export function mergeMessages(raw: OpenCodeMessage[]): DisplayStep[];
  ```
  注意：本阶段 `mergeMessages` 仍接受 `(raw)`，可保留可选 `mergeGapMs` 参数但不使用（向后兼容，避免改调用点）。

- [ ] **Step 1: 重写 `message-merging.ts`**

  整体替换文件内容为：

  ```ts
  import type { OpenCodeMessage, OpenCodePart } from "./opencode-client";

  export type DisplayStep =
    | { kind: "user";        id: string; text: string; createdAt: number }
    | { kind: "step-start";  id: string; createdAt: number }
    | { kind: "reasoning";   id: string; createdAt: number }
    | { kind: "tool";        id: string; tool: string; status?: string; createdAt: number }
    | { kind: "text";        id: string; text: string; createdAt: number }
    | { kind: "step-finish"; id: string; createdAt: number };

  function partKind(part: OpenCodePart): DisplayStep["kind"] | "ignored" {
    switch (part.type) {
      case "text": return "text";
      case "reasoning": return "reasoning";
      case "tool": return "tool";
      case "step-start": return "step-start";
      case "step-finish": return "step-finish";
      default: return "ignored"; // snapshot / agent / file / compaction
    }
  }

  export function mergeMessages(
    raw: OpenCodeMessage[],
    _mergeGapMs = 2 * 60 * 1000,
  ): DisplayStep[] {
    const out: DisplayStep[] = [];

    for (const msg of raw) {
      const createdAt = msg.info.time?.created ?? 0;
      if (msg.info.role === "user") {
        const text = msg.parts
          .filter((p): p is Extract<OpenCodePart, { type: "text" }> => p.type === "text")
          .map((p) => p.text ?? "")
          .join("\n");
        out.push({ kind: "user", id: msg.info.id, text, createdAt });
        continue;
      }

      // assistant: expand each part into an independent step, preserving order.
      for (const part of msg.parts) {
        const kind = partKind(part);
        if (kind === "ignored") continue;
        if (kind === "text") {
          const text = part.text ?? "";
          if (!text) continue; // drop empty text (preserve existing filter)
          out.push({ kind: "text", id: `${msg.info.id}-${(part as { id?: string }).id ?? out.length}`, text, createdAt });
        } else if (kind === "tool") {
          out.push({
            kind: "tool",
            id: `${msg.info.id}-${(part as { id?: string }).id ?? out.length}`,
            tool: (part as { tool?: string }).tool ?? "tool",
            status: (part as { state?: { status?: string } }).state?.status,
            createdAt,
          });
        } else {
          out.push({ kind, id: `${msg.info.id}-${(part as { id?: string }).id ?? out.length}`, createdAt });
        }
      }
    }

    return out;
  }
  ```

- [ ] **Step 2: 重写 `message-merging.test.ts`**

  整体替换为（匹配新 `DisplayStep` 结构）：

  ```ts
  import { describe, it, expect } from "vitest";
  import { mergeMessages } from "./message-merging";
  import type { OpenCodeMessage } from "./opencode-client";

  function msg(id: string, role: "user" | "assistant", parts: unknown[], created = 1000): OpenCodeMessage {
    return {
      info: { id, role, sessionID: "ses_x", time: { created } },
      parts: parts as OpenCodeMessage["parts"],
    };
  }

  describe("mergeMessages", () => {
    it("keeps a single user message as one step", () => {
      const out = mergeMessages([msg("u1", "user", [{ type: "text", text: "hi" }])]);
      expect(out).toEqual([{ kind: "user", id: "u1", text: "hi", createdAt: 1000 }]);
    });

    it("expands assistant parts into independent steps", () => {
      const out = mergeMessages([
        msg("a1", "assistant", [
          { type: "step-start", id: "p0" },
          { type: "reasoning", text: "thinking…", id: "p1" },
          { type: "tool", tool: "bash", state: { status: "completed" }, id: "p2" },
          { type: "text", text: "Done.", id: "p3" },
          { type: "step-finish", id: "p4" },
        ]),
      ]);
      expect(out.map((s) => s.kind)).toEqual([
        "step-start", "reasoning", "tool", "text", "step-finish",
      ]);
      expect(out[2]).toMatchObject({ kind: "tool", tool: "bash" });
      expect(out[3]).toMatchObject({ kind: "text", text: "Done." });
    });

    it("keeps part order across multiple assistant messages in a turn", () => {
      const out = mergeMessages([
        msg("a1", "assistant", [{ type: "tool", tool: "read", state: { status: "completed" }, id: "p1" }]),
        msg("a2", "assistant", [{ type: "text", text: "Step 2", id: "p2" }]),
      ]);
      expect(out.map((s) => s.kind)).toEqual(["tool", "text"]);
    });

    it("drops empty text and ignored part types", () => {
      const out = mergeMessages([
        msg("u1", "user", [{ type: "text", text: "hi" }]),
        msg("a1", "assistant", [{ type: "text", text: "", id: "p1" }, { type: "snapshot", isSnapshot: true, id: "p2" }]),
      ]);
      expect(out).toHaveLength(1);
      expect(out[0].kind).toBe("user");
    });
  });
  ```

- [ ] **Step 3: 运行单测确认通过**

  运行：`pnpm exec vitest run src/services/message-merging.test.ts`
  预期：全部通过（若 `order-sim.test.ts` 报错属预期，Task 2 处理）。

- [ ] **Step 4: 提交**

  ```bash
  git add agent-mobile-app/src/services/message-merging.ts agent-mobile-app/src/services/message-merging.test.ts
  git commit -m "feat: refactor mergeMessages to emit independent DisplaySteps"
  ```

---

### Task 2: 更新 `order-sim.test.ts` 适配 `DisplayStep`

**Files:**
- Modify: `agent-mobile-app/src/services/order-sim.test.ts`

**Interfaces:**
- Consumes: `mergeMessages`（Task 1 的新签名），`DisplayStep["kind"]`
- Produces: 无（测试仅验证顺序）

- [ ] **Step 1: 更新断言为 `DisplayStep` 结构**

  将 `order-sim.test.ts` 中所有 `last.role` 改为 `last.kind`，`last.text` 保持（text step 仍有 `text` 字段）。具体替换：

  - `expect(last.role).toBe("assistant")` → `expect(last.kind).toBe("text")`
  - `expect(last.text).toBe("最终回复")` 保持不变
  - `expect(last.role).toBe("user")` → `expect(last.kind).toBe("user")`

  完成后文件关键部分：

  ```ts
  const display = mergeMessages([...messages].sort((a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0)));
  const last = display[display.length - 1];
  expect(last.kind).toBe("text");
  expect(last.text).toBe("最终回复");
  ```

- [ ] **Step 2: 运行测试确认通过**

  运行：`pnpm exec vitest run src/services/order-sim.test.ts`
  预期：通过。

- [ ] **Step 3: 提交**

  ```bash
  git add agent-mobile-app/src/services/order-sim.test.ts
  git commit -m "test: adapt order-sim tests to DisplayStep"
  ```

---

### Task 3: 新增 `StepChip` 组件渲染过程旁白

**Files:**
- Create: `agent-mobile-app/src/components/chat/StepChip.tsx`
- Test: 无单测（视觉组件，E2E 覆盖）

**Interfaces:**
- Consumes: `DisplayStep`（来自 `../../services/message-merging`），`colors`/`spacing`（来自 `../../theme`）
- Produces:
  ```tsx
  export function StepChip({ step }: { step: Extract<DisplayStep,
    { kind: "step-start" } | { kind: "reasoning" } | { kind: "tool" } | { kind: "step-finish" }> }): JSX.Element;
  ```

- [ ] **Step 1: 创建 `StepChip.tsx`**

  ```tsx
  import React from "react";
  import { View } from "react-native";
  import { Loader, Check, Wrench } from "lucide-react-native";
  import { Text } from "../index";
  import { colors, spacing } from "../../theme";
  import type { DisplayStep } from "../../services/message-merging";

  type ProcessStep = Extract<DisplayStep,
    { kind: "step-start" } | { kind: "reasoning" } | { kind: "tool" } | { kind: "step-finish" }>;

  function label(step: ProcessStep): string {
    switch (step.kind) {
      case "step-start": return "开始执行…";
      case "reasoning": return "思考中…";
      case "tool": return `工具(${step.tool})调用中…`;
      case "step-finish": return "完成";
    }
  }

  function icon(step: ProcessStep) {
    const size = 12;
    const color = colors.muted;
    switch (step.kind) {
      case "step-start": return <Wrench color={color} size={size} strokeWidth={2} />;
      case "reasoning": return <Loader color={color} size={size} strokeWidth={2} />;
      case "tool": return <Wrench color={color} size={size} strokeWidth={2} />;
      case "step-finish": return <Check color={colors.status.success} size={size} strokeWidth={2} />;
    }
  }

  export function StepChip({ step }: { step: ProcessStep }) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 1 }}>
        {icon(step)}
        <Text variant="caption" color="muted">{label(step)}</Text>
      </View>
    );
  }
  ```

- [ ] **Step 2: 类型检查**

  运行：`pnpm exec tsc --noEmit`
  预期：通过（注意：ChatPanel/MessageBubble 尚未改，暂不影响——StepChip 独立编译）。

- [ ] **Step 3: 提交**

  ```bash
  git add agent-mobile-app/src/components/chat/StepChip.tsx
  git commit -m "feat: add StepChip for process-step narration"
  ```

---

### Task 4: 改造 `MessageBubble` 支持 `DisplayStep`

**Files:**
- Modify: `agent-mobile-app/src/components/chat/MessageBubble.tsx`

**Interfaces:**
- Consumes: `DisplayStep`（新结构）、`StepChip`（Task 3）
- Produces: 支持渲染 user/text 气泡 + 过程 step 旁白

- [ ] **Step 1: 重写 `MessageBubble.tsx`**

  整体替换为：

  ```tsx
  import React, { useState } from "react";
  import { View, Pressable, ScrollView } from "react-native";
  import Markdown from "react-native-markdown-display";
  import { ChevronDown, ChevronRight } from "lucide-react-native";
  import { Text, Box } from "../index";
  import { colors, spacing, radius } from "../../theme";
  import type { DisplayStep } from "../../services/message-merging";
  import { StepChip } from "./StepChip";

  export function MessageBubble({ step }: { step: DisplayStep }) {
    if (step.kind === "step-start" || step.kind === "reasoning" || step.kind === "tool" || step.kind === "step-finish") {
      return <StepChip step={step} />;
    }

    if (step.kind === "user") {
      return (
        <Box marginBottom="sm" style={{ alignItems: "flex-end" }}>
          <Box padding="sm" rounded="md" style={{ maxWidth: "92%", backgroundColor: colors.accent.default, borderBottomRightRadius: radius.xs }}>
            <Markdown style={{ body: { color: colors.onAccent, fontSize: 15, lineHeight: 22 }, code_inline: { color: colors.onAccent, backgroundColor: "rgba(255,255,255,0.2)", padding: 0, lineHeight: 22 }, paragraph: { marginVertical: 4 } }}>
              {step.text}
            </Markdown>
          </Box>
        </Box>
      );
    }

    // kind === "text" (assistant main bubble)
    return (
      <Box marginBottom="sm" style={{ alignItems: "flex-start" }}>
        <Box marginLeft="xxs" marginBottom="xxs">
          <Text variant="captionStrong" color="accent">Pulse</Text>
        </Box>
        <Box padding="sm" rounded="md" style={{ maxWidth: "92%", backgroundColor: colors.surface[2], borderBottomLeftRadius: radius.xs }}>
          <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
            <Markdown style={{ body: { color: colors.ink, fontSize: 15, lineHeight: 22 }, heading1: { color: colors.ink, fontSize: 18, fontWeight: "700" }, heading2: { color: colors.ink, fontSize: 16, fontWeight: "700" }, heading3: { color: colors.ink, fontSize: 15, fontWeight: "700" }, code_inline: { color: colors.accent.bright, backgroundColor: colors.surface[1], padding: 0, borderRadius: 3, lineHeight: 22 }, fence: { color: colors.ink, backgroundColor: colors.surface[1], padding: 8, borderRadius: 6 }, code_block: { color: colors.ink, backgroundColor: colors.surface[1] }, link: { color: colors.accent.bright }, paragraph: { marginVertical: 4 }, bullet_list_icon: { color: colors.muted } }}>
              {step.text}
            </Markdown>
          </ScrollView>
        </Box>
      </Box>
    );
  }
  ```

  > 注：`ToolSummary` 与 `ToolCallSummary` 相关逻辑被移除（工具 step 改为 StepChip 旁白）。原 `message.tools` 字段不再存在。若 lint 提示未使用 import，删除之。

- [ ] **Step 2: 类型检查**

  运行：`pnpm exec tsc --noEmit`
  预期：可能因 ChatPanel 仍传 `DisplayMessage` 报错——属预期，Task 5 修复。

- [ ] **Step 3: 提交**

  ```bash
  git add agent-mobile-app/src/components/chat/MessageBubble.tsx
  git commit -m "feat: render DisplayStep bubbles and process narration"
  ```

---

### Task 5: 改造 `ChatPanel` 适配 `DisplayStep[]` 与紧凑聚簇

**Files:**
- Modify: `agent-mobile-app/src/components/chat/ChatPanel.tsx`

**Interfaces:**
- Consumes: `mergeMessages`, `DisplayStep`（Task 1）；`MessageBubble`（Task 4）
- Produces: FlatList 数据 `DisplayStep[]`，紧凑聚簇间距

- [ ] **Step 1: 更新类型导入与状态**

  在 ChatPanel.tsx：
  - 第 28 行：`import { mergeMessages, type DisplayMessage }` → `import { mergeMessages, type DisplayStep }`
  - 第 43 行：`useState<DisplayMessage[]>` → `useState<DisplayStep[]>`
  - 第 49 行：`useRef<FlatList<DisplayMessage>>` → `useRef<FlatList<DisplayStep>>`
  - 第 198 行：`renderItem={({ item }) => <MessageBubble message={item} />}` → `renderItem={({ item }) => <MessageBubble step={item} />}`
  - 第 196 行：`keyExtractor={(m) => m.id}` → `keyExtractor={(s) => s.id}`

- [ ] **Step 2: 紧凑聚簇间距**

  同一轮（user 消息之间）的 step 紧挨排列，不同轮之间留更大间距。在 `renderItem` 中判断当前 item 是否"轮起始"：

  ```tsx
  renderItem={({ item, index }) => {
    const prev = display[index - 1];
    const isTurnStart = !prev || prev.kind === "user";
    return (
      <View style={{ marginTop: isTurnStart ? spacing.md : spacing.xxs }}>
        <MessageBubble step={item} />
      </View>
    );
  }}
  ```

  说明：`prev.kind === "user"` 表示前一条是用户消息 → 当前 assistant step 是一轮的起点（加大间距）；其余 step 紧凑（`xxs`）。user step 自身通过 `prev` 判断（前一条是 user 之前的内容）保持间距合理。若发现 user step 间距不对，将条件改为 `isTurnStart = !prev || prev.kind === "user" || item.kind === "user"`。

  > 需确认 `spacing` 含 `md` 与 `xxs` 键（当前 theme 已用 `xxs`/`xs`/`sm`；若缺 `md`，用 `sm` 替代）。实施时以 `theme.ts` 实际导出为准。

- [ ] **Step 3: 类型检查**

  运行：`pnpm exec tsc --noEmit`
  预期：通过。

- [ ] **Step 4: 全量单测**

  运行：`pnpm test`
  预期：全部通过（message-merging、order-sim、message-reducer、opencode-events、project-status）。

- [ ] **Step 5: 提交**

  ```bash
  git add agent-mobile-app/src/components/chat/ChatPanel.tsx
  git commit -m "feat: render DisplaySteps with compact turn clustering"
  ```

---

### Task 6: 手动 E2E 验证 + 构建

**Files:**
- 运行：`pnpm exec expo export --platform web`（构建，验证无编译错误）
- 运行：E2E 脚本（如已有 `test/` 下 Playwright 脚本）

**Interfaces:**
- Consumes: 阶段 1 全部改动
- Produces: 验证过程旁白 + 主气泡渲染

- [ ] **Step 1: 构建验证**

  运行：`pnpm exec expo export --platform web`
  预期：`Exported: dist`，无报错。

- [ ] **Step 2: Playwright 手动验证（可选）**

  若存在可复用的 Playwright 脚本（`test/*.mjs`），打开 sheet 触发一次含工具调用的回复，校验渲染顺序为：`思考中… → 工具(x)调用中… → 主文本气泡 → 完成`。此步骤依赖 opencode server 可用（当前 4096 已关闭，需先启动 `opencode serve` 或跳过）。

- [ ] **Step 3: 提交（如有脚本改动）**

  ```bash
  git add -A
  git commit -m "chore: stage-1 verification"
  ```

---

## Self-Review 记录

**1. Spec 覆盖：**
- DisplayStep 数据结构 → Task 1 ✓
- 过程旁白文案（开始执行/思考中/工具调用中/完成）→ Task 3 ✓
- 工具 step 只显示工具名 → Task 3 label `工具({tool})调用中…` ✓
- 紧凑聚簇共用 Pulse 标签 → Task 5（间距）+ Task 4（Pulse 标签在 text 气泡）✓
- 保留空气泡过滤 → Task 1（`if (!text) continue` + ignored 类型）✓
- 不改 reducer → 全局约束 ✓

**2. 占位符扫描：** 无 TBD/TODO。`spacing.md` 有"以实际导出为准"说明（因 design agent 无法读 theme，实施时需确认——已注明）。

**3. 类型一致性：**
- `mergeMessages` 返回 `DisplayStep[]` 在各 task 一致。
- `MessageBubble` 改收 `step: DisplayStep`，ChatPanel 传 `step={item}` 一致。
- `kind` 值（user/step-start/reasoning/tool/text/step-finish）全计划一致。
- `order-sim` 断言改 `last.kind`/`last.text` 与新结构一致。
