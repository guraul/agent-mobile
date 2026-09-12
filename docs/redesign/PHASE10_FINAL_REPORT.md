# PHASE10_FINAL_REPORT.md —— L1 Presentation + Notification / Delivery（Phase 10）

> 基线：`PRODUCT_MODEL.md` 冻结（**未修改**，`git diff` = 0 行）；实现依据 `docs/redesign/PHASE10_DESIGN.md`。
> 范围：fund.estimate 从 legacy `/api/events/stream` 迁移为正式 L1 presentation API；L1 snapshot + SSE；mobile 跑马灯切换；`/api/events/stream` 删除；`delivery_jobs` outbox；Email/WeCom/WeChat 从 `fund-estimation.ts` 解耦；Attention/L1 → Delivery → Channel Adapter pipeline。

---

## 1. 修改文件

### BFF（family-finance）
**新增：**
- `packages/web/lib/product/l1-rules.ts` — L1Rule/L1Source/L1Statement + `l1.market.estimate`（fund.estimate 为 deterministic data source，不入 `product_events`）
- `packages/web/lib/product/l1-market-source.ts` — 5s 现算估算 → L1Statement → 内存 frame（不写 Event/Attention/EventIngestor）
- `packages/web/lib/product/l1-emitter.ts` — L1 frame 广播（`l1.updated`）
- `packages/web/app/api/product/l1/route.ts` — GET snapshot（JWT 只读；无 lifecycle；stale/收盘返回 `[]`）
- `packages/web/app/api/product/l1/stream/route.ts` — SSE（每帧全量替换 + 心跳；指数退避客户端）
- `packages/web/lib/delivery/` — `types.ts` / `adapters.ts` / `decision.ts` / `repository.ts` / `enqueue.ts` / `worker.ts` / `delivery.test.ts`
- `packages/web/lib/product/l1-rules.test.ts` — 9 项（authorized/unauthorized/market close/no Attention/no lifecycle/payload isolation/Event 独立）

**修改：**
- `packages/web/lib/product/migrations.ts` — `20260910-product-p10-delivery-jobs`（delivery_jobs 表，UNIQUE dedup_key）
- `packages/web/lib/scheduler/handlers/fund-estimation.ts` — 解耦：**不再直接调用** email/wework/wechat；Attention 建立后经 `enqueueDelivery` → outbox
- `packages/web/lib/scheduler/handlers/index.ts` + `store.ts` — 注册 `delivery-sweep` job（每分钟）
- `packages/web/instrumentation.ts` — 启动 `startL1MarketSource()`（5s L1 数据源）
- `packages/web/lib/scheduler/handlers/fund-estimation.test.ts` — 更新为新 delivery 流语义

**删除：**
- `packages/web/app/api/events/stream/route.ts` — legacy L1 shim
- `packages/web/lib/events/`（`types.ts` / `estimate-payload.ts` + tests）— 无生产 consumer

### Mobile（agent-mobile-app）
**新增：**
- `src/services/l1.ts` — `fetchL1` / `subscribeL1` / `toMarketEstimate`（+ `l1.test.ts`）
- `src/hooks/useL1.ts` — snapshot + SSE + reconnect reconciliation；`funds` 行情投影

**修改：**
- `src/app/(tabs)/index.tsx` — `useFundEvents` → `useL1`
- `src/components/navigation/FundMarqueeItem.tsx` — 数据源类型改为 L1
- `docs/knowledge-base/{API,INDEX,modules/pulse-stream,modules/services}.md` — L1/legacy 退役同步

**删除：**
- `src/services/fund-events.ts`、`src/hooks/useFundEvents.ts` — legacy consumer

---

## 2. L1 Rule Implementation

`lib/product/l1-rules.ts`：
- `L1Rule { ruleId, speaks, render, window? }` — presentation authority，与 Attention `rules.ts` **分离**（能建 Attention ≠ 能说 L1）。
- `l1.market.estimate`：授权 named standing rule（PM §22）；`render` 只接受 `{ type: "data" }` source（fund.estimate 是 deterministic data source，**不是 product Event**）。
- 市场关闭（周末 / 收盘后）→ 不 render（无 stale value）。
- negative：Event source → 无 L1；无 speaking authority 的数据 → 无 L1。

## 3. L1 Snapshot / SSE

- `GET /api/product/l1` → `{ items: L1Statement[] }`（JWT；只读；无 lifecycle；无内部 rule/config/provenance；stale 不返回）。
- `GET /api/product/l1/stream` → SSE `{ kind: "l1.updated", at, items }`（**每帧全量替换**；首连推 snapshot；15s 心跳；无逐条 add/remove protocol）。
- L1 statement 无 `open/handled/dismissed`。

## 4. Fund.estimate Migration

- `fund.estimate` **保持不入 `product_events`**（deterministic data source，5s 现算）。
- 新链路：`calculateFundEstimation()` → `l1.market.estimate` rule → `L1Statement` → snapshot/SSE。
- 数据源失败 → 当前 frame 不含该基金（不返回 stale）；市场关闭 → `items: []`。
- **market threshold Event pipeline 未动**（`market.rule.evaluated/matched` → Attention 原样保留）。

## 5. Mobile Pulse Migration

- `useFundEvents` → `useL1`（`/api/product/l1` + `/api/product/l1/stream`）。
- 跑马灯视觉/交互不变（FundMarqueeItem 同视觉、MARKET 标签 + StatusPill idle "Watching"）。
- 已删除 `services/fund-events.ts` / `hooks/useFundEvents.ts`（无剩余引用）。

## 6. `/api/events/stream` Removal

- **已删除** 路由 + `lib/events/*`（types/estimate-payload + tests）。
- mobile 无 consumer（grep 仅剩注释/历史文档）。
- `FINAL_ARCHITECTURE.md` §3 退役登记更新为 "已删除（Phase 10）"；`API.md` 标记删除。

## 7. delivery_jobs Schema

```sql
CREATE TABLE delivery_jobs (
  id TEXT PRIMARY KEY, presentation_kind TEXT CHECK('attention','l1'),
  presentation_ref TEXT, channel TEXT CHECK('wechat','wework','email','push'),
  status TEXT CHECK('pending','delivering','delivered','failed','expired'),
  dedup_key TEXT UNIQUE, attempt INT, max_attempts INT, next_attempt_at INT,
  occurred_at INT, last_error TEXT, payload_snapshot TEXT, updated_at INT
);
```
- infra outbox（非 product entity）；**UNIQUE(dedup_key)** 幂等。

## 8. Delivery Decision

`lib/delivery/decision.ts`：code/config registry（**不建 delivery_policies 表**）。
- 默认：market Attention → `[wework, email]`；L1 → 无投递（Pulse 呈现）。
- 环境变量覆盖：`DELIVERY_CHANNELS_MARKET_ATTENTION`。
- decision 只发生在 **authorized presentation 之后**；禁止 `Event → notification`。

## 9. Channel Adapters

`lib/delivery/adapters.ts`：统一 `send(presentation): DeliveryOutcome`。
- `EmailAdapter` / `WeComAdapter` / `WeChatAdapter`（复用现有 `emailService`/`weworkService`/`weChatService` 传输，channel 格式在 adapter 内）；`pushAdapter` 占位（future）。
- adapter 只消费 `DeliveryPresentation { title, body, kind, ref, deepLink }`，**不读 raw payload/provenance/authorizationRef/Memory**。

## 10. Retry / Idempotency

- 幂等键 `dedup_key = sha256(kind|ref|channel|window)`（`lib/delivery/repository.ts` `deliveryDedupKey`）。
- 同 presentation+channel+window → 一行；retry 同键（attempt+1，不新增行）。
- worker 指数退避（5s→60s cap），`max_attempts` 达上限 → `failed`；未达 → 回 `pending` + `next_attempt_at`。

## 11. Attention / L1 Delivery

- **fund-estimation.ts 解耦**：不再直接调三通道；matched → Attention → `enqueueDelivery({kind:'attention', ref:'market:<attId>', ...}, {key: windowId})` → outbox。
- `delivery-sweep`（scheduler，每分钟）→ adapter.send() → delivered/failed。
- **delivery 失败绝不改变 Attention**（OPEN 保持；Event/Assignment 不受影响）。
- L1 → optional delivery（当前默认无投递；Pulse 呈现即足）；**L1 → Attention 禁止**。

## 12. Security

- 所有 product API（含新 L1 端点）JWT（`requireAuthHeader`；无 token → 401 已验证）。
- delivery_jobs 不存 secret（adapter 读 env）；`payload_snapshot` 只含 presentation 字段（测试断言不泄漏 `WEWORK_WEBHOOK_URL`/`provenance`/`authorizationRef`/token）。
- deepLink 不带 JWT；notification body 不带 authorizationRef / raw payload。
- 回归测试：`delivery.test.ts` security 用例 + `l1-rules.test.ts` payload 隔离。

## 13. Real Smoke vs Simulation

**Real smoke（运行中 BFF，19234）：**
- `GET /api/product/l1` → 401（无 token）→ 200 `{items:[]}`（JWT；收盘时段正确返回空）。
- `GET /api/product/l1/stream` → SSE 首连推送 `l1.updated`。
- 重启后日志：`[migrations] applied 20260910-product-p10-delivery-jobs`、`[scheduler] scheduled "delivery-sweep"`、`[l1] market estimate source started`。
- delivery 全链路：enqueue 测试 job → `POST /api/scheduler/delivery-sweep/run` → **delivered**（真实 WeComAdapter + webhook）。

**Simulation（vitest）：**
- `l1-rules.test.ts`（9 项）、`delivery.test.ts`（9 项）、`fund-estimation.test.ts`（6 项，mock fundService/channels）——确定性路径验证。

**E2E（Playwright，9928 静态版）：**
- `pulse-e2e.mjs`（E2E_NO_SEND）：**6/6 PASS**（含跑马灯/market 分组渲染 + 无 JS 错误）。
- `phase9-e2e.mjs`：**9/9 PASS**。

## 14. Full Test Results

| 套件 | 结果 |
|---|---|
| BFF vitest（全部） | **22 files passed / 3 skipped，196 tests passed / 5 skipped** |
| BFF tsc `--noEmit --skipLibCheck` | CLEAN |
| Mobile vitest | **16 files passed，113 tests passed** |
| Mobile tsc `--noEmit` | CLEAN |
| E2E pulse-e2e | 6/6 |
| E2E phase9 | 9/9 |
| Migration（clean DB + 既有 DB） | 通过（既有 DB 实测 applied p10 migration） |

## 15. Docs Updated

- `docs/redesign/FINAL_ARCHITECTURE.md` — L1 数据通道、§3 退役登记、§3b Phase 10 新增
- `docs/knowledge-base/API.md` — L1 端点 + legacy 删除标注
- `docs/redesign/IMPLEMENTATION_MODEL.md` — §11 更新 + §11b L1/Delivery runtime
- `docs/redesign/PHASE10_DESIGN.md` — 状态改"设计定稿 + 已实现"
- `docs/knowledge-base/{INDEX,modules/pulse-stream,modules/services}.md` — fund-events/useFundEvents 退役同步

## 16. Final Grep

- `/api/events/stream`：仅历史文档 / 注释（无 live code）。
- `sendFundNotification*`：仅 channel 服务实现 + adapters + 测试 mock + 解耦注释。
- `trade-alert`：无 live code（仅历史文档）。
- `fund.estimate`：仅注释 / 测试名（L1 数据源描述，非 Event/Attention/legacy code path）。
- `l1.market.estimate`：L1 rules 实现 + 测试。

## 17. `PRODUCT_MODEL.md` Verification

```
git diff -- docs/redesign/PRODUCT_MODEL.md   →  (empty)
```

**未修改。** PM §15（Event=fact，非所有 runtime data 都需 Event）/ §22（L1 = authorized presentation）均为原则内落实，无 semantic gap。

---

## Remaining Backlog

- **L1 briefing/digest 形态**（PM §22 策略层）：单 statement 已实现；briefing 聚合（多基金 digest）策略待产品决策。
- **L1 delivery 策略**：当前 L1 默认不投递；"收盘摘要 email"等可加 policy（`decision.ts` 已支持）。
- **Push adapter**：占位（future）；需 APN/FCM 通道时实现。
- **delivery 管理面**（Phase 9 UX 方向）：`GET /api/product/deliveries` 查询面（retry/audit）未做（observability 已具备，查询面下轮）。
- **Retention 策略**（P2-2）：delivery_jobs 过期清理 TTL 未设（当前量级可运行）。

**全部红线满足 / 全部测试通过 / 真实 smoke 验证 / PRODUCT_MODEL 零变更。**
