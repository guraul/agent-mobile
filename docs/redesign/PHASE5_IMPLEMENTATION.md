# PHASE5_IMPLEMENTATION.md —— Assignment Runtime 语义决策（Phase 5 + 5.5）

> 状态：Phase 5 落地 + Phase 5.5 hardening 后定稿
> 语义来源：`PRODUCT_MODEL.md`（冻结，PM §n 引用）；架构来源 `IMPLEMENTATION_MODEL.md`
> 代码基线：family-finance `5f63534` 之后（Phase 5.5 hardening）· agent-mobile Phase 5.5

本文记录 **runtime 语义决策**（不是产品语义——产品语义全部以 PM 为准）。实现与 PM 冲突时记 gap，不改 PM。

---

## 1. Trigger boundary（重启/错过时间）

**决策：skip missed run（不补跑、不 catch up）。**

- `later.setInterval` 的既有语义即"从注册时刻起按下一次 occurrence 触发"——legacy `fund-estimation` job、`attention-expiry`、Assignment trigger 三者一致，不引入第二套语义。
- `14:49:59 restart → 14:50:05 recover`：不补跑 14:50 的 occurrence，等下一次 occurrence。
- restart 恢复 = DB 扫描（`startAssignmentTriggers` 只注册 `state='active'` 且 `trigger_definition.enabled` 的行）。revoked / completed / disabled 均不恢复（有测试）。
- **已知限制（P1）**：one-shot（如"今天 18:00 提醒我"）在错过 occurrence 后保持 active，下一次 occurrence（次日 18:00）才会 fire。这是 skip-missed-run 的直接推论，deterministic 且不制造重复；"错过即处理"策略（catch-up / 过期完成）留待产品定义。

## 2. Execution identity（occurrence correlation）

- `executionId = assignmentId + occurrenceAt`，`occurrenceAt` = 最近一次 ≤ fire 时刻的 cron 计划时刻（later `prev(1, now)`）。
- fired 事件 id 确定性派生：`evt_trig_<assignmentId>_<occurrenceAt>` → 同 occurrence 的重复触发（timer 重复回调 / 手动 replay / 跨进程重入）经 `INSERT OR IGNORE` 幂等——**replay 不制造第二个事实**（Event = a real runtime occurrence happened）。
- 不同真实 occurrence → 不同 id → 各自事件（两个真实事实）。
- fire 入口先做 replay 预检（事件已存在 → `skipped='occurrence-replayed'`，不重复评估）；事件 payload 携带 `executionId` + `occurrenceAt` 供审计关联。

## 3. One-shot concurrency

- **authoritative commit point = `consumeOneShot` 的条件 UPDATE**（`WHERE state='active' AND mode='one-shot'`）。
- 任何时刻至多一个调用者 consume 成功；其余得到 deterministic `skipped='already-consumed'`（含跨进程情形——DB 条件 UPDATE 是最终防线；BFF 单实例部署下单线程同步段天然串行）。
- 恰好一次：execution / `trigger.fired` 事件 / Attention / `assignment.completed` 事件（有并发测试）。
- 评估失败：执行机会仍被消费（single execution opportunity），错误记入 fired 事件 payload；completed 事件仍发出（5.5 修复：失败路径曾漏发）。同 occurrence 重放被幂等挡住——**评估失败不自动重试**（repair 策略属 P1）。

## 4. Revoke race（fire vs revoke）

两种交错都 deterministic，且审计可解释：

- **Case A（revoke 先提交）**：fire 的 state 守卫读到 revoked → `skipped='not-active'`，无事件、无 Attention、无执行。
- **Case B（fire 先获授权）**：
  - one-shot：consume 成功 = 执行已授权；随后的 revoke 条件 UPDATE 不命中（state 已 completed）→ `transitioned=false`，revoke 无效。执行可完成。
  - ongoing：fire 在评估期间 revoke 提交 → 本次执行可完成（fired 事件 + Attention 允许存在）；fired 事件的 `occurred_at` = fire 授权时刻（早于 revoke 时刻）→ 审计链可解释"授权在先、revoke 只影响未来"。
- **不变式**：不存在"Revoked + trigger.fired 但无法解释先后"的状态——fired.occurred_at 与 revoked.occurred_at 的先后即事实顺序（有测试断言）。
- revoke 永远不触碰既有 Attention（服务层无调用路径）；revoke 后 state 守卫 + timer 注销双保险停止未来触发。

## 5. Proposal expiry（Phase 5.5）

- `assignment_proposals.expires_at`（migration `20260906-product-phase55-proposal-expiry`）；propose 时写入 `created_at + 7 天`（**实现策略**：PM 未定义 proposal validity window，7 天为最小合理默认，可调）。
- sweep worker `assignment-proposal-expiry`（cron 每分钟）：`state='proposed' AND expires_at <= now` → `expired`（幂等，仅对 proposed 生效）。
- expired 是 **proposal disposition**（PM §10），不是 Assignment lifecycle：过期提案不激活、不注册 trigger、不创建 Assignment；`confirm` 只接受 proposed（过期后 confirm 被拒，有测试）。

## 6. Legacy seed convergence（Phase 5.5）

收敛不变式：**scheduler_jobs 里存在 `fund-estimation` seed ⇔ 存在 replacement Assignment**（除非用户 revoke 了 replacement）。

| 情形 | 重启后行为 |
|---|---|
| replacement 存在（active/revoked/completed）+ legacy enabled | legacy 压回 disabled（ensureSeedJobs 收敛） |
| replacement 被手动 DELETE + legacy 存在 | **recreate** replacement（新 id、同 authorizationRef），legacy disable——与迁移语义一致（有测试） |
| replacement 被用户 revoke（行还在） | 不 recreate（显式撤销优先），legacy 保持 disabled |
| replacement 与 legacy 都不存在 | no-op（不凭空造 Assignment） |
| legacy 与 replacement 同时 enabled | 不可能：迁移/收敛路径互斥 disable；测试覆盖 |

recreate 是幂等事务（insert replacement + disable legacy）——任何时刻至多一个 enabled 来源（exactly-once）。

## 7. Authority 链（§7 审计结论）

`Attention.creation_reason_kind ∈ {named-rule, user-instruction, assignment-authorization}`（DB CHECK 强制）。生产路径：named-rule 两条（permission blocking / market target-nav）、assignment-authorization（trigger fire）。**scheduler job 自身不创建 Attention**（fund-estimation 只 ingest 事件）；`assignment.trigger.fired` 事件无规则消费——Event 是 evidence/fact，不是 authority。每个 assignment-authorization Attention 的 `creation_reason_ref` 都能解析到 Assignment 行 → `authorization_ref` → `provenance.proposalId`（有审计测试）。

## 8. Cross-system commit points（§13）

| 操作 | authoritative commit point | 失败投影 |
|---|---|---|
| activation | `assignments` INSERT | 事件 ingest 失败 → 责任已激活、审计缺口（log + 可重放）；不回滚 |
| one-shot 授权 | `consumeOneShot` 条件 UPDATE | 后续评估/事件失败 → completed 行事实仍在（5.5 起事件也补发） |
| fired 事实 | `product_events` INSERT（幂等 id） | 失败 → log；确定性 id 允许后续补偿 |
| Attention | `attention_items` INSERT（dedup UNIQUE） | 失败 → 无 Attention；事件仍在（可由 evidence 追溯重放） |
| revoke | `assignments` 条件 UPDATE（state→revoked） | timer 注销/事件失败 → DB state 权威，restart 扫描不再注册 |

无 distributed transaction；每层独立可审计，restart 后从 DB state 收敛（timer 重建、事件不重放、Attention 不重建）。

Orphan 分析：assignments 无 DELETE 产品路径（仅 revoke/complete）→ 无 orphan Attention 来源；内存 timer 指向被手动删除的行 → fire 时 `skipped='not-found'`。

## 9. Observability（Phase 5.5）

结构化日志（correlation 链）：
- `[assignment-service] activated assignment=<id> proposal=<id> ... authorizationRef=<...>`
- `[assignment-triggers] fire assignment=<id> execution=<executionId> occurrence=<iso> [simulated]`
- `[assignment-triggers] fired assignment=<id> execution=<...> event=<eventId> matched= attention=[...] completed=`
- `[assignment-triggers] fire skipped occurrence-replayed ...` / `fire evaluation failed ... error=`
- `[assignment-service] revoked assignment=<id> by=...`

链路：assignmentId → executionId → eventId → attentionId 全程可追踪；`product_events.payload.executionId` 持久化 correlation。

## 10. Runtime permission boundary（§11 审计结论）

Phase 5 代码无任何 OpenCode permission 读写路径（`assignment-triggers/conditions` 仅调用市场数据 HTTP 只读）。Assignment active 不影响 `permission.asked → Attention（named-rule）` 的独立管道（有组合测试）。Assignment 授权的是"未来什么条件可以产生 Attention"（PM §12），action-time approval 恒独立。

---

## §P8 Assignment Execution Resilience（Phase 8 定稿）

### P8.1 Failure 分类（§2）

| 结果 | 分类 | 责任语义 |
|---|---|---|
| condition matched → Attention | 成功 | one-shot → Completed（surfacing happened） |
| condition **false**（评估正常完成、无 match） | **不是 failure** | one-shot → Completed（legit：condition 未成立即无 surfacing 义务，PM §16.3）；ongoing → 留待下次 occurrence |
| **execution error**（评估抛错 / Attention 写失败） | **failure** | **责任未 discharged**——PM §11 completion 条件「surfacing happened **or legitimately suppressed**」不涵盖 error（error 不是 suppression）。**修正了 Phase 5.5 的实现错误**（此前 failure 也 Completed） |
| infrastructure/runtime failure | 同 execution error（MVP 不再细分；partial execution 归入同路径） | 同上 |

### P8.2 Execution identity / attempt（§3/§6）

- `executionId = assignmentId:occurrenceAt`（不变）——同一次 scheduled occurrence 的所有尝试共享。
- `executionAttemptId = executionId#a<attempt>`（implementation identity，非产品实体）。
- fired 事件 id：attempt 1 = `evt_trig_<asg>_<occ>`（Phase 5 兼容），attempt ≥2 = `..._a<n>`。
- 幂等边界：**同 executionId + 同 attempt** → 幂等（确定性 id + replay 预检）；**同 executionId + 新 attempt**（显式 retry）→ 允许真正再次执行，不产生第二个 logical occurrence。

### P8.3 one-shot 执行锁（§6）

- `assignments.execution_lock`（migration `20260907-product-p8-execution-lock`）：fire 开始原子占坑（`WHERE state='active' AND execution_lock IS NULL`），成功后消费（Completed）并释放，失败释放。
- **消费点从「评估前」后移到「成功后」**——失败不再吞掉执行机会。并发第二调用 → `skipped='execution-in-progress'`（deterministic）。
- revoke race 语义随之精确化：执行中（锁持有、未消费）revoke 提交 → revoke 赢（state=revoked，consume 不命中），已建 Attention 保留（PM §11：revocation 不触碰 Attention）；consume 已提交后 revoke → 失效。事件顺序（fired.occurred_at ≤ revoked.occurred_at）保证审计可解释。

### P8.4 Repair（§5/§7-§9）

- one-shot failure → **repair-request Attention**（authority：PM §14 attributable condition——责任无法履行可请求用户决定；`creation_reason_kind='assignment-authorization'`，ref=assignmentId，无时间窗）。
- ongoing failure → 单次不打扰（下次 occurrence 自愈）；**连续 ≥3 次失败** → repair-request Attention（不静默偏离）。
- 恢复（成功执行、streak 归零）→ open repair-request → 系统 **EXPIRED**（creation reason 的 window =「直到执行恢复或用户决定」，系统侧关闭，PM §17）。
- Repair 授权 ≠ activation：`POST /api/product/assignments/:id/repair`（同 executionId 新 attempt）与 `POST /:id/compensate`（missed 决定）都是**用户显式动作**承载的授权；不重建 Assignment。
- Assignment lifecycle 保持三态：**无 failed state**；failure 只存在于 execution 层（事件 + repair Attention）。

### P8.5 Missed one-shot（§10-13）

- scheduler 语义不变：**missed occurrence 不自动执行**（skip missed run，Phase 5.5 决策保留）。
- 启动扫描 `detectMissedOneShots()`（DB-only，deterministic）：active one-shot 且「最近 occurrence 已过 + 晚于 activated_at + 无该 occurrence 的任何 fired 事件」→
  ingest `assignment.execution.missed`（确定性 id `evt_missed_<asg>_<occ>`）+ `provenance.pendingCompensation`。
- 补偿待决期间：正常 fire → `skipped='compensation-pending'`（杜绝错过后的意外未来执行）；状态保持 Active（不自动 Completed/Revoked）。
- **L2 proposal（≠ Attention）**：补偿以待决状态 + missed 事件表达，UI 呈现为 `[Run now]/[Skip]` 提案（当前最小入口 = Talk：`/assignments` 列表标注 + `/run-now <asg>` / `/skip <asg>` 命令；Pulse 卡片为 UX backlog）。
- 用户决定（`POST /:id/compensate`）：
  - `run-now` → **compensation execution**：identity 取补偿发生时刻（新 executionId，**不伪造原 missed occurrence 已执行**），payload 带 `compensation:true + compensatesMissedOccurrence` 审计链；成功 → Completed。
  - `skip` → 用户显式放弃该 one-shot 责任 → **Revoked**（`revokedBy='user:compensation-declined'`，PM §11 用户撤回）。
- 决定记入 `provenance.compensationDecision`（append 到行内 provenance，审计完整）。

### P8.6 Semantic gap 记录（未修改 PM）

PM §11 "its single execution opportunity was consumed and nothing further will fire" 与 P8 行为（failure 释放机会、repair/下次 occurrence 可再执行）存在字面张力。裁决依据：PM 的 completion 定义（「surfacing happened or legitimately suppressed」）排除了 execution error——error 既非 surfacing 也非 suppression，Completed 不成立；"single opportunity" 的意图是防止无限重复履行，由执行锁（并发 exactly-once）+ attempt 幂等 + repair 显式授权共同保证。属 PM 原则内推导，记录于此。
