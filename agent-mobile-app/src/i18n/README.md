# `src/i18n/` — 轻量 i18n（第 0 期建能力；第 1 期 Pulse / Settings / Attention / sheets；第 2 期 chat；第 3 期 service 拼句）

零依赖的类型化字典 + `t()`。默认语言 **`en`**（当前 UI 的实际语言），`zh` 保留现有中文文案。

```ts
import { t, useLocale, setLocale, getLocale } from "@/i18n";

t("pulse.digest.allClear"); // "Nothing needs you right now."
t("chat.files", { count: 2 }); // 有 _one/_other 时按 count 选，否则回落 key
const [locale, changeLocale] = useLocale(); // 切换触发重渲染
```

## 怎么加一条文案（三步）

1. 在 `index.ts` 的 `en` 字典里加 key（英文，作为默认文案）。
2. 在 `zh` 字典里补齐同名 key —— `satisfies MessageDict` 会强制对齐，漏了编译失败。
3. 组件里改成 `t("...")`，并在组件顶部调用 `useLocale()` 订阅语言（渲染期取文案）。

复数：同时提供 `<key>_one` / `<key>_other`，调用 `t("<key>", { count })`；只有 base key 时照常回落。

## 命名规范

`<surface>.<component>.<key>`，小驼峰尾段，例如：

- `pulse.digest.allClear` —— Pulse 首页空态一句话
- `pulse.header.settings` —— Header 的 Settings 入口
- `pulse.activity.title` —— Activity sheet 的 `Lately` 标题
- `chat.handoff.confirm` —— chat 交接确认

## 红线

- **数据不进字典**：assignment 标题、记忆正文、项目名、用户数据一律原样展示，不翻译。
- **只迁界面文案，不迁数据**：服务端/用户产出的 message（含错误对象 message）原样透传，不包 `t()`。
- **不引第三方 i18n 依赖**（i18next / react-i18next / expo-localization 均不用）。
- 缺 key 不抛异常：返回 key 本身并 `console.warn` 一次。

## 当前覆盖范围

**第 1 期已迁移**：Pulse 首页（`app/index.tsx`）、Attention 详情（`app/attention/[id].tsx`）、
Pulse 各 sheet（Settings / Memory / Knowledge / Noticed / Detail / Fund / List / Light / Activity /
TodayDigest）与两个 sheet 原语（`navigation/BottomSheet`、`pulse/LightSheet`）的全部界面文案，
共 102 条 key。`ListSheet`、`TodayDigest` 本身没有硬编码文案（标题由调用方传、摘要由 service 生成）。

**第 2 期已迁移**：chat / chatcode 面板——`components/chat/zcode/` 下 `ChatPanelZ`（状态行、Attention
上下文卡、排队 chip、输入区两态、model / agent 面板、question / permission / 工具输出 sheet）、
`MessageBubbleZ`、`HandoffCard`、`AssignmentConfirmCard`、`SessionsDrawer`、`ProjectChatZ`、
`ToolGroupCard`、`ThinkCard`，以及 legacy 渲染层（`ChatPanel` / `MessageBubble` / `ProjectChat` /
`StepChip`）与 `app/talk.tsx` 的 boot / offline 文案，共 99 条 key（`chat.*`）。
消息正文、session 标题、项目路径 / 名、agent 名、错误原文、assignment 标题与 body 一律透传，不进字典。

**第 3 期已迁移**：service 层拼句与回执（纯函数直接调 `t()`，`locale` 是模块级全局，不需要 React）——
`services/assignment/card-payload.ts`（时间 / 模式 / 域 / 条件 / 卡上注 / 回执 / 错误兜底）、
`services/assignment/client.ts`（斜杠命令族反馈全文与写入用责任描述）、
`services/handoff/card-phase.ts`（卡上注 / 错误兜底）、`services/handoff/target.ts`（目录校验 reason）、
`services/command-receipt.ts`（`命令失败：` 前缀）、`services/runtime-presence.ts`（auth / other 兜底），
共 57 条 key（`assignment.card.*` 18 / `assignment.command.*` 25 / `handoff.card.*` 4 / `handoff.target.*` 5 /
`command.failed` 1 / `runtime.*` 4）。服务端原始错误、基金代码、目录路径、时间、assignment 标题一律插值透传。

**尚未迁移**：`SupportingList`（`In motion` / 分组标签 / `Review` / `Confirm` / `Watching`）、
`FeaturedItem` 的 `Review:` 无障碍文案、domain 标签（Market / Coding / Pulse）；
`services/handoff/handoff-message.ts` 拼的是**投喂给 agent 的首条消息**（面向模型，不是界面），有意保留中文。
