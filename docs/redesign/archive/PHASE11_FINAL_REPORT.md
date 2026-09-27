# PHASE11_FINAL_REPORT.md —— Agent Observation（Phase 11）

> 基线：`PRODUCT_MODEL.md` 冻结（**未修改**，`git diff -- docs/redesign/PRODUCT_MODEL.md` = 0 行）；实现依据 `docs/redesign/PHASE11_DESIGN.md`（实现状态/偏差见其 §28）。
> 范围：MVP `observation.market.repeated-decline`——deterministic pattern detection → `agent.observation.recorded`（审计）→ Assignment Proposal（绝不 activate）。
> 不做（本轮冻结）：LLM observation、coding/email/user-profiling/cross-domain、L1/Attention output、Memory/KB 写入、direct notification、Observation API/UI、distributed scheduler。

---

## 1. 修改文件

### BFF（family-finance/packages/web）

**新增：**
- `lib/observation/types.ts` — `ObservationRule` / `ObservationJudgment` / `ObservationOutcome`
- `lib/observation/rules.ts` — Rule Definition registry（`OBSERVATION_RULES`；**非授权 registry**）
- `lib/observation/grants.ts` — Observation Authorization（`OBSERVATION_GRANTS` 静态单用户配置；不建表）
- `lib/observation/observation-detector.ts` — deterministic `repeated-decline`（无 LLM）
- `lib/observation/observation-service.ts` — 授权 → judgment → Event 审计 → Output Policy → proposal（幂等/cooldown/recovery）
- `lib/observation/observation-runtime.ts` — `sweepObservations()` + `observationSweepHandler`
- `lib/observation/observation.test.ts` — Phase 11 回归 28 项
- `test/phase11-observation-smoke.mjs` — real smoke（真实 BFF + `data/finance.db`）
- `docs/knowledge-base/modules/observation.md` — 模块知识库

**修改：**
- `lib/product/types.ts` — `PRODUCT_EVENT_TYPES += "agent.observation.recorded"`
- `lib/product/events.ts` — `listSubjectKeys()`（candidate loader / subject grouping）
- `lib/product/assignment-proposal-repo.ts` — `findByInstructionRef()`（derived dedup key）
- `lib/product/migrations.ts` — `20260911-product-p11-observation-proposal-dedup`
- `lib/scheduler/handlers/index.ts` — 注册 `observation-sweep`
- `lib/scheduler/store.ts` — seed `observation-sweep`（`* * * * *`）
- `docs/knowledge-base/{INDEX,DATA}.md`、`modules/scheduler.md` — Phase 11 同步

### agent-mobile（docs only）

- `docs/redesign/PHASE11_DESIGN.md` — 顶部实现状态 + §28 implementation status / actual deviations（不改设计决策）
- `docs/redesign/BACKLOG.md` — Future 行收敛为「market MVP 已实现；coding/L1/Attention 仍 Future」

### Mobile 代码

**零修改**（本轮无 mobile 需求）。

---

## 2. Database / migration changes

- 新增 migration `20260911-product-p11-observation-proposal-dedup`：

```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_prp_observation_ref
  ON assignment_proposals(instruction_ref)
  WHERE instruction_ref IS NOT NULL AND instruction_ref LIKE 'observation:%';
```

- 作用：observation-born proposal 的 DB 级幂等并发防线（derived key 前缀 `observation:`）。
- 幂等、可重跑、不破坏旧数据；已在真实 DB applied（`_migrations` 已含该行）。
- `agent.observation.recorded` **无需 schema 变更**：`product_events.type` 无 CHECK；`source` CHECK 已含 `agent-observation`。
- **未建** canonical observation 表。

---

## 3. Observation runtime

- `sweepObservations()`：复用现有 scheduler（`scheduler_jobs` + handler registry），不引入新框架。
- 仅评估「有新相关事件」的 subject：进程内 `lastSweepAt` cursor + 重启/首跑 30 天 lookback 兜底；一次读 window 内候选，非逐事件触发。
- 无 pattern → 不产出、不写 Event（no-op suppression）；cursor 仅在完整成功后推进（失败下轮重看，dedup 兜底）。

```text
product_events
  → observation-sweep（每分钟）
  → Rule Definition + Authorization（双命中）
  → candidate Events（eventTypes + subjectScope + window）
  → deterministic detector
  → agent.observation.recorded
  → Output Policy（allowedOutcomes 白名单）
  → assignment-service.propose
```

---

## 4. Observation authorization

- `rules.ts` = rule definition registry；`grants.ts` = 当前用户授权（MVP 静态 code config，**不建 database table**）。
- `evaluateSubject` 先查 grant；**注册 rule ≠ 自动授权**——rule definition + grant 同时命中才可执行。
- 测试：grant 缺失 → `unauthorized`，零 observation / 零 proposal / 零 active assignment。

---

## 5. Detector

- 纯 deterministic，无 LLM、无 prompt、无 reasoning trace。
- 判定：same fund（`payload.code` / `refs.fundCode` 必须等于 subject）＋ 每个 `tradeDate` 取最新事件（同交易日多事件只算一个评估点）＋ 最近 `minEvidenceEvents=3` 个不同评估点**全部 `diff < 0`**。
- `market.rule.matched` 不被简单等价为 repeated-decline（wrong subject / wrong type / 缺 tradeDate / 缺 diff / 非负方向均不成立）。

---

## 6. agent.observation.recorded

- 经现有 `eventIngestor` 写入 `product_events`；`source="agent-observation"`、`retention_class="audit"`。
- payload：`{ruleId, subject, evidenceEventIds, judgmentSummary, warranted, outcome, pattern}`；不保存 chain of thought / prompt / full model output。
- `outcome` 由 Output Policy 计算（processing result），不是 Observation intrinsic field。
- **Event persistence ≠ Memory/KB persistence authority**：本路径不调用 memory/KB/Attention/L1/delivery。

---

## 7. Scheduler

- `handlers/index.ts` 注册 `observation-sweep`；`ensureSeedJobs()` 幂等 seed（每分钟、enabled）。
- 真实运行输出：`rules=1 subjects=1 produced=0 deduplicated=0 cooldown=0 unauthorized=0 no-pattern=1`（两次调用均 success）。
- 可重复执行 / 可恢复 / 并发安全：确定性 event id + DB UNIQUE 为最终防线。

---

## 8. Proposal integration

- 只走现有 `assignment-service.propose`（不绕过 service）：
  - `createdBy = "observation:<ruleId>"`；
  - `instructionRef = "observation:<ruleId>:<observationEventId>"`（observation → evidence 可审计链）；
  - ongoing / market / `fund-nav-above-target` / 14:50 工作日 schedule。
- market + ongoing 在 confirmation matrix 下**必然要求确认** → 只产生 proposal。
- **Observation → Active Assignment 不存在**：测试断言 `proposal exists` 且 `assignments.active` 为空；确认仍必须走 `assignment-service.confirm`。

---

## 9. Idempotency

- Observation 自身：确定性 event id `evt_obs_<sha256(ruleId|subject|sorted evidence ids)[0:26]>` + `product_events` PK（`INSERT OR IGNORE`）。
- Proposal：`instructionRef` 预查 + partial UNIQUE index（并发/重放最终防线）。
- **same subject + same rule + same effective evidence window → 一次 observation opportunity**。
- 中断恢复：Event 已写、proposal 缺失 → 重放按 instructionRef 补齐，不重复 Event。
- cooldown：同 subject+rule 72h（`MARKET_REPEATED_DECLINE_COOLDOWN_MS`），新 window 在冷却内不产生新 proposal。
- 测试：`run / run again / run again` → one observation, one proposal；强制重放同一 window → `deduplicated`。

---

## 10. Tests

| 类别 | 覆盖 |
|---|---|
| Rule | 注册 rule 定义正确（eventTypes/subjectScope/window/pattern/minEvidenceEvents/allowedOutcomes/cooldown） |
| Authorization | grant 存在 → 可执行；grant 缺失 → 无 observation/无输出；sweep 同样拒绝 |
| Candidate filtering | unrelated event / wrong type / wrong subject / 缺字段 → ignored |
| Cardinality | 2 个评估点 → 无；3 个 → 有；同 tradeDate 多事件只算 1 点 |
| Pattern | same fund + 3 distinct tradeDate + diff<0 → observation；different fund / 非负方向 / 最新点覆盖 → 无 |
| Persistence | observation → exactly one `agent.observation.recorded`（payload 合同字段校验） |
| Idempotency | run×3 → 1 observation + 1 proposal；重放 dedup；cooldown；中断恢复 |
| Proposal | observation → proposal（createdBy/instructionRef/trigger）；proposal ≠ active；confirm 路径可用 |
| Negative authority | allowedOutcomes 不含 proposal → 有 judgment Event、无 proposal；observation 不建 Attention |
| Memory/KB | 真实临时 `MEMX_ROOT` / `LLM_WIKI_VAULT` 目录前后快照一致（零写入） |
| Migration | partial unique index 存在且可重复执行 |

| 套件 | 结果 |
|---|---|
| BFF vitest（全量） | **23 files passed / 3 skipped；224 tests passed / 5 skipped**（Phase 11 新增 28） |
| BFF tsc `--noEmit --skipLibCheck` | **CLEAN** |
| Mobile vitest（无修改） | 16 files passed，113 tests passed |
| Mobile tsc（无修改） | CLEAN |

---

## 11. Real smoke（REAL / SIMULATION / NOT EXECUTED）

**REAL（已执行）**
- BFF 重启后真实日志：`[migrations] applied 20260911-product-p11-observation-proposal-dedup`、`[scheduler] scheduled "observation-sweep" cron=* * * * *`。
- `POST /api/scheduler/observation-sweep/run` 真实执行两次：`produced=0 no-pattern=1`，`observationEventCount=0`、`observationProposalCount=0`（真实 DB 无污染、无 false positive）。
- 数据条件：真实 `market.rule.matched` 全部为正 diff（`+0.0087` / `+0.0178`，见 `test/phase11-observation-smoke.mjs` 输出），不满足 `diff < 0`。

**SIMULATION（vitest fixture integration）**
- 3 个负 diff 评估点 → detector → `agent.observation.recorded` → Assignment Proposal 全路径；
- 同 window 重放 → dedup；cooldown；中断恢复补齐；confirm → Active（治理路径）。

**NOT EXECUTED（如实声明，不伪造）**
- 真实 repeated-decline → proposal 的端到端链路：当前 runtime 无 decline 方向的 `market.rule.matched` 生产者，未伪造 production Event（PHASE11_DESIGN §23 允许 simulation 覆盖）。

**E2E（已执行，环境数据依赖）**
- `pnpm e2e:nosend`（pulse-e2e）：**4/6**；`phase9-e2e.mjs`：**8/9**。
- 唯一失败均为 `Needs you` 分组断言；root cause = 真实 DB 当前 **0 条 open Attention**（31 expired / 11 handled / 2 dismissed；市场 Attention 有效期至 15:00 收盘，运行时为晚间），与 Phase 11 无关（observation 无 Attention 写路径），无 JS console/page error。
- 未修改测试、未放宽 assertion、未跳过步骤。

---

## 12. PRODUCT_MODEL unchanged

```text
git diff -- docs/redesign/PRODUCT_MODEL.md   →  (empty)
```

**未修改。** 本轮全部语义（permitted observation rule、judgment vs output、proposal ≠ activation、Event persistence ≠ Memory/KB authority）均为 PM §19/§16.2/§10/§6 原则内落实。

---

## 13. Deviations / known issues

1. **`allowedOutcomes` 实现为 `["proposal"]`**（设计 §18 示例为 `["proposal","l1"]`）——按本轮冻结范围只实现 proposal output path；L1/Attention 未实现（§13）。
2. **cooldown = 72h**（设计未指定具体数值；取一个完整 window 周期）。
3. **真实数据无法触发**：`market.rule.matched` 现仅由 fund-estimation 在 `diff > 0` 时发出；未来需 decline 方向的 matched 生产者（或扩展 eventTypes），本轮不改。
4. **E2E 数据/时段依赖**：`Needs you` 断言依赖盘中 open Attention；晚间/无 open item 时失败，非回归。
5. **按 §24 未实现**：LLM observation、coding/email/user-profiling/cross-domain、L1/Attention output、Memory/KB 写入、direct notification、distributed scheduler、Observation API/UI。
6. 新增 migration `20260911-product-p11-observation-proposal-dedup` 已 applied；`agent.observation.recorded` 无 schema 变更。

---

## 14. Authority 边界确认（代码实现未破坏）

```text
Observation Rule Definition（rules.ts registry）
        ≠ Observation Authorization（grants.ts；注册不自动授权；双命中才执行）        ✓ 测试
        ≠ L1 Authority（无 L1 代码路径；grant 不蕴含 L1 presentation）             ✓ 无路径
        ≠ Attention Authority（不 import AttentionService）                        ✓ 测试无 Attention
        ≠ Assignment Authorization（只 propose，绝不 activate）                     ✓ 测试 active 为空
        ≠ Event Persistence（Event 仅 product_events 审计记录）                     ✓
        ≠ Memory / KB Persistence Authority（零调用；沙箱目录零写入）               ✓ 测试

Observation（judgment）
        ≠ Output（outcome 由 Output Policy 计算，非 intrinsic field）              ✓ 测试 outcome=none

Proposal ≠ Active Assignment（confirm 仍走既有 governance）                        ✓ 测试
```

不存在：`rule registered → automatically authorized`、`allowedOutcomes → authority`、`observation → auto Attention/Assignment/Notification/Memory/KB`。

---

**全部 Phase 1–10 测试保持绿色 / Phase 11 测试绿色 / tsc clean / real smoke 如实报告 / PRODUCT_MODEL 零变更。未进入 Phase 12。**
