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
