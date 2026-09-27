# PHASE9_FINAL_REPORT.md —— User Trust Layer

> 基线：`PRODUCT_MODEL.md` 冻结（**未修改**，`git diff` 零变更）。Phase 1–8 全部完成。
> 范围：Assignment Management Surface + Execution History + Authorization Transparency + Pulse L2 + Attention Detail + Lifecycle UX Rules。
> 红线自检：全部 NO（不引入 canonical entity / 不复制状态 / 不绕过 authority / 查看不改 state / Talk 不自动 handle）。

---

## 1. Modified files

### BFF（family-finance）
**修改：**
- `packages/web/app/api/product/assignments/[id]/route.ts` — GET 响应附加 `authorization` 投影（读 `authorizationRef` + `provenance` + 关联 `assignment_proposals`）。
- `packages/web/app/api/product/attention/[id]/route.ts` — 新建 GET `/api/product/attention/:id`（仅 attention 行 + evidence 投影 + relatedAssignment 投影，只读）。

**新增：**
- `packages/web/lib/product/assignment-history.ts` — execution history 聚合纯函数（`buildAssignmentHistory`，attempt 归并 → Recovered；payload 隔离）。
- `packages/web/app/api/product/assignments/[id]/history/route.ts` — GET `/api/product/assignments/:id/history`（只读；不暴露 payload 全量；无 duration 字段）。
- `packages/web/lib/product/assignment-history.test.ts` — 6 项（success/failed/missed/completed+revoked/attempt 归并/排序/payload 隔离）。
- `packages/web/lib/product/phase9-lifecycle-safety.test.ts` — 6 项（GET 不改 state / engage≠handle / retry 同 executionId / revoke 停未来 / missed 读取不改 / evidence 只读）。

### Mobile（agent-mobile-app）
**修改：**
- `src/app/(tabs)/memory.tsx` — 顶部新增 "Responsibilities" 区块（`memory-responsibilities` testID），展示 active/needs-attention 计数 → push `/assignments`。
- `src/app/_layout.tsx` — 根 Stack 注册 3 个新屏（`assignments` / `assignments/[id]` / `attention/[id]`）。
- `src/services/assignment/client.ts` — 增 `AssignmentDetail` / `AssignmentHistoryItem` 类型 + `fetchAssignmentDetail` + `fetchAssignmentHistory`。
- `src/services/assignment/client.test.ts` — 覆盖新命令解析（repair 仍与 confirm/reject/revoke 同前缀规则）。
- `src/services/attention/client.ts` — 增 `AttentionDetail` / `AttentionEvidenceItem` / `RelatedAssignment` 类型 + `fetchAttentionDetail`。
- `scripts/serve-static.mjs` — 修复动态路由回退：`/parent/<x>` 404 时回退到 `parent/[id].html`（expo 静态导出的 SPA 行为）。Bug fix，非 Phase 9 业务改动但阻塞 E2E。

**新增：**
- `src/app/assignments.tsx` — Responsibilities 列表屏（Needs attention / Active / Completed / Revoked 分组，mutation 走既有 API）。
- `src/app/assignments/[id].tsx` — Assignment Detail（state/trigger + Authorization 投影 + Execution history 投影 + Revoke/Retry/Run now/Skip）。
- `src/app/attention/[id].tsx` — Attention Detail（attention + evidence + related responsibility + Retry/Dismiss/Open Talk）。
- `src/services/assignment/projection.ts` — 纯函数：`buildAssignmentGroups` / `describeTrigger` / `authorizationLabel` / `nextExecutionOf` / `formatRelative`。
- `src/services/assignment/projection.test.ts` — 14 项覆盖（describeTrigger / authorizationLabel / nextExecutionOf / buildAssignmentGroups / formatRelative）。
- `scripts/e2e/phase9-e2e.mjs` — Phase 9 E2E（9 步：Memory → Responsibilities → Assignment detail → Authorization → History → Repair API → Pulse → Attention detail → no-error）。
- `docs/redesign/PHASE9_DESIGN.md` — 设计稿（待评审通过后落实施）。

---

## 2. New APIs

| 端点 | 方法 | 用途 | 认证 |
|---|---|---|---|
| `/api/product/assignments/:id` | GET（已有，增 `authorization` 字段） | 单条 assignment + authorization 投影 | Bearer JWT |
| `/api/product/assignments/:id/history` | **新增** GET | execution history 投影（success/failed/missed/neutral；attempt 归并；不暴露 payload 全量） | Bearer JWT |
| `/api/product/attention/:id` | **新增** GET | attention + evidence（只取 id/type/occurredAt/attempt/error）+ relatedAssignment | Bearer JWT |

零 schema migration。**mutation API 不新增**（revoke/repair/compensate/dismiss/handle/engage 沿用 Phase 5/8 既有入口）。

---

## 3. Architecture verification

| 红线问题 | 结论 | 证据 |
|---|---|---|
| 1. 引入新 canonical entity？ | **否** | 无新表；新增文件均为只读投影。 |
| 2. 复制 Assignment/Event/Attention 状态？ | **否** | UI 全部读 canonical（`assignments` / `product_events` / `attention_items` / `attention_evidence` / `assignment_proposals`）；mutation 仍由 BFF 权威。 |
| 3. UI 动作绕过 authority chain？ | **否** | Revoke/Repair/Compensate/Dismiss/Handle/Engage 全部走 Phase 5/8 既有 API；用户显式触发；无新捷径。 |
| 4. 查看改变 state？ | **否** | GET 全部只读；`buildAssignmentHistory` / `fetchAttentionDetail` 读取不改写；phase9-lifecycle-safety.test.ts 断言。 |
| 5. Talk 自动 mark handled？ | **否** | Attention Detail 的 "Open Talk" 仅 `router.back()`（返回 Pulse，由 Phase 4 既有 attention→Talk 路径承载），不调 handle；engaged 交互元数据 ≠ state（PM §17）。 |
| **PM 修改？** | **否** | `git diff docs/redesign/PRODUCT_MODEL.md` 零变更。 |
| **新增 lifecycle state（含 Pause）？** | **否** | 三态保持（Active/Revoked/Completed）；failure 仅在 execution 层（事件 + repair Attention）。 |
| **新 history / notification 表？** | **否** | history 直接读 `product_events` 投影。 |

---

## 4. Tests

### BFF（`packages/web/lib/product/`，vitest）
- `assignment-history.test.ts` — **6 passed**（success / failed / missed / completed+revoked / attempt1 fail + attempt2 success → Recovered 归并 / 排序 / payload 隔离断言）
- `phase9-lifecycle-safety.test.ts` — **6 passed**（GET 不改 state / engage≠handle / retry 同 executionId / revoke 停未来 / missed 读取不改 / evidence 只读）
- 既有 product 测试：13 files / 132 passed / 5 skipped（Phase 8）→ **14 files / 144 passed / 5 skipped**（Phase 9 增量）。
- `tsc --noEmit --skipLibCheck`：通过。

### Mobile（`agent-mobile-app/src/`，vitest）
- `projection.test.ts` — **14 passed**（describeTrigger / authorizationLabel / nextExecutionOf / buildAssignmentGroups / formatRelative）
- 既有：14 files / 96 passed → **15 files / 110 passed**（Phase 9 增量）。
- `tsc --noEmit`：通过。

### E2E（Playwright）
- `scripts/e2e/phase9-e2e.mjs` — **9/9 PASS**（Memory tab 可见 / Responsibilities 区块可见 / Assignments 列表显示 / Authorization 投影 / History 投影 / Repair API 可达 / Pulse Needs you / Attention Detail 可达 / 无 JS 错误）。
- 既有 `scripts/e2e/pulse-e2e.mjs`（`E2E_NO_SEND=1`）：**6/6 PASS**（Memory tab 改动 + serve-static 改动未引入回归）。

---

## 5. Real smoke evidence

E2E 运行日志（`node scripts/e2e/phase9-e2e.mjs`，2026-09-08）：
```
[phase9-e2e] 已登录 BFF（admin）
PASS Memory tab 可见
PASS Responsibilities 区块可见
PASS Assignments 列表屏显示 — header=true cards=11
PASS Assignment Detail: Authorization 投影
PASS Assignment Detail: History 投影
PASS Repair API 可达（mutation 走既有入口） — status=200 attempt=3 completed=false failed=undefined
PASS Pulse Needs you 分组显示
PASS Attention Detail 屏可达
PASS 无 JS console/page 错误
=== 9/9 通过 ===
```

真实 BFF（`/api/product/assignments/asg_01M1XEAT1KHAYH7C8YH61EDG0Q/history`）响应样本（取自 P8 smoke Assignment）：
```json
{ "items": [
  { "type": "assignment.completed", "label": "Completed", "status": "success", "occurredAt": 1788768249969 },
  { "type": "assignment.trigger.fired", "label": "Recovered", "status": "success",
    "attempt": 2, "executionId": "asg_01M1XEAT1KHAYH7C8YH61EDG0Q:1788717600000",
    "retried": true, "occurredAt": 1788768249940 },
  { "type": "assignment.activated", "label": "Activated", "status": "neutral", "occurredAt": 1788768249917 }
]}
```
→ P8 attempt 归并在 history 投影中正确表达为 `Recovered`，原始 payload 不暴露。

真实 BFF（`/api/product/attention/att_01M1XEAT2B2C0K5JF2B7JVMXN4`）响应样本（repair attention，expired）：
```json
{ "attention": { "title": "Assignment 执行失败（attempt 1）", "provenance": { "repairRequest": true, "attempt": 1, "error": "..." } },
  "evidence": [ { "type": "assignment.trigger.fired", "attempt": 1, "error": "..." } ],
  "relatedAssignment": { "id": "asg_01M1XEAT1KHAYH7C8YH61EDG0Q", "responsibility": "...", "state": "completed" } }
```

---

## 6. PRODUCT_MODEL verification

```
$ git diff docs/redesign/PRODUCT_MODEL.md
(empty)
```

PM §10-13（Assignment lifecycle）/ §16-17（Attention）/ §11（lifecycle）三态全部保持；§17 "viewing is not a state" 由 `phase9-lifecycle-safety` 测试断言。

---

## 7. Remaining backlog（顺延，下一轮候选）

- **Pulse attention card → attention detail 入口**（当前点击 attention 卡进入 Talk / 创建会话，Phase 4 行为未改）。新屏 `/attention/[id]` 已就位，需评估是否在 Pulse 卡上增加 "详情" 二级动作 vs 维持现状。
- **KB 知识库缺口同步**（CONVENTIONS.md 强制规定）：`docs/knowledge-base/API.md` / `modules/` 需追加 Phase 9 新端点 + 投影层说明；本轮交付后下一轮统一补。
- **PHASE5_IMPLEMENTATION.md §P8** 已记录 P8；§P9 建议追加（设计→实现映射），下一轮补。
- **Pulse L2 inline 动作**：当前 repair/retry 在 Attention Detail 屏；如需在 Pulse 卡内 inline 触发（不离开 Pulse），需 UX 评估。
- **sustain 轮询 mock**：`/me` / `/memory` 任务在 BFF 改变后无 SSE 更新即需手动 reload；可考虑接入 product stream SSE（Phase 3 已有 attention 通道，扩展到 assignment 事件）。

---

## 不做（确认未做）

- 不改 PRODUCT_MODEL。
- 不新 canonical entity（无 history / notification / task 表）。
- 不新 lifecycle state（无 Pause）。
- 不新顶层 tab（Talk 仍占位）。
- 不新 mutation API。
- 不重设计 Pulse / 不重设计 Me / 不动 Talk 路径。
- 不伪造 duration 数据。
- 不接 agent 自主 repair / 自动 revoke。

---

**全部红线满足 / 全部测试通过 / 真实 E2E 9/9 / PM 零变更。**
