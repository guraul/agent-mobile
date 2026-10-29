# modules/pulse-stream.md —— Pulse 根界面（AI 伴侣 briefing 单表面）

> 最后更新：2026-09-28 · **RN 浅色迁移（epic #7）A-G 完成、H 详情重做完成**（基准 `docs/pipeline/RN_MIGRATION_BRIEF.md`，D1-D10 决策）。当前形态以本节为准；下方 Companion 段及更早内容为历史参考。
> 2026-10-29：补 Noticed 两类（observation / retry-report）/ TodayDigest / Settings 三入口事实登记，见下方「事实登记（2026-10-29）」。
> 2026-10-29：market 同类合并（#140，呈现层）——见下方「事实登记（2026-10-29）· market 同域提醒合并」。

## 当前形态（2026-09-28 浅色 Companion，PR #16-#23）

```
登录 gate（D4）：未登录 / 401 → router.replace("/login")（独立登录页 app/login.tsx，
  cream + Welcome back + 白卡 Username/Password + LightPrimaryButton；已登录访问自动 back）
root（cream #F7F5DC 画布，页面水平 padding 25）
├── top-fixed（pinned，不随内容滚动）
│   ├── Header：LightPresenceDot 呼吸点（14px #5CBB63；offline 灰静止）+ presence 文字
│   │   （Attentive / Needs you / Offline，label 12/600 accent-deep，offline 灰）+
│   │   绝对居中标题 Pulse（page-title 24/700）+ 旧齿轮 → 旧 SettingsSheet
│   │   （D5 过渡期保留——唯一有意偏离 mock 之处，等 chat 侧设置面板落地后删）
│   └── Hero：单行问候（display 26/400 lh1.24；本地时间 + 用户名，React #418 guard 保留）；
│       aiVoice 仅离线渲染（D7 红线）："I'm having trouble reaching my runtime."
├── ScrollView 内容区（pt14 / pb128）
│   ├── TodayDigest（可选一行）：她今天替你做了什么（12/400 #6F6F6F + 低调 chevron）→
│   │   ActivitySheet（days=1「今天」）；无数据/页满截断/失败都不渲染
│   ├── Featured（FeaturedItem 或 MarketGroupItem，≤1 个**渲染单元**）：白卡整卡 Pressable → /attention/[id]（D10：无 lead、
│   │   无行内 chips——Review/Discuss 收进详情页）；铃铛 16px #D97706 + 标题 17/700 +
│   │   why 灰底块（15/400 #2A2A2A）+ meta（source · time）
│   ├── In motion（SupportingList = 单张绿卡 #B2D7B5）：标题 [ In motion ]（方括号 400 字重）+
│   │   四组条目（#C8EBCB 圆角 15，固定顺序 To review → Suggested → Running → Market，
│   │   组标签 11.5px #233323 + 13px 线性图标 eye/lightbulb/activity/trending-up；
│   │   条目标题 14/600 #101710 ellipsis，字值有意偏离 7-token——D1）；
│   │   行内动作：To review → chip "Review"；Suggested → chip "Confirm" + quiet "Dismiss"
│   │   （confirmed 只剩绿 Watching）；Running → meta；Market → 涨跌（红涨绿跌）；
│   │   标题可点路由 D8 判据；≤4 溢出 More (n) → ListSheet；Confirm/Reject 唯一推进路径（D9）
│   ├── Noticed ghost 卡（透明底 + 1.5px dashed 绿边圆角 24）：组标签 "Noticed" + See All
│   │   （溢出 → ListSheet）；行 = 绿点 6×6 + fact 15/400 + time 12 gray（min-h 44，
│   │   行间 divider）；点行 → DetailSheet（只读；Discuss 唯一出口 → /talk）
│   ├── 空态（D7）：在线且三区全空 → aiVoice "All's been calm while you were away." +
│   │   "Nothing needs you right now."（pulse-empty）
│   └── 错误行 ×2（12 #E5484D）：suggestion 错误（pulse-suggestion-error）/ project 错误
│       （pulse-error，非离线时）
├── Dock（bottom 50）：LightDock "Start New Chat"（黑底 pill + 白字 + 桃色箭头 +
│   chat FAB halo）整颗 → /talk（路由参数不变，D8）；**非 TextInput**
└── Sheets：FundSheet / DetailSheet / ListSheet ×2 → **LightSheet 浅色原语**
    （scrim rgba(10,10,10,.45) + 白卡顶圆角 28 + handle）；SettingsSheet / MemorySheet /
    KnowledgeSheet → 旧 BottomSheet 暗色（D5 过渡保留，chat 批次迁移）
```

- **presence 映射不变**：opencode/bff 离线 → offline；openAttentions.length > 0 → needs-you；否则 attentive。
- **attention 详情**（`/attention/[id]`，pulseB-review 基准）：Related responsibility 卡（resp-body + ACTIVE pill）→ Evidence 卡（ev-row 灰底行：type·attempt·time + error）→ 页脚注 "Viewing never changes state."；底部**紫渐变 dock**（Open Talk，路由 D8）+ 弱化 Dismiss/Retry 压 pill 左侧（D9：Dismiss Alert 二次确认）；**主卡已删**（与 Featured 重复）。
  - **凭据到期事项动作（#96，ref agent-mobile#91）**：`subjectKind === "credential"`（域 `personal`、`sessionId=null`）的事项，dock 主按钮换成「重发二维码」（testID `attention-renew`）→ `POST /api/product/attention/:id/renew`（**依赖 homebase 片 1**）→ 成功：本地视为已关闭 + 一行反馈 `attention-renew-notice`（"已发送二维码到企业微信…10 分钟未扫会再提醒你"），按钮转 "已重发" 不可重复点；失败：错误行 + 按钮保持可点（不静默）。**Open Talk 对这类事项隐藏**（sessionId=null 且非 market 会走 `services/attention/talk.ts` 抛「该事项的会话已不可用」）。判据纯函数在 `services/attention/store.ts`：`isCredentialItem` / `attentionActionFlags`（普通事项行为不变）。
- **动效**：AnimatedEntry stagger 保留（Reduce Motion 兼容）；呼吸点 reanimated withRepeat（Reduce Motion 兼容）。
- **预算为硬约束**：Featured ≤1 / Supporting ≤4 / Noticed ≤5。
- **动作语义红线不变**：查看 ≠ 授权；Confirm/Reject 是 suggestion 唯一推进路径；破坏性动作（Dismiss）弱化 + 二次确认（D9）。
- **testID 兼容**：pulse-title / pulse-status / pulse-orb / pulse-settings / pulse-today-digest / featured-attention / supporting-ny-/-sg-/-run-/-mkt-/-mg- / pulse-market-group（组容器）/ pulse-market-group-item（展开项）/ supporting-more / noticed-<id> / noticed-see-all / pulse-empty / pulse-suggestion-error / pulse-error / conversation-entry / fund-row-<code> 全保留；已删：pulse-login-banner、watching-line、supporting-more-projects、attention-detail-main。

## Companion 暗色形态（2026-09-21 引入，迁移前，历史参考）

- **Header**（index.tsx 内联，无独立组件）：左 `AIOrb`（`size="header"`=40，唯一允许的发光元素，testID `pulse-orb`）+ `AIStatus`（`● Attentive` 等，testID `pulse-status`）+ 标题「Pulse」（`pulse-title`）；右 Settings 齿轮（`pulse-settings`）→ SettingsSheet。
- **登录 banner**：未登录（无 token / 401）时 Hero 上方出现「未登录 — 点击登录」（`pulse-login-banner`）→ 登录 BottomSheet（账号/密码）。
- **Hero**（index.tsx 内联）：问候两行（时间问候 + 用户名）+ AI 在场文案 `aiVoice`（在线「I've been keeping an eye on things for you.」/ 离线换离线文案）+ watching 行（`Watching N thing(s) for you ›`，testID `watching-line` → `/assignments`；WATCHING 只在 Hero 出现一次）。
- **presence 映射**：opencode/bff 离线 → `offline`；`openAttentions.length > 0` → `needs-you`；否则 `attentive`。
- **Featured**（`FeaturedItem`）：最多 **1** 条 attention（testID `featured-attention`）；lead「One thing needs you」+ AlertGlyph tile + 标题 + why + meta（source · time）；动作 = `Review` chip（→ `/attention/[id]`）+ `Discuss` TextAction（→ `/talk` 带上下文）。
- **Supporting**（`SupportingList`）：≤4 行（index.tsx `SUPPORTING_BUDGET` slice 后传入）；渲染为**四个语义 micro-group**（组标签 `Needs you · n` / `Suggested · n` / `Running · n` / `Market · n`，`type.label` 级别），固定顺序 NEEDS YOU → SUGGESTED → RUNNING → MARKET；行 = 语义 dot + statement（≤2 行）+ 动作 chips（testID 前缀 `supporting-ny-` / `supporting-sg-` / `supporting-run-` / `supporting-mkt-`）；已 confirm 的 suggestion 行只显示绿色「Watching」。溢出进「More (n)」（`supporting-more` → ListSheet）。
- **More projects (n)**（`supporting-more-projects`）：当天活跃之外的项目（idle）→ Projects sheet（ListSheet 复用，running+idle 全列，点行 → 项目 Talk）。
- **Noticed**：section micro-label「NOTICED」+ 溢出时「See All」（`noticed-see-all` → ListSheet）；行组件 `PulseNoticed`（dot + fact 单行 + 时间，testID `noticed-<id>`），点击 → `DetailSheet`（只读详情；Discuss 是唯一出口 → `/talk`）。
- **Conversation Entry**（`ConversationEntry`，底部固定 dock）：**不是 TextInput** —— 整个「+ Talk to Pulse…」胶囊与右侧渐变圆箭头都是 Pressable（"Enter Talk" not Send），→ `/talk`；Pulse 上唯一输入 affordance，真实输入只在 Talk。
- **Sheets**（全部 contextual，挂在 index.tsx）：`SettingsSheet`、`MemorySheet`（What I remember + Forget）、`KnowledgeSheet`（KB 检索 → OPEN `/kb/doc` / ASK ABOUT THIS）、`BoundariesSheet`（Settings「How we work together」→ 三层自主边界；仅 Acts 层 Nightly retry 有开关）、`CalendarSheet`（Settings「External sources → Calendar」→ ICS 只读订阅：打码 URL + 删除确认 + 底部加源）、`FundSheet`（MARKET 行 → 行情详情）、`DetailSheet`（Noticed 详情）、`ListSheet` ×3（Supporting 溢出 More / Projects / Noticed See All）、登录 `BottomSheet`。
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
| `agent-mobile-app/src/components/pulse/TodayDigest.tsx` | Pulse 顶部一句话（她今天替你做了什么）：只读取数 + AppState active 刷新；无数据/截断/失败不渲染 |
| `agent-mobile-app/src/components/pulse/SupportingList.tsx` | Supporting 四语义组渲染（组标签 · n + dot 行 + chips）；导出 `RunningRow`/`MarketRow` 类型 |
| `agent-mobile-app/src/components/pulse/PulseNoticed.tsx` | Noticed 行（dot + fact + 时间，informational） |
| `agent-mobile-app/src/components/pulse/ActionChips.tsx` | 动作原子：`InlineChip`（neutral/review/discuss）+ `ConfirmPill`（accent 渐变主作动）+ `TextAction`（安静文字） |
| `agent-mobile-app/src/components/pulse/PressableScale.tsx` | 按压缩放容器（行/胶囊通用） |
| `agent-mobile-app/src/components/pulse/ConversationEntry.tsx` | 底部「+ Talk to Pulse…」胶囊 + 渐变圆钮，均 Pressable → /talk（**非 TextInput**） |
| `agent-mobile-app/src/components/pulse/DetailSheet.tsx` | Noticed 只读详情（label/body/meta + Discuss；查看不改产品状态） |
| `agent-mobile-app/src/components/pulse/ListSheet.tsx` | 共享溢出面（More / Projects / Noticed See All），presentation only |
| `agent-mobile-app/src/components/pulse/SettingsSheet.tsx` | Settings：Responsibilities(只读投影列表 + `/assignments` 管理入口；同区块另有 What I've been doing / How we work together 两行) / Connection(+Advanced，BFF 地址探测与覆盖) / External sources(Calendar 行：未连/首条 label·打码 URL/n 个) / Preferences(按 agent model 偏好+嵌套 picker，过滤 deepseek、排除 openrouter/siliconflow-cn) / What I remember / Knowledge / Logout |
| `agent-mobile-app/src/components/pulse/CalendarSheet.tsx` | Calendar（ICS 只读订阅，issue #153 切片 3b）：源列表（打码 URL + `Trash2` 删除，`showAlert` 二次确认）、底部输入框加源（前端 https + `.ics` 基本校验）、错误只占一行（`calendar-error`，不弹窗）；增删后回调 Settings 行刷新摘要 |
| `agent-mobile-app/src/components/pulse/MemorySheet.tsx` | What I remember（memx projection 只读 + Forget；capability 不是 destination） |
| `agent-mobile-app/src/components/pulse/KnowledgeSheet.tsx` | KB 检索 → preview → OPEN(`/kb/doc`) / ASK ABOUT THIS(Talk 带上下文) |
| `agent-mobile-app/src/components/pulse/BoundariesSheet.tsx` | How we work together（Settings 入口）：三层自主边界（Acts, then tells you / Asks first / Never）；层名用 `StatusPill`，逐条「标题 + 当前实际行为」。**唯一可调项** = Acts 层的 Nightly retry（`Switch`，进 sheet 读 `GET /api/scheduler/jobs`，切换乐观更新、失败回滚 + `showAlert`）；其余条目只读 |
| `agent-mobile-app/src/services/agency/boundaries.ts` | 自主边界**唯一事实源**（`BOUNDARY_TIERS`：三层 + 条目 i18n key + tone）。⚠️ 边界变更必须同步此文件；UI 只渲染、不复制内容 |
| `agent-mobile-app/src/services/agency/scheduler-toggle.ts` | Nightly retry 开关的 BFF 客户端：`fetchNightlyRetryEnabled`（jobs 里取 `nightly-retry.enabled`）、`setNightlyRetryEnabled`（`POST /api/scheduler/nightly-retry/start\|stop`）、`toggleNightlyRetry`（乐观更新 + 失败回滚）。只碰这一个 job |
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
└── Sheets（条件渲染）：SettingsSheet / MemorySheet / KnowledgeSheet / BoundariesSheet / CalendarSheet / FundSheet
                       / DetailSheet（Noticed 详情） / ListSheet×3（More / Projects / Noticed）
                       / 登录 BottomSheet
```

**数据来源 → 区域映射**：

| 区域 | hook | 内容 |
|---|---|---|
| Featured | `useAttentions()` | 最高优先级 attention（≤1） |
| Supporting | `useAttentions()` + `useSuggestions()` + `useProjectEvents()` + `useL1().funds` | NEEDS YOU → SUGGESTED → RUNNING → MARKET（≤4） |
| Noticed | `useL1().noticed` | L1 `observation` + `retry-report`（≤5） |
| Hero watching | `useProjectEvents()` / assignments | `Watching N` 行 |

### 事实登记（2026-10-29）：Noticed 两类 / TodayDigest / Settings 三入口

- **Noticed 只收两种 L1 kind**：`observation` 与 `retry-report`（`hooks/useL1.ts` 的 `noticed` 过滤）。
- **`retry-report` 只在 L1 snapshot 里出现**：它是 homebase `agent_reports` 的持久化夜间补跑报告，SSE `/api/product/l1/stream` 全量帧不含。
- **SSE 帧必须并回未过期的 `retry-report`**：`useL1.apply` 把上一状态里 `expiresAt === null || expiresAt > now` 的 retry-report 并回全量帧，否则下一帧就把它冲掉（#146）。
- **冷启动先补 `loadToken()` 再拉 snapshot**：`useL1.refresh` 自己补一次 token，否则首帧无 token 跳过 snapshot，只在 snapshot 出现的 retry-report 永远拿不到（#148）。
- **retry-report 文案由 BFF 生成**：`homebase packages/web/lib/product/l1-rules.ts` 的 nightlyRetry rule，App 原样透传、不拼句。
- **BFF 还有第三类 L1 `kind: "calendar"`**（`ics-sync` handler 每 30 分钟产「今天剩余事件」，35 分钟 TTL，内存态不落库）；`agent-mobile-app/src/services/l1.ts` 的 `L1Kind` 尚未纳入、`noticed` 过滤不含它 → **Pulse 当前不渲染 calendar**（缺口，勿写成已上线）。
### 事实登记（2026-10-29）：market 同域提醒合并（#140）

- **合并是视图，不是新产品对象**：`attention_items` 仍是 N 行、无迁移、无 API 变更、不写 Event（施工卡 `docs/pipeline/MARKET_ALERT_GROUPING_CARD.md` §3）。
- **合并键**：`domain=market` ∧ `creationReasonRef` 相同 ∧ `expiresAt` 相同 → `market:{reasonRef}:{expiresAt}`（不跨授权、不跨窗口、不跨域；`expiresAt=null` 永不合并）。
- **纯函数**：`services/attention/grouping.ts` 分两层——`groupMarketAttentions(items) → { groups, singles }`（分组语义，纯数据：`key` / `reasonRef` / `expiresAt` / `items`，组内 `createdAt` 升序）+ `unitsFromGrouping(grouping, order) → PulseUnit[]`（渲染单元，`attention` | `market-group`，组带 `count` / `members`）。N=1 不进 groups、原样留在 singles；组占**最新成员**的位置；单元内成员按 `createdAt` 降序。
- **`PulseAttentionItem` 新增 `expiresAt`**（`services/attention/store.ts`）：分组需要窗口；视图模型其他字段不变。
- **预算按单元计**：`index.tsx` 的 `units` memo 先 `groupMarketAttentions(openAttentions)` 再 `unitsFromGrouping(...)` 排队，Featured ≤1 / Supporting ≤4 数的是**渲染单元**，这才是"腾首屏位子"的来源。分组抛错 → fail-open 退回 `openAttentions.map(attentionUnit)`（合并永远不能吃掉条目）。
- **组件**：`components/pulse/MarketGroupItem.tsx`，`variant="featured"`（白卡 + 琥珀铃铛）/ `"supporting"`（绿卡内条目）；testID `featured-attention`（组在 Featured 位时）/ `supporting-mg-<groupKey>`，成员 `-member-<id>`、展开开关 `-toggle`、溢出 `-more`。**e2e 稳定钩子**：组容器 `pulse-market-group`、展开项 `pulse-market-group-item`（与上面按实例派生的 testID 并存，互不影响）。
- **文案**：标题 `{count} funds crossed the targets you set.`（计数在标题里，永不说 "one"）/ 副标题 `Today's check — kept together.` / `Show {count} details` / `+{count} more` / a11y `Review {count} market alerts from today's check`（`i18n` key 前缀 `pulse.marketGroup.`）。**不出现 "I merged"**。
- **只展开，不做批量动作**：无组级 Dismiss / Handle（PM §17 生命周期仍 per-item）。展开前 5 条 + `+N more`，一条不丢。

- **TodayDigest 位置/入口**：`components/pulse/TodayDigest.tsx`，Pulse ScrollView 第一行（Hero 之下），testID `pulse-today-digest`；点击 → `ActivitySheet` 的 `days={1}`「今天」模式。
- **TodayDigest 取数**：`fetchAgentActivity(1, 50)`（`GET /api/product/agent-activity?days=1&limit=50`），只读，不改任何执行权。
- **TodayDigest 口径**：本地时区当天 00:00 起、outcome ∈ {`evaluated`,`matched`,`failed`}；文案失败优先 → 命中 → all clear（`buildTodayDigestText`）。
- **TodayDigest 渲染门槛**：`buildTodayDigest` 返回 `null` 就整行不渲染——一页取满 50 条（可能被截断）或今天没有可计执行，均不占位。
- **TodayDigest 失败静默**：读失败最多再试 1 次（800ms 后），仍失败保持不渲染；`AppState` 变 `active` 时重刷。
- **Settings「Responsibilities」区块**：只读投影 `buildResponsibilities(assignments, proposals, lastRunByAssignment)`（active assignment + proposed proposal）；`settings-responsibilities` 行 → `/assignments` 管理页，assignment 行 → `/assignments/[id]`，提案行不可点（详情页只认 `asg_`）。
- **Settings「How we work together」入口**：`settings-boundaries` 行 → `BoundariesSheet`（三层边界；唯一可调项 Nightly retry）。
- **Settings「Calendar」入口**：External sources 区块的 `settings-calendar` 行 → `CalendarSheet`（ICS 只读订阅）；行摘要 = 未连 / 首条 label·打码 URL / n 个 / 读失败「暂时读不到」。
- **日历与职责互不阻塞**：ICS 读失败只影响 Calendar 一行；增删后 `reloadIcs()` 只刷日历一行，不重拉 agents / 职责。

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
homebase BFF /api/product/l1 + /api/product/l1/stream（L1 presentation，SSE + snapshot，JWT）
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
