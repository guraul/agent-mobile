# Companion UI Transplant — Backend Support Gaps

> 日期：2026-09-21 · 分支：`feat/ui-transplant-showcase2`
> 背景：UI 1:1 移植 showcase2（组件直移方案）。移植中发现以下 showcase2 功能**当前 BFF/运行时无数据面支撑**，按决定「先记录、以后解决」处理。

| # | showcase2 功能 | 缺口 | 处理 | 未来解决方向 |
|---|---|---|---|---|
| 1 | AI 消息上的 **memory chip**（点击展开记忆详情） | opencode 消息不带 memx 归因，BFF 无「消息↔记忆」数据面 | 移植时省略（不伪造归因） | 若 opencode 事件流未来携带 memory 引用（或 BFF 侧做归因），再接入 `ConversationMessage` 的 `memory` prop |
| 2 | AI 消息上的 **knowledge/source chip**（引用来源） | BFF 无「消息↔KB 文档」归因 | 同上省略 | 同上；或仅在「ASK ABOUT THIS」进入的会话给首条上下文消息挂真实 source chip（数据真实可用） |
| 3 | Featured 卡的 **Defer** 动作 | 后端无 defer 语义（`PRODUCTION_UI_MIGRATION_MAPPING` 锁定已移除） | 移植时去掉（FeaturedItem/SupportingList 已删 Defer） | 若产品重启 Defer 语义需先立 canonical 状态 |
| 4 | presence 三态 `engaged / thinking / noticed` | Pulse 无对应运行时推导（仅 attentive/needs-you/offline） | 保留 showcase2 类型定义，运行时不会出现这三态 | 若需要（如会话进行中显示 engaged），客户端可从 busy 状态派生 |
| 5 | `SuggestionItem.assignment = 'active'`（行内 "Watching" 态） | `useSuggestions` 只返回 proposed，无 confirmed+active 关联投影 | 恒为 `idle`（行内不显示 Watching） | BFF 可在 proposals 投影里带 assignment 状态 |
| 6 | Market L1 行/FundSheet 数据的实时性 | 休市时 L1 为空（正确行为），行不渲染 | 保留（开市自然出现） | 无需解决 |

## 移植中保留的生产功能（showcase2 没有，但必须保留）

- Settings 入口（header 右侧齿轮；showcase2 header 无此元素）
- Talk 的 agent/model 切换 chips、slash 命令、permission/question 弹窗（功能机制未动）
- Memory/Knowledge 全量 sheet（生产版保留：列表/Forget/KB 检索/OPEN/ASK；showcase2 的 chip 详情版未移植，见 #1/#2）
- 登录横幅与登录 sheet、离线态呈现、Watching 计数行
- 预算：Supporting ≤4 + `More (n)`、Noticed ≤5 + `See All`（锁定约束）

## 已知待迭代（视觉保真）

- Talk chrome 尚未按 showcase2 `TalkScreen` 重排（header 居中 orb + `● LISTENING`、消息 orb 缩进、composer 圆形箭头键）——当前仍是 `ProjectChatZ` 旧版视觉 + 新 orb
- 顶部 ambient 辉光强度可能弱于 showcase2 观感（expo-linear-gradient 已接入，待调）
- Hero 姓名显示依赖 UI 登录写入的 `pulse_username`（token 注入的测试环境无姓名）
