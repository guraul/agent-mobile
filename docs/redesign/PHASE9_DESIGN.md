# PHASE9_DESIGN.md —— User Trust Layer（Phase 9 设计）

> 状态：**设计稿（待评审）**
> 语义来源：`PRODUCT_MODEL.md`（冻结，PM §n 引用）；架构来源 `FINAL_ARCHITECTURE.md`、`IMPLEMENTATION_MODEL.md`；代码基线 family-finance `29f8d69`（Phase 7）+ P8（未提交）+ agent-mobile `79dc243`（Phase 7）。
> 目标：把 runtime 能力转成可信赖的产品体验。**不重设计架构、不引入新 canonical entity、不改 PM**。

---

## 0. 范围与红线

- **只做投影层（projection）与 API 补充（只读为主）**。Assignment / Event / Attention 的 canonical 存储与生命周期零改动。
- **不新增 canonical entity**：不建 assignment 副本表、不建 notification/task 实体、不建独立 history 表（历史来自 `product_events` 投影）。
- **不改 PRODUCT_MODEL.md**。
- 移动端导航遵循「优先不加顶层 tab」：**Assignment 管理并入 Memory tab**（见 Part 8 决策）。

---

## 1. Architecture Review Checklist（编码前先答）

| # | 问题 | 结论 |
|---|---|---|
| 1 | 是否引入新 canonical entity？ | **否**。全部是已有实体（Assignment/Event/Attention）的只读投影。 |
| 2 | 是否复制 Assignment/Event/Attention 状态？ | **否**。UI 只渲染 BFF 投影；无第二份存储；状态迁移仍由 BFF 权威（revoke/repair/compensate/dismiss/handle 原 API）。 |
| 3 | UI 动作是否绕过 authority chain？ | **否**。所有 mutation 动作（revoke/repair/compensate/dismiss/handle/engage）走既有后端入口，用户显式触发；无新 authority 捷径。 |
| 4 | 查看是否改变 state？ | **否**。GET 列表/详情为只读；不写 lifecycle。Attention 列表 GET 已有 `viewed` 交互元数据（Phase 3，非 state），保持。 |
| 5 | Talk 是否自动 mark handled？ | **否**。打开 Talk / 进入详情不自动 handling；HANDLED 只发生在用户显式 handle（携带 artifactRef）。 |

**全部 NO → 可继续。**

---

## 2. 目标（Mission）

用户能清楚回答：

1. AI 当前拥有哪些责任（responsibility）。
2. 为什么被允许执行（authorization 出处）。
3. 执行发生了什么（execution history）。
4. 什么需要用户决策（needs-attention / compensation）。
5. 如何暂停/撤销/管理责任（revoke / repair / compensate）。

---

## 3. Part 1 —— Assignment Management Surface（Memory tab 内 "Responsibilities" 区块）

### 3.1 导航决策

- **当前 4 tab**：Pulse / Talk（占位）/ Memory / Me。
- **决策：不加第 5 个顶层 tab**（避免 tab 膨胀，Talk 仍占位未激活）。Assignment 管理并入 **Memory tab**，新增 "Responsibilities" 区块（在 Memory 投影之上）。Memory tab 语义 = "AI 的持久理解与承诺"（PM §6 + §11-13 责任对象），概念贴近。
- 入口层次：Memory tab 顶部加区块头部 `Responsibilities` + 计数，点击进入**独立的 Assignments 列表屏**（expo-router stack 内 push），避免 Memory tab 单页过载。

### 3.2 Assignments 列表屏（投影）

数据：`GET /api/product/assignments?state=`（已有）+ `GET /api/product/attention?subjectKind=assignment`（已有，拿 needs-attention 标注）。

分组（纯客户端分组，按 PM lifecycle）：

| 分组 | 来源 | 说明 |
|---|---|---|
| Needs attention | `attention`（subjectKind=assignment, state=open，repairRequest 或 compensation 相关） | Assignment 执行失败 / missed 补偿待决 |
| Active | `assignments` state=active | 当前责任 |
| Completed | state=completed | 已履行（历史） |
| Revoked | state=revoked | 已撤销（历史） |

列表项（card）：

```
[icon] Fund NAV monitoring        [状态 pill: ACTIVE]
       Trigger: Every weekday 14:50
       Authorization: User confirmed
       [View history] [Revoke]
```

- **needs-attention 项**：从 Attention 反查 assignment（`creationReasonRef`=assignmentId），展示 `⚠ 执行失败 · 市场数据源超时` + `[Retry]` `[Skip]`（补偿）或 `[Retry]`（repair）。
- 全部 mutation 走既有 API：`revoke` / `repair` / `compensate`（后两者见 Part 4）。

### 3.3 投影服务（mobile）

新增 `src/services/assignment/projection.ts`（纯函数，可测）：
- `buildAssignmentGroups(assignments, attentions): AssignmentGroup[]`——分组 + 视图模型（StatusType、label、isNeedsAttention、nextExecutionLabel）。
- `describeTrigger(td): string`——cron → 人话（`Every weekday 14:50` / `Every day 18:00`；解析 cron 字段，不引第三方）。
- `authorizationLabel(a): string`——`User confirmed` / `Direct activation (explicit instruction)` / `Legacy migration`（读 `authorizationRef` + `provenance`）。
- `nextExecutionOf(td): number | null`——下一次 occurrence（与 BFF 同款 cron prev/next 计算，或由 BFF 下发，见 7.2）。

---

## 4. Part 2 —— Execution History Projection

### 4.1 数据来源

`product_events`（canonical fact），按 `subject.kind=assignment, subject.id=<id>` 过滤，type 白名单：

| 事件 | 用户可见形态 |
|---|---|
| `assignment.trigger.fired`（无 error） | `✓ Executed`（matched true → "Matched" / false → "Evaluated, no match"） |
| `assignment.trigger.fired`（payload.error） | `⚠ Failed` + reason（error） |
| `assignment.execution.missed` | `⏭ Missed`（occurrence 错过，补偿待决） |
| `assignment.completed` | `✓ Completed` |
| `assignment.revoked` | `✋ Revoked` |
| `assignment.activated` | `▶ Activated` |

- **attempt**：`trigger.fired` payload 有 `attempt` / `executionId` / `occurrenceAt`（P8）→ 同 executionId 多次 attempt 归并成一条逻辑行，显示 `attempt 1 failed → attempt 2 success`（"Recovered / Manual retry"）。
- **duration**：事件无 duration 字段，不做伪造；显示 `occurredAt`（本地化时间）+ attempt 号。**不新增 duration 数据**（YAGNI，除非 BFF 已有）。如需可后续在 fired payload 加 `durationMs`（属 event payload 扩展，非新表）。

### 4.2 API

**新增只读 API**：`GET /api/product/assignments/:id/history` → `{ items: HistoryItem[] }`
- BFF 从 `product_events` 聚合（subjectKind=assignment, subjectId=id，type 白名单），返回**用户友好投影**（camelCase），不暴露原始 payload 全量：
  ```ts
  { id, type, occurredAt, label, status: "success"|"failed"|"missed"|"neutral",
    attempt?: number, executionId?: string, reason?: string }
  ```
- 服务器端聚合逻辑放 `packages/web/lib/product/assignment-history.ts`（纯函数，有单测）；route 只做鉴权 + 转发。

---

## 5. Part 3 —— Authorization Transparency

- **不复制 authorization 数据**：直接读 `assignment.authorizationRef` + `provenance`（`proposalId` / `createdBy` / `instructionRef` / `migratedFrom`）+ 关联 proposal（`assignment-proposals` 行）取 `responsibility`/`instructionRef`。
- Assignment Detail 屏 "Authorization" 区块：
  ```
  Created:  2026-09-01
  Source:   User instruction
  Instruction: "Check my fund NAV every weekday"
  Confirmed: Yes (proposal: prp_xxx)
  Can revoke: Yes
  ```
- **API**：`GET /api/product/assignments/:id`（已有）返回 `item`；若要 proposal 原文，需 BFF 附带 `authorization: { proposalId, instructionRef, createdBy, via }` 投影字段（在现有 route 内附加，读 proposal repo，**不建新存储**）。

---

## 6. Part 4 —— Pulse L2 Experience

### 6.1 现状

Pulse "Needs you" = Attention store open items（Phase 3，authoritative）。repair-request Attention（P8）已能进 Pulse（subjectKind=assignment）。

### 6.2 增强（保持 Attention projection）

Pulse 里 repair / compensation 类 Attention 卡增加 L2 动作（**仍是 Attention 卡的投影，不新建实体**）：

- repair Attention（`provenance.repairRequest=true`）：
  - 卡标题 = Attention title（已有）；副标题加 `Reason: <provenance.error>`。
  - 动作：`[Retry]` → `POST /assignments/:id/repair`（用户显式）；`[Dismiss]` → 既有 dismiss；`[Open Talk]` → 既有 attention 进入 Talk 路径。
- compensation 类：Pulse 不单独造卡——补偿是 L2 proposal（P8 决策，**≠ Attention**），留在 Assignments 列表的 "Needs attention" 分组 + `/run-now` `/skip`（Talk 命令已实现）。Pulse 保持纯 Attention 投影，不扩展 compensation UI（符合 §4 边界：Pulse remains Attention projection）。

### 6.3 "Pause responsibility"

- **PM 无 pause 态**（三态：Active/Revoked/Completed）。**不引入 Pause 新 state**。
- "Pause" 用户意图 → **Revoke**（停止未来执行），文案明确 "Pause = revoke（停止未来触发；已有提醒保留）"，符合 PM §11。

---

## 7. Part 5 —— Attention Detail Page

### 7.1 新增 stack 屏（expo-router push，非新 tab）

`Attention Detail`：点击 Pulse/Assignments 中 Attention 卡进入。展示：

```
Attention: Fund monitoring failed
Created:  2026-09-07 14:52
Reason:   assignment execution failure   (creationReasonKind/ref → 反查 assignment)
Related responsibility: Fund monitoring (creationReasonRef → assignment.responsibility)
Evidence: Execution attempt #2           (attention_evidence → event payload.attempt)
Actions:  Retry | Dismiss | Open Talk
```

- **数据来源（全部只读已有/投影）**：
  - Attention 行：`GET /api/product/attention?subjectId=<id>`（已有，含 provenance）。
  - Evidence：`attention_evidence` 关联的 `product_events` → 取 `trigger.fired` 的 attempt/error（**新增只读端点**或并入 detail 投影）。
  - Related assignment：`creationReasonRef` → `GET /api/product/assignments/:id`（已有）。
- **动作**：Retry（repair，仅 repairRequest 类）、Dismiss（已有）、Open Talk（既有 attention→Talk 路径）。Handle 仅当用户显式确认并携带 artifactRef（PM §17）。

### 7.2 API 补充（最小只读）

| 端点 | 方法 | 新增 | 用途 |
|---|---|---|---|
| `/api/product/assignments/:id/history` | GET | **新增** | Part 2 执行历史投影 |
| `/api/product/assignments/:id/authorization` | GET | **新增** | Part 3 授权投影（或并入 `:id` 返回，见 7.3） |
| `/api/product/attention/:id` | GET | **新增** | Attention 详情（含 evidence 投影），目前只有 list |
| `/api/product/assignments` | GET | 已有 | 列表 |
| `/api/product/assignments/:id` | GET | 已有 | 详情 |
| `/api/product/assignments/:id/{revoke,repair,compensate}` | POST | 已有 | mutation |
| `/api/product/attention/:id/{dismiss,handle,engage}` | POST | 已有 | mutation |

### 7.3 最小化决策

- 将 `authorization` 并入 `GET /assignments/:id` 返回（不新增独立端点），减少 API 面。
- 将 `evidence` 并入 `GET /attention/:id`（新端点，含 evidence 事件投影）。
- 新增只读端点仅 `history` 与 `attention/:id`。

---

## 8. Part 6 —— Lifecycle UX Rules（贯穿所有 UI）

| 规则 | 强制实现 |
|---|---|
| 查看 Assignment → 无 state change | GET 只读；无 viewed 写（Assignment 无 viewed 概念，与 Attention 不同） |
| 打开 Talk → 无自动 handling | 进入 Talk 不调 handle；只 engage（记录交互，非 state） |
| Retry → 新 execution attempt | `POST /repair`（同 executionId 新 attempt，P8） |
| Revoke → 停止未来执行 | `POST /revoke`（state→revoked，timer 注销，Attention 不动） |
| Handle → 仅显式用户动作 + artifact | `POST /attention/:id/handle`（需 artifactRef） |

保持既有语义：**Viewing ≠ Handling；Engage ≠ Completion**。

---

## 9. Part 8 —— Mobile Implementation 结构

### 9.1 文件变更（agent-mobile-app）

```
src/app/assignments.tsx                     # 新增 stack 屏：Assignments 列表（push from Memory）
src/app/assignments/[id].tsx                # 新增 stack 屏：Assignment Detail（含 history + authorization）
src/app/attention/[id].tsx                  # 新增 stack 屏：Attention Detail
src/app/(tabs)/_layout.tsx                  # Stack 增加上述屏（root layout）
src/app/(tabs)/memory.tsx                   # 改：顶部加 "Responsibilities" 区块入口（计数 + push）
src/services/assignment/projection.ts       # 新增：分组/描述/授权标签/下一执行（纯函数）
src/services/assignment/history.ts          # 新增：history fetch + 视图模型（纯函数转换）
src/services/assignment/client.ts           # 改：加 fetchAssignmentDetail / fetchAssignmentHistory
src/services/attention/client.ts            # 改：加 fetchAttentionDetail
src/services/assignment/projection.test.ts  # 新增：分组/触发器描述/授权标签单测
src/services/assignment/history.test.ts     # 新增：历史投影单测
src/services/attention/client.test.ts       # 改：detail 解析
```

### 9.2 根 Stack

`src/app/_layout.tsx` 已用 `Stack`（headerShown:false）。新增：
```tsx
<Stack.Screen name="assignments" />
<Stack.Screen name="assignments/[id]" />
<Stack.Screen name="attention/[id]" />
```
进详情需返回手势/头部返回——detail 屏用自定义头部（`ScreenHeader` 已有 back）。

---

## 10. BFF 变更（family-finance）

### 10.1 新增文件

```
packages/web/app/api/product/assignments/[id]/history/route.ts    # GET 历史投影
packages/web/app/api/product/attention/[id]/route.ts              # GET 详情（含 evidence）
packages/web/lib/product/assignment-history.ts                    # 历史聚合纯函数
```

### 10.2 修改

- `packages/web/app/api/product/assignments/[id]/route.ts`：GET 返回附加 `authorization` 投影（读 proposal repo；无则缺省）。
- 无 schema 迁移：**全部来自已有表**（assignments / assignment_proposals / product_events / attention_evidence / attention_items）。

---

## 11. Authority Analysis（§11）

- **所有 mutation 都走既有 authority 链**：
  - revoke：用户显式动作（PM §11 用户撤回）。
  - repair：用户对 repair Attention 的批准动作（P8 §7，`repairRetry` 显式入口）。
  - compensate run-now/skip：用户显式决定（P8 §13，`compensate`）。
  - dismiss/handle/engage：用户显式动作（PM §17）。
- **查看类零 mutation**：GET 不改 state、不建 data、不触发执行。
- **无 agent 自主触发的新 mutation**：本阶段不新增任何"系统自动 repair/自动 revoke"路径。
- **Pause 未新增 state**：用户"Pause"映射到 Revoke，语义在 PM §11 内。

---

## 12. Migration Requirements

- **零 schema migration**。BFF 无新表、无新列；复用：
  - `assignments`（lifecycle）
  - `assignment_proposals`（authorization）
  - `product_events`（history fact）
  - `attention_items` + `attention_evidence`（needs-attention / evidence）
- 若未来加 `durationMs`，属 event payload 扩展（无表变更）。

---

## 13. Testing Plan

### 13.1 BFF（vitest）

- `assignment-history.test.ts`（新增）：
  - fired 无 error → success label；fired 有 error → failed + reason
  - 同 executionId 多 attempt 归并（attempt 1 fail → attempt 2 success = "Recovered"）
  - missed → missed label；completed / revoked → 各自 label
  - 只暴露投影字段（不泄 payload 全量）
- 既有 12 个 product test 全绿（回归）。

### 13.2 Mobile（vitest 纯函数）

- `projection.test.ts`（新增）：分组（needs-attention/active/completed/revoked）、触发器 cron→人话、授权标签、next-execution。
- `history.test.ts`（新增）：history items → 视图模型（状态色/标签/attempt）。
- `attention client detail` 解析测试。
- 既有 14 个 test 全绿。

### 13.3 E2E（Playwright，至少覆盖）

1. Create Assignment（Talk `/assign remind ... at HH:MM` 或已有）
2. Trigger execution（fire → event/Attention）
3. See Pulse（Attention 卡出现）
4. Open detail（Assignment Detail：history + authorization）
5. Retry / Revoke（mutation 生效）
6. Verify lifecycle（state 变化 + 事件链）

（E2E 复用 `scripts/e2e/pulse-e2e.mjs` harness，按现有模式追加场景；发消息步骤默认跳过——`e2e:nosend`。）

---

## 14. 交付物

1. `docs/redesign/PHASE9_DESIGN.md`（本文件）
2. Phase 9 最终报告：Modified files / New APIs / Architecture decisions / Tests / Real smoke evidence / PRODUCT_MODEL verification / Remaining backlog

---

## 15. 不做（Out of Scope）

- 不改 PRODUCT_MODEL / 不新 canonical entity / 不新 lifecycle state（含 Pause）。
- 不重设计 Pulse / 不新顶层 tab（Talk 保持占位）。
- 不建 notification/task 实体、不建独立 history 表。
- 不做 agent 自主 repair / 自动 revoke。
- 不伪造 duration / 不新增非必要 mutation API。
