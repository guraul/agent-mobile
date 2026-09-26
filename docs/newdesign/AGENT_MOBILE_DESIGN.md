# Agent Mobile Design System

**目标平台：** Expo / React Native / Android  
**产品：** Agent Mobile / Pulse  
**设计来源：** OpenChamber Mobile UX + Agent Mobile 原有产品语义

---

# 1. Design Direction

Agent Mobile 应采用：

> **温暖、安静、技术但不工具化的 AI Companion 视觉语言。**

OpenChamber 提供：

- mobile interaction patterns
- compact technical UI
- drawer/sheet
- restrained surface hierarchy
- keyboard-safe composer

Agent Mobile 自己定义：

- Pulse
- Talk
- Memory
- Me
- Attention
- Assignment
- Agent Session
- Context

---

# 2. 产品语义不能被改变

## Pulse

> I noticed.

负责：

- AI presence
- brief
- attention
- what changed
- what matters now

不变成 dashboard。

## Talk

> Let's think.

负责：

- conversation
- contextual discussion
- agent interaction
- session continuity

## Memory

> I remember.

负责：

- narrative memory
- relevant remembered facts
- KB/contextual knowledge

## Me

> How we work together.

负责：

- relationship
- responsibilities
- preferences
- configuration

---

# 3. Visual Tokens

现有 Warm AI Companion token 是本设计系统的基础。

## Colors

```text
background      #FDFCFA
surface         #FFFFFF
surfaceMuted    #F7F6F4
surfaceSubtle   #F8F7F5
surfaceCode     #F4F3F1
surfaceUser     #F7F2EE

textPrimary     #393A34
textSecondary   #5C5C54
textTertiary    #6B6B63
textDisabled    #9A9991

accent          #B35017
accentSoft      #F4E7DE

success         #5F8D3D
warning         #8D6C15
error           #B7493F
info            #2D72C4

border          #E5E1DE
borderStrong    #D8D5D0
borderFocus     #B35017
```

## Spacing

```text
4 / 8 / 12 / 16 / 20 / 24 / 32
```

默认 screen padding：

```text
16px
```

## Radius

```text
small    6
medium   10
large    12
sheet    16
pill     999
```

---

# 4. OpenChamber Pattern → Agent Mobile Principle

| OpenChamber pattern | Agent Mobile adaptation |
|---|---|
| Sessions Drawer | Agent Context / Talk context |
| Workspace Drawer | Agent Work context |
| Files | Artifacts / context |
| Changes | Agent changes |
| Terminal | Runtime / execution |
| Session | Agent Session |
| Composer | Talk Composer |
| Tool Activity | Agent Activity |
| Bottom Sheet | Context Detail |
| Swipe Action | Secondary action |
| Project | Agent project/context |
| Worktree | 不直接暴露；仅在确有价值时作为 technical detail |

---

# 5. Pulse

Pulse 不采用 OpenChamber 的 Chat-first layout。

Pulse 应保持：

```text
Presence
   ↓
Primary brief
   ↓
Needs attention
   ↓
Supporting signals
   ↓
Talk entry
```

不能出现：

- permanent composer
- dense dashboard cards
- agent list
- log feed
- project management grid

OpenChamber 的 drawer/sheet 只在 Pulse 的 contextual interaction 中使用。

---

# 6. Talk

Talk 可以大量吸收 OpenChamber 的 mobile chat UX：

- keyboard-safe composer
- compact header
- streaming stability
- tool activity
- model/agent controls
- context chips
- bottom sheet
- attachment/context handling

但视觉上仍然属于 Agent Mobile。

## Message

AI message：

- 直接放在主 background 上
- 不默认使用厚重 bubble
- technical activity 使用 compact surface

User message：

- 可使用 `surfaceUser`
- border 克制

---

# 7. Talk Composer

Composer 是核心 shared component。

应该支持：

- text
- send
- queue
- agent
- model
- context
- attachment
- keyboard safe area

必须保留现有业务逻辑。

视觉迁移不得破坏：

- send
- queue
- slash commands
- question flow
- permission flow
- assignment commands
- model/agent selection

---

# 8. Agent Activity

OpenChamber 的 tool activity 思路可以吸收，但 Agent Mobile 应降低技术噪音。

建议：

```text
Agent thinking
Agent tool activity
Agent result
```

采用 compact expandable surface。

默认状态：

> 看得见发生了什么，但不要求用户阅读所有日志。

---

# 9. Attention

Attention 是 Pulse 的核心信息类型。

视觉优先级：

```text
Featured Attention
    ↓
Supporting Attention
    ↓
Quiet / expired
```

不要把每个 Attention 都做成大卡片。

---

# 10. Memory

Memory 不复制 OpenChamber 的 session/history UI。

Memory 应继续：

- narrative
- grouped
- readable
- low density

可以借鉴 OpenChamber：

- sheet
- detail panel
- contextual navigation

但不能变成 session archive。

---

# 11. Me

Me 应保持关系型 UI。

Responsibilities / Assignments 可以使用：

- compact rows
- status dots
- bottom sheet
- detail screen
- swipe secondary actions

但不要变成 settings dashboard。

---

# 12. Navigation

Agent Mobile 的一级语义仍然：

```text
Pulse | Talk | Memory | Me
```

视觉上采用 quiet bottom navigation。

OpenChamber 的 drawer 不是替代这四个 surface，而是作为 contextual navigation pattern。

---

# 13. Drawer Rules

Agent Mobile 可以使用：

### Context Drawer

用于：

- Agent Session
- project/context
- recent conversations

### Work Drawer

用于：

- changes
- artifacts
- runtime
- execution context

drawer 必须：

- mobile-first
- gesture aware
- back-button aware
- safe-area aware

---

# 14. Sheet Rules

优先用于：

- Attention detail
- Memory detail
- Agent context
- model/agent picker
- assignment detail
- technical preview

sheet 打开后必须保持当前 context。

---

# 15. Touch

所有交互目标：

> 最低 44×44 dp

尤其：

- navigation
- send
- drawer rows
- sheet actions
- status controls

---

# 16. Android

必须验证：

- keyboard
- navigation bar
- status bar
- edge-to-edge
- Android back
- gesture
- bottom composer
- bottom sheet

---

# 17. 现有业务逻辑保护

纯视觉迁移不得修改：

- OpenCode integration
- API contract
- session semantics
- attention semantics
- assignment lifecycle
- market rule behavior
- Memory API
- KB API

已有 Talk 逻辑尤其要保持：

- ChatPanelZ
- question flow
- slash commands
- agent/model selection
- voice placeholder
- assignment commands

---

# 18. Component Design Principle

优先：

```text
existing component
    ↓
theme/token migration
    ↓
layout adaptation
    ↓
interaction adaptation
```

而不是：

```text
new component
    ↓
copy OpenChamber
```

只有现有 component 无法表达目标 UX 时，才新增 component。

---

# 19. Visual North Star

> **一个知道发生了什么、记得你在做什么、但不会用大量 dashboard 信息轰炸你的 AI Companion。**

技术能力应该随时可展开。

但技术 UI 永远服务于 Companion，而不是反过来。

---

# 20. 设计判断规则

当两个方案都可行时，优先：

1. 更清楚的层级
2. 更少的视觉噪音
3. 更好的单手操作
4. 更稳定的 keyboard 行为
5. 更少的永久性 toolbar
6. 更自然的 context preservation
7. 更接近“和一个伙伴工作”而不是“管理一个系统”

