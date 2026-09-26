# OpenChamber → Agent Mobile Component 对比与迁移表

> 目的：作为下一阶段 UI migration 的前置分析。
>
> 本文不是直接执行代码的 prompt，而是明确“OpenChamber 的什么应该进入 Agent Mobile、进入现有哪个 component、哪些东西不应该搬”。

---

# 1. 总原则

Agent Mobile 已经存在产品组件和业务逻辑。

因此迁移策略：

```text
OpenChamber
    ↓
Pattern
    ↓
现有 Agent Mobile component
    ↓
视觉/交互改造
```

而不是：

```text
OpenChamber component
    ↓
复制
    ↓
Agent Mobile
```

---

# 2. 现有 Agent Mobile 组件基线

当前已有设计/迁移文档中已经明确出现的主要组件包括：

- `AIOrb`
- `AIStatus`
- `FeaturedItem`
- `SupportingList`
- `ConversationEntry`
- `ChatPanelZ`
- `BottomSheet`
- `ScreenHeader`
- `agent pill`
- `Mic`
- Responsibilities / Assignments UI
- Memory UI
- KB UI

其中 `ChatPanelZ` 是 Talk 的重要业务承载组件；纯视觉迁移不应重写其核心行为。

---

# 3. 核心映射

| OpenChamber Mobile pattern | Agent Mobile 现有 component | 处理 | 原因 |
|---|---|---|---|
| Sessions Drawer | `ConversationEntry` / Talk context | 改造 | OpenChamber session list 的移动交互可复用，但语义必须变成 Agent Session/context |
| Workspace Drawer | 无完全对应 | 新增轻量 Work Drawer shell | Agent Mobile 需要技术上下文入口，但不应复制完整 OpenChamber workspace |
| Chat Header | `ScreenHeader` | 改造 | 现有 header 可承载 orb/status/context |
| Chat message | `ChatPanelZ` | 视觉迁移 | 保留现有聊天逻辑 |
| Composer | `ChatPanelZ` 内现有 composer | 重点改造 | OpenChamber 的 keyboard-safe composer 是最值得吸收的模式 |
| Agent / Model control | `agent pill` | 改造 | 直接对应已有能力 |
| Voice | `Mic` | 保留现状 | 当前只是 placeholder，不因为视觉迁移增加功能 |
| Tool Activity | `ChatPanelZ` / message surfaces | 新增/抽象 compact activity component | 需要 OpenChamber 式技术上下文，但保持 Agent Mobile 语义 |
| Changes | 无一一对应 | 新增 Work Context surface | Agent Mobile 需要呈现 agent changes |
| Files | 无一一对应 | 新增 Artifact/File surface | 只在 Talk/Work context 中出现 |
| Terminal | 无一一对应 | 新增 Runtime surface | 技术能力不是一级导航 |
| Bottom Sheet | `BottomSheet` | 直接改造 | 已存在，适合承接 OpenChamber sheet pattern |
| Attention detail | `FeaturedItem` + detail | 改造 | OpenChamber sheet/detail interaction 可复用 |
| Supporting rows | `SupportingList` | 改造 | OpenChamber compact list language 很适合 |
| Presence | `AIOrb` + `AIStatus` | 保留并强化 | Agent Mobile 的独有产品身份 |
| Pulse hero | `AIOrb` / `AIStatus` / `FeaturedItem` | 重组 | 不应该变成 OpenChamber chat screen |
| Memory detail | Memory UI | sheet/detail 改造 | 借交互，不借 session history 语义 |
| KB preview | KB UI | sheet 改造 | 与 OpenChamber secondary context pattern 一致 |
| Responsibilities | Assignments UI | row/sheet 改造 | 可借 swipe/compact row，但保持 Assignment 语义 |
| Bottom navigation | Pulse/Talk/Memory/Me | 保留 | Agent Mobile 产品核心，不被 OpenChamber drawer 替代 |

---

# 4. 第一优先级：Composer

这是最值得直接吸收 OpenChamber Mobile 的 component。

目标：

```text
┌─────────────────────────────┐
│ context / attachment        │
│                             │
│ message                     │
│                             │
│ agent     model      send   │
└─────────────────────────────┘
```

必须保证：

- keyboard 打开时整体稳定
- send / queue 清晰
- model/agent controls 不挤压输入
- attachments 不破坏输入区
- safe area 正确

已有 `ChatPanelZ` 的业务行为保持不变。

---

# 5. 第二优先级：Drawer

OpenChamber：

```text
Sessions Drawer
```

Agent Mobile：

```text
Agent Context Drawer
```

建议包含：

```text
Current Agent Session
Recent contexts
Projects / domains
New Talk
```

不要直接暴露：

```text
Project
Worktree
Session
```

三层技术层级。

用户应该看到的是“我现在和哪个 context 在工作”。

---

# 6. 第三优先级：Workspace Drawer

OpenChamber：

```text
Files
Changes
Terminal
Notes
MCP
```

Agent Mobile：

```text
Work
├── Changes
├── Artifacts
├── Runtime
└── Context
```

只有 agent work 需要时才进入。

不要加入一级 bottom navigation。

---

# 7. 第四优先级：Compact Activity

OpenChamber 的 Activity / tool UI 可以直接启发：

```text
Thinking
Using tool
Running command
Changed files
Waiting for approval
```

Agent Mobile 建议统一成：

```text
Agent Activity
```

视觉：

- compact
- expandable
- secondary
- 不抢夺 message hierarchy

---

# 8. 第五优先级：Rows

OpenChamber 的 session/project/worktree rows 可以带 swipe action。

Agent Mobile 可以把这个 pattern 应用到：

- Attention
- Assignment
- Agent Session
- Artifact
- Memory item

但只有 secondary action 才应该放到 swipe 后。

---

# 9. 第六优先级：Bottom Sheet

现有 `BottomSheet` 应成为统一容器。

优先统一：

```text
AttentionDetailSheet
MemoryDetailSheet
ContextSheet
ModelPickerSheet
AgentPickerSheet
AssignmentDetailSheet
```

避免每个业务模块实现自己的 modal。

---

# 10. 不应该迁移的 OpenChamber UI

以下内容不应该直接复制：

### Project / Worktree hierarchy

这是 OpenChamber coding workspace 的核心概念。

Agent Mobile 不应该因此变成 IDE。

### Desktop sidebar

手机端应该使用 drawer/sheet，而不是压缩 desktop sidebar。

### OpenChamber settings structure

Agent Mobile 的 Me / settings 有自己的产品语义。

### OpenChamber session archive UX

Agent Mobile 的 Agent Session 是 context boundary，不应直接等价成聊天记录管理。

### Capacitor / WebView

Agent Mobile 继续 Expo / React Native。

---

# 11. 组件改造顺序

```text
P0
Theme / tokens
    ↓
P0
ChatPanelZ / Composer
    ↓
P0
ScreenHeader
    ↓
P0
BottomSheet
    ↓
P1
AIOrb / AIStatus
    ↓
P1
FeaturedItem / SupportingList
    ↓
P1
ConversationEntry
    ↓
P1
Agent Activity
    ↓
P2
Agent Context Drawer
    ↓
P2
Work Drawer
    ↓
P2
Memory / KB sheets
    ↓
P2
Assignment rows / sheets
```

---

# 12. 视觉映射原则

OpenChamber 的：

```text
compact
neutral
technical
dense-but-readable
```

迁移为 Agent Mobile：

```text
compact
warm
conversational
technical-but-subordinate
```

也就是说：

> 不要把 Agent Mobile 做成 OpenChamber 的暖色皮肤。

而应该：

> 把 OpenChamber 成熟的 mobile interaction grammar 融入 Warm AI Companion。

---

# 13. 验收标准

一个 component 迁移完成后必须同时满足：

### 产品

- 没有破坏 Pulse / Talk / Memory / Me 语义
- 没有把 Agent Mobile 变成 coding dashboard

### 视觉

- 使用统一 token
- spacing/radius/icon 一致
- 不产生独立视觉体系

### 交互

- Android touch target 合格
- keyboard-safe
- back button 合理
- drawer/sheet 行为一致

### 工程

- 不复制 Web/Capacitor implementation
- 不复制 OpenChamber business logic
- 不破坏现有 API / hooks / stores
- 优先复用现有 component

---

# 14. 最终目标

不是：

```text
Agent Mobile ≈ OpenChamber
```

而是：

```text
Agent Mobile
    =
Warm AI Companion
+
OpenChamber Mobile UX maturity
```

最终用户看到的是 Agent Mobile，而不是 OpenChamber 的 clone。
