# OpenChamber Mobile UX 规范

> 用途：描述 OpenChamber 当前手机端的交互模式，供 Agent Mobile 选择性吸收。
>
> 注意：本文档不是 OpenChamber 产品功能清单，而是 Mobile UX pattern catalog。

## 1. 移动端总体结构

OpenChamber 的核心移动结构可以抽象成：

```text
Sessions Drawer  ←→  Main Chat  ←→  Workspace Drawer
```

手机上重点是：

- 当前 session
- 对话
- workspace context
- secondary tools

平板则可以逐渐展开成多栏布局。

## 2. Sessions Drawer

主要职责：

- project
- worktree
- session
- session search
- session actions
- 新建 session

当前版本支持：

- session 搜索
- project sorting
- session/project/worktree row 的 swipe actions
- session rename
- session archive/delete 等操作
- 从 project root 创建 session

## 3. Workspace Drawer

主要承担：

- Files
- Changes
- Terminal
- Notes
- MCP 等 workspace-related surfaces

移动端不应该把这些功能全部永久显示在主屏幕。

原则：

> 只有用户需要技术上下文时，才把它拉到当前视野。

## 4. Chat Header

Header 的信息应该有限：

- 当前 session
- 当前 workspace/context
- 必要的状态
- drawer entry
- 当前核心操作

不要把 desktop toolbar 原样压缩到手机顶部。

## 5. Chat

Chat 是主 surface。

核心要求：

- 消息可连续阅读
- streaming 不导致跳动
- thinking/tool activity 可以展开或折叠
- action 控件不占据主要视觉空间
- markdown、code、table、diff 在窄屏下可读

## 6. Composer

移动 composer 是核心组件。

当前 OpenChamber 的移动设计已经把：

- attachments
- model controls
- agent controls
- message input
- send / queue

组织到移动端可操作的区域。

重要行为：

```text
Keyboard closed
    ↓
Composer at bottom

Keyboard opened
    ↓
Chat + message box + composer
一起移动
```

不能只移动 TextInput，而让聊天内容突然跳动。

## 7. Agent Working

Agent 工作期间：

- send 可以变成 queue
- queued messages 可以折叠
- work status 不应该遮挡主要对话
- tool activity 是上下文，不应变成全屏日志

## 8. Drawer Gesture

OpenChamber 当前移动端支持：

- drawer open
- reverse edge swipe close
- row swipe actions

这说明它的 drawer 并不是简单 modal。

Agent Mobile 若采用类似模式，应使用真正的 gesture interaction，而不是只做一个从左边弹出的 View。

## 9. Row Swipe Actions

适用于：

- session
- project
- worktree

原则：

- 主区域仍然是 row content
- swipe 后才出现 secondary/destructive actions
- 不把四五个按钮长期暴露在 row 上

## 10. Bottom Sheet

适合：

- picker
- detail
- secondary actions
- context preview
- settings subsection

不适合：

- 主要聊天
- 长期主导航

## 11. Back Button

Android back 应优先按当前上下文关闭：

```text
Modal
  ↓
Sheet
  ↓
Drawer
  ↓
Nested screen
  ↓
Current root
```

不要让 Android back 直接破坏 session context。

## 12. Phone / Tablet

Phone：

```text
Drawer / Chat / Drawer
```

Tablet：

```text
Sessions | Chat | Workspace
```

不要通过简单缩放实现 tablet。

应该根据可用宽度切换信息架构。

## 13. Technical Surfaces

Files / Changes / Terminal 都属于 secondary context。

推荐：

```text
Chat
  ↓
Workspace action
  ↓
Sheet / Drawer / dedicated panel
  ↓
Return to Chat
```

而不是：

```text
Chat
  ↓
永久四栏工具栏
```

## 14. Empty / Loading / Error

必须有独立的 mobile states：

- no session
- loading sessions
- loading messages
- offline
- connection failed
- no changes
- no files
- terminal unavailable

空态应该解释“现在是什么状态”和“下一步可以做什么”。

## 15. Android System UI

必须验证：

- status bar
- navigation bar
- keyboard
- safe-area
- edge-to-edge
- bottom composer
- bottom sheet

OpenChamber 最新版本已经专门修复 Android mobile 中 settings、drawers、chat controls 与 system navigation bar 的冲突，这类问题必须作为 Agent Mobile 的验收项。

## 16. 对 Agent Mobile 的适配原则

直接吸收：

- drawer
- sheet
- swipe action
- keyboard-safe composer
- mobile-specific toolbar
- technical context panels
- responsive phone/tablet
- Android back semantics

重新解释：

- Session → Agent Session / Talk context
- Workspace → Agent Work context
- Changes → Agent-generated changes / artifacts
- Terminal → Runtime / execution context
- Notes → Memory / contextual knowledge

不直接引入：

- Project / Worktree / OpenChamber session hierarchy
- OpenChamber settings information architecture
- OpenChamber coding terminology

## 17. Mobile UX North Star

> **用户始终知道自己正在和谁、围绕什么 context 对话；技术细节可以随时展开，但不会主动夺走主注意力。**
