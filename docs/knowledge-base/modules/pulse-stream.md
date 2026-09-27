# modules/pulse-stream.md —— Pulse 根界面（AI 伴侣 briefing 单表面）

> 最后更新：2026-09-26 · commit：`a1e8e5e`（按源码事实核对：showcase2 移植组件更名 FeaturedItem/SupportingList/PulseNoticed/ActionChips；结构树补登录 banner / More projects / 错误行 / DetailSheet；澄清 ConversationEntry 非 TextInput；修正状态机与 Marquee 残留描述）

## ⚠️ Companion UI Migration（2026-09-21 引入，2026-09-26 按 `a1e8e5e` 源码核对，当前形态）

Pulse 已从「五分组项目导航 + 全屏聊天 sheet」重写为**单表面 AI briefing**。以下为当前结构，旧分组描述保留在后文作历史参考。

- **Header**（index.tsx 内联，无独立组件）：左 `AIOrb`（`size="header"`=40，唯一允许的发光元素，testID `pulse-orb`）+ `AIStatus`（`● Attentive` 等，testID `pulse-status`）+ 标题「Pulse」（`pulse-title`）；右 Settings 齿轮（`pulse-settings`）→ SettingsSheet。
- **登录 banner**：未登录（无 token / 401）时 Hero 上方出现「未登录 — 点击登录」（`pulse-login-banner`）→ 登录 BottomSheet（账号/密码）。
- **Hero**（index.tsx 内联）：问候两行（时间问候 + 用户名）+ AI 在场文案 `aiVoice`（在线「I've been keeping an eye on things for you.」/ 离线换离线文案）+ watching 行（`Watching N thing(s) for you ›`，testID `watching-line` → `/assignments`；WATCHING 只在 Hero 出现一次）。
- **presence 映射**：opencode/bff 离线 → `offline`；`openAttentions.length > 0` → `needs-you`；否则 `attentive`。
- **Featured**（`FeaturedItem`）：最多 **1** 条 attention（testID `featured-attention`）；lead「One thing needs you」+ AlertGlyph tile + 标题 + why + meta（source · time）；动作 = `Review` chip（→ `/attention/[id]`）+ `Discuss` TextAction（→ `/talk` 带上下文）。
- **Supporting**（`SupportingList`）：≤4 行（index.tsx `SUPPORTING_BUDGET` slice 后传入）；渲染为**四个语义 micro-group**（组标签 `Needs you · n` / `Suggested · n` / `Running · n` / `Market · n`，`type.label` 级别），固定顺序 NEEDS YOU → SUGGESTED → RUNNING → MARKET；行 = 语义 dot + statement（≤2 行）+ 动作 chips（testID 前缀 `supporting-ny-` / `supporting-sg-` / `supporting-run-` / `supporting-mkt-`）；已 confirm 的 suggestion 行只显示绿色「Watching」。溢出进「More (n)」（`supporting-more` → ListSheet）。
- **More projects (n)**（`supporting-more-projects`）：当天活跃之外的项目（idle）→ Projects sheet（ListSheet 复用，running+idle 全列，点行 → 项目 Talk）。
- **Noticed**：section micro-label「NOTICED」+ 溢出时「See All」（`noticed-see-all` → ListSheet）；行组件 `PulseNoticed`（dot + fact 单行 + 时间，testID `noticed-<id>`），点击 → `DetailSheet`（只读详情；Discuss 是唯一出口 → `/talk`）。
- **Conversation Entry**（`ConversationEntry`，底部固定 dock）：**不是 TextInput** —— 整个「+ Talk to Pulse…」胶囊与右侧渐变圆箭头都是 Pressable（"Enter Talk" not Send），→ `/talk`；Pulse 上唯一输入 affordance，真实输入只在 Talk。
- **Sheets**（全部 contextual，挂在 index.tsx）：`SettingsSheet`、`MemorySheet`（What I remember + Forget）、`KnowledgeSheet`（KB 检索 → OPEN `/kb/doc` / ASK ABOUT THIS）、`FundSheet`（MARKET 行 → 行情详情）、`DetailSheet`（Noticed 详情）、`ListSheet` ×3（Supporting 溢出 More / Projects / Noticed See All）、登录 `BottomSheet`。
- **空态**：在线且 featured/supporting/noticed 全空时一句安静提示「Nothing needs you right now.」（`pulse-empty`）。
- **错误行**：suggestion 错误（`pulse-suggestion-error`）与 project 错误（`pulse-error`，非离线时）内联展示。
- **动效**：Hero/Featured/Supporting/Noticed 各包一层 `AnimatedEntry`（index 0–3 stagger，fade+translateY，尊重 Reduce Motion）。
- **动作语义**：Review → `/attention/[id]`；Discuss → `/talk`（带上下文）；Confirm/Reject 是 suggestion 唯一推进路径（查看 ≠ 授权）。
- **离线**：orb 扁平灰（offline 态无 halo、无呼吸）；runtime 不可用不阻断首屏渲染。
- **预算为硬约束**：Featured ≤1 / Supporting ≤4 / Noticed ≤5，超出一律走溢出入口，不得突破。

## v0.1.1 及更早（历史）

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

Pulse 根界面（唯一表面）：问候 + AI 在场状态 + **AI briefing 组合**（Hero / Featured / Supporting / Noticed）
+ 底部 Conversation Entry + contextual sheets。卡片动作路由进 Talk 或详情屏。是产品核心页
（语义冻结基线 `docs/redesign/PRODUCT_MODEL.md`；迁移锁定决策 `docs/redesign/PRODUCTION_UI_MIGRATION_MAPPING.md`）。

## 入口文件

`agent-mobile-app/src/app/index.tsx`（Pulse 根界面；历史名 `(tabs)/index.tsx` / `pulse.tsx`）

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/app/index.tsx` | 页面：Header/登录 banner/Hero/Featured/Supporting/Noticed 组合 + 预算与溢出 + 错误行 + 全部 sheet 装配 |
| `agent-mobile-app/src/components/pulse/AIOrb.tsx` | 唯一发光元素；6 态 presence（attentive/engaged/thinking/noticed/needs-you/offline），呼吸 + noticed/needs-you 一次性 ping；size：dot(8)/avatar(28)/header(40)/hero(108)；Talk header 复用 |
| `agent-mobile-app/src/components/pulse/AIStatus.tsx` | 状态文字「● Attentive」等（11px 大写 + 1.32 字距）；Talk header 复用 |
| `agent-mobile-app/src/components/pulse/AnimatedEntry.tsx` | 首渲染 stagger（fade+translateY，Reduce Motion 兼容） |
| `agent-mobile-app/src/components/pulse/FeaturedItem.tsx` | Featured 卡（≤1）：lead + AlertGlyph tile + why + meta + Review/Discuss |
| `agent-mobile-app/src/components/pulse/SupportingList.tsx` | Supporting 四语义组渲染（组标签 · n + dot 行 + chips）；导出 `RunningRow`/`MarketRow` 类型 |
| `agent-mobile-app/src/components/pulse/PulseNoticed.tsx` | Noticed 行（dot + fact + 时间，informational） |
| `agent-mobile-app/src/components/pulse/ActionChips.tsx` | 动作原子：`InlineChip`（neutral/review/discuss）+ `ConfirmPill`（accent 渐变主作动）+ `TextAction`（安静文字） |
| `agent-mobile-app/src/components/pulse/PressableScale.tsx` | 按压缩放容器（行/胶囊通用） |
| `agent-mobile-app/src/components/pulse/ConversationEntry.tsx` | 底部「+ Talk to Pulse…」胶囊 + 渐变圆钮，均 Pressable → /talk（**非 TextInput**） |
| `agent-mobile-app/src/components/pulse/DetailSheet.tsx` | Noticed 只读详情（label/body/meta + Discuss；查看不改产品状态） |
| `agent-mobile-app/src/components/pulse/ListSheet.tsx` | 共享溢出面（More / Projects / Noticed See All），presentation only |
| `agent-mobile-app/src/components/pulse/SettingsSheet.tsx` | Settings：Responsibilities / Connection(+Advanced，BFF 地址探测与覆盖) / Preferences(按 agent model 偏好+嵌套 picker，过滤 deepseek、排除 openrouter/siliconflow-cn) / What I remember / Knowledge / Logout |
| `agent-mobile-app/src/components/pulse/MemorySheet.tsx` | What I remember（memx projection 只读 + Forget；capability 不是 destination） |
| `agent-mobile-app/src/components/pulse/KnowledgeSheet.tsx` | KB 检索 → preview → OPEN(`/kb/doc`) / ASK ABOUT THIS(Talk 带上下文) |
| `agent-mobile-app/src/components/pulse/FundSheet.tsx` | Market 行情详情（L1 estimate：estimatedNav · prev · ±%；只读无动作） |
| `agent-mobile-app/src/components/pulse/showcase-types.ts` | companion 视图层类型（PresenceState/NeedsYouItem/SuggestionItem/NoticedItem 等） |
| `agent-mobile-app/src/hooks/useAttentions.ts` | Attention hook：snapshot + product SSE attention.* + 重连对账（Featured 数据源） |
| `agent-mobile-app/src/hooks/useSuggestions.ts` | Suggestion hook：proposed 快照 + product SSE proposal.* + confirm/reject 转发 |
| `agent-mobile-app/src/hooks/useL1.ts` | L1 hook：snapshot + SSE + reconciliation；`funds`=行情投影、`noticed`=observation |
| `agent-mobile-app/src/hooks/useProjectEvents.ts` | 聚合 opencode 项目 + 会话 + 状态 + SSE 实时（RUNNING 行数据源） |

**未接入残留**（showcase2 移植带来、当前路由未引用；改动前先确认是否还需要）：`NoticedListSheet.tsx`（See All 实际走 ListSheet）、`AIComposer.tsx`、`ThinkingDots.tsx`、`ContextChip.tsx`、`ConversationMessage.tsx`；`components/navigation/` 下的 `Marquee.tsx` / `FundMarqueeItem.tsx` / `EventItem.tsx` 同属此类（仅 barrel 导出，无页面使用）。

## 页面结构（index.tsx，Companion IA）

```
View root（#0B0A12 + companion backgroundGradient + 顶部紫光 topGlow）
├── ScrollView（paddingBottom 130 给 dock 让位）
│   ├── header：AIOrb(header=40) + AIStatus + "Pulse" + [Settings 齿轮]
│   │            （pulse-orb / pulse-status / pulse-title / pulse-settings）
│   ├── 登录 banner（needLogin 时；pulse-login-banner → 登录 BottomSheet）
│   ├── AnimatedEntry(0) Hero：问候两行 + aiVoice + Watching N 行（watching-line → /assignments）
│   ├── AnimatedEntry(1) FeaturedItem（featured != null；featured-attention）
│   ├── AnimatedEntry(2) SupportingList ×≤4（supporting-ny-/sg-/run-/mkt-<id>；溢出 → supporting-more）
│   ├── More projects (n)（supporting-more-projects → Projects ListSheet）
│   ├── AnimatedEntry(3) Noticed 区（sectionLabel + noticed-see-all + noticed-<id> 行）
│   ├── pulse-empty（在线且全部为空）
│   ├── pulse-suggestion-error / pulse-error（条件内联错误行）
│   └── entryDock：ConversationEntry（conversation-entry，固定底部 → /talk）
└── Sheets（条件渲染）：SettingsSheet / MemorySheet / KnowledgeSheet / FundSheet
                       / DetailSheet（Noticed 详情） / ListSheet×3（More / Projects / Noticed）
                       / 登录 BottomSheet
```

**数据来源 → 区域映射**：

| 区域 | hook | 内容 |
|---|---|---|
| Featured | `useAttentions()` | 最高优先级 attention（≤1） |
| Supporting | `useAttentions()` + `useSuggestions()` + `useProjectEvents()` + `useL1().funds` | NEEDS YOU → SUGGESTED → RUNNING → MARKET（≤4） |
| Noticed | `useL1().noticed` | observation L1（≤5） |
| Hero watching | `useProjectEvents()` / assignments | `Watching N` 行 |

## Supporting 构成（SupportingList）

`SupportingList` 按四个语义桶渲染 micro-group（组标签 `Needs you · n` 等，`type.label` 级别）；
行 = 语义 dot + statement（≤2 行）+ 动作 chips：

- **NEEDS YOU**：dot=`attention`（amber）；chip `Review`；点行体 = Discuss。
- **SUGGESTED**：dot=`accent`（confirmed 后 `success`）；chips `Confirm`（InlineChip）+ `Dismiss`（TextAction）；confirmed 后仅剩绿色「Watching」字样。
- **RUNNING**：dot 按 status（running=`attention` / idle=`offline`）+ 行尾 Running/Idle；点行 → 项目 Talk。
- **MARKET**：dot=`noticed` + 行尾涨跌幅（红涨绿跌，中国约定）；点行 → FundSheet。

**MARKET L1 ≠ Attention**：MARKET 行是 informational 呈现，不产生 obligation、不进 Featured。
**Confirm/Reject 是 suggestion 唯一推进路径**；点行体/阅读/进 Talk 永不 confirm（查看 ≠ 授权）。

## 溢出与详情

- Supporting >4 → 「More (n)」→ `ListSheet`（完整列表，SupportingList 复用，顺序不变）。
- Noticed >5 → 「See All」→ `ListSheet`（PulseNoticed 行复用）；单条点击 → `DetailSheet`（Discuss 是唯一出口 → `/talk`）。
- 当天不活跃项目 → 「More projects (n)」→ Projects `ListSheet`（running+idle 全列）。
- Featured / Supporting 的 Review → `/attention/[id]`；Discuss → `/talk`（attention 上下文）。
- MARKET 行点击 → `FundSheet`；Responsibilities 列表在 `/assignments`。

## 基金事件流（2026-08-27 新增）

```
family-finance BFF /api/product/l1 + /api/product/l1/stream（L1 presentation，SSE + snapshot，JWT）
  └── L1 statement（market-estimate 每 5s：未归档基金实时估算）
        └── useL1 → funds[] → Supporting「MARKET」行 + FundSheet
```

- **services/l1.ts**：`fetchL1`（`/api/product/l1` snapshot）+ `subscribeL1`（`/api/product/l1/stream` SSE，每帧全量替换）+ `toMarketEstimate`（L1Statement → 跑马灯行情投影）。复用 `tokenHeader` JWT；断线指数退避重连；重连先 snapshot 对账。
- **hooks/useL1.ts**：snapshot + SSE + reconnect reconciliation；`statements`（全部 L1）+ `funds`（行情投影）。
- ~~Marquee 跑马灯呈现~~（已退役为未接入残留）：`components/navigation/Marquee.tsx` / `FundMarqueeItem.tsx` 仍存在但无页面引用（仅 barrel 导出）；当前行情呈现 = SupportingList MARKET 行 + FundSheet。若复用 Marquee，注意其 **web 滚动坑（2026-08-28）**：① `useNativeDriver` 按平台——web 必须 `false`（RN Web 的 Animated native driver 不更新 DOM transform，与 BottomSheet 黑框同源坑）；② `onLayout` 必须放在 **Animated.View**（内容）上测宽度，放外层容器会误判 contentWidth 过小导致 `shouldScroll` 恒 false、永不滚动。
- **行情显示**：MARKET 行尾显示 `±changePct%`（红涨绿跌）；FundSheet 行显示 `estimatedNav · prev prevNav · ±changePct%`，`prevNav` 来自 L1 statement data。
- **启动时 BFF 地址覆盖（2026-08-30，方案 C）**：启动 effect 先 `getRuntimeBaseUrl()`（AsyncStorage `pulse_bff_url`，Me 页写入）设 `opencodeConfig.runtimeBaseUrl`，**再** `loadToken()`+refresh；所有请求走 `getBaseUrl()`（覆盖优先回退 env）。运行中不热切，改地址重启生效。
- **SSE 首连提速（2026-08-28）**：`services/l1.ts` / `opencode-events.ts` 未登录等待 token 从固定 3000ms 改为 **300ms 短轮询**——SSE 订阅 mount 即启动，但 `loadToken()` 异步写内存 token 未完成时首连无 token，原等 3s 重试导致跑马灯比项目列表晚 3s；改后跑马灯 4.2s→1.7s，与项目列表几乎同步。
- 涨跌颜色：changePct>=0 用 `success`（红涨），否则 `error`（绿跌）——注意中国市场红涨绿跌约定。
- **L1 语义（Phase 10）**：L1 是 authorized informational presentation（PM §22）——无 lifecycle、无 obligation、不产生 Attention、无 badge。市场关闭 / 数据源失败 → BFF 不返回 stale statement（`items: []` → 跑马灯消失）。

## 状态判定优先级（project-status.ts，Phase 3 后）

```
1. 任一 session busy/retry → running（"Running"/"Retrying"）
2. 兜底                    → idle（中性呈现；绝不产生 needs-you / Attention / badge）
```

`ProjectStatus = "running" | "idle"`（旧的 pending/knownIdle → needs-you 派生路径已删除，「需要你」唯一来自 Attention store）。
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

- **预算是硬约束**：Featured ≤1 / Supporting ≤4 / Noticed ≤5；超出必须走「More」/「See All」sheet，不要在根界面堆列表。
- **Supporting 分组只到 micro 组标签**：分组仅由 `SupportingList` 的 groupLabel（`Needs you · n` 等，`type.label` 级别）表达，不得升级为区块大标题/分组卡片；桶顺序固定 NEEDS YOU → SUGGESTED → RUNNING → MARKET。
- **发光元素只允许 AIOrb 一处**；新组件不得自带 glow/pulse 动画。
- **语义色 ≠ 强调色**：dot 用 companion 语义色（attention/success/accent/offline/noticed，见 `theme/companion/colors.ts`），主作动 CTA 用 accent 渐变（`ConfirmPill` / ConversationEntry 圆钮），不要互换。
- **勿用 `project.time.updated` 判活跃**：其值被 watcher 污染，活跃度必须基于 `session.time.updated`。
- **`/session` 不带 directory 参数只返回默认工作区会话**：必须按项目 `directory` 分别查询。
- **MARKET 行数据源（Phase 10）**：`useL1.funds` 来自 `/api/product/l1`（L1 presentation），勿在前端硬编码基金列表；无活跃基金 / 市场关闭 / 数据源失败时 BFF 返回空（index 只在有 funds 时 push market 桶，区块不渲染）。
- **trade-alert 已退役**（Phase 7）：needs-you 语义只在 Attention store；行情只走 L1（无 obligation、无 badge）。
- **勿在 Pulse 上放聊天宿主**：Pulse 唯一输入 affordance 是 ConversationEntry，且它**不是 TextInput**（整个胶囊与圆钮只是进 Talk 的 Pressable），真实输入只在 `/talk` 渲染 ProjectChatZ。
- 单测：`src/services/project-status.test.ts`（9 例）。
