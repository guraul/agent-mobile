# PHASE1_IMPLEMENTATION.md —— Event + Attention 持久化与确定性管道（编码级设计）

> 状态：设计稿（本轮**不写业务代码**，仅 DDL 草案 / 服务签名 / 流程 / 测试矩阵）
> 语义来源：`PRODUCT_MODEL.md`（冻结，PM §n 引用）· 架构来源：`IMPLEMENTATION_MODEL.md`（v1）
> 代码基线：family-finance @ `2c38301`（packages/web）· agent-mobile @ `0af5829`
> 本 Phase 范围 = IMPLEMENTATION_MODEL 的 Phase 1 + Phase 2 合并为第一个编码增量：持久化层 + 两条确定性规则（permission / market threshold）。没有至少一条规则接通，管道无法验收，故合并；**手机端 Pulse 改造仍留下一轮**（本 Phase 双轨并行，旧前端行为不变）。

---

## 0. 现状核实结论（读了代码，不是猜的）

| 事实 | 来源 | 对设计的影响 |
|---|---|---|
| SQLite = better-sqlite3 + WAL，`initDatabase()` 内联 `CREATE TABLE IF NOT EXISTS`；`_migrations` 表已建但**没有 runner** | `lib/database.ts:39` | 新表走同一 `initDatabase()` 追加；不引入迁移框架（见 §15） |
| scheduler 有 `registerJob/registry` + `scheduler_job_runs` 审计 | `lib/scheduler/registry.ts`、`store.ts` | expiry worker 直接注册为 job |
| `/api/opencode/stream` 是**每客户端连接独立 fetch** `/global/event`；无全服单点 tap | `app/api/opencode/stream/route.ts` | Event bridge 必须是**进程内常驻单连接**，不能寄生在客户端路由里 |
| opencode 实际事件名：`permission.asked/replied`、`session.idle/error/updated`、`message.*`；**没有 `session.completed`** | 客户端联合类型 `opencode-events.ts:6-24` | bridge 白名单按真实事件名；PM §15 的"session completed"在实现中对应 `session.idle`（且 idle 永不产生 Attention，PM §16.1） |
| 上游是 live tail，**无重放**；BFF 重启期间的事件丢失 | `stream/route.ts`（`fetch /global/event` 直连） | permission 类需要启动回填（`/permission` 列表，见 §10） |
| `fund-estimation.ts:76-88`：通知成功才 publish；通知失败/关闭 → 无事件 | handler | §9 的解耦对象 |
| `publisher.ts`：内存 `lastEvents` 单槽 + `ackEvent`；`/api/events/ack` 被手机端"确认处理"调用 | `lib/events/publisher.ts`、`fund-events.ts:43-55` | §8 迁移；ack 重定义为 dismiss shim |
| 手机端事件联合类型已含 `permission.asked/replied`（含 reply 字段） | `opencode-events.ts:14-15` | handling artifact 的证据在客户端/服务端都可达 |

---

## 1. 数据模型（最终定稿）

五张表，全部加进 `initDatabase()` 的 DDL 块（沿用 `CREATE TABLE IF NOT EXISTS` 风格；`_migrations` 不启用的理由见 §15）。

### 1.1 `product_events`（append-only 事实日志）

```sql
CREATE TABLE IF NOT EXISTS product_events (
  id              TEXT PRIMARY KEY,                -- 'evt_' + ULID
  type            TEXT NOT NULL,                   -- 'opencode.permission.asked' | 'opencode.permission.replied'
                                                   -- | 'market.rule.matched' | 'market.rule.evaluated'
                                                   -- | 'assignment.trigger.fired' (Phase 5)
                                                   -- | 'opencode.session.deleted'
  subject_kind    TEXT NOT NULL CHECK (subject_kind IN ('session','fund','project','assignment','permission')),
  subject_id      TEXT NOT NULL,
  occurred_at     INTEGER NOT NULL,                -- 世界时间（ms）
  source          TEXT NOT NULL CHECK (source IN ('opencode-sse','market-scheduler','agent-observation','api')),
  payload         TEXT,                            -- JSON：紧凑证据
  refs            TEXT,                            -- JSON：{sessionId?, messageId?, requestID?, jobRunId?}
  retention_class TEXT NOT NULL DEFAULT 'audit' CHECK (retention_class IN ('transient','audit')),
  created_at      INTEGER NOT NULL                 -- 入库时间（ms）；occurred_at ≠ created_at
);
CREATE INDEX IF NOT EXISTS idx_pe_type_time    ON product_events(type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_pe_subject_time ON product_events(subject_kind, subject_id, occurred_at);
```

- **append-only**：无 UPDATE/DELETE 路径（Phase 1 无 purge job；`transient` 类为未来清理预留分类）。
- `occurred_at` ≠ `created_at`：迟到/回填事件不篡改历史。
- **不保存**：Pulse 文案（属 Attention/L1 呈现层）、Attention 状态、任何因 notification 成败而变的字段。
- **`fund.estimate` 不入库**（明确决策）：它是每 5 秒一次的 L1 数据面（PM §22 named standing rule 的行情呈现），高频、无规则消费、无证据价值——入库是噪音。`market.rule.evaluated`（每日一次的规则运行事实）才入库。
- **`session.idle` 不入库**（明确决策）：无规则消费、PM 禁止其成为 Attention、Phase 1 无证据价值。

### 1.2 `attention_items`

```sql
CREATE TABLE IF NOT EXISTS attention_items (
  id                   TEXT PRIMARY KEY,           -- 'att_' + ULID
  dedup_key            TEXT NOT NULL UNIQUE,       -- 见 §4；UNIQUE 是并发安全的核心
  subject_kind         TEXT NOT NULL CHECK (subject_kind IN ('session','fund','project','permission')),
  subject_id           TEXT NOT NULL,
  domain               TEXT NOT NULL CHECK (domain IN ('coding','market')),
  creation_reason_kind TEXT NOT NULL CHECK (creation_reason_kind IN ('assignment-authorization','named-rule','user-instruction')),
  creation_reason_ref  TEXT NOT NULL,              -- ruleId / assignmentId / 指令记录 id
  session_id           TEXT,                       -- 关联 Agent Session（permission 类必有；market 类可空）
  state                TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open','handled','dismissed','expired')),
  created_at           INTEGER NOT NULL,           -- = 成为 OPEN 的时刻（trigger/occurrence），非 instruction time
  expires_at           INTEGER,                    -- NULL = 永不因时间过期（PM §17）
  handled_at           INTEGER,
  dismissed_at         INTEGER,
  expired_at           INTEGER,
  handling_ref         TEXT,                       -- 指向 handling artifact（≠ session_id，见 §1.3）
  title                TEXT NOT NULL,
  summary              TEXT NOT NULL,
  provenance           TEXT NOT NULL,              -- JSON {createdBy, backfilled?, note?}
  CHECK (state <> 'handled'   OR handled_at   IS NOT NULL),
  CHECK (state <> 'dismissed' OR dismissed_at IS NOT NULL),
  CHECK (state <> 'expired'   OR expired_at   IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_att_state_exp  ON attention_items(state, expires_at);
CREATE INDEX IF NOT EXISTS idx_att_session    ON attention_items(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_att_subject    ON attention_items(subject_kind, subject_id);
```

**`created_at` 的两条通道定义**（严格对齐 PM §16.3）：

- **evidence-backed**（permission / market）：`created_at` = 触发 Event 的 `occurred_at`（条件成立、判毕、成为 OPEN 的那一刻）。回填场景（§10）：真实 ask 时刻不可得 → 取回填入库时刻，`provenance.backfilled = true` 如实标注。
- **instruction-backed**（Phase 1 无实例，通道保留）：`created_at` = 被授权 trigger 的 fire 时刻（`assignment.trigger.fired.occurred_at`），**不是** instruction time。用户"现在就记下来"这类即时指令若要建 item，`created_at` = 指令确认时刻（此刻既是 instruction 也是 trigger）。

**`session_id` 与 `handling_ref` 的语义分离**（不许混同）：

```text
Attention(permission 类)
 ├── session_id   = sess_123          ← 关联/路由的 Agent Session（创建时已知）
 └── handling_ref = perm_reply:xxx    ← handling outcome 的引用（approve/reject 落定后写入）
Attention(market 类)
 ├── session_id   = NULL → 用户 engage 后回填
 └── handling_ref = conv:sess_456#outcome  ← 处理对话的结论引用（Phase 4 起产生）
```

`session_id` 回答"这个事项发生在哪/去哪谈"；`handling_ref` 回答"它被如何处理掉了"。前者可空、可 engage 回填；后者只在终态 HANDLED 时有意义。

### 1.3 `attention_evidence`（canonical 关系表，非 JSON）

```sql
CREATE TABLE IF NOT EXISTS attention_evidence (
  attention_id TEXT NOT NULL REFERENCES attention_items(id) ON DELETE CASCADE,
  event_id     TEXT NOT NULL,          -- 软引用 product_events(id)，故意不加 FK（理由见下）
  recorded_at  INTEGER NOT NULL,
  PRIMARY KEY (attention_id, event_id)
);
```

为什么用关联表而不是 `evidence_refs` JSON：

1. 多 Event ↔ 单 Attention 的**追加**是高频操作，关联表 `INSERT` 天然表达，JSON 要读-改-写整个数组并引入并发丢更新风险；
2. 单 Event ↔ 多 Attention（一事件拆多 subject）在 JSON 里必然冗余复制；
3. 审计/查询（"这个事件支撑过哪些 Attention""这个 Attention 由哪些事实支撑"）是双向 SQL join，不是 JSON 遍历；
4. retention 独立：未来 `transient` 事件清理时**不得级联撕掉审计证据**——因此 `event_id` 故意做**软引用**（无 FK）：product_events 的清理策略变更不会破坏 attention 的证据历史；join 在查询期完成。

**保留 `evidence_refs` JSON 吗？** 不保留该字段。若某 API 响应需要内联 evidence，查询时 join 派生——JSON 只能作为响应序列化，**不是 canonical**。

### 1.4 `attention_interactions`（append-only 交互元数据）

```sql
CREATE TABLE IF NOT EXISTS attention_interactions (
  id           TEXT PRIMARY KEY,
  attention_id TEXT NOT NULL REFERENCES attention_items(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('viewed','opened','engaged')),
  occurred_at  INTEGER NOT NULL,
  metadata     TEXT                     -- JSON（如 {via: 'pulse'|'talk'}）
);
CREATE INDEX IF NOT EXISTS idx_ai_item ON attention_interactions(attention_id, occurred_at);
```

- `viewed`（Pulse 打开列表/详情）、`opened`（详情展开）、`engaged`（经 item 进入 Talk）。
- **这些是交互元数据，不是生命周期**：不得重定义为 seen/acknowledged/in_progress；不推进 state（§6 守卫）；未读/badge 由本表派生。

### 1.5 被裁掉的表（及理由）

- `attention_rules`：Phase 1 只有两条确定性规则，用**代码内注册表**（`lib/product/rules.ts`，`ruleId` 稳定，作为 `creation_reason_ref`）。规则可配置化（DB 行）推迟到规则数量或运营需求出现时——避免为两条规则建配置系统。
- `attention_evaluations`：suppress/无规则命中等评估结果，Phase 1 以 `market.rule.evaluated` 类事件承载审计；独立评估表推迟。
- Open Thread marker 表：**deferred to Phase 4/5**（PM §24 的 marker 语义不依赖 Phase 1 任何路径；现在建表是投机）。

---

## 2. deduplication（可编码策略）

```text
creation_reason_identity : ruleId（+ 条件参数指纹） | assignmentId + triggerId | instructionRecordId
subject_identity         : subject_kind + subject_id（粒度原则见下）
window_identity          : windowPolicy(now) → 'trade:2026-09-08' | 'day:2026-09-08' | 'perm:none' | ...
dedup_key                = sha256(creation_reason_identity | subject_identity | window_identity)
```

**subject 粒度决策**（本设计的关键裁定）：subject 必须细到"两个真正不同的事项绝不共享 subject"。

- permission：`subject_kind='permission'`、`subject_id=requestID`——每个被阻塞的请求是独立事项；**不用 session 做 subject**（否则 `∞` 窗口下，同一 session 的第二个 permission 请求会被第一个的 dedup_key 吞掉——那是语义错误，不是优化）。
- market：`subject_kind='fund'`、`subject_id=code`；window = 交易日（`trade:YYYY-MM-DD`），`expires_at = 当日 15:00`。
- reminder（Phase 5）：window = 指令隐含期限的日历日。

各情形行为：

| 情形 | 行为 |
|---|---|
| OPEN item 已存在（同 key） | `attention_evidence` 追加；不新建、不改状态、不重复通知 |
| DISMISSED 在同 window | 不创建、不复活、不 re-nag；**允许**追加 evidence（事实仍发生了，审计诚实），状态不动 |
| EXPIRED item 同 key | 理论上不应发生（window 关闭后同 key 的触发不再产生）；若因迟到事件出现 → 仅追加 evidence，不新建 |
| window 滚动 | window_id 变化 → dedup_key 不同 → 新 item（PM §18：新窗口新事项） |
| Event replay（同 id 重复 ingest） | `product_events` 主键冲突 → 跳过入库；evidence 主键 `(attention_id, event_id)` 冲突 → 跳过追加 |
| duplicate Event（不同 id、同事实） | 按**事实**处理：入库两行（都是发生过的事）；evidence 各自追加；Attention 仍单条（dedup 兜底） |
| **并发创建** | `attention_items.dedup_key` 的 **UNIQUE 约束**是硬保证：`INSERT ... ON CONFLICT(dedup_key) DO NOTHING` → 按 dedup_key SELECT 取既有 id → 走追加分支。**不依赖应用层 check-then-insert**（虽然 better-sqlite3 同步单连接天然串行，UNIQUE 是面对未来多进程/迁移的正确防线） |

---

## 3. EventIngestor（统一入库入口）

```ts
// lib/product/event-ingestor.ts（签名级设计）
interface EventEnvelope {
  id: string;                       // 源侧生成；opencode 桥 = 'evt_'+ULID
  type: EventType;                  // 1.1 白名单
  subject: { kind: SubjectKind; id: string };
  occurredAt: number;
  source: EventSource;
  payload?: unknown;                // 紧凑 JSON
  refs?: Record<string, string>;
  retentionClass?: 'transient' | 'audit';
}

EventIngestor.ingest(env): { event: ProductEvent; evaluations: EvaluationOutcome[] }
```

职责（严格分层）：

1. **validate** envelope（type 白名单、subject 完整、occurred_at 合法）；
2. **persist** Event（`INSERT OR IGNORE` 幂等；主键冲突 = 重复投递，直接返回既有行）；
3. **evaluate**：把 Event 交给 **rule evaluator**（§4）——ingestor 只负责"入库 + 转交评估"，**自身不拥有任何 Attention authority**；没有规则命中就没有后续；
4. 返回 `{event, evaluations}`，供调用方（bridge/handler）与审计使用。

铁律：**Event 入库成功 ≠ Attention 创建成功**。两者独立事务、独立审计：事件先 commit；评估/创建失败只记日志与 evaluation outcome，事件永不回滚——修复后可经重放/回填补偿。

---

## 4. Rule evaluator 与两条 Phase 1 规则

```ts
// lib/product/rules.ts（代码内注册表；ruleId 稳定 = creation_reason_ref）
interface AttentionRule {
  ruleId: string;                          // 'opencode.permission.blocking' | 'market.target-nav-threshold'
  accepts: (e: ProductEvent) => boolean;
  evaluate: (e: ProductEvent) => RuleOutcome;
  // RuleOutcome:
  //  | { kind: 'not-applicable' }
  //  | { kind: 'suppressed'; reason: string }              // 条件成立但 fire-time 无处理需要
  //  | { kind: 'create'; spec: AttentionSpec }             // subject/reason/expiresAt/title/summary/window
}
```

**Rule 1 `opencode.permission.blocking`**（domain=coding）

- accepts：`opencode.permission.asked`。
- evaluate：条件恒成立（有请求被阻塞 = 需要 user 授权，PM §16.1 user-action test 天然通过，不可 suppress）→ create：
  - `subject = {permission, requestID}`，`session_id = props.sessionID`；
  - `creation_reason_kind='named-rule'`，`creation_reason_ref='opencode.permission.blocking'`；
  - `expires_at = NULL`（无窗口不过期，PM §17）；
  - title/summary 由 payload 生成（permission 名 + patterns）。
- `opencode.permission.replied` → 不建 item；转交 AttentionService 的 **handle 桥**（§6）。

**Rule 2 `market.target-nav-threshold`**（domain=market）

- accepts：`market.rule.matched`。
- evaluate：diff > 0 已由 handler 判定（确定性规则本体在 handler，规则层只做授权与塑形）→ create：
  - `subject = {fund, code}`；`window = trade:<当日>`；`expires_at = 当日 15:00`；
  - `creation_reason_kind='named-rule'`，`creation_reason_ref='market.target-nav-threshold'`；
  - title/summary："{fund.name} 估净 {x} 高于目标 {y}（+{diff%}）"。
- `market.rule.evaluated`（无命中）→ 不建 item（silence is correct，PM §16.3）。

为什么 permission Attention **不能降级成 L1**：它通过 user-action test（用户必须批准/拒绝，否则 agent 永久阻塞）——任何" statement 化"都是把义务走私进通知（PM §22 明令禁止）。

---

## 5. Event ingestion flow（端到端）

```text
[bridge: opencode tap]                 [bridge: market handler]            [future: agent endpoint]
常驻单连接 /global/event                fund-estimation handler
  ↓ 白名单过滤                            ↓ 无条件入库（先于通知）
permission.asked/replied                market.rule.matched / .evaluated
  ↓            ↓                          ↓
  │ (startup backfill: GET /permission → 对缺失的 asked 补 ingest，provenance.backfilled=true)
  └────────────┴────────────┴──────────────► EventIngestor.ingest()
                                                ↓ validate
                                                ↓ product_events（append，幂等）
                                                ↓ rule evaluator
                                                ↓ dedup（UNIQUE 约束）＋ evidence
                                                ↓ attention_items（OPEN）
attention.created/updated → in-process emitter → /api/product/stream（SSE）
```

opencode tap 的实现要点：**进程内常驻单连接**（模块级单例，随 BFF 启动，指数退避重连），独立于客户端路由——客户端 `/api/opencode/stream` **保持现状不动**（chat delta 通道）。tap 白名单：`permission.asked` / `permission.replied` / `session.deleted`（subject 终止追踪，Phase 1 只入库不动作）。`session.idle` / `message.*` **不入库**。

---

## 6. AttentionService（lifecycle 实现）

```ts
// lib/product/attention-service.ts（签名级设计）
AttentionService.create(spec: AttentionSpec): { item; created: boolean }   // evaluator 专用；dedup 内建
AttentionService.handle(id, { artifactRef, actor }): AttentionItem         // OPEN→HANDLED
AttentionService.dismiss(id, { actor }): AttentionItem                     // OPEN→DISMISSED
AttentionService.expireDue(now: number): AttentionItem[]                   // OPEN→EXPIRED（扫 expires_at）
AttentionService.get(id): AttentionItem | null                             // 只读；viewed 交互另记
AttentionService.list({ state?, domain?, subject? }): AttentionItem[]      // 只读
AttentionService.markEngaged(id, { sessionId })                            // 回填 session_id/handling 上下文（Phase 4 启用）
```

状态转换与守卫：

- 迁移实现为条件 UPDATE：`UPDATE attention_items SET state=?, ..._at=? WHERE id=? AND state='open'`——`changes=0` 即目标已终态，拒绝并返回当前行。**终态不可逆**：HANDLED/DISMISSED/EXPIRED → 一切回 OPEN 的路径不存在（PM 未定义 reopen，实现即禁止）。
- `handle` 必须携带 `artifactRef`（permission reply id / 对话结论引用）——无 artifact 不算 HANDLED（PM §17）。
- **零迁移触发源**（全部由守卫保证）：viewing（get/list 只读）、Talk open/close、Session completion/deletion、Assignment revoke/complete——这些路径根本不调用 lifecycle 方法。
- `expire` 与 suppression 的区别在实现上天然成立：suppress 发生在**创建前**（无行），expire 作用于**已存在的 OPEN 行**。
- 每次 `handle/dismiss` 同时写 `attention_interactions`（type=engaged）与 `handling_ref`。

---

## 7. Expiry worker

- 注册为 scheduler job：`registerJob('attention-expiry', ...)`，cron `* * * * *`（每分钟，廉价：一条索引 UPDATE）。
- 语义：`UPDATE attention_items SET state='expired', expired_at=? WHERE state='open' AND expires_at IS NOT NULL AND expires_at <= ?`，逐行产出 `attention.expired` 变更事件给 SSE。
- 明确不变式（全部已由 schema/守卫承载）：`expires_at IS NULL` 永不过期；suppression ≠ expiration（一个在创建前、一个在创建后）；Assignment Completed/Revoked ≠ expiration（不触碰行）；Session deletion ≠ 自动 expiration（Phase 1 保持 OPEN，见 §10 决策）。

---

## 8. 现有 publisher 迁移

目标态：

```text
source（opencode tap / market handler / 未来 agent）
  ↓ EventIngestor
product_events（事实，append-only）
  ↓ rule evaluator
attention_items（+ evidence / interactions）
  ↓ in-process emitter
/api/product/stream（attention.created / attention.updated）← Pulse 新通道
  ↘ delivery（邮件/企微/微信，best-effort，Phase 2+ 抽出）
```

逐项裁决：

- **`ackEvent()` 不再操作 Event**。Event 是事实，不可被 ack 删除。现有 `/api/events/ack` 保留为**兼容 shim**：`{type:'fund.trade-alert'}` → 定位该 domain/subject 最新的 open market Attention → `AttentionService.dismiss`（映射裁决见下）→ 不删任何 product_event。手机端"确认处理"按钮行为不变（needs-you 消失），语义从"删事件"变为"关 item"。
- **ack → DISMISSED 的映射裁决**：现有按钮"确认处理"不产生处理 artifact（交易在线下发生），按 PM §17 只能合法落入 DISMISSED（显式用户终止、无产物）。Phase 4+ 可增"已执行交易 → HANDLED + artifact"按钮；届时"确认处理"与"已执行"两个动作并存。
- **`/api/events/stream` 过渡期保留**：继续推 `fund.estimate`（L1 数据面，不变）；`fund.trade-alert` 改为**由 Attention 创建派生的 legacy shim**（从 item 反推旧 payload），保证旧前端 needs-you 行为不变。Phase 3 手机端切换到 `/api/product/stream` + attention API 后，shim 与 ack shim 一并退役。
- **publisher.ts 的 `lastEvents/getLastEvent` 退役**：重连补推由持久 store 天然满足（新连接查 `state='open'` 的 items + 近期事件尾）。

---

## 9. fund-estimation 迁移（最小变更边界）

**Phase 1 拆到哪里**：一次性完成「事件入库 + Attention 创建 + 通知解耦」，因为三者是同一条 handler 内的三行改动，拆开反而要做两次迁移：

```text
旧：estimates → 通知（成功？）→ publish(trade-alert)
新：estimates
     ├─ ingest market.rule.matched / .evaluated（无条件，先于一切通知）
     ├─ evaluator → Attention（dedup：同交易日同基金单条）
     ├─ 通知（email/wechat/wecom）＝ best-effort delivery：失败仅记日志，
     │   不影响事件与 Attention 的存在
     └─ legacy SSE shim：attention.created → fund.trade-alert（旧前端兼容）
```

明确不做的：通知投递的队列/重试机制（Phase 2+ 的 delivery 层）；`fund.estimate` 入库。

## 10. OpenCode permission → Event → Attention → HANDLED

```text
permission.asked（opencode tap 或启动回填）
  ↓ EventIngestor.ingest
product_events（opencode.permission.asked）
  ↓ rule: opencode.permission.blocking
Attention（subject=permission:requestID，session_id，creation_reason=named-rule，expires_at=NULL）
  ↓ SSE attention.created（Phase 3 前旧前端无感）
用户在聊天弹窗 approve / reject
  ↓ runtime permission reply（POST /permission/:id/reply，现有链路）
  ↓ bridge 捕获 permission.replied（含 requestID + reply）
  ↓ handling artifact = reply 记录
AttentionService.handle(item, {artifactRef: 'perm_reply:'+requestID})
  → HANDLED
```

三条禁则：收到 permission **event** ≠ HANDLED（创建时是 OPEN）；**不能降级为 L1**（user-action test，见 §4）；reject 也是合法 HANDLED artifact（拒绝决定是决定，PM §17）。启动回填：bridge 启动时 `GET /permission`（经 `proxyRequest`），对列表内每个 pending request 补 ingest（`provenance.backfilled=true`）——弥补 live tail 重启丢事件。

---

## 11. Pulse / API 边界

```text
内部（仅服务端调用，非 HTTP）：
  EventIngestor.ingest / AttentionService.create —— 客户端永远不能直接创建 Attention
用户面（JWT，同现有 auth）：
  GET  /api/product/attention?state=&domain=       （list；viewed 交互记录在此副作用写入）
  GET  /api/product/attention/:id                  （get；同上）
  POST /api/product/attention/:id/handle           {artifactRef?}        （Phase 1：permission 桥自动；端点同开）
  POST /api/product/attention/:id/dismiss          {}
  POST /api/product/attention/:id/engage           {sessionId}           （预留，Phase 4 启用）
SSE：
  /api/opencode/stream   —— 不动（chat delta 专用）
  /api/events/stream     —— 过渡期保留（fund.estimate L1 + trade-alert shim），Phase 3 退役
  /api/product/stream    —— 新增：attention.created / attention.updated（含 expired/handled/dismissed 终态广播）
```

拆分理由：现有 `/api/events/stream` 混装 L1 数据（estimate）与需要用户处理的 trade-alert，且无 item 语义——UI 语义不能再寄生其上；attention stream 只广播 item 生命周期事实。

---

## 12. Migration strategy

| 现有物 | 策略 |
|---|---|
| in-memory `lastEvents` | **不迁移历史**（本就易失、单槽、无审计价值）；新 store 从上线时刻起记录 |
| `fund.trade-alert`（内存事件） | **不转换旧数据**；新 pipeline 上线即产生 product_event + attention；旧 SSE 由 shim 派生（§8） |
| 手机端 `alert` state / `/api/events/ack` | 双轨过渡：Phase 1-2 旧通道原样可用（ack→dismiss shim）；Phase 3 手机端切 `/api/product/stream` + attention API，随后退役 shim |
| backward compatibility 红线 | 过渡 shim 允许，**违反新语义的行为不允许保留**：ack 不再删事件；通知失败不再吞事件；`lastEvents` 不再是任何语义的 source of truth |

## 13. Schema migration

Phase 1 不引入迁移框架：四张表 DDL 追加进 `initDatabase()` 的执行块（`CREATE TABLE IF NOT EXISTS` 幂等，与现有六张表同风格）；`_migrations` 表保留但继续不用（单开发运维、表均为新增，无破坏性变更；等出现第一个 ALTER 需求再立 runner——避免为四张新表预建机制）。

关键 DDL 裁决：

- `dedup_key` 用 **`UNIQUE` 约束**（不是普通索引 + 应用层检查）：它是并发创建的唯一硬防线，语义上（reason, subject, window) 三元组本就至多一条 item（PM §19 + §16.4 同窗口不 re-nag），唯一性成立；`ON CONFLICT DO NOTHING` + 回读是标准路径。
- `attention_evidence.event_id` **故意无 FK**（软引用）：未来 `transient` 事件清理不得级联撕毁证据历史。
- 时间戳统一 **INTEGER ms**（与 OpenCode `time.created/updated` 及前端消费一致，不用 SQLite `datetime('now')` 文本）。
- 枚举用 **CHECK 约束**（SQLite 无原生 enum）；JSON 列为 TEXT，解析在应用层。
- FK：`attention_evidence.attention_id` / `attention_interactions.attention_id` → CASCADE（item 删除连带清理从属数据）；`foreign_keys = ON` 已由 `database.ts` 开启。

## 14. Phase 1 Definition of Done（验收测试矩阵）

**Event**

- [ ] ingest 后 BFF 重启，事件仍在（持久化）
- [ ] 同 id 重复 ingest → 单行（幂等）
- [ ] 迟到事件（occurred_at < created_at）如实共存
- [ ] `SELECT * FROM product_events` 构成可读历史（type/subject/时间线）

**Attention**

- [ ] rule create → OPEN 行 + evidence 行
- [ ] 同 dedup_key 二次触发 → 不新建，evidence 追加
- [ ] dismiss → DISMISSED；同窗口再触发 → 不新建不复活
- [ ] handle（带 artifactRef）→ HANDLED；artifact 缺失 → 拒绝
- [ ] expiry sweep：到点 → EXPIRED；`expires_at NULL` 永不命中
- [ ] 重启后 OPEN item 仍 OPEN（生命周期持久）

**Permission**

- [ ] `permission.asked` → Event → Attention（session_id 绑定，expires_at NULL）
- [ ] 同 session 第二个 permission request（新 requestID）→ **新** Attention（subject 粒度裁决）
- [ ] approve/reject → reply 事件 → 对应 item HANDLED（artifact=reply）
- [ ] BFF 重启 → 启动回填把 pending permission 补成 item（backfilled=true）

**Market**

- [ ] 14:50 threshold 命中 → Event（无条件）→ Attention（交易日窗口，15:00 过期）
- [ ] email/wechat 全部发送失败 → Event 与 Attention **仍然存在**（解耦判据）
- [ ] 到 15:00 未处理 → EXPIRED；次日再命中 → 新 item（窗口滚动）
- [ ] 无命中日 → 仅 `market.rule.evaluated`，无 Attention

**Negative（语义守卫）**

- [ ] `session.idle` → 不入库、无 Attention
- [ ] Event 无命中规则 → 仅入库，无 Attention
- [ ] GET attention / Pulse 打开 → 仍 OPEN（零状态写入）
- [ ] 打开 Talk → 仍 OPEN
- [ ] Session 关闭/删除 → Attention 原样（无自动 EXPIRED）
- [ ] Assignment revoked（Phase 5 前模拟）→ 已有 Attention 原样
- [ ] 重复创建并发（同 key 双 ingest）→ 恰好一条 item（UNIQUE 生效）

## 15. Implementation order（下一轮编码顺序）

1. DDL 追加进 `initDatabase()` + 四表（§1）
2. `lib/product/events.ts`（repository：insert/get/list）
3. `lib/product/attention-service.ts`（create/handle/dismiss/expireDue/get/list/markEngaged）
4. `lib/product/rules.ts`（两条规则）+ `lib/product/event-ingestor.ts`
5. opencode tap（常驻单连接 + 白名单 + 启动回填）
6. `fund-estimation.ts` 解耦改造 + legacy shim
7. expiry job + `/api/product/stream` + attention REST 端点 + ack shim
8. 测试（vitest，矩阵 §14；BFF 侧测试文件随 `packages/web` 现有约定放置）

## 16. Known implementation decisions（本轮裁决记录）

1. `dedup_key` 加 UNIQUE（并发硬防线；语义上三元组至多一 item，见 §2/§13）。
2. permission subject = requestID（subject 粒度裁决；session 做 subject 会吞掉后续请求）。
3. ack 兼容 shim → DISMISSED（无 artifact 的用户终止的唯一合法终态）；Phase 4 增"已执行 → HANDLED"动作。
4. `fund.estimate` / `session.idle` / `message.*` 不入库（L1 数据面与 runtime 噪音，无规则消费）。
5. 规则为代码注册表（两条），DB 化推迟。
6. opencode tap 无重放 → 启动回填补偿 permission；其余类型接受丢失（Phase 1 无消费方）。
7. Session 删除的 permission item：保持 OPEN（PM §17 无窗口不过期），呈现层标注；产品侧裁决记录于 IMPLEMENTATION_MODEL §14。
8. 本 Phase 合并 IMPLEMENTATION_MODEL 的 Phase 1+2（无规则则管道不可验收）；Pulse 改造（原 Phase 3）留下一轮。

**本轮不写业务代码。** 下一轮（编码轮）按 §15 顺序实施：DB migrations → repositories → EventIngestor → AttentionService → rules → bridges → expiry → API/SSE → 测试。`PRODUCT_MODEL.md` 全程只读。
