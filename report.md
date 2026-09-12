# P8：Assignment Execution Resilience —— 最终报告

> 基线：`PRODUCT_MODEL.md` 已冻结，未修改。Phase 1–7 已完成，Architecture audit 已通过。
> 本轮范围：failed trigger repair + one-shot missed-run compensation（backend + minimal Pulse L2 hook）。

---

## 1. Failure 分类

| 结果 | 分类 | 责任语义 |
|---|---|---|
| condition matched → Attention | 成功 | one-shot → Completed |
| condition **false**（评估正常完成、无 match） | **不是 failure** | one-shot → Completed（legit discharge）；ongoing → 留待下次 |
| **execution error**（评估抛错 / Attention 写失败） | **failure** | 责任未 discharged——不 Completed |
| infrastructure/runtime / partial | 同 execution error（MVP 不细分） | 同上 |

代码：`fireAssignmentTrigger` 的 `fail()` 收口（`assignment-triggers.ts:390`）。`condition false` 走正常成功路径，无 `error` 字段、不触发 failure。

## 2. executionId / attempt 语义

- `executionId = assignmentId:occurrenceAt`（保留不变）——同一次 scheduled occurrence 的所有尝试共享。
- `executionAttemptId = executionId#a<attempt>`（implementation identity，非产品实体）。
- 事件 id：attempt 1 = `evt_trig_<asg>_<occ>`（Phase 5 兼容）；attempt ≥2 = `..._a<n>`（`firedEventIdOf`）。
- 幂等边界：**同 executionId + 同 attempt → 幂等**（确定性 id + INSERT OR IGNORE + replay 预检）；**同 executionId + 新 attempt（显式 retry）→ 真正再次执行**，不产生第二个 logical occurrence。

## 3. Retry / repair 实现

- `POST /api/product/assignments/:id/repair` → `assignmentService.repairRetry`（`retry:true` → 新 attempt）。授权由用户显式动作承载，**≠ activation**，不重建 Assignment。
- 移动端入口：`/repair <asg_id>`（Talk 命令）。
- one-shot 执行锁（`assignments.execution_lock`，migration `20260907-product-p8-execution-lock`）：**消费点从「评估前」后移到「成功后」**——失败不再吞掉执行机会。成功 → consumeOneShot（Completed）；失败 → 释放锁 + failure 记录。

## 4. failure → Attention authority

- **非每个失败都产生 Attention**。one-shot 失败 → repair-request Attention（PM §14 attributable condition，`creation_reason_kind=assignment-authorization`，ref=assignmentId，无时间窗）；ongoing **单次失败不打扰**（下次自愈），连续 **≥3 次**才抬 repair Attention。
- 恢复（成功执行、streak 归零）→ open repair-request **系统 retire（EXPIRED）**。
- 不新增 `assignment.execution.failed` 等事件——现有 `trigger.fired` 的 payload（`error` + `attempt`）已能表达失败事实（§4 "不要机械新增"）；仅新增一个 `assignment.execution.missed` 事件（补偿事实）。

## 5. one-shot missed-run 最终行为

- scheduler 语义不变：**missed occurrence 不自动执行**（skip missed run 保留）。
- 启动扫描 `detectMissedOneShots()`（DB-only deterministic）：active one-shot、最近 occurrence 已过、晚于 activation、无该 occurrence fired 事件 → `assignment.execution.missed` 事件 + `provenance.pendingCompensation`。
- 状态保持 **Active**（不自动 Completed/Revoked）；补偿待决期间正常 fire → `skipped='compensation-pending'`（**杜绝错过后的意外未来执行**——one-shot 不会因错过而在次日意外补跑）。

## 6. Compensation 机制

- **L2 proposal（≠ Attention）**：`POST /:id/compensate {action}`，移动端 `/run-now <asg>` / `/skip <asg>`。
  - `run-now` → **compensation execution**：identity 取补偿时刻（新 executionId，**不伪造原 missed occurrence 已执行**），payload 带 `compensation:true + compensatesMissedOccurrence` 审计链；成功 → Completed。
  - `skip` → 显式放弃责任 → **Revoked**（`revokedBy='user:compensation-declined'`）。
- 决定记入 `provenance.compensationDecision`。Pulse 卡片为 UX backlog（本轮只做 backend + 最小 Talk hook，符合 §13 边界）。

## 7. Assignment lifecycle 保持不变

三态 **Active / Revoked / Completed**，**无 failed state**。failure 只在 execution 层（事件 + repair Attention）。无新增 lifecycle state、无 PM 修改。

## 8. Restart behavior

BFF 重启：migration 已应用（`/tmp/family-finance.log` 确认 `applied 20260907-product-p8-execution-lock`）；`startAssignmentTriggers()` 启动即跑 `detectMissedOneShots()`（日志：`started: 1 timer(s) ..., 0 missed one-shot(s) pending compensation`）——错过可被确定性检测。

## 9. Auditability

链条完整且全部落库（非 console）：
- failed: `trigger.fired(error)` → repair Attention（evidence 关联）→ retry `trigger.fired(_aN)` → `assignment.completed` → repair Attention EXPIRED。
- missed: `assignment.execution.missed` → `pendingCompensation` → `compensationDecision` → `trigger.fired(compensation, compensatesMissedOccurrence)` → Completed。

## 10. Tests + regression

- BFF：**132 passed / 5 skipped**（含新增 phase8-resilience 10 项：failure 分类、repair Attention authority、ongoing streak、attempt 幂等、compensate run-now/skip/守卫、restart determinism；phase5/phase55 用例按 P8 语义更新）。`tsc --noEmit` 通过。
- Mobile：**96 passed**（新增 compensate 命令解析测试）。`tsc --noEmit` 通过。
- 修复了 `repairRetry` 不接受 `fetcher` 注入的类型错误（`assignment-service.ts`）。

## 11. Real smoke vs simulation

`PHASE8_SIM=1 npx vitest run phase8-sim.test.ts`（2 passed）——走**同一 production runtime path**（`fireAssignmentTrigger`/`compensate`/`detectMissedOneShots`），在真实 `data/finance.db` 上执行；failure/missed 由注入 fetcher 抛错 + `activated_at` 前移**明确标注模拟**，不伪装 wall-clock。残留均为 completed/revoked 惰性行，无 OPEN repair Attention、无 active smoke Assignment 干扰真实 Pulse。

## 12. Semantic gap（未修改 PM）

PM §11 "its single execution opportunity was consumed and nothing further will fire" 与 P8（failure 释放机会、repair/下次可再执行）存在字面张力。**裁决**：PM 的 completion 定义（「surfacing happened **or legitimately suppressed**」）排除 execution error——error 既非 surfacing 也非 suppression，Completed 不成立；"single opportunity" 的意图是防止无限重复履行，由执行锁（exactly-once）+ attempt 幂等 + repair 显式授权共同保证。属 PM 原则内推导，已记录于 `docs/redesign/PHASE5_IMPLEMENTATION.md §P8.6`。

---

## 本轮实际补充

- 修复 `repairRetry` fetcher 类型错误（`assignment-service.ts`）。
- 补全移动端 `compensateAssignment` + `/run-now` / `/skip` 命令（此前 missed-run 补偿只到后端，Talk 无入口，且 `/list` 文案误导为 `/repair`）。
- 新增对应单测；更新 `docs/redesign/PHASE5_IMPLEMENTATION.md`。
- 全部验证通过，未提交（未获指示）。
