# PHASE12_DESIGN.md —— Agent Observation → Product Presentation（Phase 12 设计）

> 状态：**设计稿（只设计，不编码）**。
> 语义来源：`PRODUCT_MODEL.md`（冻结，PM §n 引用；重点 §19/§20/§22/§16.2/§10/§17）。
> 架构来源：`FINAL_ARCHITECTURE.md`、`IMPLEMENTATION_MODEL.md`；前置设计 `PHASE10_DESIGN.md`（L1+Delivery 已实现）、`PHASE11_DESIGN.md`（Observation MVP 已实现）。
> 基线：Phase 1–11 完成；`lib/observation/*` 真实运行（deterministic → `agent.observation.recorded` → Assignment Proposal）。
> 本轮：设计 Observation 的三种合法 output（L1 / Proposal / Attention）如何进入用户产品体验；**不写代码**。
> 底线：**不修改 PRODUCT_MODEL.md**；发现真实语义冲突只报告 semantic gap。

---

## 0. 核心原则（贯穿全文）

```text
Observation             ≠ L1 / Attention / Assignment Proposal / Assignment
Observation（judgment） ≠ Output（output 由 Output Policy 计算）
Observation             ≠ Memory / KB

Observation Rule Definition
  ≠ Observation Authorization
  ≠ L1 Presentation Authority
  ≠ Attention Creation Authority
  ≠ Assignment Authorization
  ≠ Delivery Authority（delivery decision）
  ≠ Event Persistence
  ≠ Memory / KB Persistence Authority

allowedOutcomes = output path 白名单（不是 authority）
```

禁止推导（Phase 12 不得破坏）：

```text
✗  rule registered            → automatically authorized
✗  allowedOutcomes 声明        → automatically authorized
✗  Observation                → automatically L1 / Attention / Proposal / notification
✗  L1                         → Attention（点击/查看不转换）
✗  Proposal                   → Active Assignment
✗  Event persistence          → Memory / KB write permission
```

Phase 12 只做一件事：给已存在的 Observation judgment 增加**经过各自 authority 检查的 presentation output**，并把它们接入 Pulse/Talk 的真实消费面。

---

## 1. Phase 12 Goal

Phase 11 已实现：

```text
product_events
    ↓
observation-sweep（scheduler）
    ↓
Observation Rule Definition + Authorization
    ↓
deterministic detector（repeated-decline）
    ↓
Observation Judgment
    ↓
agent.observation.recorded（audit Event）
    ↓
Assignment Proposal        ← 唯一 output（allowedOutcomes=["proposal"]）
```

**缺口**：这个 Proposal 在用户产品面上不可见——Pulse 只呈现 open Attention（Needs you）、项目 running（Today）、L1 行情跑马灯（Market）；Proposal 只存在于 DB / `/api/product/assignment-proposals` / Talk 命令流。

Phase 12 目标：

```text
Observation
    ↓
Output Policy（per-output）
    ├── L1        —— 值得知道、无需决定（informational）
    ├── Proposal  —— Agent 建议承担责任（用户确认才 active）
    └── Attention —— 需要用户处理（authority + handling warranted）
    ↓
Pulse / Talk /（可选）Delivery
```

**范围原则**：

- 设计三种 output 的完整语义与 authority 链；
- **只选一个 scenario 作为 Phase 12 implementation candidate**（§17），不三个一起编码；
- 不改 Observation 核心语义（deterministic、judgment、audit-only、无 lifecycle）；
- 不建 observation entity、不建 `l1_items`、不改 PRODUCT_MODEL。

---

## 2. Current Phase 11 → Phase 12 Boundary（现状盘点）

### 2.1 已真实存在（可复用，不重造）

| 能力 | 真实接口（代码） | 与 Phase 12 的关系 |
|---|---|---|
| Observation rule registry | `lib/observation/rules.ts`：`OBSERVATION_RULES` / `OBSERVATION_RULE_IDS` | rule definition；**非授权** |
| Observation authorization | `lib/observation/grants.ts`：`OBSERVATION_GRANTS` / `isObservationAuthorized()` | 静态单用户授权；执行前提 |
| Detector | `lib/observation/observation-detector.ts`：`detectObservation()` → `ObservationJudgment {ruleId, subject, evidenceEventIds, judgmentSummary, warranted}` | pattern judgment（deterministic） |
| Output policy（当前） | `lib/observation/observation-service.ts`：`decideObservationOutcome()` → `"proposal" \| "none"` | Phase 12 扩展点 |
| Observation audit Event | `agent.observation.recorded`，payload `{ruleId, subject, evidenceEventIds, judgmentSummary, warranted, outcome, pattern}`；确定性 id `evt_obs_*` | L1/Attention 的 presentation 输入 |
| Proposal runtime | `assignment-service.propose/confirm`；`assignment_proposals`；`createdBy="observation:<ruleId>"`、`instructionRef="observation:<ruleId>:<eventId>"`；partial unique index | Phase 11 已闭环（除 presentation） |
| L1 runtime | `lib/product/l1-rules.ts`（`L1Rule`/`L1Statement`/`l1.market.estimate`/`l1RulesFor`）、`l1-emitter.ts`、`l1-market-source.ts`（5s）、`/api/product/l1` + `/api/product/l1/stream` | Phase 12 L1 统一的目标载体 |
| Attention runtime | `attention-service.create(spec)`（dedup_key UNIQUE + evidence + emitter）、`attention_items`/`attention_evidence`、`/api/product/attention` + `/api/product/stream` | Phase 12 Attention 落点 |
| Delivery runtime | `lib/delivery/`：`decision.ts`（attention market → wecom/email；L1 默认无）、`enqueueDelivery`、`delivery_jobs`（UNIQUE dedup）、sweep worker | 只消费 presentation；不改 |
| Pulse（mobile） | `src/app/(tabs)/index.tsx`：Needs you（open Attention）/ Today（项目）/ Market（`useL1().funds` 跑马灯）；`useL1` 返回 `statements` 但目前只投影 `funds` | Phase 12 呈现面 |
| Talk（mobile） | `(tabs)/talk.tsx` = Placeholder（UX-3）；真实 Talk 从 Pulse 上下文进入 `ProjectChatZ`；Assignment 命令流（`/confirm` 等） | L1/Proposal 路由落点 |

### 2.2 缺失 / 需要修改的真实点（Phase 12 设计对象）

| # | 缺口 | 证据 | Phase 12 是否必须解决 |
|---|---|---|---|
| G1 | **L1 frame 单写者 replace**：`l1-market-source.refreshL1MarketFrame()` 调 `setL1Statements()` 整体替换；observation L1 若写入会被 5s 后抹掉 | `l1-market-source.ts:50-55`、`l1-rules.ts:127-137` | **是**（L1 统一的前提） |
| G2 | **L1 rule 不接受 event source**：`l1.market.estimate.speaks = s.type === "data"` | `l1-rules.ts:92-98` | **是** |
| G3 | **observation event payload `outcome` 是单值**：无法表达 multi-output | `observation-service.ts` ingest payload | **是**（设计扩展） |
| G4 | **Observation proposal 在 Pulse 不可见**（无 Suggestions 呈现） | Pulse `index.tsx` 只有 Attention/Today/Market 组 | 设计；MVP 可延后 |
| G5 | **无 observation 专用 Attention creation authority**（只有 execution grants） | `grants.ts` | 设计；本轮不实现 |
| G6 | **无 `handlingWarranted` 判定**（Phase 11 `warranted` = pattern judgment） | `observation-detector.ts` | 设计；本轮不实现 |
| G7 | **真实 repeated-decline 不可达**：`market.rule.matched` 仅由 fund-estimation 在 `diff>0` 时发出 | `fund-estimation.ts:66-77`；PHASE11_FINAL_REPORT §11 | **是**（L1 MVP 的 data prerequisite） |
| G8 | L1 `kind` 只有 `"market-estimate"`，客户端无法区分来源 | `services/l1.ts` | 是（随 G1/G2） |

### 2.3 边界纪律（Phase 12 不做什么前提）

- Phase 11 的语义不动：rule definition ≠ authorization、deterministic 检测、event = audit。
- 不建 observation canonical entity、不建 `l1_items`、不给 L1 加 lifecycle。
- 不把 `allowedOutcomes` 当 authority。
- 不新建 scheduler / notification framework / LLM runtime。

---

## 3. Observation Output Policy（统一模型）

### 3.1 判定链（每个 output 独立通过各自的 authority）

```text
Observation Judgment（deterministic）
        ↓
① Observation Authorization（grants.ts）——该 rule 是否允许执行观察？       [已实现]
        ↓
② allowedOutcomes 白名单（rule definition）——该 output path 是否被声明？   [已实现字段]
        ↓
③ per-output authority check：
     L1         → L1 Presentation Authority（l1-rules registry：`l1.observation.<ruleId>` speaks）
     Proposal   → Assignment governance（propose 始终允许；activation 只经用户确认/matrix）
     Attention  → Attention Creation Authority（observation 专用静态授权）+ handlingWarranted
        ↓
④ output 产生：
     L1Statement（无 lifecycle） / Assignment Proposal / Attention Item
```

**任一 output 未通过 ③ → 该 output 不产生，不影响其他 output。**

### 3.2 `outcome` → `outcomes`（实现形状扩展，非 PM 变更）

Phase 11 payload 是单值 `outcome`；multi-output 需要集合。设计：

```ts
// agent.observation.recorded payload（Phase 12 起）
{
  ruleId, subject, evidenceEventIds, judgmentSummary, warranted,
  outcomes: Array<"l1" | "proposal" | "attention" | "none">,  // processing results（set）
  outcome?: ObservationOutcome                                 // 兼容 Phase 11 单值读取
}
```

- `outcomes` 是 **Output Policy 的 processing result**，不是 Observation intrinsic field（延续 Phase 11 §11.2）。
- 旧事件读取回退：`payload.outcomes ?? [payload.outcome].filter(x => x && x !== "none")`。
- 确定性 event id 不变（rule + subject + sorted evidence ids）——payload 扩展不破坏幂等。

### 3.3 Observation 没有产品生命周期（再次确认）

```text
✗ observation.status = shown / read / handled
✗ observation.state / observation lifecycle
✗ Observation reopen / dismiss / expire
```

- Observation 只有一次 judgment 事实（`agent.observation.recorded`，audit）与派生的 output；所有 lifecycle 都属于最终 product entity：**L1 无 lifecycle / Attention 有 lifecycle / Proposal 有 disposition / Assignment 有 lifecycle**。
- Observation Event 不被 output 的状态回写；Attention handle/dismiss、Proposal confirm/reject、L1 过期都不改变 observation。

### 3.4 Output Policy 纯函数（设计形状）

```ts
interface ObservationOutputDecision {
  l1:        { allowed: boolean; authorized: boolean };
  proposal:  { allowed: boolean; authorized: true };      // governance 在 propose/confirm 内
  attention: { allowed: boolean; authorized: boolean; handlingWarranted: boolean };
  outcomes: ObservationOutcome[];                          // 实际产生的 output 集合
}
```

- 纯 deterministic；无 LLM；无 side effect（side effect 由 observation-service 按 decision 执行）。
- `authorized` 来源必须是各自独立 registry，**不得**从 `allowedOutcomes` 推导。

---

## 4. Observation → L1

### 4.1 L1 Source Identity

**裁决：不引入 L1 canonical table；在现有 `L1Statement` 上增加显式 presentation metadata。**

```ts
// lib/product/l1-rules.ts（Phase 12 扩展形状）
type L1Kind = "market-estimate" | "observation";

interface L1Statement {
  id: string;                    // deterministic，见 §4.4
  kind: L1Kind;
  text: string;                  // agent 口吻的呈现文本（非 audit judgmentSummary）
  occurredAt: number;
  sourceRef: string;             // "fund:000001" | "observation:<eventId>"
  expiresAt: number | null;      // source-driven validity（见 §4.5）
  sourceKind: "deterministic" | "observation";  // 描述性 metadata，不是 authority
  data?: Record<string, unknown>;// 客户端投影用（不含 raw payload / provenance）
}
```

- `sourceKind` 只回答"这条 statement 从哪类来源投影而来"，供呈现分组/样式；**L1 presentation authority 永远来自 l1-rules registry，不来自 metadata**。
- 不因为新增 metadata 而建 `l1_items`。

### 4.2 L1 Presentation Authority（新增位）

Observation L1 必须有自己的 presentation rule；rule 存在 = 该来源有权被说（与 Attention rule、observation grant 分离）。

```ts
// lib/product/l1-rules.ts（设计形状；Phase 12 实现）
// 为每个已授权的 observation ruleId 注册一条 L1 rule：
//   ruleId: `l1.observation.<observationRuleId>`（如 l1.observation.observation.market.repeated-decline）
//   speaks: source.type === "event"
//           && source.event.type === "agent.observation.recorded"
//           && payload.ruleId === observationRuleId
//           && payload.warranted === true
//           && (payload.outcomes ?? [payload.outcome]).includes("l1")
//   render: deterministic 模板 → L1Statement（null = 不值得说）
```

- `L1Source` 扩展（保持 rule 纯函数、可单测）：

```ts
type L1Source =
  | { type: "event"; event: ProductEventRow; relatedEvents?: ProductEventRow[] } // Phase 12 增补
  | { type: "data"; data: unknown; occurredAt: number };
```

- `render` 用 `relatedEvents`（= `payload.evidenceEventIds` 对应的事实事件）取基金名/评估点，生成用户文本（如「我注意到 华宝医疗ETF联接C 连续 3 个交易日估算净值走低。」）；**audit 的 `judgmentSummary` 不直接当 UI 文案**。
- negative 登记：没有对应 `l1.observation.<ruleId>` 的 observation rule → `l1RulesFor()` 不返回任何 rule → 即使 `allowedOutcomes` 含 `l1` 也不呈现。

### 4.3 L1 Runtime：单写者 replace → source-owned composition

**问题（G1）**：`setL1Statements()` 会整体替换 frame，market 5s loop 会抹掉 observation L1。

**裁决：保留 Phase 10 对外语义（snapshot + 每帧全量替换），把 frame 内部改为按 source owner 分片合并。**

```ts
// lib/product/l1-rules.ts（设计形状）
const frame = {
  sources: Map<string, L1Statement[]>,   // key: "l1.market.estimate" / "l1.observation.<ruleId>"
};

setL1SourceStatements(sourceKey: string, items: L1Statement[]): void;
currentL1Statements(now = Date.now()): L1Statement[];
//  merge 所有 sources → filter expiresAt > now → 同 id 去重（新 occurredAt 覆盖旧）→ 稳定排序
```

- `l1-market-source` 只更新 `"l1.market.estimate"` 分片；observation runtime 只更新 `"l1.observation.<ruleId>"` 分片。
- 任一源更新 → `l1Emitter.emit(currentL1Statements(now))` → SSE 仍每帧全量替换（客户端 `useL1` 无需改协议）。
- `/api/product/l1` snapshot 语义不变（`currentL1Statements(Date.now())`）。
- 重启可恢复：observation 分片在 sweep 时从 `agent.observation.recorded` 事件重建（§4.6）；market 分片 5s 自建。

**对外接口不变**：`GET /api/product/l1`、`GET /api/product/l1/stream`（不新增 L1 API）。

### 4.4 L1 Dedup（same observation → same L1 identity）

```text
statement id = `l1.observation.<ruleId>:<observationEventId>`   （确定性）
```

- 同一次 observation（同 rule + subject + effective evidence window）→ 同 `observationEventId` → 同 statement id → frame 内天然去重；重复 sweep 不产生重复呈现。
- 不同 observation opportunity（新 evidence window）→ 新 id；旧 statement 由 §4.5 validity / supersede 收敛。
- **不给 L1 引入 Attention 式 dedup_key/lifecycle**；identity 是"呈现幂等键"，不是产品实体状态。

### 4.5 L1 Expiry / Validity

**裁决：L1 无 lifecycle；只有 source-driven validity。**

- `expiresAt = observationEvent.occurredAt + rule.l1ValidityMs`（rule 声明；默认取 `cooldownMs`，如 72h；显式 0/null 语义另定，见 §23）。
- 过期由 `currentL1Statements(now)` 过滤 + 下一次 frame emit 自然移出（客户端全量替换），**没有 OPEN/HANDLED/DISMISSED/EXPIRED**。
- **source disappearance**：若同 (rule, subject) 出现更新的 observation event，observation 分片重建时只保留最新一条 → 旧 statement 立即被 supersede（不等 expiresAt）。
- **不复制 Attention cooldown 为 L1 状态**；cooldown 仍属于 observation execution（防重复 judgment），L1 只是投影。

### 4.6 Observation L1 构建时机

```text
observation-service 产出 observation（写 agent.observation.recorded）
        ↓
refreshObservationL1(rule)              // 每条 l1-authorized rule
        ↓
latest = product_events(agent.observation.recorded) 按 (ruleId, subject) 取最新，且 occurredAt > now - l1ValidityMs
        ↓
l1RulesFor({type:"event", event: latest, relatedEvents: evidence}) → render
        ↓
setL1SourceStatements(`l1.observation.<ruleId>`, statements)
```

- 同一 refresh 也挂在 `observation-sweep` 每轮末尾（重启/漏帧兜底）——纯读事件，确定性、幂等。
- 无 observation → 空分片（不保留 stale）。

### 4.7 Observation → L1 的 authority 链（最终）

```text
agent.observation.recorded Event
        ↓
Observation Execution Grant（grants.ts）              [执行前提，Phase 11]
        ↓
allowedOutcomes 含 "l1"                                [path 白名单，非 authority]
        ↓
L1 Presentation Authority：l1.observation.<ruleId> (speaks)   [独立 registry]
        ↓
L1Statement（Pulse 呈现；无 lifecycle）
```

---

## 5. Observation → Attention

**设计完整，Phase 12 MVP 不实现**（§17）。四者同时成立才允许：

```text
① Observation Authorization（该 rule 可执行观察）
② allowedOutcomes 含 "attention"（进入 attention output path）
③ Attention Creation Authority（observation 专用独立授权）
④ handlingWarranted（§6，需用户决定）
```

### 5.1 Attention Creation Authority（新增独立 registry）

- **不复用** `OBSERVATION_GRANTS`（观察授权 ≠ 建 Attention 授权）、**不复用** `allowedOutcomes`、**不复用** Assignment authorization。
- MVP 静态配置（与 grants.ts 同模式，不建表）：

```ts
// lib/observation/attention-authority.ts（设计形状）
export const OBSERVATION_ATTENTION_AUTHORITY: string[] = [
  // 当前用户显式授权"某 pattern 成立时需要我处理"的 ruleId（Phase 12 设计为空）
];
export function isObservationAttentionAuthorized(ruleId: string): boolean;
```

- authority 语义 = **用户在观察时明确选择了"这类发现要叫我处理"**（PM §16.2 standing permission 的 attention 面）；Agent 兴趣永远不是来源。

### 5.2 Evidence（复用，不复制）

- 建 Attention 时 `evidenceEventIds` 传：

```text
[ observationEventId, ...judgment.evidenceEventIds ]
```

- `attentionService.create()` 已有的 `attention_evidence.appendMany` 落到 `attention_evidence`（软引用原 `product_events`）。
- audit chain：`Attention → attention_evidence → agent.observation.recorded → payload.evidenceEventIds → 原始 market facts`，**不 copy events、不建 observation 表**。

### 5.3 Dedup / Window

```text
dedupKey = sha256(`named-rule:${ruleId}|fund:${subjectId}|obs:${observationEventId}`)
```

- 同一次 observation opportunity → 同 Attention（重放只追加 evidence，不新建）；新 evidence window → 新 observation → 新 Attention（受 rule cooldown 限制）。
- `creationReasonKind = "named-rule"`，`creationReasonRef = ruleId`（PM §16.2：named Agent observation rule；不借用 assignment authorization）。
- `subjectKind = "fund"`、`domain = "market"`、`sessionId = null`（engage 后回填）。

### 5.4 Lifecycle（不新增）

- 沿用 Attention 现有 `OPEN → HANDLED / DISMISSED / EXPIRED`；**不为 observation 增加状态**。
- `expiresAt`：rule 声明 validity 时使用；未声明 = NULL（PM §17：无窗口不过期）。
- Attention 处理与 observation 无关：observation 无 lifecycle，Attention 结束不回写 observation。

---

## 6. Observation → Proposal（integration review，不重设计）

现状（Phase 11 已实现，验收通过）：

```text
observation → assignmentService.propose
  mode: ongoing / domain: market
  createdBy: "observation:<ruleId>"
  instructionRef: "observation:<ruleId>:<eventId>"（→ observation event → evidence）
  trigger: schedule-rule + fund-nav-above-target
  → proposal（proposed） —— 绝不 activate
  → confirm（用户显式） → Active Assignment
```

Phase 12 只做产品面 review：

| 问题 | 裁决 |
|---|---|
| Pulse 如何呈现 Proposal | 设计为 **L2 suggestion presentation**（§11），**不是 Attention**；Phase 12 MVP 不实现（§22 gap-1） |
| Proposal 是否需要独立 presentation | 需要（否则 observation proposal 不可见）；但属于独立 workstream，不混入 L1 MVP |
| Proposal 是否可作为 L2 | 可以（PM §22 L2 = 简单行动/决定；PM §23 允许 Pulse 呈现 proposal）；但受 PM §20 措辞张力约束（§22 gap-1） |
| Proposal 是否产生 Attention | **禁止**（PM §10：proposal 无 trigger、无 Attention；唯一未决状态是 proposal disposition） |
| Proposal 是否直接 delivery | **禁止**（本轮无 `proposal` presentation kind；delivery 只消费 Attention/L1） |

**语义确认（不变）**：

```text
Proposal ≠ Attention
Proposal ≠ Active Assignment
Observation → Proposal →（用户确认）→ Active Assignment（唯一路径）
```

---

## 7. Handling Warranted

Phase 11 只有一个 `warranted`（pattern judgment）。Phase 12 必须拆清三个判断：

| # | 判断 | 问题 | 来源 | 落点 |
|---|---|---|---|---|
| 1 | `judgment.warranted` | pattern 是否成立（证据充分、同向、不同评估点） | deterministic detector | Observation Judgment |
| 2 | `worthKnowing` | 是否值得知道且无需决定 | L1 presentation rule（`render` 返回 statement 或 null） | L1 |
| 3 | `handlingWarranted` | 是否有一个等待用户处理的决定 | 独立 predicate（下述） | Attention |

**`handlingWarranted` 判定（deterministic，设计形状）**：

```text
handlingWarranted(rule, judgment) =
      Attention Creation Authority 已授权（isObservationAttentionAuthorized(rule.ruleId)）
  AND rule.handlingReason ≠ null            // 明确"什么决定在等用户"（rule 定义的一部分）
  AND userActionTest(rule, judgment) = true // PM §16.1：存在用户行动可改变结果
  AND 未被同窗口 dedup / 未在 cooldown 内
```

- `userActionTest` deterministic 例：阈值相关决定（继续/调整/停止监控）、修复选择、权限确认。对 repeated-decline：用户可决定"是否继续观察/调整阈值/不关心"——但**只有在用户显式授权"这类发现要叫我"之后**才成立。
- **禁止**：`warranted = true → Attention`；Agent 觉得异常 / Agent curiosity 不是 handling reason。
- **禁止**：`allowedOutcomes 含 attention → Attention`（还须 ③ + ④）。
- `worthKnowing` 与 `handlingWarranted` **互斥叙述**：PM §22 明确 L1 不得成为 Attention 的藏身处——若需用户行动，则不是 L1。

---

## 8. L1 Semantics（Phase 12 汇总）

| 维度 | 裁决 |
|---|---|
| canonical entity | **无**（不建 `l1_items`） |
| lifecycle | **无**（无 open/handled/dismissed/expired；无 state API） |
| 数据模型 | 扩展 `L1Statement` metadata（`kind`/`sourceKind`），仍为内存投影 |
| source authority | 每种来源一个 presentation rule；observation 用 `l1.observation.<ruleId>`（独立 registry） |
| runtime | source-owned frame composition（§4.3），对外 snapshot/SSE 全量替换语义不变 |
| identity | 确定性 statement id（§4.4）；重复 sweep 无重复呈现 |
| validity | `expiresAt`（rule 声明）+ 新 observation 的 supersede；过期自动移出 |
| delivery | 默认 no delivery（Phase 10 策略保持）；不新增 |
| Talk | 点击不产生 handling state、不转换 Attention（§12） |

---

## 9. Attention Semantics（observation-born，Phase 12 设计）

| 维度 | 裁决 |
|---|---|
| canonical | 沿用 `attention_items`（不新建实体） |
| creation kind | `named-rule`，ref = observation ruleId（不借用 assignment authorization） |
| 四检查 | observation grant + allowedOutcomes 含 attention + attention authority + handlingWarranted（§5） |
| evidence | `attention_evidence` 引用 [observation event, ...original evidence events]（§5.2） |
| dedup | per (rule, subject, observation opportunity)，沿用 UNIQUE dedup_key |
| lifecycle | 沿用 OPEN/HANDLED/DISMISSED/EXPIRED；observation 不引入状态 |
| expiresAt | rule validity；未声明 = NULL（无窗口不过期） |
| delivery | 沿用 Attention delivery policy（market attention → wecom/email），delivery 不改 state |
| Pulse | 沿用 Needs you 呈现（L2/L3）；不新增 UI 语义 |

---

## 10. Proposal Semantics（Phase 12 汇总）

| 维度 | 裁决 |
|---|---|
| canonical | `assignment_proposals`（已存在） |
| 状态 | `proposed/confirmed/rejected/cancelled/expired`（proposal disposition，非 Assignment lifecycle） |
| activation | 只经 `confirm`（用户显式）或 matrix direct（observation 场景 market/ongoing 必然 confirm） |
| Pulse | 设计为 L2 suggestion（独立 presentation，不是 Attention、不是 L1）；MVP 不实现 |
| notification | 禁止 proposal → notification |
| dedup | `instructionRef` 确定性 + partial unique index（Phase 11） |
| duplicate | `duplicateOf` 语义：指向既有 Active Assignment，不静默建第二份责任 |
| expiry | proposed 7 天 TTL → expired（不影响既有 Attention/Event） |

---

## 11. Pulse Presentation

### 11.1 呈现分类（不新增顶层 UI）

```text
Pulse
 ├── Needs you      = open Attention（L2/L3，有 handling 动作）        [已有]
 ├── Noticed        = observation L1 statements（informational，无动作）[Phase 12 新增]
 ├── Today          = 项目 running                                    [已有]
 └── Market         = market-estimate L1 跑马灯                        [已有]
```

- "Noticed"（命名可调）只渲染 `statement.kind === "observation"` 的 L1：一行 agent 口吻文本，无 dismiss、无 badge、无 lifecycle。
- **不暴露**：ruleId、observation event id、sweep、raw payload（可放 data 供未来导航，但 UI 不展示内部 id）。
- L1 statement 点击 → Talk 仅作为未来能力（§12）；MVP 不实现点击（Talk changes = NO）。
- 预算：`useL1()` 已经返回全部 statements；Pulse 只需新增 `noticed` 投影 + 一个 section，无需新 hook/新端点。

### 11.2 Proposal suggestion（设计，不实现）

如果未来实现：`Suggestions` 组呈现 `proposed` proposals（`GET /api/product/assignment-proposals?status=proposed`），动作 Confirm / Ignore 映射现有 `confirm`/`reject`；**不是 Attention**、**不进入 lifecycle**、**不 delivery**。与 PM §20 "Pulse content comes in exactly two kinds" 的措辞张力见 §22 gap-1。

### 11.3 冲突避免

- 同一 observation 不同时呈现 "Noticed"（L1）与 "Needs you"（Attention）——§14 规定 `l1` 与 `attention` 互斥。
- 同一观察有 Proposal + L1（`[l1, proposal]`）时：L1 是"我注意到了"，Proposal 是"要不要我接着盯"；两个实体、两种动作，语义不重复；但 MVP 只实现 L1。

---

## 12. Talk Routing

| 来源 | 路由 | 是否改 state | Phase 12 实现 |
|---|---|---|---|
| L1（observation / market-estimate） | 有 session → Resume；无 session → Create（带 statement 上下文） | **零 state 写入**；不 engage、不转 Attention | 设计；MVP 不做点击 |
| Attention | Phase 4：有 session → Resume；无 → Create + engage 回填 | 只有用户 handle/dismiss 才迁移 | 沿用，不改 |
| Proposal | Talk 讨论；Confirm/Reject 走显式动作（Pulse 卡或 `/confirm`、`/reject`） | proposal disposition；绝不自动 active | 设计；MVP 不改 |
| Observation 本身 | 无 Talk 路由（不是产品实体、无 UI） | — | — |

铁律：

```text
L1 → Talk  ≠  handling（无 obligation、无 state）
Proposal → Talk ≠ activation（确认永远是用户显式动作）
Attention → Talk 沿用 Phase 4（viewing ≠ handling）
```

---

## 13. Delivery

```text
Observation → presentation（L1 / Attention / Proposal）→ optional delivery
✗ Observation → notification（禁止直连）
```

| output | Phase 12 裁决 |
|---|---|
| L1（含 observation L1） | 默认 **no delivery**（Phase 10 策略保持）；Pulse 呈现即可 |
| Attention（含 observation-born） | 沿用现有 decision（market attention → wecom/email）+ outbox；delivery 不改 state |
| Proposal | **no delivery**（无 `proposal` presentation kind；本轮不扩 `delivery_jobs` CHECK） |
| Delivery 层改动 | **无**；不新增 channel/framework |

若未来要 proposal delivery：必须先有 proposal presentation authority + 新 presentation kind + decision 策略；仍不得 Observation → notification（必须经 presentation）。

---

## 14. Multi-output

```text
one Observation
   ├── L1        （worth knowing）
   ├── Proposal  （responsibility suggestion）
   └── Attention （actionable，authority + handling warranted）
```

### 14.1 合法组合

| allowedOutcomes | 允许？ | 说明 |
|---|---|---|
| `["l1"]` | ✅ | 纯 informational（Phase 12 MVP） |
| `["proposal"]` | ✅ | Phase 11 现状 |
| `["l1","proposal"]` | ✅ | "我注意到了 + 要不要我接着盯"（方向明确、动作不同） |
| `["attention"]` | ✅ | 需要处理（authority + handling warranted） |
| `["attention","proposal"]` | ✅（语义） | Attention 是主呈现；Proposal 是建议的补救行动；MVP 设计中 Proposal 不进 Pulse，仅在 Talk 可达 |
| `["l1","attention"]` | ❌ | PM §22：需用户行动的不是 L1；同一 matter 不能既"无需决定"又"等你决定" |

### 14.2 Dedup / Ordering / 冲突

- 每个 output 独立 dedup（L1 按 statement id；Attention 按 dedup_key；Proposal 按 instructionRef）。
- **一个 observation opportunity = 至多一条 `agent.observation.recorded`**（Phase 11 幂等锚点）。
- 呈现冲突策略（presentation-only）：同一 observation 的 actionable 呈现至多一个，优先级 `attention > proposal`；L1 与 attention 互斥（§14.1）；L1 + proposal 可并存（MVP 只实现 L1）。
- 顺序：先记 audit Event → 再按 decision 产生 output（Event 是幂等锚点；中断可恢复，Phase 11 已实现 proposal 恢复，同样适用于 L1 重建）。

---

## 15. Dedup

| 层 | 幂等键 | 来源 | Phase |
|---|---|---|---|
| Observation | 确定性 event id：`sha256(ruleId\|subject\|sorted evidence ids)` | `observation-service.observationEventIdOf` | 11 |
| L1 | statement id：`l1.observation.<ruleId>:<observationEventId>`；frame merge + supersede + expiresAt | §4.4/§4.5 | 12 |
| Attention | `sha256(named-rule:<ruleId>\|fund:<subjectId>\|obs:<observationEventId>)`（UNIQUE dedup_key） | §5.3 | 12（设计） |
| Proposal | `instructionRef = observation:<ruleId>:<eventId>` + partial UNIQUE | 11 | 11 |
| Delivery | `sha256(kind\|ref\|channel\|window)`（UNIQUE） | 10 | 10 |
| Cross-output | 同一 observation 的多个 output 各自 dedup；不互相复用键 | §14.2 | 12 |

---

## 16. Authority Audit

```text
Observation
  ├─ cannot bypass L1 presentation authority    → l1RulesFor() 无对应 rule → 无 L1
  ├─ cannot bypass Attention creation authority → isObservationAttentionAuthorized 未授权 → 无 Attention
  ├─ cannot bypass Assignment governance        → 只 propose；activation 只经 confirm/matrix
  ├─ cannot bypass delivery decision            → 无 Observation → channel 直连路径
  └─ cannot bypass Memory/KB persistence        → observation runtime 不 import memory/KB 写路径
```

| 概念 | 载体 | 不得被谁替代 |
|---|---|---|
| Observation Rule Definition | `lib/observation/rules.ts` | — |
| Observation Authorization | `lib/observation/grants.ts` | `allowedOutcomes`、rule 注册 |
| L1 Presentation Authority | `lib/product/l1-rules.ts` registry | observation grant、`allowedOutcomes` |
| Attention Creation Authority | `lib/observation/attention-authority.ts`（设计） | L1 authority、assignment authorization、`allowedOutcomes` |
| Assignment Authorization | `assignment-service.propose/confirm` | 任何 observation output |
| Delivery Authority | `lib/delivery/decision.ts` | presentation kind 本身 |
| Event Persistence | `product_events`（audit） | Memory/KB persistence |
| Memory / KB Persistence Authority | PM §6 独立机制（本轮不涉及） | observation event 存在本身 |

---

## 17. MVP Choice

三个 scenario（§14）中，Phase 12 第一实现选 **Scenario A：Observation → L1（informational）**。

| candidate | 内容 | 新 authority | 新 lifecycle | 产品价值 | 裁决 |
|---|---|---|---|---|---|
| **A** | Observation → L1 → Pulse | 仅 L1 presentation rule | 无 | "I noticed" 落地；解决 L1 统一（G1/G2） | **✅ selected** |
| B | Observation → Proposal → Pulse suggestion | proposal presentation（PM §20 张力） | proposal disposition（已有） | 闭合 Phase 11 建议不可见 | ⏭ 下一候选（设计已备） |
| C | Observation → Attention | Attention creation authority + handlingWarranted | 沿用 Attention | 最强干预 | ⏸ 暂不实现（authority 最重） |

**Scenario A 实现范围（下一轮编码）**：

0. **data prerequisite（G7）**：让 repeated-decline 在真实数据可达——observation rule 的 evidence 来源扩展为 `market.rule.evaluated`（每日评估事件，diff 含符号），detector 语义不变（§22 gap-2 记录为实现决策）。
1. L1 frame source-owned composition（`setL1SourceStatements` / merge / sourceKey），market source 改分片写入。
2. `l1.observation.<ruleId>` presentation rule + `L1Source.relatedEvents` 扩展 + negative 登记。
3. Observation event payload `outcomes` 扩展（兼容旧 `outcome`）。
4. Observation sweep 末尾 + 产出后的 L1 分片刷新（重启可恢复）。
5. Pulse "Noticed" section 渲染 observation L1（`useL1.statements` 投影，不新增端点）。
6. 测试 + E2E + 文档。

**不在 Scenario A**：Attention path、Proposal Pulse presentation、L1 delivery、LLM。

**选择理由**：

- 零新增 authority、零 lifecycle、零 governance 变化（语义最安全）；
- 解决 blocking 架构缺口 G1/G2（否则任何 observation output 都无法进入 L1 面）；
- 让 Phase 11 的 observation 第一次真正"可见"（Pulse "I noticed" 承诺）；
- Proposal presentation 涉及 PM §20 措辞张力（§22 gap-1），值得单独一轮解决，不与 L1 混合。

---

## 18. LLM Decision

**裁决：Phase 12 不引入 LLM bounded observation judgment。**

理由：

| 维度 | 判断 |
|---|---|
| 架构 | LLM judgment 需要新的 confidence/warranted 语义、内部 bounded execution context（Phase 11 §20 未建）；authority 链是 deterministic 的，LLM 不能拥有 authority |
| 成本 | 每 sweep × 每 subject 的 LLM 调用无上界；当前无成本模型/预算/降级策略 |
| 产品 | deterministic path 尚未闭环（proposal 不可见、L1 未接）；先证明 observe → present → user responds 的价值，再决定 LLM 是否增加判断力 |
| 风险 | LLM 输出不稳定会污染 audit Event 与 presentation；当前 event payload 语义是"判断摘要 + warranted"，不接受 reasoning trace |
| 名字 | "Agent Observation" 不要求 LLM；Observation = judgment，deterministic judgment 也是 judgment |

**重新评估前置条件**（全部满足才考虑）：

1. deterministic observation 完成产品闭环（L1/Proposal 可见、用户有响应）；
2. 有内部 bounded execution context（不进用户 Talk history）；
3. confidence 只作 runtime metadata，产品判断仍用 warranted/not-warranted；
4. 明确的成本/降级策略；
5. 有 deterministic 无法覆盖的 pattern 需求。

---

## 19. Test Strategy

| 组 | 用例 |
|---|---|
| **L1 authority** | observation grant + `allowedOutcomes` 含 l1 + `l1.observation.<ruleId>` 存在 → L1Statement；缺 L1 rule → 无 L1（即使 allowedOutcomes 含 l1）；缺 observation grant → 无 observation 无 L1 |
| **L1 semantics** | L1 无 lifecycle（无 state API/字段、不产生 attention_items）；statement id 确定性（同 observation 重放 → 同 id，无重复呈现）；supersede（新 observation 替换旧 statement）；expiresAt 到期移出；market source 更新不抹除 observation 分片（G1 回归） |
| **L1 多源** | frame = market + observation 合并；SSE 每帧全量替换（协议不变）；data source 失败不影响 observation statement |
| **Attention（设计期负例）** | allowedOutcomes 含 attention 但无 attention authority → 无 Attention；authority 有但 handlingWarranted=false → 无 Attention；`warranted=true` 单独 → 无 Attention；observation 不自动 Attention |
| **Attention（若未来实现）** | evidence 含 observation event + 原 fact；dedup 同 opportunity；Attention lifecycle 独立；delivery 不改 state |
| **Proposal** | observation → proposal（已有）；proposal ≠ active；confirm 走 governance；L1/MVP 不改变 proposal 行为 |
| **Mixed** | `[l1, proposal]` → 两 output 各自产生、各自 dedup；`[l1, attention]` registry 校验拒绝 |
| **Negative authority** | 无 grant → nothing；allowedOutcomes 不被当 authority；Observation 不直连 delivery；Observation 不写 Memory/KB；`outcomes`/`outcome` 兼容读取 |
| **Real data** | `market.rule.evaluated` evidence（G7）→ 真实连续 3 个负 diff → observation → L1 出现在 `/api/product/l1`；无 pattern 不产出 |
| **Mobile** | Pulse "Noticed" 只渲染 observation L1；无 NEEDS YOU 误标；无 dismiss/handle 动作；无 JS error |

---

## 20. Non-goals（本轮 / MVP 明确不做）

- 修改 PRODUCT_MODEL。
- 创建 observation entity / `l1_items` / observation UI 顶层页。
- LLM observation runtime。
- coding observation、email behavior、user behavioral profiling、cross-domain inference。
- new notification framework / new scheduler / new lifecycle state。
- Observation → direct notification。
- Observation → direct Memory/KB write。
- Proposal → Attention、Proposal → auto-active、Proposal → delivery（本轮）。
- L1 attach/detach 逐条协议、L1 delivery 策略变更。
- 多实例/分布式 observation。

---

## 21. Final Architecture

```text
Events（product_events：market facts / assignment facts / ...）
      │
      ▼
Observation Rule（rules.ts）
      │
Observation Authorization（grants.ts）        ← 独立 ①
      │
deterministic detector
      │
Observation Judgment（warranted / evidenceEventIds）
      │
agent.observation.recorded（audit Event）
      │
Output Policy（allowedOutcomes 白名单 + per-output authority）
      │
 ┌─────────────┼──────────────────┬────────────────────┐
 ▼             ▼                  ▼                    ▼
L1         Proposal           Attention            （none）
 │             │                  │
 │ L1 authority │ Assignment      │ Attention authority
 │ (l1-rules)   │ governance      │ + handlingWarranted
 ▼             ▼                  ▼
L1Statement   Assignment        Attention Item
（内存投影）    Proposal           （attention_items）
 │             │                  │
Pulse         Talk/Pulse(L2)     Pulse（Needs you）
"Noticed"      confirm → Active   handle/dismiss
 │             │                  │
 ▼             ▼                  ▼
（默认 no      Active            Attention
delivery）     Assignment        delivery policy
                                  → delivery_jobs
```

权威边界（不变）：

```text
Observation Rule Definition ≠ Observation Authorization
≠ L1 Presentation Authority ≠ Attention Creation Authority
≠ Assignment Authorization ≠ Delivery Authority
≠ Event Persistence ≠ Memory/KB Persistence Authority
Observation ≠ Output
```

---

## 22. Semantic Gap 检查

| # | 张力 | 分析 | 处置 |
|---|---|---|---|
| gap-1 | PM §20：**"Pulse content comes in exactly two kinds"**（informational statements / Attention renderings）与 PM §22 L2 "Proposal"、§23 "Pulse may present ... proposals" | Assignment Proposal 若作为 Pulse L2 suggestion 呈现，是"第三种"呈现对象（不属于 §20 的两类）；若解释为 §20 只约束 source（statement vs Attention），则 L2 proposal 属于 §22 的 interaction level，不冲突 | **不修改 PM**。Phase 12 MVP 不实现 Proposal Pulse presentation，把该问题留到单独一轮；设计上承认两种解释，实施时二选一（推荐"§22/§23 允许 L2 suggestion，§20 的 'two kinds' 指 source 分类"）。 |
| gap-2 | Phase 11 rule `eventTypes=["market.rule.matched"]` 假设 matched 可携带负 diff；实际 runtime 只在 `diff>0` 发 matched | 不是 PM 矛盾，是 runtime 数据可达性问题（G7） | 记录为 Phase 12 实现 prerequisite：以 `market.rule.evaluated`（每日、含符号 diff）作为 decline evidence；PM 不动。 |
| gap-3 | Phase 11 `warranted` 单字段 vs Phase 12 `worthKnowing` / `handlingWarranted` | 细化，不是冲突（`warranted` 仍是 pattern judgment） | 设计层拆分（§7）；Event payload 仅增 `outcomes`，不改 `warranted` 语义。 |
| gap-4 | PM §17 无窗口不过期 vs L1 `expiresAt` | L1 无 lifecycle；`expiresAt` 是 client 移出提示，不是状态迁移（Phase 10 已定） | 保持 Phase 10 语义；observation L1 validity = source-driven，不构成 gap。 |

**未发现需要修改 PRODUCT_MODEL 的真实矛盾。**

---

## 23. Decision Points（Phase 12 最终裁决）

| # | 决策点 | 裁决 |
|---|---|---|
| 1 | Observation output policy | `allowedOutcomes` = path 白名单；每个 output 独立 authority 检查；不合并 authority（§3） |
| 2 | Observation → L1 | 复用 Phase 10 L1 管道；新增 `l1.observation.<ruleId>` presentation authority + source-owned frame（§4） |
| 3 | L1 canonical / lifecycle | 无 `l1_items`、无 lifecycle；确定性 statement id + expiresAt/supersede（§8） |
| 4 | L1 runtime 组合 | frame 按 source owner 分片合并；对外 snapshot/SSE 全量替换协议不变（§4.3） |
| 5 | Observation → Attention | 四检查（grant + allowedOutcomes + attention authority + handlingWarranted）；evidence 复用 attention_evidence；dedup per observation opportunity（§5） |
| 6 | handling warranted | 独立 predicate（§7）；`warranted=true` 不蕴含 Attention；Agent curiosity 永远不是 reason |
| 7 | Observation → Proposal | 保持 Phase 11；只 propose；Pulse L2 suggestion 设计但不实现（§6/§11.2） |
| 8 | Pulse | 新增 "Noticed" 组渲染 observation L1；不新增顶层 UI；Proposal suggestion 延后（§11） |
| 9 | Talk routing | L1 零 state；Attention 沿用 Phase 4；Proposal confirm/reject 显式；都不自动 active（§12） |
| 10 | Delivery | L1 默认 no delivery；Attention 沿用；Proposal no delivery；Observation 禁止直连（§13） |
| 11 | Multi-output | `[l1,proposal]`/`[attention,proposal]` 允许；`[l1,attention]` 禁止；actionable 呈现至多一个（§14） |
| 12 | Observation state | 无生命周期；`agent.observation.recorded` 只是 audit（§3/§15） |
| 13 | MVP | Scenario A：Observation → L1（§17） |
| 14 | LLM | **NO**（§18）；满足五个前置条件后再评估 |
| 15 | Event payload | 增 `outcomes[]`，保留 `outcome` 兼容读取；不改确定性 id（§3.2） |
| 16 | 真实数据 prerequisite | G7：decline evidence 改用 `market.rule.evaluated`（§22 gap-2） |

---

## 24. Final Decision

```text
Phase 12 implementation candidate:
    Scenario A —— Observation → L1（deterministic market repeated-decline
    的 informational statement → Pulse "Noticed"；含 L1 source composition、
    observation L1 authority、identity/validity）

LLM observation:   NO
L1:                YES
Attention:         NO        （设计完成，本轮不实现）
Proposal:          YES       （Phase 11 runtime 已实现；其 Pulse presentation 设计完成、不属本轮 implementation candidate）
Pulse changes:     YES       （新增 Noticed 组渲染 observation L1；不改顶层 UI）
Talk changes:      NO        （L1 保持 informational；Proposal/L1 Talk 路由仅设计）
Delivery changes:  NO
PRODUCT_MODEL:     UNCHANGED
```

> **本轮只设计，不编码。**
> 若发现 PRODUCT_MODEL 真实语义冲突，不修改 PM，只报告 semantic gap（见 §22：无 PM 矛盾，仅 §20 措辞张力与 runtime 可达性问题）。

---

## 25. Implementation Status（2026-09-11）

Phase 12 已实现。所有 tests pass（BFF 228 passed, Mobile 113 passed）；TypeScript 类型检查通过。

### 实现概要

| 组件 | 状态 | 文件 |
|------|------|------|
| G7：decline evidence 改用 `market.rule.evaluated` | ✅ | `rules.ts` |
| Observation payload outcomes[] | ✅ | `observation-service.ts` |
| L1Statement 类型扩展（kind + sourceKind） | ✅ | `l1-rules.ts`, `l1.ts`（mobile） |
| L1 Source 扩展（relatedEvents） | ✅ | `l1-rules.ts` |
| Source-owned L1 frame composition | ✅ | `l1-rules.ts` + `l1-market-source.ts` |
| Observation L1 presentation authority | ✅ | `observation-l1.ts` + `l1-rules.ts` |
| Observation sweep → L1 refresh 集成 | ✅ | `observation-runtime.ts` + `observation-service.ts` |
| L1 validity（expiresAt = l1ValidityMs） | ✅ | `observation-l1.ts` |
| Supersede 逻辑（新 statement 覆盖旧） | ✅ | `mergeL1Sources()` |
| Pulse "Noticed" section | ✅ | `index.tsx`（mobile）+ `useL1.ts` |
| Phase 12 tests | ✅ | `observation.test.ts` |

### Deviations from Design

1. **`observation-l1.ts` 不再显式调用 `l1Emitter.emit`** — `setL1SourceStatements()` 内部已自动合并所有 sources + 广播，显式 emit 会导致重复广播。
2. **backward-compat `outcome` 字段** — 当 outcomes 含 `["l1", "proposal"]` 时，`outcome` = `"proposal"`（proposal 优先级 > l1），保持旧 consumer 兼容。
3. **`eventTypes` 从 `["market.rule.matched"]` 改为 `["market.rule.evaluated"]`** — 修复 G7（matched 只在 diff>0 发出，decline 无法触发）。

### Test Results

```
BFF:     23 passed | 3 skipped (26) — 228 tests | 5 skipped
Mobile:  16 passed (16) — 113 tests
TypeScript: BFF ✅, Mobile ✅
```
