# FINAL_ARCHITECTURE.md —— 系统最终架构（Phase 7 定稿）

> 状态：Phase 7 Final Integration Audit 产物。语义唯一来源：`PRODUCT_MODEL.md`（冻结）；
> runtime 决策记录：`PHASE5_IMPLEMENTATION.md`；剩余工作：`BACKLOG.md`（冻结）。
> 本文是 implementation architecture，不重新定义产品语义。

---

## 1. 最终架构图

```text
                        ┌────────────────────────────┐
                        │   Mobile（Expo web 9928）  │
                        │  Pulse / Talk / Memory / Me │
                        └──────────────┬─────────────┘
                                       │ JWT（/api/opencode/rest proxy + /api/product/*）
                        ┌──────────────▼─────────────┐
                        │      BFF（family-finance   │
                        │       next dev :19234）    │
                        └──────────────┬─────────────┘
                                       │
       ┌───────────────┬───────────────┼────────────────┬──────────────┐
       │               │               │                │              │
       ▼               ▼               ▼                ▼              ▼
┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌───────────┐  ┌───────────┐
│ OpenCode   │  │ Event      │  │ Assignment  │  │ Memory    │  │ KB        │
│ Server     │  │ pipeline   │  │ runtime     │  │ (memx)    │  │ (llm-wiki │
│ :4096      │  │            │  │             │  │           │  │  vault)   │
└─────┬──────┘  └─────┬──────┘  └──────┬──────┘  └─────┬─────┘  └─────┬─────┘
      │               │                │               │              │
      │ permission    │ product_events │ assignments + │ USER.md      │ vault/*.md
      │ bridge        │ (append-only)  │ proposals     │ .mem/*.md    │ raw-ideas/
      │ (tap)         │                │ trigger cron  │ MEMORY.md    │
      │               │                │ (later.js)    │              │
      │               ▼                ▼               │              │
      │         ┌─────────── rules ───────────┐        │              │
      │         │ named-rule:                 │        │              │
      │         │  permission.blocking        │        │              │
      │         │  market.target-nav          │        │              │
      │         │ assignment-authorization:   │        │              │
      │         │  trigger.fire → Attention   │        │              │
      │         └──────────────┬──────────────┘        │              │
      │                        ▼                       │              │
      │               ┌────────────────┐               │              │
      │               │ attention_items│               │              │
      │               │ OPEN→HANDLED/  │               │              │
      │               │ DISMISSED/     │               │              │
      │               │ EXPIRED        │               │              │
      │               └───────┬────────┘               │              │
      │                       ▼                        ▼              ▼
      │               ┌────────────────┐    ┌──────────────────────────┐
      │               │ Pulse 需求面    │    │ /api/product/memory /kb  │
      │               │ (needs-you =   │    │ （只读投影 + forget /     │
      │               │  Attention）   │    │  raw-idea 最小写入）      │
      │               └───────┬────────┘    └──────────────────────────┘
      │                       ▼
      │               ┌────────────────┐
      └──────────────▶│ Talk（Chat）   │
        Session       │ Resume/Create  │
        (canonical    └───────┬────────┘
         在 OpenCode）        ▼
                        ┌────────────────┐
                        │ Handling       │
                        │ (reply/决定/   │
                        │  对话结论)      │
                        └────────────────┘
```

数据通道：手机端 SSE 三条（`/api/opencode/stream` chat delta；`/api/product/stream` attention + proposal 变更（Phase 13 起，proposal.* 为 presentation 通知）；`/api/product/l1/stream` L1 presentation 变更）；
L1 行情跑马灯走专用 L1 端点（`/api/product/l1` snapshot + `/api/product/l1/stream` SSE）——legacy `/api/events/stream` 已删除（§3）。

### 1b. Phase 11–13 呈现链路（Observation 接入 Pulse）

```text
market.rule.evaluated（scheduler，含 diff）
      ↓ observation-sweep（每分钟 job；rule registry + grants 授权分离）
agent.observation.recorded（audit Event，outcomes=[l1, proposal]）
      ├──→ L1 frame（kind="observation"，source-owned 分片 + 3 天 validity）
      │        → /api/product/l1/stream → Pulse "Noticed"（informational，无动作）
      └──→ assignmentService.propose（market/ongoing → 必然停留 proposed，绝不 activate；
               运行时守卫：result.assignment 非空即抛错）
               → proposal.created → /api/product/stream → Pulse "Suggested"（L2 卡）
                   ├→ [确认] → confirm API（唯一 activation moment）
                   │     → assignments 行 + assignment.created/activated + trigger 注册
                   │     → 后续：trigger fire → Event → Attention → "Needs you" → Talk → Handling
                   └→ [不用了] → reject API → rejected（无 Assignment/Attention/Delivery）
```

与 §1 图的关系：§1 图覆盖 Attention 主链（需求面）；本节补 Phase 11–13 的呈现双链（L1 informational / Proposal actionable）。Pulse 最终五组：NEEDS YOU（Attention）/ SUGGESTED（Proposal）/ NOTICED（observation L1）/ TODAY（项目 running，runtime 信息）/ MARKET（行情 L1）。

## 2. Source of truth（§4 审计结论：无双重 canonical）

| 概念 | canonical | 产品层表示 |
|---|---|---|
| Session / 消息 | OpenCode Server | 引用（sessionId） |
| Event | `product_events`（SQLite，append-only） | — |
| Attention | `attention_items` | 无副本（mobile store 是**缓存投影**，SSE reconcile） |
| Assignment | `assignments` / `assignment_proposals` | 无副本 |
| Memory | `~/.opencode`（memx 文件） | 无 mirror（BFF 只读投影 + forget bridge） |
| KB | llm-wiki vault（`LLM_WIKI_VAULT`） | 无 mirror（rg 检索 + Raw Idea 原子写） |
| Open Thread | （未实现——Backlog Future） | PM §24 marker 语义，当前无实体 |
| Pulse | presentation only（Attention 渲染 + L1 statement + Proposal L2 Suggestion） | 无持久化 |
| Talk | interaction surface（OpenCode 会话） | handling_ref 引用 |

## 3. Legacy 退役登记（Phase 7/10 执行）

| 项 | 状态 | 说明 |
|---|---|---|
| `/api/events/ack` | **已删除**（404） | mobile 零消费；语义由 `POST /api/product/attention/:id/dismiss` 承担 |
| trade-alert SSE 派生 + 重放（legacy-shim.ts） | **已删除** | mobile 零消费；needs-you 语义只在 Attention |
| `lib/events/publisher.ts`（内存 lastEvents 残余） | **已删除** | 零生产 consumer |
| `/api/events/stream` | **已删除**（Phase 10） | mobile 已迁到 `/api/product/l1` + `/api/product/l1/stream`；`services/fund-events.ts`、`lib/events/*` 一并删除 |
| mobile `screens/events.ts`、`SessionPanel.tsx` | **已删除** | 死代码（IMPLEMENTATION_MODEL P2 清单） |
| mobile `FundMarqueeItem.hasAlert` | **已删除** | trade-alert 残留 prop |

## 3b. Phase 10 新增（L1 + Delivery）

| 项 | 状态 | 说明 |
|---|---|---|
| L1 rule registry | 新增 | `lib/product/l1-rules.ts`：`l1.market.estimate`（fund.estimate 为 deterministic data source，不入 `product_events`）；与 Attention rules 分离 |
| L1 snapshot | 新增 | `GET /api/product/l1`（JWT 只读；无 lifecycle；stale/收盘不返回） |
| L1 SSE | 新增 | `GET /api/product/l1/stream`（每帧全量替换当前生效 statements；心跳；指数退避客户端负责） |
| L1 market source | 新增 | `lib/product/l1-market-source.ts`：5s 现算估算 → L1Statement（不写 Event/Attention/EventIngestor） |
| delivery_jobs | 新增 | SQLite outbox（infra 非 product entity）：`lib/delivery/*` + migration `20260910-product-p10-delivery-jobs`；UNIQUE(dedup_key) 幂等 |
| channel adapters | 新增 | `lib/delivery/adapters.ts`：Email/WeCom/WeChat（`send(presentation)` 统一接口）；Push 占位 |
| delivery decision | 新增 | `lib/delivery/decision.ts`：market attention → wecom/email（code/config registry，不建表） |
| delivery worker | 新增 | `lib/delivery/worker.ts`：scheduler job `delivery-sweep`（每分钟） |
| fund-estimation 解耦 | 修改 | handler 不再直接调 email/wework/wechat；Attention 建立后经 `enqueueDelivery` → outbox |

## 3c. Phase 13 新增（Proposal → Pulse L2 Suggestion）

| 项 | 状态 | 说明 |
|---|---|---|
| proposalEmitter | 新增 | `lib/product/proposal-emitter.ts`（照 attentionEmitter 模式）：`proposal.created/updated` presentation 广播；direct-activation 分支不广播 |
| 迁移点广播 | 修改 | `assignment-service.ts` 五个点（propose 停留 proposed / confirm / reject / cancel / expireProposalsDue）只加 emit，迁移语义零改动 |
| product stream 扩展 | 修改 | `/api/product/stream` 连接时重放 proposed proposals + 订阅 proposalEmitter（attention 部分原样保留）；`proposal.*` 是 presentation 通道变更通知（与 attention.created/updated 同族），非 product_event |
| Pulse Suggested | 新增 | mobile：`services/proposal/`（store/client）+ `hooks/useSuggestions.ts` + `index.tsx` SUGGESTED 组；Suggestion = `assignment_proposals` 只读投影（status 原样保留，渲染过滤 proposed），不建表、无新 lifecycle、无客户端过期计时器 |
| Confirm/Reject | 复用 | 既有 `POST /api/product/assignment-proposals/:id/{confirm,reject}`（activation moment / rejected）；重复调用 409 确定性失败；Observation→Proposal→Assignment 无确认路径不存在（P13 §6 全路径审计） |

## 3d. Phase 11/12 新增（Agent Observation + Observation→L1）

| 项 | 状态 | 说明 |
|---|---|---|
| Observation rule registry | 新增 | `lib/observation/rules.ts`：`observation.market.repeated-decline`（同基金连续 3 个评估点 diff<0；allowedOutcomes=["proposal","l1"]）；**rule ≠ authority** |
| Observation authorization | 新增 | `lib/observation/grants.ts`：静态授权清单（`isObservationAuthorized`），rule 只有出现在 grants 中才可执行——观察授权 ≠ Assignment 授权（PM §16.2） |
| Observation sweep | 新增 | `lib/observation/observation-runtime.ts`：scheduler job `observation-sweep`（每分钟，cursor + 30d lookback 兜底）→ `agent.observation.recorded`（确定性 id，幂等锚点 + instructionRef dedup + partial UNIQUE） |
| Observation → Proposal | 新增 | `ensureProposalForObservation`（observation-service）：只 propose（market/ongoing → matrix required）；运行时不变式守卫（`result.assignment` 非空即抛错） |
| Observation → L1 | 新增 | `lib/observation/observation-l1.ts`：refreshObservationL1 → source-owned L1 分片（`setL1SourceStatements`），expiresAt = observation 时刻 + l1ValidityMs（=cooldown 3 天） |
| G7 修正 | 修改 | decline 证据改用 `market.rule.evaluated`（`market.rule.matched` 只在 diff>0 发出，无法表达走低） |

## 4. Authority 快捷方式检查（§3，全绿）

- `eventIngestor` 无 HTTP 暴露——客户端不能创建 Attention/Event。
- Assignment 创建唯一入口 = proposals + confirmation matrix（`POST /api/product/assignments` 405）。
- Assignment 代码零 OpenCode permission 引用——activation ≠ runtime permission。
- `session.idle`/`message.*` 不进 product 管道（tap 白名单）。
- 查看/进 Talk/Session 删除无任何 Attention state 写路径。
- Raw Idea 保存无 product store 写路径（保存 ≠ 执行）。
- **Observation authority 独立**：observation rules 需 grants 授权（≠ Assignment 授权、≠ Attention creation、≠ L1 presentation）；runtime 守卫保证 Observation → Proposal 绝不 auto-activate。
- **L1 presentation authority 独立**：l1-rules 与 attention rules 分离注册；会建 Attention 的规则不自动会"说话"，反之亦然（PM §22）。
- Attention creation authority 实际清单：`named-rule`（permission blocking / market target-nav）+ `assignment-authorization`（trigger fire）。`user-instruction` 为 CHECK 允许的合法形态，当前无生产者。Observation 当前**无** Attention output path（→ Post-MVP）。

## 5. 关键不变式（运行验证）

- Event：append-only、idempotent（INSERT OR IGNORE / 确定性 id）、occurred_at≠created_at。
- Attention：dedup_key UNIQUE、终态不可逆、`expires_at NULL` 永不过期、viewing 零状态写入。
- Assignment：activation 唯一路径（proposals+matrix）、one-shot 消费即 commit point、
  execution identity（occurrence）幂等、revoke race deterministic（见 PHASE5_IMPLEMENTATION §2-4）。
- Legacy seed：exactly-once（`fund-estimation` disabled ⇔ replacement Assignment 存在）。
- Proposal：proposed 7 天未决 → expired（不能事后 confirm）；disposition 单行原子迁移（`WHERE status='proposed'`），重复 confirm/reject 确定性 409。
- L1：无表、无 lifecycle——进程内 frame + `expiresAt`（observation 3 天 / market 实时帧）；重启由 `startL1MarketSource` + observation sweep 重建。
- SSE/projection：DB 是唯一 canonical state；SSE 广播与 mobile store 仅为 projection/cache——连接重放（open attention + proposed proposals + L1 全帧）+ 客户端重连 snapshot 对账。
- 已知缺口（non-blocking）：confirm 的 resolution 回填 no-op（`resolution.assignmentId` 恒 `{}`；canonical 链路经 `assignment.provenance.proposalId` 完整，无消费方——MVP_ACCEPTANCE §Known Issues）。
