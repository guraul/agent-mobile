# PHASE13_DESIGN.md —— Assignment Proposal → Pulse L2 Suggestion（Phase 13 设计）

> 状态：**设计稿（只审计与设计，不编码）**。
> 语义来源：`PRODUCT_MODEL.md`（冻结，PM §n 引用；重点 §10/§20/§22/§23/§16.2）。
> 架构来源：`FINAL_ARCHITECTURE.md`、`IMPLEMENTATION_MODEL.md`；前置 `PHASE11_DESIGN.md`（Proposal runtime 已实现）、`PHASE12_DESIGN.md`（Observation → L1 已实现，§11.2 已预留 Proposal suggestion 设计位）。
> 代码基线：BFF family-finance（Phase 1–12 全部在库，Phase 8–12 未提交但已运行）；agent-mobile `79dc243` + Phase 9–12 未提交工作。
> 本轮目标：把已存在的 **Observation → Assignment Proposal** 接到 **Pulse L2 Suggestion**，用户可 **Confirm → Assignment / Reject → Proposal rejected**。保持 Phase 12 链路（Observation → L1 → Noticed）不变。**不实现 Observation → Attention**（后续扩展）。
> 底线：不改 PRODUCT_MODEL、不改 DB schema、不新增 canonical entity、不引入新 lifecycle。

---

## 0. 审计结论（TL;DR）

| 审计问题 | 结论 |
|---|---|
| Observation → Proposal runtime 是否已存在？ | **是，完整闭环**（Phase 11）：produce/dedup/disposition/confirm/reject/expire 全部就绪 |
| Confirm / Reject API 是否已存在？ | **是**：`POST /api/product/assignment-proposals/:id/{confirm,reject}`，JWT 保护，并发/重放安全 |
| Pulse 是否已有 L2 呈现？ | **否**——这是 Phase 13 唯一的真实缺口 |
| Phase 13 是否需要新 canonical entity？ | **不需要**。Suggestion = `assignment_proposals` 的只读 user-facing projection |
| 是否存在绕过 confirmation 的路径？ | **未发现**（详见 §6 全路径审计） |
| 是否需要新 canonical Event？ | **不需要**。activation 审计已由 `assignment.created/activated` 覆盖；SSE 变更广播是 presentation 通道（同 attention.created/updated 家族），不是 product_event |
| Proposal lifecycle 是否有 product_event？ | **没有**（`PRODUCT_EVENT_TYPES` 无 proposal.* 类型）——与 Attention 一致（表 + SSE，不入事件流），**不新增** |

---

## 1. Current State

### 1.1 已运行的主链路（Phase 11 + 12）

```text
product_events（market.rule.evaluated，每日含符号 diff）
      ↓ observation sweep（每分钟 job，cursor + 30d lookback 兜底）
Observation Rule Definition（rules.ts，rule ≠ authority）
      + Observation Authorization（grants.ts，静态单用户授权）
      ↓ deterministic detector（repeated-decline：同基金连续 3 个评估点 diff<0）
Observation Judgment {warranted, evidenceEventIds, judgmentSummary}
      ↓
agent.observation.recorded（audit Event，确定性 id evt_obs_*，幂等锚点）
      ↓ Output Policy（allowedOutcomes=["proposal","l1"]，白名单非 authority）
      ├──→ assignmentService.propose（market/ongoing → 必然 proposed，绝不 activate）
      └──→ L1 statement（l1.observation.observation.market.repeated-decline）→ Pulse "Noticed"
```

### 1.2 缺口（Phase 13 唯一要闭合的）

Proposal 产生后**在产品面上不可见**：`assignment_proposals` 行状态为 `proposed`，只能通过 Talk 斜杠命令 `/confirm prp_xxx` / `/reject prp_xxx`（用户需要先知道 id）触达。Pulse 没有 Suggestions 组；用户不知道"Agent 建议承担责任"这件事发生过。

Phase 12 设计（§11.2/§17 Scenario B）已预判：`Suggestions` 组呈现 `proposed` proposals，动作映射现有 `confirm`/`reject`，**不是 Attention、不进 lifecycle、不 delivery**。Phase 13 即 Scenario B 的实现设计。

### 1.3 不变量（Phase 13 不得破坏）

```text
Proposal ≠ Attention          （PM §10：proposal 无 trigger、无 Attention、无 presentation authority 借用）
Proposal ≠ Active Assignment  （只有 confirm/direct-activation 两个 activation 路径）
Observation → L1（Noticed）保持不变（Phase 12 回归红线）
L1 ≠ L2 ≠ Attention           （三种 presentation，各自独立 authority）
```

---

## 2. Existing Proposal Runtime（审计明细）

### 2.1 Proposal 在哪里产生

`assignmentService.propose()`（`family-finance/packages/web/lib/product/assignment-service.ts:209`）是唯一入口。现有两个调用方：

| 调用方 | 位置 | 场景 |
|---|---|---|
| `POST /api/product/assignment-proposals` | `app/api/product/assignment-proposals/route.ts` | Talk 结构化提案（mobile `/assign` 命令 → `createProposal()`） |
| `ensureProposalForObservation()` | `lib/observation/observation-service.ts:117` | **Observation → Proposal**（Phase 11 主链路） |

Observation 路径的固定形状：`mode="ongoing"`、`domain="market"`、trigger = `50 14 * * 1-5` + `fund-nav-above-target`、`actionScope`（读数据/评估/提醒，交易需 action-time approval）、`createdBy="observation:<ruleId>"`、`instructionRef="observation:<ruleId>:<observationEventId>"`。**绝不 activate**：`ensureProposalForObservation` 内含运行时不变式守卫——若 `result.assignment` 非空直接抛错（`observation-service.ts:151-154`）。

### 2.2 Proposal payload（`ProposalRow`，`lib/product/types.ts:158`）

```ts
{
  id: string;                    // "prp_" + ULID —— 稳定 ID（2.4）
  mode: "one-shot" | "ongoing";
  responsibility: string;        // 责任人话文本（如"持续监控基金 012414（华宝医疗ETF联接C），达到目标净值时提醒"）
  domain: "market" | "personal";
  triggerDefinition: TriggerDefinition;   // schedule-rule（cron + condition）——proposal 阶段的内部机制定义，非独立实体
  actionScope: Record | null;    // 允许动作 / requiresConfirmation
  status: ProposalStatus;        // proposed | confirmed | rejected | cancelled | expired
  createdAt: number;
  resolvedAt: number | null;
  resolution: { assignmentId?; reason?; via? } | null;
  sessionId: string | null;
  instructionRef: string | null; // observation:<ruleId>:<eventId> —— 证据链锚点 + dedup 键
  expiresAt: number | null;      // createdAt + 7 天（PROPOSAL_TTL_MS，Phase 5.5）
  provenance: { createdBy };     // "observation:<ruleId>" | "talk" | "api"
}
```

### 2.3 disposition 如何存储

`assignment_proposals` 表：`status` + `resolution`(JSON) + `resolved_at`。唯一迁移函数 `proposalRepository.resolve()`（`assignment-proposal-repo.ts:106`）：`UPDATE ... WHERE id = ? AND status = 'proposed'`——**单行原子终局迁移**，`changes===0` 即已被处理（并发防线）。disposition 是 proposal phase 的结局，不是 Assignment lifecycle（PM §10）。

### 2.4 与 observation / event 的关系

- **稳定 ID**：有。`prp_<ULID>`，所有动作（confirm/reject/Talk 命令）以它为目标。
- **observation 关系**：经 `instructionRef` 软引用——`observation:<ruleId>:<evt_obs_*>` → `agent.observation.recorded` Event → `payload.evidenceEventIds` → 原始 `market.rule.evaluated` 事实。审计链完整，**不复制数据**。
- **dedup**：`instructionRef` 确定性（rule+subject+evidence window 决定 observationEventId）+ DB partial UNIQUE（并发防线）+ sweep 内 `findByInstructionRef` 预查 + dedup 恢复路径（Event 是幂等锚点，propose 前中断可补齐）。同一次 observation opportunity 永远至多一条 proposal。
- **duplicate 语义**（PM §10）：`findDuplicateActiveAssignment()` 在 propose 时比对同 domain + 同 condition 的 Active Assignment，返回 `duplicateOf` 提示（不阻止创建，由 Agent/用户指向既有责任）。
- **与 Event 的关系**：proposal 自身的 disposition 变更**不产生 product_event**；activation 产生 `assignment.created` + `assignment.activated`（subject=assignment，refs.proposalId 回链）。

### 2.5 Confirm / Reject API（已存在，不重新实现）

| 端点 | 语义 | 错误语义 |
|---|---|---|
| `POST /api/product/assignment-proposals/:id/confirm` | 用户显式确认 = activation moment | 404 not found；**409** 非 proposed（confirmed/rejected/cancelled/expired） |
| `POST /api/product/assignment-proposals/:id/reject` | 用户拒绝（PM §10 四种结局之一） | 404 / 409 同上 |
| `GET /api/product/assignment-proposals?status=proposed` | 列表（Phase 13 Suggestion 数据源） | 401 未登录 |

均走 `requireAuthHeader`（JWT）+ CORS 白名单。mobile 端 `services/assignment/client.ts` 已有 `confirmProposal()` / `rejectProposal()` 封装（Phase 5 Talk 命令流使用中）。

### 2.6 Confirm 后 Assignment 如何创建/激活

`assignmentService.confirm()`（`assignment-service.ts:244`）：

```text
1. getById → 校验 status === 'proposed'（否则 ProposalError → 409）
2. resolve(proposed → confirmed)          ← 占坑：并发双确认只有一个 transitioned=true
3. activateProposalInternal(proposal, authorizationRef = "confirmation:<proposalId>[:<confirmedBy>]")
   3a. assignmentRepository.insert(...)    ← 行创建 = authoritative commit point
   3b. ingest assignment.created + assignment.activated（Event = 投影，失败不回滚责任）
   3c. registerAssignmentTrigger(...)      ← timer 注册，未来执行从此开始
4. resolve 回填 { assignmentId, via: "confirmation" }
```

关键性质：

- **matrix 的位置**：confirmation matrix 在 **propose 时**评估（`assessConfirmation`）。market/ongoing 必然 `required=true` → proposal 停留 `proposed` 等待确认；all-low（one-shot personal）在 propose 内即时 direct-activation 并立刻 resolve(confirmed, via=direct-activation)——**不会以 proposed 状态存在**。因此 confirm API 能激活的 proposal 必然是 matrix 判定需要确认的那一类；confirm 本身就是 PM §10 的 activation moment，无需（也不应）在 confirm 内重复 matrix。
- rejected/cancelled/expired proposal 永不进入 Assignment lifecycle（无行、无 trigger、无 Attention）。

---

## 3. Pulse Integration Point（当前架构审计）

### 3.1 数据入口现状（mobile）

| Pulse 组 | 数据源 | 刷新机制 | 文件 |
|---|---|---|---|
| Needs you | `GET /api/product/attention`（open） | REST snapshot + `/api/product/stream` SSE（attention.created/updated）+ 重连 reconcile | `useAttentions.ts` + `services/attention/store.ts` + `client.ts` |
| Noticed | `useL1().noticed`（`kind==="observation"`） | snapshot `GET /api/product/l1` + `/api/product/l1/stream` SSE 每帧全量替换 | `useL1.ts` + `services/l1.ts` |
| Today | `useProjectEvents`（opencode 会话轮询） | 30s 轮询 | `useProjectEvents.ts` |
| Market | `useL1().funds`（market-estimate L1 投影） | 同 L1 | 同上 |

BFF SSE 通道两个：`/api/product/stream`（attentionEmitter：item 级 created/updated 增量 + 连接时 open 快照重放）、`/api/product/l1/stream`（l1Emitter：全帧替换）。emitter 模式统一（`emitter.ts` / `l1-emitter.ts`：globalThis 单例 + Set<Listener>）。

### 3.2 是否已有 L2 / presentation abstraction

**没有统一 abstraction，也不需要造一个。** Pulse 首页的 `GroupItem` 是 discriminated union（`index.tsx:154-158`）：

```ts
type GroupItem =
  | { kind: "project"; event: GroupedEvent }
  | { kind: "attention"; attention: PulseAttentionItem }
  | { kind: "market" }
  | { kind: "noticed"; statement: L1Statement };
```

Phase 13 增加一个 `{ kind: "suggestion"; suggestion: PulseSuggestion }` variant + 一个 `groups` 条目即是完整接入。每组各自接自己的数据源与 authority（Attention → attention_items；L1 → L1 rules；Suggestion → assignment_proposals），互不复制、互不转换。

### 3.3 数据模型判断：是否需要新 canonical entity？

**NO。** 判据：

1. `assignment_proposals` 已是 canonical（有行、有稳定 ID、有 disposition、有 provenance、有 TTL）——Suggestion 需要的一切产品语义已存在。
2. Phase 10 对 L1 的裁决（"L1 是 presentation，不建表"）同理适用于 Suggestion 的**呈现层**：Suggestion 不是新的产品对象，而是 proposal 的 user-facing projection。
3. 唯一的新运行时构件是 **presentation 通道的变更广播**（proposalEmitter），它是 infra（与 attentionEmitter 同级），不是 entity。
4. PM §23 明文允许："Pulse may present conversational statements, proposals, and invitations."

---

## 4. Proposed L2 Suggestion Projection

### 4.1 核心边界

```text
L2 Suggestion ≠ Assignment Proposal
Suggestion = Proposal 的 user-facing projection（只读）
presentation state 不复制 lifecycle —— 唯一状态源是 proposal.status（BFF 权威）
```

客户端**不持有第二份状态机**：store 里存的是 BFF 返回的 proposal 字段（含 status），渲染过滤 `status === 'proposed'`——与 Attention store 过滤 `state === 'open'` 完全同构（`attention/store.ts:78`）。终态（confirmed/rejected/cancelled/expired）的行随 SSE/对账更新后自然从 Pulse 消失。

### 4.2 Projection model（mobile 视图模型，纯函数）

```ts
// src/services/proposal/store.ts（新增，纯函数）
export interface PulseSuggestion {
  id: string;                 // = proposal.id（prp_*），稳定引用
  responsibility: string;     // proposal.responsibility 原文（"what"）
  domain: "market" | "personal";
  mode: "one-shot" | "ongoing";
  status: ProposalStatus;     // 原样保留，不翻译成第二套状态
  triggerLabel: string;       // describeTrigger(triggerDefinition.schedule)（复用 Phase 9 projection.ts）
  reasonLabel: string | null; // "why"：provenance.createdBy 前缀 "observation:" → 确定性模板文案；talk 来源为 null
  createdAt: number;
  expiresAt: number;          // proposal TTL（7 天）→ 呈现"有效至"提示
}

export function toPulseSuggestion(p: ProposalRow): PulseSuggestion;
export function proposedSuggestions(items: PulseSuggestion[]): PulseSuggestion[];   // filter status==='proposed'，createdAt DESC
export function applyProposalChange(items: PulseSuggestion[], change: ProposalChange): PulseSuggestion[];  // upsert
export function reconcileSuggestionsFromSnapshot(snapshot: ProposalRow[]): PulseSuggestion[];
```

- `reasonLabel`（"为什么建议"）：`createdBy === "observation:<ruleId>"` → 客户端确定性模板（如「基于近期行情观察（连续 3 个评估点净值走低）」），与相邻 Noticed 卡的 L1 文案同族、不引用 audit judgmentSummary 原文；`createdBy === "talk"/"api"` → null（用户自己发起的提案无需"why"）。**BFF 零改动**——不新增 why 字段，不暴露 raw payload。
- 不展示：ruleId、observation event id、instructionRef、provenance 全量（内部标识不出 UI；testID 用 proposal.id 供 E2E）。

### 4.3 显示字段 / stable reference / lifecycle mapping

| 项 | 裁决 |
|---|---|
| source | `GET /api/product/assignment-proposals?status=proposed`（现有端点，零改动）+ product SSE proposal 变更（§9） |
| stable reference | `proposal.id`（`prp_*`）：React key、testID、Confirm/Reject 目标、SSE upsert 键 |
| display fields | responsibility（主文本）、triggerLabel（确认后会发生什么）、reasonLabel（为什么）、expiresAt（有效期提示）、domain pill |
| lifecycle mapping | proposed → 显示；confirmed → 消失（激活的 Assignment 在 Memory tab Responsibilities 可见，Phase 9）；rejected/cancelled/expired → 消失。**无本地 lifecycle 字段、无本地状态迁移** |
| confirm action | 显式按钮 → `confirmProposal(id)`（现有封装）→ POST confirm → 依据响应/SSE 移除卡片 |
| reject action | 显式按钮 → `rejectProposal(id)`（现有封装）→ POST reject → 卡片消失 |
| expiration handling | 权威在 BFF：现有 expiry sweep（每分钟）`proposed → expired`；客户端经 SSE `proposal.updated` 或重连对账自然移除。**不新增客户端过期计时器**（`expiresAt` 仅作展示提示） |
| duplicate handling | propose 时 `duplicateOf` 语义已存在（PM §10：指向既有 Assignment，不静默建第二份责任）。呈现层 MVP：所有 `proposed` proposal 各自成卡（每张是独立的待决事项）；observation 链路的 instructionRef dedup 已保证同一观察机会至多一张。不新增呈现层 dedup 机制 |

### 4.4 与 Noticed（L1）的关系

当前 rule `allowedOutcomes=["proposal","l1"]`，同一次 observation 会同时产出两者 → Pulse 将同时出现：

- **Noticed**（L1）：「我注意到 XX 连续 3 个交易日估算净值走低。」——informational，无动作。
- **Suggested**（L2）：「我建议：持续监控 XX，达到目标净值时提醒你。」——简单决定，Confirm/Reject。

这是 Phase 12 §11.3 预判过的合法并存（两个实体、两种动作、语义不重复），不需要合并或抑制。

---

## 5. Confirm / Reject Flow（现有 API 行为审计）

### 5.1 语义核对

```text
Confirm:  proposed →（用户显式按钮）→ confirm API → Assignment activated（唯一 activation moment）
Reject:   proposed →（用户显式按钮）→ reject API → Proposal rejected（无 Assignment、无 trigger、无 Attention）
```

与理想语义完全一致，**无需新增第二套状态机**。

### 5.2 逐项行为（现状即答案）

| 问题 | 现状（代码事实） |
|---|---|
| 是否 idempotent？ | **单次迁移语义**：`resolve()` 的 `WHERE status='proposed'` 原子守卫保证终局迁移恰好发生一次。重复调用**不产生副作用、确定性地失败**（ProposalError → HTTP 409），不是"幂等地返回成功"。客户端处理：409 → 视为"已在别处处理"→ 重拉 snapshot 对账 |
| 已 confirmed 再 confirm？ | 第一步 `status !== 'proposed'` 检查直接抛错 → 409，无第二次 activation、无第二个 Assignment（并发双确认也由 resolve 占坑防线拦截，`phase55-hardening.test.ts` 已覆盖） |
| 已 rejected 再 reject？ | 同上 → 409，确定性 |
| expired proposal confirm？ | `expireProposalsDue` sweep 已将 status 迁为 expired → confirm 抛错 → 409。过期提案不能确认（既有测试覆盖） |
| rejected proposal confirm？ | → 409 |
| activation 是否经过 authorization/activation guard？ | matrix 在 propose 时评估（§2.6）；confirm 即 activation moment（PM §10）。observation 提案全部 market/ongoing → 必然经 confirm。direct-activation 类不进 Pulse（瞬时 resolved），与 Suggestion 无交集 |
| 是否产生既有 canonical Events？ | confirm → `assignment.created` + `assignment.activated`（现有，refs.proposalId 回链）；reject/cancel/expire → 无 product_event（与 Attention 家族一致）。**Phase 13 不新增任何事件类型** |

### 5.3 结论

现有 API 语义完备，Phase 13 在 UI 层只是**调用**它们。唯一补充是 BFF 在这些迁移点上**广播 presentation 变更**（§9），不改变迁移语义本身。

---

## 6. Authorization & Security（全路径审计）

问题：是否存在 Observation → Proposal → Assignment 绕过用户确认的路径？

### 6.1 Assignment 行的全部创建路径（`assignmentRepository.insert` 调用面）

| # | 路径 | 授权来源 | 是否绕过 confirmation | 判定 |
|---|---|---|---|---|
| 1 | `assignmentService.confirm` → `activateProposalInternal` | 用户显式 confirm（JWT API / Talk 命令） | 否——confirm 就是确认 | ✅ |
| 2 | `assignmentService.propose` direct-activation 分支 | 用户显式指令本身（matrix 三轴全低：one-shot + personal） | 否——PM §10 允许 direct activation；且此类 proposal 瞬时 resolve，不产生 Suggestion | ✅ |
| 3 | `assignment-legacy-migration.ts`（instrumentation 启动序一次性迁移） | 用户此前运维层配置 target_nav 监控的行为（`authorization_ref = legacy-seed:fund-estimation`，迁移期特殊性已明文登记） | 否——既有事实，非 Phase 13 引入；幂等收敛 | ✅（不在本轮范围） |

除上述三处外，`assignmentRepository.insert` 无其他调用方（grep 验证）。

### 6.2 `propose` 的全部调用方

| 调用方 | 鉴权 | 能否自动激活 |
|---|---|---|
| `POST /api/product/assignment-proposals`（route.ts） | JWT | 仅 matrix all-low（one-shot personal）；请求本身即用户显式指令 |
| `ensureProposalForObservation`（observation-service） | 进程内（scheduler 链） | **不能**：market/ongoing → matrix required=true；另有运行时不变式守卫（result.assignment 非空即抛错） |

### 6.3 其余攻击面排查

| 面 | 结论 |
|---|---|
| scheduler | `assignment-triggers.ts` 只对 **active** Assignment 注册 timer 并触发执行；不接触 proposal 状态，无自动 confirm 路径 |
| observation runtime | 只 propose；dedup/cooldown 保证不重复提案；无 confirm/cancel 调用 |
| SSE | 全部只读广播（attentionEmitter/l1Emitter/拟新增 proposalEmitter）；SSE 端点 GET-only，无 mutation |
| mobile | `confirmProposal`/`rejectProposal` 仅由显式用户动作调用（Talk 斜杠命令 + Phase 13 拟新增按钮）；无自动 confirm |
| test helper | 测试使用 `assignmentService.confirm()`（正规服务路径），无直插 DB 绕过；测试代码不进生产 bundle |
| legacy route | `/api/product/assignments` POST = 405（激活必须经 proposals，FINAL_ARCHITECTURE §4 已登记）；`/api/events/stream` 已删除（Phase 10 退役） |
| proposal expiry sweep | 只做 proposed → expired（关闭选项，不开责任） |

**结论：未发现任何 Observation → Proposal → Assignment 的无确认路径。** Phase 13 的全部改动（emitter + SSE + UI）均为只读呈现与显式动作转发，不新增 authority。

---

## 7. Event / Attention / L1 Boundaries（污染检查）

| 检查项 | 裁决 | 依据 |
|---|---|---|
| Event 代替 Proposal？ | **禁止**。不新增 `proposal.*` 到 `PRODUCT_EVENT_TYPES`；proposal disposition 的权威在表行，与 Attention 家族一致（表 + SSE，无 product_event） | types.ts 现状；PM §10 |
| Attention 代替 Suggestion？ | **禁止**。Phase 13 不 import attention-service；不为 proposal 建 Attention（PM §10：proposal 无 Attention） | PM §10 Unconfirmed proposal |
| L1 代替 L2？ | **禁止**。Noticed 组不动；L1 rule registry 不感知 proposal；Suggestion 是独立 GroupItem variant | PM §22 |
| Delivery notification？ | **禁止**。proposal 不进 delivery decision（`delivery_jobs` CHECK 仅 attention/l1）；delivery 层零改动 | Phase 12 §13 裁决沿用 |
| Open Thread / Memory / KB write？ | **禁止**。observation runtime 本就不 import 这些；Phase 13 不引入 | Phase 11/12 边界沿用 |
| 复用现有机制？ | activation 审计复用现有 `assignment.created/activated`；proposal 列表复用现有 GET；confirm/reject 复用现有 POST。**不重新设计任何一条** | §2/§5 |

关于 SSE 变更种类命名的澄清：拟新增的 `proposal.created/updated` 是 **presentation 通道的变更通知**（与 `attention.created/updated` SSE 同家族——attention 的这两个 kind 同样不是 product_event），不进入 `product_events`，不构成"新 canonical Event"。这延续了既有架构事实，不是新设计。

---

## 8. Mobile UX Contract（语义与最小 UI 契约，不实现）

### 8.1 Pulse 分组全景（Phase 13 后）

```text
Pulse
 ├── NEEDS YOU   —— open Attention（L2/L3，有 handling 动作）          [已有，不动]
 ├── SUGGESTED   —— proposed Proposal（L2 suggestion，Confirm/Reject）  [Phase 13 新增]
 ├── NOTICED     —— observation L1（informational，无动作）             [Phase 12，不动]
 ├── TODAY       —— 项目 running                                       [已有，不动]
 └── MARKET      —— market-estimate L1 跑马灯                          [已有，不动]
```

命名对齐 PM §2 心智模型：Noticed = "I noticed."，Suggested = "我建议承担一个责任"。组仅在有内容时渲染（与现有 groups filter 一致）。

### 8.2 Suggestion 卡（最小契约）

```text
┌──────────────────────────────────────────────┐
│ ● SUGGESTED                        [Market]  │
│ 我建议：持续监控基金 012414（华宝医疗ETF联接C），│
│ 达到目标净值时提醒你。                         │
│ 为什么：基于近期行情观察（连续 3 个评估点净值走低）│
│ 确认后：每个交易日 14:50 评估，命中时提醒；      │
│        可随时在 Responsibilities 中撤销。      │
│                    [ 确认 ]        [ 不用了 ] │
└──────────────────────────────────────────────┘
```

卡必须让用户回答四问（任务书要求）：

1. **Agent 注意到了什么** → "为什么"行（与相邻 Noticed 卡同族文案；observation 来源才有，talk 来源省略）。
2. **Agent 建议承担什么责任** → responsibility 原文。
3. **为什么建议** → 同 1（reasonLabel）。
4. **确认后会发生什么** → triggerLabel 派生的效果句 + 撤销出口提示（Revocation 在 PM §11 永远可用）。

### 8.3 动作语义（硬规则）

| 规则 | 契约 |
|---|---|
| Confirm / Reject 是**唯一**推进路径 | 两个显式按钮；按下即调用现有 API；Confirm 前不做额外交互要求（按钮本身 = PM §10 的 explicit acceptance） |
| **查看 ≠ 授权** | 点开卡片/阅读/进入 Talk **永不**调用 confirm——卡体不做 confirm 语义的动作（MVP：卡体无 press 动作或仅展开详情的只读 sheet） |
| Reject 无残留 | 卡片消失；不写任何本地状态；被拒 proposal 只留 disposition 审计 |
| Confirm 反馈 | 卡片消失 + 轻量成功提示；激活的 Assignment 在 Memory tab → Responsibilities 可见（Phase 9 面板，零改动复用） |
| 失败处理 | 409（已在别处处理）→ 静默重拉 snapshot；网络错误 → 卡片保留 + 错误提示，不乐观移除 |
| 动作进行中 | 按钮置 busy，防双击重复提交（服务端 409 兜底） |

### 8.4 不做

- 不把 Suggestion 做成 Needs you 卡（不是 Attention，无 dismiss/handle 语义）。
- 不给 Suggestion 加 badge/红点/未读（PM §32：seen 是交互元数据；Suggestion 连 seen 都不需要）。
- 不做 Suggestion 详情页/二级屏（MVP 一卡足够；四问全部在卡内回答）。
- 不做 "稍后再说"（等于什么都不做——proposal 留在 proposed 直到用户处理或 7 天过期；拒绝才是不想要）。

---

## 9. SSE / Refresh Strategy

### 9.1 裁决：扩展 `/api/product/stream`（product presentation 通道）

新增 `proposalEmitter`（`lib/product/proposal-emitter.ts`，照 `emitter.ts` 模式），并在 proposal 终局迁移点广播：

| 时点 | 广播 | 备注 |
|---|---|---|
| `propose()` 且 proposal 停留 proposed | `proposal.created`（item=proposal 行） | **direct-activation 分支不广播**（瞬时 resolved，广播会造成闪烁） |
| `confirm()` 迁移成功后 | `proposal.updated`（confirmed 行） | 客户端移出 suggested |
| `reject()` / `cancel()` 成功后 | `proposal.updated` | 同上 |
| `expireProposalsDue()` 每个 transitioned | `proposal.updated`（expired 行） | sweep 每分钟，幂等 |
| dedup/恢复路径返回既有 proposal | **不广播**（无新事实） | |

`/api/product/stream/route.ts` 改动（对称于 attention 部分）：

- 连接建立时重放当前 `proposed` proposals（快照语义，补偿断线窗口，与 attention open 重放同构）；
- 订阅 proposalEmitter 转发变更；
- 心跳/CORS/鉴权不变。

### 9.2 客户端

`useSuggestions()` 镜像 `useAttentions()`：

```text
mount → GET ?status=proposed（snapshot 对账）→ subscribe /api/product/stream
      → proposal.created/updated upsert 进 store（渲染过滤 status==='proposed'）
      → SSE 断线重连 → 重拉 snapshot reconcile（沿用 attention hook 的 onReconnect 模式）
```

Confirm/Reject 动作路径：响应体已含迁移后的 proposal → 本地立即 upsert（卡片即刻消失）→ SSE 回流同一事实（幂等 upsert，无冲突）。

### 9.3 被否决的备选

| 备选 | 否决理由 |
|---|---|
| 纯轮询（无 SSE） | 新建议出现延迟到下一轮轮询；与 Attention/L1 的实时体验不一致；测试矩阵第 5 条要求 SSE 刷新 |
| 独立 `/api/product/proposals/stream` | 多一条端点/连接；product stream 本就是产品呈现通道，proposal 属于它 |
| 复用 L1 全帧替换协议 | proposal 有 disposition 与独立生命周期语义，item 级增量（attention 模式）才是同构选择；L1 的无状态全帧语义不该被污染 |
| 复用 `useL1`/attention store 承载 suggestion | 会把三种 authority 不同的 presentation 搅进同一 store，违反边界（§7） |

---

## 10. Test Matrix（设计，不写代码）

### Positive

| # | 用例 | 层 |
|---|---|---|
| 1 | Observation produces Proposal | BFF vitest（已有 Phase 11 覆盖，回归确认） |
| 2 | Proposal appears as Pulse L2 Suggestion | mobile vitest（store/projection）+ E2E（卡出现在 SUGGESTED 组） |
| 3 | Confirm creates/activates Assignment | BFF vitest（已有）+ E2E（点确认 → Assignment 出现在 Responsibilities） |
| 4 | Reject rejects Proposal | BFF vitest（已有）+ E2E（点拒绝 → 卡消失，无 Assignment 行） |
| 5 | SSE refreshes Suggestion | BFF vitest（emitter 广播点）+ E2E（sweep 产生 proposal → 卡在不开屏重拉的情况下出现） |
| 6 | Existing Phase 12 L1 remains visible | mobile vitest + E2E（Noticed 卡与 Suggested 卡并存于同一 observation） |

### Negative

| # | 用例 | 层 |
|---|---|---|
| 7 | Observation alone never creates Assignment | BFF vitest（已有不变式守卫测试，回归确认） |
| 8 | Opening Suggestion never confirms Proposal | E2E（点卡体 → 无 confirm 请求发出，proposal 仍 proposed） |
| 9 | Opening Talk never confirms Proposal | 沿用 Phase 4 既有断言模式（engage ≠ confirm）；E2E 进入会话后 proposal 仍 proposed |
| 10 | duplicate Confirm is deterministic | BFF vitest（已有：并发/重复 confirm → 一次迁移 + 409；补 SSE 断言仅一次 updated） |
| 11 | duplicate Reject is deterministic | BFF vitest（同上） |
| 12 | expired Proposal cannot be confirmed | BFF vitest（已有，回归） |
| 13 | rejected Proposal cannot be confirmed | BFF vitest（已有，回归） |
| 14 | no Attention is created accidentally | BFF vitest（confirm/reject 全程 attention_items 计数不变） |
| 15 | no Delivery is triggered accidentally | BFF vitest（proposal 广播后 delivery_jobs 计数不变） |

### Regression

| # | 用例 | 层 |
|---|---|---|
| 16 | Phase 10 L1 still works | 既有 L1 测试 + E2E 跑马灯 |
| 17 | Phase 12 observation L1 still works | `observation-l1.test.ts` 全绿 + E2E Noticed |
| 18 | Assignment execution still works | 既有 phase5/8 测试 + trigger 注册路径 |
| 19 | Assignment revoke still works | 既有 revoke 测试 |
| 20 | existing Attention flow still works | attention-service 全部测试 + `/api/product/stream` attention 部分回归（改动点：route 增加订阅，必须不破坏既有 attention 事件） |

---

## 11. Files to Change

### BFF（family-finance，独立 git）

| 文件 | 变更 | 内容 |
|---|---|---|
| `packages/web/lib/product/proposal-emitter.ts` | **新增** | proposalEmitter（照 `emitter.ts` 逐行模式）；`ProposalChange { kind: "proposal.created"\|"proposal.updated"; at; item: ProposalRow }` |
| `packages/web/lib/product/assignment-service.ts` | 修改 | propose（停留 proposed 时）/ confirm / reject / cancel / expireProposalsDue 各迁移点 emit；**仅此**，不改任何迁移语义 |
| `packages/web/app/api/product/stream/route.ts` | 修改 | 连接时重放 proposed proposals + 订阅 proposalEmitter；attention 部分原样保留 |
| `packages/web/lib/product/proposal-emitter.test.ts`（或并入现有 service 测试） | 新增 | 广播点断言（§10 #5/#10/#11/#15） |

零 schema 变更、零新端点、零事件类型变更。

### Mobile（agent-mobile-app）

| 文件 | 变更 | 内容 |
|---|---|---|
| `src/services/assignment/client.ts` | 修改 | 新增 `fetchProposals(status?)`（GET 列表）+ `ProposalRow` 完整类型（现有 `ProposalRecord` 是其子集，保留兼容）；confirm/reject 封装已有不动 |
| `src/services/proposal/store.ts` | **新增** | §4.2 视图模型 + 纯函数（toPulseSuggestion / proposedSuggestions / applyProposalChange / reconcileSuggestionsFromSnapshot） |
| `src/services/proposal/client.ts` | **新增** | `subscribeProposalEvents()`：连 `/api/product/stream`，只认 `proposal.*` kind（attention kind 忽略）；独立连接、退避重连（照 attention/client.ts 模式） |
| `src/hooks/useSuggestions.ts` | **新增** | 镜像 useAttentions：snapshot + SSE + reconcile；暴露 `suggestions / confirm / reject / connected` |
| `src/services/assignment/projection.ts` | 修改 | 新增 `describeProposalEffect(td)`（triggerLabel → "确认后会发生什么"句）与 `observationReasonLabel(createdBy)`（确定性模板） |
| `src/app/(tabs)/index.tsx` | 修改 | GroupItem 加 `suggestion` variant；新增 SUGGESTED 组；Suggestion 卡（两按钮 + busy + 409 对账） |
| `src/services/proposal/store.test.ts`、`projection` 增量测试 | **新增** | §10 mobile 层用例 |
| `scripts/e2e/phase13-e2e.mjs` | **新增** | 按 pulse-e2e.mjs harness：建议出现 → 打开不确认 → Confirm → Responsibilities 可见 → Reject 路径（复用现有 proposal/observation 数据或测试注入） |
| 知识库 | 修改 | `docs/knowledge-base/API.md`（product stream 广播种类 + suggestion 数据源）、`docs/redesign/FINAL_ARCHITECTURE.md`（Pulse 组登记 + proposal presentation 一行）、`docs/knowledge-base/modules/pulse-stream.md`（Suggested 组） |

---

## 12. Files NOT to Change

| 文件/域 | 理由 |
|---|---|
| `docs/redesign/PRODUCT_MODEL.md` | 冻结；无真实语义矛盾（§13 gap-1 为解释问题，PM §23 已允许 proposals 呈现） |
| DB schema / `migrations.ts` | `assignment_proposals` 已具备全部所需字段；零迁移 |
| `assignment-service.ts` 的 propose/confirm/reject/cancel/expire **语义** | 只加 emit，不改迁移/守卫/matrix 逻辑 |
| `assignment-proposal-repo.ts` | 已满足（list/resolve/findByInstructionRef/getById 全够） |
| `lib/observation/*` 全部 | Observation runtime（rules/grants/detector/service/runtime/l1）零改动；allowedOutcomes 已含 proposal |
| attention 全家（service/repo/rules/stream 客户端/attention 页面） | 边界隔离；stream route 仅**追加** proposal 部分 |
| `lib/product/l1-rules.ts` / `l1-market-source.ts` / `observation-l1.ts` / mobile `l1.ts` / `useL1.ts` | Phase 12 链路冻结（回归红线） |
| `lib/delivery/*` | proposal 无 delivery（§7） |
| `lib/scheduler/*`（除零接触） | 不新增 job；expiry sweep 已存在 |
| `PRODUCT_EVENT_TYPES` / `attention-service` / opencode bridge / permission-bridge | 无新事件、无 Attention 路径、不相关 |
| Talk 命令流（`parseAssignmentCommand` / ChatPanelZ） | `/confirm` `/reject` 已工作；Phase 13 不改 Talk |
| `src/theme/*` | 硬规定 5：颜色/字号/间距必须走 token；Suggestion 卡只用现有 token 与 EventItem/Button 组件 |

---

## 13. Risks / Gaps

| # | 风险/张力 | 分析 | 处置 |
|---|---|---|---|
| gap-1 | PM §20 "Pulse content comes in exactly two kinds"（informational statements / Attention renderings）vs L2 Proposal 呈现 | Phase 12 §22 gap-1 已登记的措辞张力。PM §23 明文 "Pulse may present conversational statements, **proposals**, and invitations"；§22 L2 = Proposal 交互级。**采信解释**：§20 的 "two kinds" 约束的是**来源分类**（statement 类 vs Attention rendering 类），§22 的 L1/L2/L3 是叠加其上的交互级；Proposal 以 L2 交互级呈现，来源属"Agent 的提案"（有 assignment governance 全链背书），不是第三类来源，更不是 raw Event。**不改 PM**，把该解释记入本设计与最终报告 | 按此解释实现；若未来 PM 修订，仅为措辞对齐 |
| risk-1 | direct-activation proposal 的广播闪烁 | propose 内 direct-activation 分支若广播 proposal.created 会立即伴随 confirmed | 裁决：仅停留 proposed 时广播（§9.1）；测试断言 direct-activation 路径零广播 |
| risk-2 | 用户离线期间在 Talk 用 `/confirm` 处理了 proposal，Pulse 仍显示旧卡 | 断线窗口错过 SSE | 既有模式兜底：重连必拉 snapshot reconcile（§9.2）；动作时 409 对账（§8.3） |
| risk-3 | 同一基金同时存在 observation proposal 与 Talk 手工 proposal（同 condition 不同 instructionRef） | 两张卡并存，confirm 第一张后第二张成为 duplicate（PM §10：指向既有 Assignment） | MVP 接受并存（各自是独立待决事项）；第二张 confirm 后的 duplicate 已是既有 propose 语义范围外的问题（propose 时提示），呈现层不做跨卡合并（不过度设计） |
| risk-4 | product stream 单连接多路事件（attention.* + proposal.*） | 老客户端（未来若存在）会收到不认识的 kind | SSE kind 自描述（`kind` 字段），客户端按 kind 过滤——与 attention client 现状一致（其只认 attention.*）；无破坏性 |
| risk-5 | proposal 过期 sweep 与 SSE 的时序 | sweep 每分钟逐条 emit；客户端在两次 emit 之间显示已过期卡 | expiresAt 展示提示让用户有预期；最终一致性由 sweep + snapshot 对账收敛，不做客户端倒计时强制移除（避免第二状态源） |
| risk-6 | E2E 真实数据依赖（observation 需要连续 3 个负 diff 评估点） | G7 已解（Phase 12 用 `market.rule.evaluated`）；但 E2E 造数据仍可能不稳定 | E2E 数据准备走 BFF 注入/既有 DB 状态断言（沿用 phase9-e2e 模式），不依赖真实行情时间窗 |

---

## 14. Implementation Plan（供实现轮执行，按依赖排序）

| 步 | 内容 | 依赖 |
|---|---|---|
| 1 | BFF：`proposal-emitter.ts` + assignment-service 五个广播点 + emitter 测试 | 无 |
| 2 | BFF：product stream route 重放 + 订阅；attention 回归测试 | 1 |
| 3 | Mobile：client.ts 加 `fetchProposals` + 类型；`proposal/store.ts` 纯函数 + 测试 | 无（可与 1 并行） |
| 4 | Mobile：`proposal/client.ts` SSE 订阅 + `useSuggestions` hook | 2、3 |
| 5 | Mobile：projection 增量（effect/reason 文案）+ Pulse SUGGESTED 组 + Suggestion 卡（§8 契约） | 4 |
| 6 | E2E：`phase13-e2e.mjs`（§10 正/负用例关键路径） | 5 |
| 7 | 验证：BFF vitest 全绿、mobile vitest 全绿、双端 `tsc --noEmit`、E2E | 全 |
| 8 | 文档：API.md / FINAL_ARCHITECTURE / pulse-stream 模块页 / PHASE13_FINAL_REPORT | 7 |

部署注意（AGENTS.md 硬规定 7）：mobile web 静态版需 `expo export --platform web --clear` + `systemctl restart serve-9928`；BFF 需重启进程。CORS 无新增端点，无白名单变更。

---

## 15. Definition of Done

1. Observation 产生的 proposal 以 Suggested 卡出现在 Pulse，四问可答（§8.2）。
2. Confirm（显式按钮）→ Assignment activated（行 + trigger + `assignment.created/activated`）→ Memory tab Responsibilities 可见；Reject → proposal rejected，无任何 Assignment 痕迹。
3. 除两个显式按钮与既有 Talk 命令外，**不存在任何**使 proposal 变为 Assignment 的路径（§6 审计结论在实现后复验）。
4. SSE：新 proposal 在不重开 App 的情况下进入 Pulse；confirm/reject/expire 后卡片消失；断线重连对账正确。
5. Noticed（Phase 12 L1）、Needs you（Attention）、Today、Market 全部回归通过；`[l1, proposal]` 并存呈现正确。
6. 无新 canonical entity、无新 product_event 类型、无 schema 迁移、PRODUCT_MODEL.md 零改动（git diff 为空）。
7. 测试：BFF vitest、mobile vitest（含新增 store/projection 用例）、双端 tsc、E2E §10 矩阵关键路径全绿。
8. 知识库三处文档同步（§11）。

---

## Architecture Decision

**问题：Phase 13 是否可以在不增加新的 canonical product entity、不修改 PRODUCT_MODEL、不引入新 lifecycle 的情况下完成？**

**答：可以。**

- **不新增 canonical entity**：Suggestion 的全部产品语义已由 `assignment_proposals`（行、稳定 ID `prp_*`、disposition、provenance、TTL、dedup 键）承载。新增物只有两个 infra 级构件：`proposalEmitter`（进程内广播，照 attentionEmitter 模式）与 Pulse 的一个 GroupItem variant——两者都是 presentation，不是产品对象。
- **不修改 PRODUCT_MODEL**：PM §22 已定义 L2 = Proposal 交互级，PM §23 已允许 Pulse 呈现 proposals；§20 "two kinds" 的措辞张力按 §13 gap-1 的解释消解（来源分类 vs 交互级），无需修订。
- **不引入新 lifecycle**：客户端唯一的"状态"是 `proposal.status` 原样字段 + `status === 'proposed'` 过滤；一切迁移由 BFF 既有 `resolve()` 单点完成（confirm/reject/cancel/expire 四个入口 + TTL sweep，全部已存在并有测试）。

**最小实现边界**（全部复用，无重设计）：

```text
复用（已存在，零改动）：
  Observation → Proposal        lib/observation/observation-service.ts（Phase 11）
  proposal 存储/迁移/dedup/TTL  assignment-proposal-repo.ts + assignment-service.ts + expiry sweep（Phase 5/5.5/11）
  Confirm / Reject API          POST /api/product/assignment-proposals/:id/{confirm,reject}（Phase 5）
  proposal 列表 API             GET /api/product/assignment-proposals?status=proposed（现有）
  mobile confirm/reject 封装    services/assignment/client.ts confirmProposal/rejectProposal（Phase 5）
  activation 审计 Event         assignment.created / assignment.activated（现有，refs.proposalId 回链）
  SSE/客户端模式                emitter → /api/product/stream → hook snapshot+reconcile（Attention 家族既有模式）
  呈现位置                      Memory tab Responsibilities（激活后的 Assignment 管理面，Phase 9）

新增（唯一缺口，全部是 presentation 层）：
  BFF  proposalEmitter + 迁移点广播 + product stream 重放/订阅      （~3 文件）
  Mobile  proposal store/client/hook + Pulse SUGGESTED 组 + 卡       （~5 文件）
```

**明确不做**：Observation → Attention（后续扩展）、proposal delivery、proposal canonical Event、第二套状态机、Suggestion 详情页、PM/schema/observation/attention/L1/delivery 改动。

---

> **本轮只审计与设计，不编码。** 若发现 PRODUCT_MODEL 真实语义冲突，不修改 PM，只报告 semantic gap——本轮结论：无真实矛盾（仅 §20 措辞张力，已有可采信解释，见 §13 gap-1）。
