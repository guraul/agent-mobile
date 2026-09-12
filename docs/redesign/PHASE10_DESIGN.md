# PHASE10_DESIGN.md —— L1 Presentation + Notification / Delivery Layer（Phase 10 设计）

> 状态：**设计定稿 + 已实现（Phase 10 Implementation）**。本文为设计依据；实现清单与结果见最终报告。
> 语义来源：`PRODUCT_MODEL.md`（冻结，PM §n 引用，重点是 §20/§22/§16.2/§17）；架构来源 `IMPLEMENTATION_MODEL.md`、`FINAL_ARCHITECTURE.md`。
> 基线：Phase 1–9 完成；Event/Attention/Assignment/Pulse/Talk/Handling/Memory/KB 已建立；Phase 9 User Trust Layer 已落地。
> 本轮：**只做设计**，把 L1 presentation governance 与 Notification/Delivery 层语义彻底定清。不写代码。

---

## 0. 核心原则（贯穿全文）

```text
Event ≠ L1
L1 ≠ Attention
Attention ≠ Notification
Pulse ≠ Delivery
Notification delivery ≠ Event persistence
```

以及（PM §22 引用的硬约束）：

> **Not Attention ≠ automatically speakable.** An Event alone never authorizes an L1 statement; a fact has no voice until an authority lets Pulse speak it.

> **Attention creation authority ≠ L1 presentation authority ≠ persistence authority.**

---

## 1. Current State（现状盘点）

### 1.1 BFF 现状

| 组件 | 文件 | 现状 |
|---|---|---|
| 产品事件 | `lib/product/events.ts` | `product_events` 表，append-only，`INSERT OR IGNORE` 幂等，`list()` 支持 subject/type/since/until 过滤 |
| EventIngestor | `lib/product/event-ingestor.ts` | validate → persist → evaluate（规则层）；无 HTTP 暴露（客户端不能创建 Event） |
| 规则注册表 | `lib/product/rules.ts` | 代码内注册（不建表）：`permissionBlocking`、`marketTargetNavThreshold`；`market.rule.evaluated` 显式登记为"恒不建 item" |
| Attention | `lib/product/attention-*.ts` | `attention_items` canonical；`attention_evidence`；`attention_interactions`（viewed/opened/engaged）；OPEN→HANDLED/DISMISSED/EXPIRED |
| L1 数据面 | `app/api/events/stream/route.ts` | **LEGACY**：唯一职责 = `fund.estimate`（5s 轮询行情 + heartbeat）；trade-alert 派生已退役 |
| scheduler | `lib/scheduler/handlers/fund-estimation.ts` | **现状耦合**：handler 内先入库 `market.rule.evaluated/matched`，再 **best-effort 直接调用** email/wework/wechat 三通道 |
| 通知服务 | `lib/emailService.ts` / `lib/weworkService.ts` / `lib/weChatService.ts` | 各自独立函数 `sendFundNotificationEmail/ToWeWork/ToWeChat(funds)`，参数为 `FundEmailData & FundNotifyData[]`（基金专属形状） |
| product SSE | `app/api/product/stream/route.ts` | 只广播 `attention.created/updated`（`attentionEmitter`） |
| 认证 | `lib/auth-shared.ts` | JWT Bearer（`requireAuthHeader`），CORS 白名单 9928 三 origin |

### 1.2 Mobile 现状

| 组件 | 文件 | 现状 |
|---|---|---|
| Pulse 首页 | `src/app/(tabs)/index.tsx` | Needs you（Attention open）+ Today（项目）+ Market（`FundMarqueeItem` 跑马灯 + BottomSheet 行情明细） |
| 基金行情 hook | `src/hooks/useFundEvents.ts` | 订阅 `/api/events/stream`，消费 `fund.estimate`，更新 `funds[]` |
| 基金事件 client | `src/services/fund-events.ts` | SSE 订阅 + 指数退避重连；只解析 `fund.estimate` |
| Attention store | `src/services/attention/store.ts` | REST snapshot + product SSE 增量 + 重连对账；`openPulseItems` = state==='open' |
| 行情 UI | `src/components/navigation/FundMarqueeItem.tsx` | 与 EventItem 同视觉；StatusPill 恒 `idle "Watching"`；onPress → fund sheet |

### 1.3 已冻结文档的既有裁决

- `IMPLEMENTATION_MODEL §11`：目标边界 = Event → { Attention (L2/L3) | L1 presentation | optional delivery }；"现有 `fund.estimate` 5s 推送 → 重分类为 **L1 presentation** 的数据源（有 named standing rule 授权的行情信息面）"。
- `FINAL_ARCHITECTURE §2`：Pulse = presentation only，**无持久化**。
- `FINAL_ARCHITECTURE §3`：`/api/events/stream` = deprecated 保留，**Removal condition** = mobile 切换到专用 L1 端点或并入 `/api/product/stream`。
- `BACKLOG RT-1`：`GET /api/product/market/estimates` 端点化。
- `BACKLOG Future`：`L1 speaking rule 清单化`、`Notification delivery 队列`。
- `PRODUCT_MODEL §22`：L1 = statement，无 obligation、无 lifecycle；source authority = named rule / permitted observation / explicit instruction（三者**授权 presentation 而非 item creation**）。

---

## 2. L1 Runtime Model

### 2.1 L1 不是 canonical entity

**结论：L1 不建立 canonical database entity。** 不建 `l1_items` 表。

L1 是 **presentation**：由已存在的 Event（fact）经 authorized presentation rule 实时投影成用户可见 statement。它没有：
- lifecycle（无 open/handled/dismissed/expired）
- obligation（从不要求用户行动）
- 独立持久化（事件已是事实源）

运行时模型：

```text
Event / deterministic data source
        ↓
authorized PresentationRule（code/config registry）
        ↓
L1 presentation（实时投影，Pulse 渲染；可选 delivery）
```

### 2.2 为什么不需要独立 persistence

| 需求 | 是否要求持久化 | 说明 |
|---|---|---|
| Pulse 渲染当前 statement | 否 | 实时投影：读事件/数据源即可 |
| 历史 | 否 | `product_events` 已是 fact 源；L1 是派生视图 |
| 去重 | 部分 | 由频率策略（§6）在投影时计算，不存状态 |
| delivery dedup | **由 delivery 层持有** | 见 §11/§12（delivery_jobs 是 infra 记录，非 L1 entity） |

**唯一例外场景**：若未来需要"用户离开后仍可查看某条 L1"（如 briefing 历史），直接查 `product_events` 即可，仍不建 L1 表。

---

## 3. L1 Source Authority（PresentationRule）

### 3.1 先判断是否需要独立对象

**结论：不需要 database entity，也不需要独立 runtime 对象。采用 code/config registry（与 attention `rules.ts` 同模式）。**

理由：
- 与 Attention rule 注册表（`lib/product/rules.ts`）同构——代码内注册，`ruleId` 稳定，不引第二套 id。
- L1 目前只有少量来源类（fund.estimate、commission 播报、未来 observation），代码注册足够。
- 强制"Attention 授权 ≠ L1 授权"：两者是**不同的注册表**，天然隔离。

### 3.2 PresentationRule 最小形态（设计）

```ts
// lib/product/l1-rules.ts（Phase 10 实现时新增；本轮只定形状）
export interface L1Rule {
  ruleId: string;                       // 稳定 id，如 "l1.market.estimate"
  speaks: (source: L1Source) => boolean; // 该来源是否有权被说
  render: (source: L1Source) => L1Statement | null; // 投影成 statement；null = 不值得说
  // frequency/dedup/freshness 归属策略层（§6），可由 rule 声明 window
  window?: { kind: "trade-day" | "statement-id" | "none"; key: string };
}
```

- `L1Source` = 一个事件（`ProductEventRow`）或一个 deterministic data source（如当前实时估算值，**未持久化为 product Event**）。
- `L1Statement` = 用户可见的呈现单元（id、text、kind、occurredAt、sourceRef），**无 state**。

### 3.3 Authority 分离（关键）

```text
same Event
   ├─→ Attention（若 authorized handling rule 命中）—— rules.ts
   └─→ L1（若 authorized presentation rule 命中）—— l1-rules.ts
```

- 能建 Attention ≠ 能说 L1；能说 L1 ≠ 能建 Attention。
- 例：`market.rule.matched` 事件 → Attention（threshold 规则）；`fund.estimate`（实时值）→ L1（named standing rule）。两者互不 imply。
- **Negative 登记**：`market.rule.evaluated` 已是"恒不建 Attention"；L1 侧同样需要 negative 登记（哪些事件/数据**没有** speaking authority → 不呈现）。

### 3.4 当前来源类 → L1 授权（映射草稿）

| 来源 | L1 授权 | 依据 |
|---|---|---|
| `fund.estimate`（实时估算，5s，不入 product_events） | **有** — named standing rule `l1.market.estimate` | PM §22 表格："Fund estimate / market information → L1 under a named standing rule" |
| `market.rule.matched`（已入 event） | 本身不是 L1；其 Attention 是 L2。实时估值走上一行 | Attention vs L1 分离 |
| commission 完成（delegated work，无 reporting clause） | **有** — under the commission itself（无额外 registry） | PM §22："may be spoken as L1 under the commission itself" |
| OpenCode session 启动 / runtime noise | **无** | PM §22 表格："nothing — an Event with no speaking authority is not presented" |
| permission 请求 | **永不 statement**（是 Attention） | PM §22 |
| Agent Observation（Phase 10 不实现） | 保留挂载点 | PM §19/§22，未来 |

---

## 4. Fund Estimate 重设计

### 4.1 现状问题

`fund.estimate` 走 `/api/events/stream`，BFF 每 5s **现算**（`calculateFundEstimation`）推给 Pulse 跑马灯。**不入 `product_events`**（当前代码注释明确："fund.estimate（5s L1 数据面）不入库；入库的是 market.rule.evaluated / matched"）。

### 4.2 裁决

- **fund.estimate 不应成为 product Event。** 理由：
  - Event = fact（PM §15），append-only、审计级。每 5s 一条全量估值 = 高频噪音，违背"不是所有 runtime data 都是 product Event"原则。
  - 估算是 **deterministic data source**（外部 API 的实时投影），不是事实日志的候选。
  - 它有 freshness（5s 过期），天然是"当前状态"而非"曾发生"。
- **归属**：属于 **runtime presentation data**（进程内缓存 / 或 future 轻量 KV），由 L1 rule `l1.market.estimate` 投影成 statement。
- **是否持久化估算快照**：MVP 不持久化（内存最新一轮即可）；future 若需要"收盘时点快照"，已有 `market.rule.evaluated`（14:50 定时任务，daily audit）兜底——它是 product Event，覆盖"今天估值曾是多少"的审计需求。

### 4.3 新链路

```text
fundService.calculateFundEstimation()   （deterministic data source，5s 现算）
        ↓
L1 rule l1.market.estimate（authorized）
        ↓
L1 statement（Pulse 跑马灯渲染；fund sheet 明细）
```

- 不经过 EventIngestor、不经过 Attention。
- 仍支持 SSE（见 §5）。

---

## 5. L1 API

### 5.1 端点裁决

从 `/api/events/stream` 迁出，建立专用 product-facing L1 端点。**最小 API surface**：

| 端点 | 方法 | 用途 | 性质 |
|---|---|---|---|
| `GET /api/product/l1` | GET | **snapshot**：当前所有 authorized L1 statements（一次性拉取，Pulse 首屏/重连对账） | 只读 |
| `GET /api/product/l1/stream` | GET | **SSE**：L1 增量（新 statement / 更新的估值 / statement 过期移除） | 只读，增量 |

> 命名裁决：用 `/api/product/l1`（语义精确 = L1 interaction level），**不**用 `/api/product/presentations`（太泛）或 `/api/product/market/estimates`（锁死 market，L1 不止行情）。`/api/product/l1` 保留给未来 commission 播报、observation statement。

### 5.2 接口形状（设计）

**snapshot** `GET /api/product/l1`：
```json
{ "items": [ { "id", "kind", "text", "occurredAt", "sourceRef", "expiresAt"? } ] }
```
- 无 `open/handled/dismissed`——L1 无 lifecycle（§2）。
- `expiresAt` 仅在 rule 声明 window 时出现（如交易时段收盘、briefing 有效期），用于客户端移出过期 statement（**不是 state 迁移**）。

**incremental** `GET /api/product/l1/stream`（SSE）：
```text
event: message
data: { "kind": "l1.updated", "at": <ts>, "items": [...] }   // 该时点全部生效 statement（全量替换语义）
```
- **决策：SSE 用"每帧全量替换"而非逐条增删。** 理由：L1 是低数量级（几条）、高频估值（5s）的 presentation——逐条 diff 复杂度高、收益低；每帧推"当前全部生效 statement"最简且天然一致（客户端无 diff 状态机）。这符合"Pulse 是 presentation，无持久化"（客户端缓存投影，全量替换即对账）。
- 不引入"statement 事件 id"的增删协议。

### 5.3 为什么这样设计

- **snapshot + stream 分离**：snapshot 供首屏/重连（对账）；stream 供实时。与 Attention 的 `GET /api/product/attention` + `/api/product/stream` 同构。
- **无生命周期**：不伪造 open/handled/dismissed。
- **未来扩展**：briefing/digest 可以是 `GET /api/product/l1?kind=briefing`（策略层再定，本轮只定形状）。

---

## 6. L1 Frequency / Briefing（策略层最小 runtime policy）

PM 把 L1 频度/形态留给策略层。本轮设计**最小 policy**（可扩展，不做推荐算法）。

### 6.1 支持的形态

| 形态 | 触发 | 示例 |
|---|---|---|
| **single statement** | rule 命中即呈现 | 一条"XX 估净 1.2345 +0.35%" |
| **briefing / digest** | 同一窗口多 statement 聚合 | 交易时段多基金估值合并成一条跑马灯 / 一条 digest |

### 6.2 最小 policy 规则

- **dedup / repeat suppression**：
  - 同一 `windowKey` 内相同信息重复 → 只呈现一次（更新数值，不新建 statement）。
  - `fund.estimate` 的 windowKey = `fund:<code>`（每基金一条，值更新）。→ 天然解决"5s 高频重复"。
  - briefing 的 windowKey = `briefing:<trade-day>`。
- **freshness**：
  - statement 有 `expiresAt`（rule 声明）。fund.estimate 的 window = 实时（无持久 window，SSE 每帧携带当前值）；收盘后 rule 不再 render → 自然消失。
- **stale information**：
  - 数据源不可用（估算失败）→ rule render 返回 null（§3.2），不呈现"过期的旧值"。
  - 客户端 SSE 断线重连 → snapshot 对账（§5.2），不会残留 stale statement。
- **market open / close**：
  - 交易时段外 rule 不 render（`tradeWindowOf` 已有 window 判定）；收盘 15:00 后 estimate 不再呈现。

> **不做**：个性化推荐、频度学习、跨用户策略。全部为确定性规则。

---

## 7. L1 → Talk

- L1 **无 handling obligation**（PM §22）。
- 用户点击 L1 / 追问 → 进入 Talk：
  - 有 session（sourceRef 关联）→ **Resume**；
  - 无 session → **Create**（同 Phase 4 attention→Talk 的 `onAttentionPress` 路径，但**不调 engage**——L1 无 state，engage 只在 Attention 有意义）。
- **禁止**：`L1 → Attention` 自动转换。只有后续出现独立 authorized handling condition（如用户明确要求盯守 → 新 Assignment 提案），才产生 Attention。点击本身不转换。

---

## 8. Delivery Architecture

### 8.1 目标边界

```text
Attention / L1
       ↓
Delivery decision（谁值得投递、投到哪些 channel）
       ↓
Delivery job（infrastructure outbox/队列）
       ↓
Channel adapter（WeChat / WeCom / Email / future Push）
```

### 8.2 Delivery 不拥有什么

Delivery 层**不拥有**：
- Event（不删不改 Event）
- Attention state（不推进 open/handled/dismissed）
- Assignment state
- L1 semantics（不判断 statement 对错）

Delivery 只做一件事：**把已经存在的 product presentation 投递到外部 channel。**

### 8.3 Delivery decision（最小形态）

```ts
interface DeliveryDecision {
  presentationRef: string;   // attentionId 或 l1 statement id/sourceRef
  kind: "attention" | "l1";
  channels: ChannelKind[];   // 由策略/配置决定哪些 channel
  windowKey: string;         // 幂等键的一部分（§12）
}
```

- decision 来源：**注册表/配置**（如 `{ kind: "attention", subjectKind: "fund", ruleId: "market.target-nav-threshold" → channels: [email] }`），MVP 先放代码/config，不建 delivery_policy 表。

---

## 9. Delivery Source

### 9.1 Attention

```text
Attention OPEN
    ↓
delivery eligibility（policy 判定：这类型该投递吗）
    ↓
notification（用户点开 → App 内 Pulse → Talk）
```

- **Delivery 不改变 OPEN**。点开 notification 只是回到 App；viewing ≠ handling（PM §17）。
- 只有用户实际处理才 HANDLED/DISMISSED（§15）。

### 9.2 L1

```text
L1 statement（经 authorized presentation rule）
    ↓
optional delivery（如"收盘摘要"推 email）
```

### 9.3 禁止路径

```text
Event
 ↓
notification
```
**除非**该 Event 已经过 presentation governance（→ 变成 Attention 或 L1）。Event 本身永远不是投递源。

---

## 10. Delivery Failure Semantics

### 10.1 失败分层（必须区分）

```text
delivery failure  ≠  Event failure
                  ≠  Attention failure
                  ≠  Assignment execution failure
```

| 失败类型 | 影响 | 处理 |
|---|---|---|
| delivery failure（channel 返回 5xx / 超时） | **零产品状态影响** | delivery_job 留 pending → retry / 换 channel；Event/Attention/Assignment 不动 |
| Attention OPEN | 保持 OPEN | delivery 失败绝不 DIMISS/EXPIRED Attention |
| Event | 保持存在 | delivery 失败绝不回删 Event |
| Assignment | 保持原状态 | delivery 失败不影响责任 |

### 10.2 例

```text
Attention OPEN
  ↓ WeChat send 失败（webhook 5xx）
  ↓ delivery_job = pending/attempt+1
  ↓ retry（或切 email）
  ↓ 成功
  ↓ Attention 仍 OPEN（直到用户处理）
```

**不变式**（承接 IMPLEMENTATION_MODEL §11）：*notification failure never determines Event existence or Attention state.*

---

## 11. Delivery Queue / Outbox

### 11.1 是否需要 persistent queue

**结论：需要 `delivery_jobs`（infrastructure outbox），但身份明确 = infra 记录，不是 product concept。**

理由（当前规模 vs 必须转 queue 的条件）：
- 现状：`fund-estimation.ts` 在 handler 内 **synchronous best-effort** 调三通道。channel 失败仅 console log，无重试、无审计。
- 本轮设计已确立语义（§10）：delivery 必须可 retry、可换 channel、可审计，**且绝不回调产品状态**。synchronous best-effort 无法满足"retry/换通道"要求。
- 因此需要最小 outbox：`delivery_jobs` 表 + 轻量 worker。

### 11.2 delivery_jobs 表（infra，非 canonical entity）

```text
delivery_jobs:
  id            TEXT PK          # dlv_<ulid>
  presentation_kind  TEXT        # 'attention' | 'l1'
  presentation_ref   TEXT        # attentionId / statementId
  channel       TEXT             # 'wechat' | 'wework' | 'email' | 'push'(future)
  status        TEXT             # pending | delivering | delivered | failed | expired
  dedup_key     TEXT UNIQUE      # presentation + channel + window（§12 幂等键）
  attempt       INTEGER          # 重试次数
  max_attempts  INTEGER
  next_attempt_at INTEGER
  occurred_at   INTEGER
  last_error    TEXT
  payload_snapshot TEXT          # 投递时的呈现快照（不引用 live object，避免时序）
```

- **不是 notification canonical entity**：它只记录"投递尝试"，不定义产品语义。
- **payload_snapshot**：投递时把已渲染的文本固化进 job——channel adapter 只消费快照，不实时重读 Attention/L1（避免投递时对象已迁移/过期）。
- worker：复用 scheduler 机制（sweep pending → deliver → 更新 status），幂等（§12）。

### 11.3 何时必须转 queue 的判据

| 规模 | 方案 |
|---|---|
| 当前（每日数十条、单机、channel 少数） | `delivery_jobs` + scheduler sweep 足够（本轮） |
| 高吞吐 / 多实例 / 外部 channel 频繁抖动 | 换外部队列（BullMQ/Redis），`delivery_jobs` 保留为幂等台账 |

---

## 12. Idempotency

### 12.1 幂等键

```text
dedup_key = sha256( presentationKind + "|" + presentationRef + "|" + channel + "|" + window )
```

| 分量 | 来源 | 例 |
|---|---|---|
| presentationKind | attention / l1 | `attention` |
| presentationRef | attentionId / statementId | `att_xxx` |
| channel | 目标通道 | `wechat` |
| window | 投递窗口（Attention: trade-day；L1: rule window） | `trade:2026-09-05` |

### 12.2 语义

- **同一 presentation + 同一 channel + 同一 window → 一次投递**（UNIQUE 约束 + INSERT OR IGNORE）。
- **retry → 同一逻辑投递**（同 dedup_key），不是新投递——不产生多条 user-facing 通知。
- **不同 channel → 独立投递**（dedup_key 含 channel，天然拆分）。
- **窗口更新**（如 Attention 跨到新交易日）→ 新 dedup_key → 新投递合法。

---

## 13. Channel Adapters

### 13.1 统一接口

```ts
// lib/delivery/adapters.ts（Phase 10 实现时新增）
export interface ChannelAdapter {
  channel: ChannelKind;                       // 'wechat' | 'wework' | 'email' | 'push'
  send(p: DeliveryPresentation): Promise<DeliveryOutcome>;  // 只消费已渲染快照
}
export interface DeliveryPresentation {
  title: string;
  body: string;
  meta?: { kind: "attention" | "l1"; ref: string; deepLink?: string };
}
export type DeliveryOutcome = { ok: true } | { ok: false; error: string };
```

- `send(presentation)` 唯一入口——**不让 `fund-estimation.ts` / 任何来源直接调用具体 channel**。
- adapter 内部封装：email=nodemailer（复用现有 `emailService` 传输逻辑）、wecom=webhook、wechat=bridge、push=占位（future）。

### 13.2 现有通道抽象

| 现状 | 迁移后 |
|---|---|
| `emailService.sendFundNotificationEmail(funds)` | `EmailAdapter.send(presention)` —— 把"基金表格"改为"通用标题+正文"，channel 专属格式在 adapter 内 |
| `weworkService.sendFundNotificationToWeWork(funds)` | `WeComAdapter.send()` |
| `weChatService.sendFundNotificationToWeChat(funds)` | `WeChatAdapter.send()` |

- 现有 `FundEmailData & FundNotifyData` 形状 **由 adapter 内部格式化**，不泄露到 delivery 层。

---

## 14. Existing Notification Code Migration

### 14.1 审计 `fund-estimation.ts` 现状

```text
fund-estimation.ts（scheduler handler）
  ├── calculateFundEstimation()          → market data source ✓（保留）
  ├── eventIngestor.ingest(evaluated)    → product Event ✓（保留，commit point）
  ├── eventIngestor.ingest(matched)      → product Event → rule → Attention ✓（保留）
  └── sendFundNotificationEmail/WeWork/WeChat(fundsWithDiff)  ✗（要拆除）
```

**要删除**：handler 内直接调用三个 `sendFundNotification*` 的块（`fund-estimation.ts:99-111`）。

### 14.2 拆分后

```text
Market data / Event source
  ├── fund-estimation.ts（scheduler）→ evaluate/matched Event 入库（product Event 权威）
  └── L1 rule（fund.estimate 实时）→ L1 statement

Product Event / L1（canonical）
  ↓
Delivery decision（policy 注册表）→ 该 presentation 该投递吗
  ↓
delivery_jobs（outbox，幂等）
  ↓
Channel adapter（wechat/wecom/email）
```

- **删除**：handler 内 best-effort 三通道调用。
- **新增**：delivery decision 判定后写入 `delivery_jobs`；sweep worker 拉取投递。
- **保留**：Event ingestion（`evaluated`/`matched`）、Attention 规则、行情数据源。

---

## 15. Attention Notification Semantics

- Attention 的 delivery **不改变 OPEN**（§10）。
- 用户通过 notification 进入 App：`delivery → open Pulse → Talk`。仍 **viewing ≠ handling**。
- 只有用户显式处理才 `HANDLED / DISMISSED`（PM §17）。
- **deepLink 设计**：`DeliveryPresentation.meta.deepLink`（如 `pulse://attention/<id>`）供 notification 点击直接定位——但只是"定位到 Pulse 上的该项"，不自动 handle。

---

## 16. Security

| 维度 | 约束 |
|---|---|
| user ownership | 所有投递绑定当前 BFF 用户（单用户系统，但 delivery_jobs 记录 `user`，未来多用户可扩） |
| project scope | presentation 的 sourceRef 属单一项目/基金域；adapter 不跨 scope |
| channel ownership | channel 配置（webhook URL / bridge / SMTP）只存环境变量 / 配置文件，**不入库、不入 payload** |
| secrets | adapter 读 `process.env`（`WEWORK_WEBHOOK_URL` 等），不把 secret 写入 delivery_jobs 或事件 |
| token handling | 不用 JWT 调外部 channel；deepLink 不携带 token（App 内再鉴权） |
| delivery logs | `delivery_jobs` 只记投递状态与 error 摘要（不记 body 全文 / 不记 provenance / 不记 payload 原始快照以外的敏感字段） |
| **绝对不广播** | `authorizationRef`、`provenance`、raw Event payload、Memory 内容——一律不进 notification body |

---

## 17. Observability

- 每投递一条产生结构化记录（在 `delivery_jobs` 行，非 console log）：

```text
presentationRef（attentionId/statementId）
deliveryId（dlv_<ulid>）
channel
status
attempt
occurredAt / updatedAt
```

- `delivery_jobs` 是 **canonical delivery state**；console 只做日志镜像，不承担状态。
- 提供只读查询面（`GET /api/product/deliveries?status=` 或并入 Phase 9 管理面，future）用于 retry/audit。
- retry 依据：`status='failed' AND attempt < max_attempts AND next_attempt_at <= now`（sweep worker）。

---

## 18. Tests（Phase 10 实现时）

### L1
- authorized Event/data → L1 statement 出现
- unauthorized Event/data → 无 L1（negative 登记生效）
- L1 → 绝不产生 Attention
- L1 → 无 lifecycle（无 open/handled/dismissed；无 state 迁移 API）
- L1 → Talk：点击 Resume/Create，无 engage、无 state 变化

### Attention
- Attention OPEN → delivery 触发
- delivery failure → Attention 仍 OPEN
- 多 channel：不同 channel 独立 delivery

### Delivery
- 同 presentation + channel + window → 幂等（一次投递）
- retry → 同逻辑 delivery（同 dedup_key，attempt+1，不新增行）
- 不同 channel → 独立 delivery（不同 dedup_key）

### Negative
- Event 单独 → 无 notification
- L1 → 无 Attention
- notification 失败 → 无 Event 删除
- notification 失败 → 无 Attention 迁移
- raw payload / authorizationRef / memory 不出现在 body

---

## 19. Legacy Cleanup Plan：`/api/events/stream`

### 19.1 结论

**`/api/events/stream` → 不保留 shim，走 `deprecated → migration → delete`。**

### 19.2 Consumer 与依赖

| consumer | 现状 | 迁移 |
|---|---|---|
| mobile `services/fund-events.ts`（Pulse 跑马灯） | 订阅 `/api/events/stream` 消费 `fund.estimate` | 改为订阅 `GET /api/product/l1`（snapshot）+ `/api/product/l1/stream`（SSE） |

无其他 consumer（trade-alert 已退役，`FINAL_ARCHITECTURE §3` 确认）。

### 19.3 Removal condition（明确可执行）

1. mobile 新增 `services/l1.ts`（或替换 `fund-events.ts`），消费 `/api/product/l1` + `/api/product/l1/stream`，跑马灯走新端点。
2. BFF 新增 `GET /api/product/l1` + `GET /api/product/l1/stream` + `lib/product/l1-rules.ts`（fund.estimate → L1 statement）。
3. E2E 验证跑马灯在新端点正常。
4. **删除** `/api/events/stream` 路由 + `services/fund-events.ts`（或改写为 `services/l1.ts`）+ `lib/events/{types,estimate-payload}.ts`（若不再被引用）。
5. 更新 `FINAL_ARCHITECTURE §3` 退役登记 + `docs/knowledge-base/API.md`。

**Migration dependency**：`fund.estimate` 的 L1 rule 必须先于端点迁移落地（否则跑马灯断流）。两者同一轮实现。

---

## 20. Architecture Decision Points（本轮最终裁决）

| # | 决策点 | 裁决 |
|---|---|---|
| 1 | L1 是否 persistence | **否**（不建 `l1_items`）；实时投影自 Event/deterministic data source |
| 2 | L1 API | `GET /api/product/l1`（snapshot）+ `GET /api/product/l1/stream`（SSE） |
| 3 | L1 SSE / snapshot | snapshot 供首屏/重连对账；stream 每帧全量替换当前生效 statements |
| 4 | L1 frequency strategy | 最小 policy：dedup by windowKey、freshness by rule window、stale 不呈现、收盘不 render；支持 single statement + briefing 形态 |
| 5 | Delivery 是否 persistent queue/outbox | **是**：`delivery_jobs`（infra outbox，非 product entity）+ scheduler sweep；规模判据见 §11.3 |
| 6 | Delivery idempotency key | `sha256(kind\|ref\|channel\|window)`；retry 同键 |
| 7 | Channel adapter interface | `send(presentation)` 统一接口；wechat/wecom/email/push(future) 各自 adapter |
| 8 | Attention delivery semantics | 不改变 OPEN；点击 → 回 App Pulse/Talk；viewing ≠ handling |
| 9 | Fund estimate migration | 保持不入 product_events；归类 deterministic data source → L1 rule `l1.market.estimate`；保留 5s 现算 |
| 10 | `/api/events/stream` removal plan | deprecated → mobile 迁移新 L1 端点 → 删除路由 + legacy files + 更新退役登记/API 文档 |

---

## 21. 不做（Non-goals / Out of Scope）

- 不改 PRODUCT_MODEL（§22 已冻结，本轮只是落实）。
- 不新增 L1 canonical entity（无 `l1_items` 表）。
- 不新增 Notification product entity（`delivery_jobs` 是 infra outbox，不是 product concept）。
- 不重做 Pulse UI（跑马灯位置/视觉不变，仅换数据源）。
- 不实现 Agent Observation pipeline（PM §19，future）。
- 不新增 Assignment 能力。
- 不改 Memory/KB。
- 不实现 Open Thread / Reconstruct。
- 不引入多 runtime / provider framework。
- 不做个性化推荐/频度学习。

---

## 22. Migration Plan（实现顺序，供下一轮）

| 步骤 | 内容 | 依赖 |
|---|---|---|
| 1 | `lib/product/l1-rules.ts`：PresentationRule 接口 + `l1.market.estimate` rule + negative 登记 | 无 |
| 2 | `GET /api/product/l1` + `GET /api/product/l1/stream`（SSE 全量替换） | 1 |
| 3 | mobile `services/l1.ts`（snapshot + SSE）+ `useL1` hook；Pulse 跑马灯切新端点 | 2 |
| 4 | 删除 `/api/events/stream` + `services/fund-events.ts` + legacy events lib（按 §19.3） | 3 |
| 5 | `lib/delivery/`：adapters（wechat/wecom/email）+ `delivery_jobs` + decision 注册表 + sweep worker | 无（独立） |
| 6 | 拆 `fund-estimation.ts`：删 handler 内三通道调用 → delivery decision → outbox | 5 |
| 7 | Attention delivery（OPEN → outbox，不改变 state） | 5 |
| 8 | 测试（§18）+ E2E + 文档（FINAL_ARCHITECTURE/API/knowledge-base） | 全 |

---

## 23. Semantic Gap 检查（本轮初步）

- PM §22 对 L1 语义描述完整（source authority、非 Attention、无 lifecycle、L1→Talk）。**未发现需要修改 PM 的真实矛盾。**
- 唯一需留意的张力：PM 表格"Fund estimate → L1 under a named standing rule"，而 §4 裁决"fund.estimate 不入 product_events"。这是 **runtime data 分类决策**（PM §15 原则允许：不是所有 runtime data 都是 Event），在 PM 原则内，不构成 gap。
- 若后续实现中发现 delivery 需要"跨窗口持久化 L1 供用户回看"，届时再评估（当前 MVP 由 `market.rule.evaluated` audit Event 兜底，无 gap）。

---

## 24. 最终报告索引（供 Phase 10 实现后填写）

1. L1 canonical 是否存在 → **否**（§2）
2. L1 source authority → code/config PresentationRule registry，与 Attention rule 分离（§3）
3. L1 API → `GET /api/product/l1` + `/api/product/l1/stream`（§5）
4. Delivery architecture → presentation → decision → outbox → adapter（§8）
5. Delivery persistence decision → `delivery_jobs` infra outbox（§11）
6. Idempotency strategy → `sha256(kind\|ref\|channel\|window)`（§12）
7. Fund estimate migration → L1 data source，不入 Event（§4）
8. Legacy `/api/events/stream` plan → deprecated → L1 端点迁移 → delete（§19）
9. 下一轮真正编码范围 → §22 步骤 1–8
10. PRODUCT_MODEL semantic gap → 无（§23）

---

**本轮不修改 PRODUCT_MODEL.md（冻结，`git diff` 应保持空）。**
