# modules/pulse-stream.md —— Pulse 根界面（AI 伴侣 briefing 单表面）

> 最后更新：2026-09-21 · commit：`feat/companion-ui-migration`（Companion UI Migration：Pulse 重写为 Hero/Featured/Supporting/Noticed + Conversation Entry；tab bar 与 Pulse 内聊天 sheet 已移除）

## ⚠️ Companion UI Migration（2026-09-21，当前形态）

Pulse 已从「五分组项目导航 + 全屏聊天 sheet」重写为**单表面 AI briefing**。以下为当前结构，旧分组描述保留在后文作历史参考。

- **Header**：左 `AIOrb`（唯一允许的发光元素）+ `AIStatus`（`● ATTENTIVE` 等）+ 标题「Pulse」；右 Settings 齿轮（`pulse-settings`）替代原 Bell。
- **Hero**（`PulseHero`）：时间问候 + AI 在场文案（`hero` 排版 token）+ watching 行（`Watching N` → `/assignments`；WATCHING 只在 Hero 出现一次）。
- **Featured**（`FeaturedAttention`）：最多 **1** 条 attention（`pulse-featured`）。
- **Supporting**（`SupportingRow`）：**单一区域、无分组标题**；行级 micro-label（`label` token）+ dot 色 + 动作名；固定顺序 NEEDS YOU → SUGGESTED → RUNNING → MARKET；最多 **4** 行，超出进「More」（`supporting-more` → ListSheet）。
- **Noticed**（`NoticedRow`）：最多 **5** 条，超出进「See All」（`noticed-see-all` → NoticedDetailSheet）。
- **Conversation Entry**（`ConversationEntry`，底部）：胶囊输入 + 发送 → `/talk`；Pulse 上唯一输入 affordance。
- **Sheets**（全部 contextual，挂在 index.tsx）：`SettingsSheet`（连接/账号/BFF 地址/model 偏好，含嵌套 model picker）、`MemorySheet`（What I remember）、`KnowledgeSheet`（KB 检索）、`FundSheet`（WATCHING 行 → 基金详情）、`ListSheet` / `NoticedDetailSheet`（溢出）。
- **空态**：无任何条目时 Hero 下一句安静提示「Nothing needs you right now.」（`pulse-empty`）。
- **动作语义**：REVIEW → `/attention/[id]`；Discuss → `/talk`（带上下文）；Mark handled 只在 Talk 内完成；Dismiss 在卡内。查看 ≠ 授权。
- **离线**：`pulse-orb-offline`（扁平灰）；runtime 不可用不阻断首屏渲染。
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
| `agent-mobile-app/src/app/index.tsx` | 页面：Hero/Featured/Supporting/Noticed 组合 + 预算与溢出 + 全部 sheet 装配 |
| `agent-mobile-app/src/components/pulse/AIOrb.tsx` | 唯一发光元素；presence→视觉状态映射（attentive/working/needs-you/offline） |
| `agent-mobile-app/src/components/pulse/AIStatus.tsx` | 状态文字（`● ATTENTIVE` 等，accentBright） |
| `agent-mobile-app/src/components/pulse/PulseHero.tsx` | Hero：问候 + AI 文案 + watching 行 |
| `agent-mobile-app/src/components/pulse/FeaturedAttention.tsx` | Featured 卡（≤1） |
| `agent-mobile-app/src/components/pulse/SupportingRow.tsx` | Supporting 行（micro-label + dot + 动作名 + chips） |
| `agent-mobile-app/src/components/pulse/NoticedRow.tsx` | Noticed 行（informational） |
| `agent-mobile-app/src/components/pulse/ConversationEntry.tsx` | 底部胶囊输入 + 发送 |
| `agent-mobile-app/src/components/pulse/Chips.tsx` | `ActionChip`（accent 主作动）+ `QuietAction`（次要） |
| `agent-mobile-app/src/components/pulse/ListSheet.tsx` | Supporting 溢出「More」 |
| `agent-mobile-app/src/components/pulse/NoticedDetailSheet.tsx` | Noticed「See All」 |
| `agent-mobile-app/src/components/pulse/FundSheet.tsx` | WATCHING 行 → 基金详情 |
| `agent-mobile-app/src/components/pulse/SettingsSheet.tsx` | Settings（连接/账号/BFF 地址/model 偏好，嵌套 model picker） |
| `agent-mobile-app/src/components/pulse/MemorySheet.tsx` | What I remember（REMEMBERS + forget） |
| `agent-mobile-app/src/components/pulse/KnowledgeSheet.tsx` | KB 检索 → `/kb/doc` |
| `agent-mobile-app/src/hooks/useAttentions.ts` | Attention hook：snapshot + product SSE attention.* + 重连对账（Featured 数据源） |
| `agent-mobile-app/src/hooks/useSuggestions.ts` | Suggestion hook：proposed 快照 + product SSE proposal.* + confirm/reject 转发 |
| `agent-mobile-app/src/hooks/useL1.ts` | L1 hook：snapshot + SSE + reconciliation；`funds`=行情投影、`noticed`=observation |
| `agent-mobile-app/src/hooks/useProjectEvents.ts` | 聚合 opencode 项目 + 会话 + 状态 + SSE 实时（RUNNING 行数据源） |

## 页面结构（index.tsx，Companion IA）

```
SafeAreaView (canvas)
├── header: AIOrb(56) + AIStatus + "Pulse"        + [Settings] (pulse-settings)
├── ScrollView
│   ├── PulseHero: greeting + aiLine + watching (Watching N → /assignments)
│   ├── pulse-empty（无任何条目时的安静提示）
│   ├── FeaturedAttention（featured != null；pulse-featured）
│   ├── Supporting ×≤4（supporting-sg-<id>；溢出 → supporting-more）
│   ├── Noticed ×≤5（noticed-<id>；溢出 → noticed-see-all）
│   └── ConversationEntry（conversation-entry：胶囊输入 + 发送 → /talk）
└── Sheets（条件渲染）：SettingsSheet / MemorySheet / KnowledgeSheet / FundSheet
                       / ListSheet / NoticedDetailSheet
```

**数据来源 → 区域映射**：

| 区域 | hook | 内容 |
|---|---|---|
| Featured | `useAttentions()` | 最高优先级 attention（≤1） |
| Supporting | `useAttentions()` + `useSuggestions()` + `useProjectEvents()` + `useL1().funds` | NEEDS YOU → SUGGESTED → RUNNING → MARKET（≤4） |
| Noticed | `useL1().noticed` | observation L1（≤5） |
| Hero watching | `useProjectEvents()` / assignments | `Watching N` 行 |

## Supporting 行构成（SupportingRow）

micro-label（`label` token：NEEDS YOU / SUGGESTED / RUNNING / MARKET）+ 语义 dot（status 色，非 accent）
+ 标题 + 说明 + 动作 chips（`ActionChip` 主作动 / `QuietAction` 次要）。
**MARKET L1 ≠ Attention**：MARKET 行是 informational 呈现，不产生 obligation、不进 Featured。

## 溢出与详情

- Supporting >4 → 「More」→ `ListSheet`（完整列表，行组件复用）。
- Noticed >5 → 「See All」→ `NoticedDetailSheet`。
- Featured / Supporting 的 REVIEW → `/attention/[id]`；Discuss → `/talk`（attention 上下文）。
- WATCHING 行点击 → `FundSheet`；Responsibilities 列表在 `/assignments`。

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

- **预算是硬约束**：Featured ≤1 / Supporting ≤4 / Noticed ≤5；超出必须走「More」/「See All」sheet，不要在根界面堆列表。
- **Supporting 是单一区域**：禁止加分组标题/分组卡片；区分只靠 micro-label + dot 色 + 动作名。
- **发光元素只允许 AIOrb 一处**；新组件不得自带 glow/pulse 动画。
- **语义色 ≠ 强调色**：dot/chip 用 `status.*`，主作动 CTA 用 `accent.*`，不要互换。
- **勿用 `project.time.updated` 判活跃**：其值被 watcher 污染，活跃度必须基于 `session.time.updated`。
- **`/session` 不带 directory 参数只返回默认工作区会话**：必须按项目 `directory` 分别查询。
- **跑马灯数据源（Phase 10）**：`useL1.funds` 来自 `/api/product/l1`（L1 presentation），勿在前端硬编码基金列表；无活跃基金 / 市场关闭 / 数据源失败时 BFF 返回空（区块不渲染）。
- **trade-alert 已退役**（Phase 7）：needs-you 语义只在 Attention store；行情只走 L1（无 obligation、无 badge）。
- **勿在 Pulse 上放聊天宿主**：Pulse 唯一输入是 Conversation Entry，进 `/talk` 才渲染 ProjectChatZ。
- 单测：`src/services/project-status.test.ts`（9 例）。
