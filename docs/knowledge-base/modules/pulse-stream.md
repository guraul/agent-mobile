# modules/pulse-stream.md —— Pulse 首页（项目导航 + 基金估值）

> ⚠️ **Phase 3-13 更新**：needs-you 现在只来自 Attention store（`services/attention/`，/api/product/attention + /api/product/stream）；`fund.trade-alert` SSE 语义与 `/api/events/ack` 已退役（Phase 7）；`fund.estimate` 为 L1 行情数据面（Phase 10 迁到 `/api/product/l1` + `/api/product/l1/stream`，legacy `/api/events/stream` 与 `services/fund-events.ts`、`hooks/useFundEvents.ts` 已删除）；Phase 12 新增 Noticed 组（observation L1）；Phase 13 新增 Suggested 组（Assignment Proposal 的 L2 呈现，`services/proposal/` + `hooks/useSuggestions.ts`）。活跃聊天为 `ProjectChatZ`（ZCode fork）。下文部分段落描述 Phase 3 之前行为，已用 ~~删除线~~ 或保留作历史参考——以本标注与 `services/` 源码为准。

> 最后更新：2026-09-12 · commit：`c315931`（v0.1.1 UX Correction：Pulse 不再承载 chat，卡片动作路由进 Talk）

## v0.1.1 UX Correction（2026-09-12）

- **Pulse 不再承载 chat**：BottomSheet 聊天宿主已删除（«AI → User» vs «User ↔ AI» 职责切分）。卡片动作全部路由进 Talk workspace（`router.push("/talk", params)`）。
- 卡片路径：Needs You 卡 → `/attention/[id]` 详情（evidence/history 投影）→ **Open Talk**；Suggested 卡 → [去聊聊]（非授权，proposal 保持 PROPOSED）+[确认]/[不用了]；Noticed 卡 → tap 上下文会话；Today 项目卡 → Talk 项目模式。
- `services/attention/talk.ts`：Attention→会话解析共享层（Resume 优先 / market Create+engage），Pulse 卡与详情屏共用。
- offline：`services/runtime-presence.ts` 分类错误（opencode-offline / bff-offline / auth / other），呈现「AI is offline」而非裸 502。

## Phase 13：Pulse ← Proposal（Suggested 组，2026-09-12）

## Phase 13：Pulse ← Proposal（Suggested 组，2026-09-12）

- **数据源** = `useSuggestions()`：`GET /api/product/assignment-proposals?status=proposed` 快照 + product SSE `proposal.created/updated`（同一条 `/api/product/stream` 连接的独立订阅，只认 `proposal.*` kind）+ 重连对账。
- **Suggestion ≠ Proposal**：`services/proposal/store.ts` 只是 `assignment_proposals` 行的只读视图模型（status 原样保留，渲染过滤 `status==='proposed'`）；不复制 lifecycle、不建表、无客户端过期倒计时（expiry 权威在 BFF sweep）。
- **Suggestion 卡（四问）**：我建议什么（responsibility 原文）、为什么（`observationReasonLabel`：observation 来源 → 确定性模板；talk 来源省略）、确认后会发生什么（`describeProposalEffect`）+ 撤销出口提示、有效期（expiresAt 仅展示）。
- **动作语义（硬规则）**：[确认] / [不用了] 两个显式按钮是唯一推进路径（调既有 confirm/reject API）；**点卡体/阅读/进入 Talk 永不 confirm（查看 ≠ 授权）**；409 → 静默重拉对账；网络错误 → 卡片保留 + 错误提示；busy 防双击。
- **分组顺序**：Needs you → Suggested → Noticed → Today → Market（组仅在有内容时渲染）。
- 确认后的 Assignment 在 Memory tab → Responsibilities 管理（Phase 9 面板复用，零改动）。

## Phase 12：Pulse ← Observation（Noticed 组，2026-09-11）

- Noticed 分组 = `useL1().noticed`（`kind==="observation"` 的 L1 statement），与 Suggested 并存合法（同一 observation 可同时产出 L1 与 proposal，语义不重复）。

## Phase 3：Pulse ← Attention（2026-09-05）

- **Needs you 分组唯一来源** = `useAttentions()`（`services/attention/store.ts` + `client.ts`）：
  REST snapshot（`GET /api/product/attention`）+ product SSE（`/api/product/stream`，attention.created/updated）+ 重连对账。
- **已删除的错误语义路径**：`project-status.ts` 的 `knownIdle→needs-you` 与 `pendingPermissions→needs-you`
  （PM §16.1：idle/pending 是 runtime 状态）；`ProjectStatus` 收窄为 `running|idle`。
- **legacy 退役（mobile 侧）**：`fund-events.ts` / `useFundEvents.ts` 已删除；跑马灯改读 L1（`services/l1.ts` + `hooks/useL1.ts`）。
- **点击路由**：permission Attention → GET session → 项目会话（现有 Talk path）；market Attention → 行情 sheet + Ignore（dismiss）。
- 查看不改 state：viewed/opened 只写 interaction（PM §17）。

## 模块职责

Pulse 首页：问候 + AI 在场状态 + **真实项目导航**（按状态分组）+ **基金估值跑马灯（L1）** + 全屏聊天 sheet。点击项目直接进入对话。是产品核心页（设计源头：`docs/knowledge-base/AI_INTERACTION_DESIGN.md`）。逐步向 Jarvis 形态演进（除 opencode 项目事件外，接入 family-finance 基金事件）。

> 历史：早期为 mock 事件流（`src/screens/events.ts` + PULSE_SECTIONS），2026-08-11 重构为 opencode 项目导航。`src/screens/events.ts` 已无引用（保留供设计期参考）。

## 入口文件

`agent-mobile-app/src/app/(tabs)/index.tsx`（Pulse 首页；历史名 `pulse.tsx`，已并入 index.tsx 作为默认 tab）

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/app/(tabs)/index.tsx` | 页面：状态分组 + 其他项目折叠栏 + 基金跑马灯 + sheet 装配 |
| `agent-mobile-app/src/hooks/useProjectEvents.ts` | 聚合 opencode 项目 + 会话 + 状态 + SSE 实时 |
| `agent-mobile-app/src/hooks/useL1.ts` | L1 hook（Phase 10）：snapshot + SSE + reconnect reconciliation；`funds` = 行情投影 |
| `agent-mobile-app/src/hooks/useSuggestions.ts` | Suggestion hook（Phase 13）：proposed 快照 + product SSE proposal.* + 重连对账 + confirm/reject 动作转发 |
| `agent-mobile-app/src/services/proposal/store.ts` | Suggestion 视图模型纯函数（Phase 13）：toPulseSuggestion / proposedSuggestions / applyProposalChange / reconcile |
| `agent-mobile-app/src/services/proposal/client.ts` | product SSE 订阅（Phase 13）：只认 `proposal.*` kind，退避重连 |
| `agent-mobile-app/src/services/assignment/projection.ts` | Assignment/Proposal 投影文案：describeTrigger / describeProposalEffect / observationReasonLabel |
| `agent-mobile-app/src/services/l1.ts` | L1 client：`fetchL1`（`/api/product/l1`）+ `subscribeL1`（`/api/product/l1/stream`）+ `toMarketEstimate` |
| `agent-mobile-app/src/components/navigation/Marquee.tsx` | 横向自动滚动跑马灯组件（基金名/估值滚动） |
| `agent-mobile-app/src/components/navigation/FundMarqueeItem.tsx` | 基金行情列表条目（与 EventItem 同视觉，MARKET 标签 + 两行跑马灯 + StatusPill；数据源 L1） |
| `agent-mobile-app/src/services/project-status.ts` | `determineProjectStatus` 纯函数（状态判定） |
| `agent-mobile-app/src/services/opencode-client.ts` | REST 客户端（/project、/session、/session/status） |
| `agent-mobile-app/src/services/opencode-events.ts` | opencode SSE 订阅（session.* / permission.* / server.connected） |
| `agent-mobile-app/src/components/navigation/EventItem.tsx` | 列表条目组件（ACTION/PROJECT 两态） |
| `agent-mobile-app/src/components/navigation/BottomSheet.tsx` | 全屏 sheet 容器（fullScreen 模式无 padding） |
| `agent-mobile-app/src/components/feedback/StatusDot.tsx` | 状态点（支持 pulse 呼吸动画） |
| `agent-mobile-app/src/components/chat/ProjectChat.tsx` | 项目聊天入口（见 modules/chat.md） |

## 页面结构（pulse.tsx）

```
KeyboardAvoidingView (ios: padding)
├── ScreenHeader (title="Pulse", right Bell → alert("Notifications"))
├── greetingWrap: getGreeting() 时间问候 + StatusDot(running, pulse) + "I'm here."
└── ScrollView
    ├── error callout（若有）
    ├── loading / 空态
    ├── groups[]（2026-08-27 起支持混合条目 project + market）：
    │   ├── NEEDS YOU（永远最上）：open Attention EventItem（Phase 3 起，Attention store 权威）
    │   ├── SUGGESTED（Phase 13）：Suggestion 卡（responsibility + 为什么 + 确认后 + [确认]/[不用了]）
    │   ├── NOTICED（Phase 12）：observation L1 statements（INFO EventItem，无动作）
    │   ├── TODAY：running 项目 EventItem
    │   └── MARKET：FundMarqueeItem 行情条目（L1）
    └── OTHER PROJECTS 可折叠栏（2026-08-25 新增，otherOpen state）
        └── 展开后：不活跃项目列表（同 EventItem，status="idle"）
└── BottomSheet(fullScreen, testID="project-chat-sheet")
    └── activeProject && <ProjectChat projectPath onBack />
```

> **分组条目类型（2026-08-27）**：`groups[].items` 由 `GroupItem` 联合类型组成——`{kind:"project", event}`（项目）或 `{kind:"market", hasAlert}`（基金行情）。渲染时按 kind 分发到 `EventItem` 或 `FundMarqueeItem`。
> **跑马灯布局规则（2026-08-27 重构）**：跑马灯不再置顶。无 trade-alert 时作为独立 MARKET 分组（Today 之后）；收到 `fund.trade-alert` 时升级为 NEEDS YOU 第一项（StatusPill 变 warning"有基金需要交易"）。FundMarqueeItem 与 EventItem 视觉一致（同 surface.1/边框/padding/圆角），UI 上像普通列表列。
> **交易提醒交互闭环（2026-08-27）**：alert 时点击 MARKET 条目（`aria-label="有基金需要交易"`，Pressable）→ 弹 `trade-alert-sheet` BottomSheet 展示各基金（估净/目标/超出%）；点"确认处理" → `dismissAlert()` 清空 alert → sheet 关闭，MARKET 回落独立分组。

## 分组规则

| section | 条件 |
|---|---|
| Needs you | `event.status === "needs-you"`（等待授权 / agent 空闲等待输入） |
| Today | `event.status === "running"`（agent 正在工作） |
| 过滤 | 仅当天活跃（`updated >= 当天 0 点`），按 `updated` 降序 |
| **Other projects** | **当天不活跃的项目**（`useProjectEvents` 的 `otherProjects`），按 `updated` 降序；默认收起，点击 chevron 展开 |

> **其他项目栏（2026-08-25）**：活跃过滤会让不活跃项目"无处可看"。`useProjectEvents` 新增 `otherProjects` state，把被活跃过滤掉的项目单独返回；pulse.tsx 在底部渲染可折叠栏（`ChevronDown/Right` + "OTHER PROJECTS (N)"），点击项目照常进聊天（`ProjectChat` 自己 `listSessions` 找会话）。

## 基金事件流（2026-08-27 新增）

```
family-finance BFF /api/product/l1 + /api/product/l1/stream（L1 presentation，SSE + snapshot，JWT）
  └── L1 statement（market-estimate 每 5s：未归档基金实时估算）
        └── useL1 → toMarketEstimate → funds[] → Marquee 跑马灯渲染
```

- **services/l1.ts**：`fetchL1`（`/api/product/l1` snapshot）+ `subscribeL1`（`/api/product/l1/stream` SSE，每帧全量替换）+ `toMarketEstimate`（L1Statement → 跑马灯行情投影）。复用 `tokenHeader` JWT；断线指数退避重连；重连先 snapshot 对账。
- **hooks/useL1.ts**：snapshot + SSE + reconnect reconciliation；`statements`（全部 L1）+ `funds`（行情投影）。
- **Marquee.tsx**：内容超宽（>90% 屏宽）时 `Animated.loop` translateX 无缝循环滚动（内容复制两份），否则静止展示。**⚠️ web 滚动坑（2026-08-28）**：① `useNativeDriver` 按平台——web 必须 `false`（RN Web 的 Animated native driver 不更新 DOM transform，与 BottomSheet 黑框同源坑）；② `onLayout` 必须放在 **Animated.View**（内容）上测宽度，放外层容器（430px）会误判 contentWidth 过小导致 `shouldScroll` 恒 false、永不滚动。
- **FundMarqueeItem.tsx**：与 EventItem 相同视觉的行情条目（MARKET 标签 + 基金名/估值两行跑马灯 + StatusPill）；StatusPill 恒 idle"Watching"（L1 = informational，无 obligation、无 badge）；Pressable 可点击（onPress → 行情 sheet）。
- **行情显示（2026-08-28）**：跑马灯 summary 行 + 基金详情 sheet 均显示 `估算值 昨 昨日净值 涨跌幅%`（如 `1.3081 昨 1.3013 +0.52%`），`prevNav` 来自 L1 statement data，便于与估算值对比。
- **启动时 BFF 地址覆盖（2026-08-30，方案 C）**：启动 effect 先 `getRuntimeBaseUrl()`（AsyncStorage `pulse_bff_url`，Me 页写入）设 `opencodeConfig.runtimeBaseUrl`，**再** `loadToken()`+refresh；所有请求走 `getBaseUrl()`（覆盖优先回退 env）。运行中不热切，改地址重启生效。
- **SSE 首连提速（2026-08-28）**：`services/l1.ts` / `opencode-events.ts` 未登录等待 token 从固定 3000ms 改为 **300ms 短轮询**——SSE 订阅 mount 即启动，但 `loadToken()` 异步写内存 token 未完成时首连无 token，原等 3s 重试导致跑马灯比项目列表晚 3s；改后跑马灯 4.2s→1.7s，与项目列表几乎同步。
- 涨跌颜色：changePct>=0 用 `success`（红涨），否则 `error`（绿跌）——注意中国市场红涨绿跌约定。
- **L1 语义（Phase 10）**：L1 是 authorized informational presentation（PM §22）——无 lifecycle、无 obligation、不产生 Attention、无 badge。市场关闭 / 数据源失败 → BFF 不返回 stale statement（`items: []` → 跑马灯消失）。

## 状态判定优先级（project-status.ts）

```
1. 任一 session 有 pending 权限   → needs-you（"Needs authorization"）
2. 任一 session busy/retry        → running（"Running"/"Retrying"）
3. 任一 session 已知 idle         → needs-you（"Needs you"，agent 在等输入）
4. 兜底                           → idle
```

**注意**：opencode `/session/status` 只报告活跃（busy/retry）会话；存在但不在 map 中的 session 视为 idle（在 hook 中显式补 `"idle"`）。

## useProjectEvents 数据流

```
refresh()（30s 轮询 + server.connected 触发）
  ├─ getProject()                    → projectsRef（过滤 id="global"）
  ├─ listSessions(directory)（按项目）→ sessionsRef
  └─ getSessionStatus()              → sessionStatusRef
recompute()：
  ├─ session 按 directory 分组到项目
  ├─ 每个项目补 idle 状态 + determineProjectStatus
  ├─ 过滤当天活跃 + updated 降序 → setEvents
  └─ 被过滤掉的不活跃项目 → setOtherProjects（updated 降序）
SSE 事件 → 更新 refs 后 recompute：
  session.status / permission.updated / permission.replied / session.updated / session.created / session.deleted
```

## 修改本模块的注意事项

- **勿用 `project.time.updated` 判活跃**：其值被 watcher 污染，活跃度必须基于 `session.time.updated`。
- **`/session` 不带 directory 参数只返回默认工作区会话**：必须按项目 `directory` 分别查询。
- **分组/判定逻辑改动**：先改 `project-status.ts`（纯函数 + 单测），再改 hook/页面。
- **BottomSheet fullScreen 无 padding**：内容组件（如 ProjectChat header）需自带 padding。
- **跑马灯数据源（Phase 10）**：`useL1.funds` 来自 `/api/product/l1`（L1 presentation），勿在前端硬编码基金列表；无活跃基金 / 市场关闭 / 数据源失败时 BFF 返回空（`funds` 为空 → 区块不渲染）。
- **trade-alert 已退役**（Phase 7）：needs-you 语义只在 Attention store；行情只走 L1（无 obligation、无 badge）。
- 单测：`src/services/project-status.test.ts`（9 例）。
