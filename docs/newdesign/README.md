# OpenChamber → Agent Mobile UI 文档包

1. `OPENCHAMBER_DESIGN.md` — OpenChamber 视觉设计语言
2. `OPENCHAMBER_MOBILE_UX.md` — OpenChamber 手机端交互规范
3. `AGENT_MOBILE_DESIGN.md` — Agent Mobile 最终设计系统
4. `OPENCHAMBER_TO_AGENTMOBILE_COMPONENT_MAP.md` — OpenChamber 与现有 Agent Mobile component 的逐项映射

`html/` 目录是手机壳 mockup 静态稿（可直接浏览器打开）：

- `pulse.html` — Pulse 首页视觉稿（初版参照）
- `pulseB.html` — **Pulse 首页迁移定稿**（浅色 Companion 皮肤，含全部迭代决策）
- `pulseB-review.html` — attention 详情页（Review 落地页）
- `pulseB-login.html` — 独立登录页
- `pulseB-sheet-{fund,noticed,noticed-list,more}.html` — 弹出层家族（Fund/Noticed 详情/Noticed 全量/More 溢出）
- `pulseB-{empty,offline,error}.html` — 状态变体（空态/离线/错误行）
- `chat.html` — Warm AI Companion 风格聊天视觉稿
- `chatcode.html` — OpenChamber mobile chat 功能结构 + Companion 皮肤的可交互原型（mock 数据，含 sessions/workspace 抽屉、工具折叠组、权限卡、pill↔展开 composer、模型/Agent 面板、排队消息等）
- `chat-widgets.html` — chat 气泡小组件（Duties/Projects/Memory/Knowledge 卡，职责与项目查询的 chat 化形态）
- `chat-settings.html` — chat 内弹出的设置面板（Settings 不做独立页的形态）

RN 迁移的执行交底书见 `docs/pipeline/RN_MIGRATION_BRIEF.md`。

建议阅读顺序：

OpenChamber Design → OpenChamber Mobile UX → Component Map → Agent Mobile Design

