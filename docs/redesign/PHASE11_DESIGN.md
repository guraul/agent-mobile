# PHASE11_DESIGN.md —— Agent Observation（Phase 11 设计）

> 状态：**设计稿（只设计，不编码）· 已按评审修正（authority 边界 / cardinality / Event 语义 / judgment vs outcome / Event persistence vs Memory-KB persistence）**
> 实现状态（2026-09-11）：MVP `observation.market.repeated-decline` 已落地；实现记录与实际偏差见 §28（不修改设计决策）；最终报告见 `PHASE11_FINAL_REPORT.md`。
> 语义来源：`PRODUCT_MODEL.md`（冻结，重点是 §19 intelligent observation path / §16.2 authority families / §22 L1 / §6 persistence / §10 Assignment governance）；架构来源 `FINAL_ARCHITECTURE.md`、`IMPLEMENTATION_MODEL.md`。
> 基线：Phase 1–10 完成；Event/Attention/Assignment/Pulse/Talk/Handling/Memory/KB/L1/Delivery 均有真实 runtime。Agent Observation 仍为 Future（BACKLOG）。
> 本轮：定义"真正属于 Agent 的主动发现"能力，**只做设计**。不写代码。

---

## 0. 核心原则（贯穿全文）

严格禁止两条被明确禁止的路径：

```text
✗  Agent thinks interesting → Attention
✗  Agent observation → Assignment auto-activate
```

必须建立的正确路径：

```text
Events
   ↓
Agent Observation
   ↓
authorized observation rule
   ↓
judgment
   ↓
L1 / Proposal / Attention
```

以及（PM §16.2/§19 冻结约束）：

> **Event = fact；Observation = judgment。Observation 不是 Event/Attention/Assignment/L1/Proposal。**
> **permitted observation 是独立 authority，不继承 Assignment authority。**
> **Attention creation authority ≠ L1 presentation authority ≠ persistence authority。**

### 0.1 Authority chain（评审修正：五层概念严格分离）

整个 Phase 11 必须区分五个概念，**任何一个都不能由另一个推导**：

```text
Observation Rule Definition   （系统允许定义什么 observation）
        ≠
Observation Authorization      （当前用户是否授权使用该 rule 观察）
        ≠
L1 Presentation Authority      （能否说 L1）
        ≠
Attention Creation Authority   （能否建 Attention）
        ≠
Persistence Authority          （能否落 Memory/KB）

以及：

Observation（judgment）
        ≠
Output（L1 / Proposal / Attention / none）
```

禁止推导：

```text
✗  Rule registered            → automatically authorized（用户未授权）
✗  allowedOutcomes 声明        → automatically authorized（只是 output path 白名单）
✗  Observation                → automatically Attention（须 output policy + authority check）
✗  Observation                → automatically Assignment（只 Proposal，走 governance）
✗  Observation                → automatically Notification（须经 presentation）
```

---

## 1. Current State（现状盘点）

### 1.1 已冻结的产品语义（PM）

- **§19 Intelligent observation path**：Observation 是 Agent 的判断，**不是 Event**，不因存在而成为 Attention；必须 backed by **permitted observation rule**；Attention 仅在 authorized observation condition 成立 **且 handling warranted** 时创建。
  ```text
  Multiple Events → Agent / pattern detection → authorized observation → handling warranted → Attention
  ```
- **§16.2 authority families**：`explicit user instruction` / `named rule` / `permitted observation` / `Assignment authorization`。四者分离；observation rule 的 authority 来自用户（standing permission），**绝不来自 Agent 自身兴趣**；observation rule 授权不能被借用/误认为 Assignment authorization。
- **§22 L1**：permitted observation 在 "worth knowing and nothing needs deciding" 时 → L1；"repeated build failure" 表格明确 = L1（无需决定）或 Attention（authorized + handling warranted）。
- **§6 persistence**：Memory/KB 有独立 persistence authority（stand by 机制可静默提炼 **explicit and stable context**；KB 只写 durable knowledge）。Observation 存在 **不自动写 Memory/KB**。
- **§10 Assignment governance**：任何 Assignment 走 proposal → activation/confirmation → Active。Observation → Proposal 是唯一允许的主动路径，绝不 auto-activate。

### 1.2 当前 runtime（Phase 1–10 实况）

| 组件 | 现状 | 与 Observation 的关系 |
|---|---|---|
| `product_events` | append-only fact 源（permission/market/assignment 事件） | Observation 的**输入**（读侧） |
| `rules.ts`（Attention rule） | code registry，`permissionBlocking` / `marketTargetNavThreshold` | **确定性子路径**（已存在）——Observation 的确定性 pattern 检测**与之分离** |
| `attention-service` / `attention_repo` | Attention 创建（dedup/evidence/广播） | Observation → Attention 的落点 |
| `assignment-service.propose/confirm` | Proposal → activation（matrix） | Observation → Proposal 的落点（**只 propose，不 activate**） |
| `l1-rules.ts`（Phase 10） | code registry，`l1.market.estimate` | Observation → L1 的落点（presentation authority 独立） |
| `delivery/`（Phase 10） | `delivery_jobs` outbox + adapters | Observation → L1/Attention/Proposal → **optional** delivery（沿用 Phase 10，禁直接 Observation→notification） |
| opencode tap / BFF proxy | 常驻 `/global/event` tap + `/api/opencode/rest/[...path]` 全量代理 | Agent runtime 可达（LLM pattern detection 若需要，走 bounded 上下文） |
| scheduler | later.js cron + `scheduler_jobs`（fund-estimation / attention-expiry / proposal-expiry / delivery-sweep） | Observation scheduler 复用（**不引入 distributed agent scheduler**） |

**关键确认**：当前 Agent **并没有** 一个专门的 observation runtime。它能看到 Events 的唯一通道 = `product_events`（BFF 直接读）或 opencode live tail（`opencode-tap` 白名单）。**Observation 需要新建运行时**（scheduler + registry + pattern detector），不是"已有东西加个钩子"。

---

## 2. Observation 的最终定义

> **Observation = Agent 对一个或多个已发生事实进行的、经过允许的判断。**

- Event = fact（已发生，append-only）。
- Observation = judgment（Agent 对 facts 的解释）。
- Observation **不是** Event / Attention / Assignment / L1 / Proposal——它是这些实体之前的**中间判断**，本身无产品生命周期、无用户可见 obligation。

```text
Event   = "基金连续三日下跌"  （fact，已入库）
Observation = "该基金近期持续下降"  （judgment，pattern 识别）
```

Observation 本身不触发任何用户可见动作；它只是产出 judgment，由 output policy 决定是否/如何呈现。

---

## 3. Observation Source（输入）

- **Observation 的 evidence source 可以是一个或多个 Events**；需要多少个 Events 由具体 Observation Rule 的 pattern/cardinality 决定（**不是 Observation 的通用语义**）。
- 单事件可以支撑一个 observation（若 rule 允许）；多事件支撑另一个（若 rule 要求）。cardinality 是 **rule 的字段**，不是 Observation 的固有属性。
- 输入域 = `product_events`（subject + type + window 过滤）+ 可选 deterministic data source（如实时估值——但 MVP 只用已入库 Events，保持 fact 纯度）。

```text
fund down 3%（Event）
fund down 4%（Event）
fund down 5%（Event）
      ↓  Agent 判断
"这个基金近期持续下降"（Observation）
```

> **cardinality 归 rule**：`repeated-decline` = 需要 3 个评估点（`minEvidenceEvents = 3`），而不是"Observation 通用要求 ≥2/≥3"。见 §4.2。

---

## 4. Permitted Observation Rule（本轮最重要）

### 4.1 定义

> Agent 可以观察什么类别的 pattern，是受 rule 约束的。没有 permitted observation rule，Observation 不得产生任何用户可见结果。

### 4.2 形状（最小）

```ts
interface ObservationRule {
  ruleId: string;                    // 如 "observation.market.repeated-decline"
  eventTypes: ProductEventType[];    // 观察哪些事件类型
  subjectScope: { kind: ProductSubjectKind; id?: string };  // 只观察指定 subject
  window: { kind: "sliding" | "trade-day" | "n-events"; size: number }; // 事件窗口
  pattern: "repeated-decline" | "repeated-failure" | "threshold-crossing" | ...; // MVP 最小集合
  minEvidenceEvents?: number;        // 该 rule 的 pattern 需要的最少证据事件数（如 repeated-decline = 3）
  allowedOutcomes: Array<"l1" | "proposal" | "attention">;  // 允许进入哪些 output policy evaluation path（白名单）
  cooldownMs?: number;               // 同 subject+rule 的观察冷却（避免成本爆炸）
}
```

> **`allowedOutcomes` 只是声明该 Observation Rule 允许进入哪些 output policy evaluation path，它本身不是任何 authority。**
>
> - `allowedOutcomes: ["attention"]` **不能单独授权创建 Attention**。
> - `allowedOutcomes: ["l1"]` **不能单独授权 L1 presentation**。
>
> 实际进入 L1 / Proposal / Attention 前，还必须分别通过对应 authority 检查（见 §5 / §7 / §8-§10）。

### 4.3 例子

```text
observe: "repeated market decline"（3+ 连续下跌）
allowed: yes
action: propose monitoring（→ Assignment Proposal，用户确认后才 active）

observe: "repeated build failure"（3+ 同处失败）
allowed: yes
action: informational L1（→ L1，无 obligation）
```

```text
observe: "user might want X"（无授权）
→ no user-facing action（连判断都不产生用户可见结果）
```

---

## 5. Observation Authority

### 5.0 Rule Definition ≠ User Authorization（评审修正）

`lib/observation/rules.ts` 作为 registry 是正确的，但它**不能代表"当前用户已经授权 Agent 观察该 pattern"**。必须拆成两个概念：

- **Observation Rule Definition**：描述"系统允许定义什么 observation"（如 `observation.market.repeated-decline` 这个 pattern 的定义）。
- **Observation Authorization / Grant**：描述"当前用户是否授权 Agent 使用这个 rule 进行 observation"。

```text
Observation Rule Definition
          ↓
Observation Authorization
          ↓
可执行 observation
```

**明确**：`observation-rules.ts` 是 **rule definition registry，不是用户授权 registry**。Phase 11 MVP 为单用户系统，可以采用**最小静态 authorized configuration / code configuration**（如 `lib/observation/grants.ts` 静态配置"当前用户已授权哪些 ruleId"），**不强制引入 database table**。

但 authority boundary 必须在设计中写清楚，**避免未来实现成**：

```text
developer registers rule
→ Agent automatically has permission
```

这是禁止的。

### 5.1 Observation authority 独立性

- Observation authority **独立于** Assignment authority。Assignment A 存在 ≠ Agent 可以观察无关的 B。
- 对齐现有 authority family：

| family | 观察权限 | 依据 |
|---|---|---|
| explicit user instruction | "keep me posted on X" → 可观察 X 相关 pattern | PM §16.2 |
| named deterministic rule | 用户配置阈值 → 确定性子路径（已有 `rules.ts`） | PM §19 |
| **permitted observation** | 用户 standing permission "watch for this pattern"（= Observation Authorization） | PM §16.2/§19（本轮） |
| Assignment authorization | 只授权该 Assignment 自身 scope；**不继承**到 observation | PM §16.2 |

- **permission scope 必须独立**：observation rule 自带 `subjectScope`，不能借用 Assignment 的 scope。
- **grant 同样必须独立**：当前用户的 observation grant 只授权该 rule 的 subjectScope，不能因为某个 Assignment 存在而扩大。

---

## 6. Observation Registry

- **采用 code/config registry**（`lib/observation/rules.ts`），**不建 database registry**——与 Attention `rules.ts`、L1 `l1-rules.ts`、Delivery `decision.ts` 同模式。
- **这是 rule definition registry，不是用户授权 registry**（见 §5.0）。授权由独立的 Observation Authorization / grant 表达（MVP 用最小静态 authorized configuration，如 `lib/observation/grants.ts`）。
- 每条 rule 至少包含 §4.2 字段（ruleId / eventTypes / subjectScope / window / pattern / minEvidenceEvents / allowedOutcomes / cooldown）。

```ts
// lib/observation/rules.ts（Phase 11 实现时新增；本轮只定形状）
export const OBSERVATION_RULE_IDS = {
  marketRepeatedDecline: "observation.market.repeated-decline",
} as const;
export const OBSERVATION_RULES: ObservationRule[] = [ /* ... */ ];

// lib/observation/grants.ts（MVP 最小静态授权配置；不建表）
export const OBSERVATION_GRANTS: string[] = [
  // 当前用户已授权的 ruleId（静态 code config；MVP 单用户）
  "observation.market.repeated-decline",
];
```

> 授权检查：`OBSERVATION_RULES`（定义）+ `OBSERVATION_GRANTS`（当前用户授权）两者**同时命中**，observation 才可执行。只注册定义 ≠ 已授权。

---

## 7. Observation Output Types（output policy）

Observation 产生 judgment 后，由 **output policy**（rule 的 `allowedOutcomes` 白名单 + 对应 authority 检查）决定落点：

| output | 条件 | 落点 |
|---|---|---|
| **informational** | `allowedOutcomes` 含 `l1` **且** L1 presentation authority 通过 **且** "worth knowing, nothing needs deciding" | → authorized L1（Phase 10 `l1-rules` 风格） |
| **proposal** | `allowedOutcomes` 含 `proposal` **且** "Agent believes responsibility may help" | → Assignment Proposal（`assignment-service.propose`，**不 activate**） |
| **actionable** | `allowedOutcomes` 含 `attention` **且** Attention creation authority 通过 **且** **handling warranted** | → Attention（`attention-service.create`，dedup + evidence） |

判断条件（output policy 决策函数）：

```text
Observation Judgment
   ↓
Observation Rule Definition + Observation Authorization（允许执行该 rule？）
   ↓
pattern detection → judgment
   ↓
Output Policy（rule.allowedOutcomes 白名单包含该 output？）
   ↓
corresponding authority check（L1 authority / Attention authority / Assignment governance）
   ↓
L1 / Proposal / Attention
```

- **Observation 本身不决定动作**；它只产出 judgment，output 由 output policy 决定。
- **`allowedOutcomes` 是 output path whitelist，不是 authority**（见 §4.2）。
- 同一 observation 可同时允许 proposal + l1（如"先 L1 告知，再提议监控"），由 rule 声明。

---

## 8. Observation → L1

```text
Repeated build failures（Events）
   ↓
permitted observation rule（observation.coding.repeated-failure）
   ↓
Agent judges pattern worth knowing（judgment）
   ↓
L1 statement（无 obligation）
```

- L1 ≠ Attention：无 handling obligation、无 lifecycle。
- 复用 Phase 10 L1 管道：`L1Statement`（内存 frame）→ `/api/product/l1` + `/api/product/l1/stream`。
- 授权：`allowedOutcomes` 含 `l1` 只是进入 L1 output path evaluation 的前提；实际呈现仍需 **L1 presentation authority** 通过（独立于 Attention 授权）。`allowedOutcomes: ["l1"]` 不能单独授权 L1 presentation。

---

## 9. Observation → Assignment Proposal（最重要的主动路径）

```text
Observation（"我发现你连续几天在 14:50 检查这只基金"）
   ↓
Agent believes responsibility may help（judgment）
   ↓
Assignment Proposal（propose，不 activate）
   ↓
user confirmation（matrix 把关）
   ↓
Active Assignment
```

**铁律**：
- 只能 **Proposal**，绝不 **Active Assignment**。
- 无用户授权不能自动承担责任（PM §10：proposal ≠ activation）。
- `assignment-service.propose` 已天然符合（matrix 决定 confirmation 与否；无 direct-activation 捷径给 observation——observation 产生的 proposal 一律要求确认，除非 matrix 判低风险 direct，但观察类场景不会触发 direct）。

> 实现注意：observation → propose 时 `createdBy` 标记 `"observation:<ruleId>"`，`instructionRef` 携带 observation 依据，保证 provenance 可审计。

---

## 10. Observation → Attention

只允许在**四者同时成立**：

```text
Observation Rule Definition + Observation Authorization（覆盖该 pattern）
+  allowedOutcomes 含 "attention"（进入 attention output path）
+  Attention creation authority 通过（该 pattern 被授权可创建 Attention）
+  handling warranted（有决定等待用户）
```

```text
repeated failures
+ authorized observation rule（定义 + 授权）
+ allowedOutcomes 含 attention
+ user asked to be alerted when persistent（handling reason）
+ handling warranted
→ Attention
```

- Agent 觉得异常 ≠ Attention。
- `allowedOutcomes: ["attention"]` 不能单独授权创建 Attention——还必须 Attention creation authority 通过 + handling warranted。
- 复用 `attention-service.create`（dedup per (creation reason, subject, window) + evidence refs）。

---

## 11. Observation Retention（persistence boundary）

- **不建立 `observations` canonical table**。
- Observation judgment 可以通过现有 `product_events` 的系统事件持久化机制记录为 `agent.observation.recorded`（append-only，audit）。
- **Event Persistence ≠ Memory/KB Persistence Authority**：`agent.observation.recorded` 的 Event 持久化属于**产品事实审计机制**，**不属于 PM §6 的 Memory/KB persistence authority**。它写入 `product_events` 只意味着"这个 judgment 作为审计事实被系统记录"，**绝不意味着 Agent 获得 Memory 或 KB 的写入权限**。

```text
Observation Judgment
        ↓
product event persistence
        ↓
agent.observation.recorded Event（product event persistence / audit）
```

- **Persistence 独立于 output path**：`agent.observation.recorded` 经产品 Event 审计机制写入，**不经过** L1/Proposal/Attention 的 authority 链（它只是审计事实，不是呈现/责任）。

### 11.0 三种 persistence 严格分离

```text
Event Persistence（product_events 系统审计）
        ≠
Memory Persistence Authority（PM §6）
        ≠
KB Persistence Authority（PM §6）
```

进一步明确：

```text
Observation
   ↓
agent.observation.recorded
```

可以正常进入 `product_events` 进行系统审计记录，**但这绝不意味着 Agent 获得了 Memory 或 KB 的写入权限**。

保留：

> **Observation ≠ Memory；Observation ≠ KB。Observation 不自动写入 Memory / KB。**

### 11.1 Observation Judgment（只表达 Agent 的判断）

Event payload 中，**judgment 部分只包含**（**不保存完整 Agent reasoning / chain of thought**）：

```text
{
  ruleId,                // observation rule
  subject: { kind, id }, // subject scope
  evidenceEventIds: [],  // 支撑事件的 Event refs
  judgmentSummary,       // 判断摘要（一句话）
  warranted: true|false  // 产品层判断（warranted / not warranted，非 confidence）
}
```

### 11.2 Output Policy（随后独立计算 actual outcome）

```text
Observation Judgment
      ↓
Output Policy
      ↓
actual outcome
```

最终 `agent.observation.recorded` Event **可以记录** `outcome` 字段：

```text
outcome: "l1" | "proposal" | "attention" | "none"
```

但这里的 `outcome` 表示 **Observation processing 的最终 output result**（由 Output Policy 计算），**不是 Observation 本身的 intrinsic field**。

> **Observation = judgment；Output Policy = decides what happens with that judgment。**

- **confidence**：不暴露给用户。若内部需要，仅作 runtime metadata（如 LLM 判断时的内部过滤），产品判断一律用 **warranted / not warranted**。

---

## 12. Confidence

- 不把 `confidence = 0.87` 暴露给用户。
- 产品判断使用 **warranted / not warranted**（二元）。
- 内部若用 LLM 判断，confidence 仅用于**运行时内部**（如决定是否值得走 LLM），不进 Event payload、不进 UI。

---

## 13. Observation Frequency / Cooldown

最小 policy（防成本爆炸）：

```text
event window（rule.window：sliding n-events / trade-day）
cooldown（rule.cooldownMs：同 subject+rule 观察冷却）
subject scope（rule.subjectScope：只观察指定 subject）
max evaluation frequency（scheduler 节流）
```

- **same subject + same rule + same window → one observation opportunity**（幂等：`agent.observation.recorded` 去重 / 冷却内不重复）。
- 避免 "every Event → Agent call"。

---

## 14. Observation vs Assignment Monitoring

| | Assignment Monitoring | Agent Observation |
|---|---|---|
| 触发 | 用户授权责任 → deterministic trigger（scheduler） | Agent 观察 Events → permitted pattern detection |
| 本质 | **responsibility execution** | **proactive discovery** |
| 授权 | Assignment authorization（activation） | permitted observation rule（独立） |
| 输出 | Attention（PM §16.3）/ Completed | L1 / Proposal / Attention（output policy） |

**两者不合并**：Observation 可以**提议**一个 Assignment（→ proposal），但 Observation 本身不是 Assignment 的执行者。

---

## 15. Observation Security / Scope

- 强制 scope 限制：
  - **user scope**：单用户系统（MVP），但 rule 必须显式声明 subject。
  - **project scope**：rule.subjectScope 限定项目/基金。
  - **event scope**：rule.eventTypes 白名单。
  - **rule scope**：只有 registered rule 能触发 observation。
- 禁止：
  ```text
  ✗ Agent → scan all users → all projects → all Events
  ```
- 只允许 permitted observation rule 指定的 scope。

---

## 16. Observation → Memory / KB

- **product event persistence ≠ Memory/KB persistence authority**（见 §11.0）。`agent.observation.recorded` 进入 `product_events` 是**系统审计**，不是 Memory/KB 写入。

```text
Observation
   ↓
agent.observation.recorded
   ↓
product_events（audit persistence）
```

与此同时，第二条路径**不是第一条路径的自动延伸**：

```text
Observation
   ↓
Memory candidate / KB candidate
   ↓
independent persistence authority（PM §6）
   ↓
Memory / KB
```

- Observation 可以产生 **Memory candidate** 或 **KB candidate**，但**不因 observation 存在就自动写入**。
- 遵循 PM §6 的独立 persistence authority：
  - Memory：只有"explicit and stable context"可静默提炼；observation 的 judgment 若构成稳定理解，可作为 candidate，但仍需独立 persistence authority。
  - KB：只写 durable knowledge；observation 不自动写。
- 无 Memory/KB persistence authority → Observation 只是 runtime judgment（Event `agent.observation.recorded`，product event audit），**不落 Memory/KB**。

> **Observation ≠ Memory；Observation ≠ KB。Observation 不自动写入 Memory / KB。**

---

## 17. Observation → Delivery

- **禁止**：
  ```text
  ✗ Observation → Notification
  ```
- **正确**：
  ```text
  Observation → L1 / Attention / Proposal → optional Delivery（Phase 10）
  ```
- 沿用 Phase 10：delivery 只消费已存在的 presentation（L1/Attention），不直接吃 observation。

---

## 18. MVP Use Case（本轮唯一）

> **市场模式观察（Market Pattern Observation）**

```text
Events:
  market.rule.matched（同 fund 多次命中）
  market.rule.evaluated（每日评估）
  或未来 fund.daily.change（若引入）

Observation rule:
  observation.market.repeated-decline
    eventTypes: [market.rule.matched]
    subjectScope: { kind: "fund" }
    window: { kind: "sliding", size: 3 }   // 3 个评估点
    pattern: "repeated-decline"
    minEvidenceEvents: 3                   // repeated-decline 需要 3 个评估点（cardinality 归 rule）
    allowedOutcomes: ["proposal", "l1"]    // output path whitelist，非 authority

Output:
  → Assignment Proposal（"要我每天自动监控该基金吗？"）
  （user confirmation → Active Assignment）
```

### 18.1 Market MVP 的 Event 语义（评审修正：不要假设 3×matched → repeated-decline）

`market.rule.matched` 是否足够支撑 `repeated-decline`，**不能直接假设**。detector 至少需要以下证据字段来区分"同一基金持续下跌"与"多次无关的 rule 命中"：

```text
same fund                 （subject_id = fund code）
+  same relevant metric / direction（估净 vs 目标的差值方向，或涨跌幅方向）
+  different evaluation points     （不同交易日 / 评估时点）
```

**优先复用现有 `market.rule.matched` payload。**

- 当前 `market.rule.matched` payload（Phase 5/10）已包含：`code`、`name`、`estimatedNav`、`targetNav`、`diff`、`tradeDate`、`refs.fundCode`。
- `tradeDate` 提供 **different evaluation points**；`diff`（估净 − 目标）提供 **direction/metric**（diff 持续为负且逐点扩大 → 持续下跌方向）；`code` 提供 **same fund**。

> **结论**：现有 `market.rule.matched` payload **已足以**区分 repeated decline 与无关命中（依赖字段：`code` / `diff` 方向 / `tradeDate`），本轮不扩展 runtime。

**若未来证明不足**（不立即实现，也不修改 PRODUCT_MODEL）——仅在 Phase 11 implementation prerequisite 中记录：

```text
market.rule.matched payload must expose enough evidence
to distinguish repeated decline from repeated unrelated rule matches.
```

必要时 future 增加 `fund` / `metric` / `direction` / `evaluationAt` 之类字段。但不在本轮设计中实现。

- **不做**（本轮明确排除）：
  - coding failure
  - email behavior
  - user behavioral profiling
  - cross-domain inference

---

## 19. Runtime Architecture

```text
product_events
      ↓
observation scheduler（cron，复用 scheduler infrastructure）
      ↓
Observation Rule Definition（lib/observation/rules.ts）
      ↓
Observation Authorization（lib/observation/grants.ts；MVP 静态授权）
      ↓
candidate Events（按 rule.eventTypes + subjectScope + window + minEvidenceEvents 过滤）
      ↓
pattern detection
   ├── deterministic（MVP：滑动窗口计数/阈值）—— 与 deterministic event rule（rules.ts）分离
   └── LLM bounded context（future：内部隔离上下文，见 §20）
      ↓
Observation Judgment（{ruleId, subject, evidenceEventIds, judgmentSummary, warranted}）
      ↓
agent.observation.recorded Event
      ↓
product_events（audit persistence）
      ↓
Output Policy（allowedOutcomes 白名单）
      ↓
corresponding authority check（L1 authority / Attention authority / Assignment governance）
 ┌──────────┼───────────┐
 ↓          ↓           ↓
L1      Proposal     Attention
 ↓          ↓           ↓
L1      Assignment   Attention
authority  governance  authority
```

product event persistence 独立表示（**不经过 output path**）：

```text
Observation Judgment
        ↓
agent.observation.recorded Event
        ↓
product_events（audit persistence）
```

Memory / KB persistence 是**另一条完全独立的路径**（不因 observation Event 被审计而自动延伸）：

```text
Observation Judgment
        ↓
Memory / KB candidate
        ↓
independent Memory / KB persistence authority（PM §6）
        ↓
Memory / KB
```

> **两条 persistence 路径完全独立**：`agent.observation.recorded` 进入 `product_events` 只意味着审计记录，**绝不授予 Memory / KB 写入权限**（§11.0）。

**关键**：Agent pattern detection **与** deterministic event rule（`rules.ts`）必须是**两个机制**：
- `rules.ts`：每事件 → 确定性 Attention（threshold 规则）。
- observation：多事件窗口 → judgment（MVP 确定性模式识别，future 可接 LLM）。

---

## 20. Agent Session Boundary

- Observation **不直接复用普通 Talk Session**。
- 需要明确：
  - MVP（确定性 pattern detection）：**不需要 LLM session**——纯代码在 scheduler 内完成，零 Talk 污染。
  - Future（LLM 判断）：创建**内部 bounded execution context**（独立隔离上下文，不进入用户 Talk history），判断后仅产出 Observation judgment（Event），不把内部推理写入用户会话。
- **优先原则**：Observation runtime 与用户 Talk Session **分离**。如果将来需要 LLM 判断，用内部 bounded execution context，不直接当用户 Agent Session。

---

## 21. Cost / Scheduling

最低限度设计：

- **evaluation frequency**：scheduler cron（如每分钟观察 sweep，但仅对"有新事件"的 subject 评估）。
- **batch Events**：一次读 window 内全部相关事件（非逐事件触发 Agent）。
- **subject grouping**：按 subject 分组评估（避免重复扫描）。
- **rule filtering**：只对 registered rule 的 eventTypes 处理。
- **cooldown**：同 subject+rule 冷却期内不重复（幂等 `agent.observation.recorded`）。
- **no-op suppression**：无 pattern → 不产出、不写 Event、不调 LLM。

复用现有 scheduler infrastructure（`scheduler_jobs` + handler），不引入 distributed agent scheduler。

---

## 22. Tests（Phase 11 实现时）

### Permission / Authority boundary
- no permitted observation rule + no grant → 无用户可见结果（L1/Proposal/Attention 全无）。
- **rule 已注册但用户未授权（grant 缺失）→ 无 observation、无输出**（防"developer registers rule → Agent automatically has permission"）。
- `allowedOutcomes: ["attention"]` 但 Attention creation authority 未通过 → **无 Attention**。
- `allowedOutcomes: ["l1"]` 但 L1 presentation authority 未通过 → **无 L1**。
- Assignment A 存在 → 不授权观察无关 B（scope 不继承）。

### Observation
- multiple Events → 一个 observation（window 聚合，`minEvidenceEvents` 达标）。
- 证据事件数 < `minEvidenceEvents`（如 repeated-decline 需 3，只有 2）→ 无 observation。
- 单事件/无关事件 → 无 observation。

### L1
- authorized observation + L1 authority → L1；L1 ≠ Attention（无 obligation/lifecycle）。

### Proposal
- authorized observation → Assignment Proposal；**无 Active Assignment**（用户未确认）。

### Attention
- authorized observation + Attention authority + handling warranted → Attention。

### Negative
- 单无关 Event → 无 observation。
- Agent curiosity（无 rule + 无 grant）→ 无任何结果。
- Observation → 不自动 Assignment（只 propose）。
- Observation → 不直接 notification（须经 L1/Attention/Proposal → delivery）。
- Observation → 不自动 Memory/KB。

---

## 23. Real Smoke（下一阶段编码时）

建议 future smoke（明确 real vs simulation）：

```text
3+ real market Events（fund.rule.matched，真实 scheduler 产生）
      ↓
observation.market.repeated-decline rule
      ↓
Agent observation（deterministic pattern 识别）
      ↓
Assignment Proposal
      ↓
user confirmation（真实 API）
      ↓
Active Assignment
```

- **real**：Events 来自真实 scheduler；Proposal/confirmation 走真实 API。
- **simulation**：pattern 检测的"3+ 事件"用测试 fixture 构造（不伪造 wall-clock 等真实盘）。

---

## 24. 不做（Non-goals / Out of Scope）

- 不改 PRODUCT_MODEL（§19/§16.2/§22 已冻结，本轮只是落实）。
- 不建 Observation canonical table。
- 不自动创建 Assignment（只 Proposal）。
- 不自动修改 Assignment。
- 不自动通知（observation → presentation → optional delivery）。
- 不自动 Memory/KB。
- 不做 cross-user observation。
- 不做 complex ML model / recommendation system。
- 不持久化 LLM reasoning trace。
- 不引入 multi-runtime / distributed agent scheduler。

---

## 25. Decision Points（Phase 11 最终裁决，含评审修正）

| # | 决策点 | 裁决 |
|---|---|---|
| 1 | Observation 是否 canonical entity | **否**（无 observations 表）；judgment 记 `agent.observation.recorded` Event |
| 2 | Observation authority | **permitted observation authorization（grant）**；`lib/observation/rules.ts` 只负责 rule **definition**，授权由 `lib/observation/grants.ts` 静态配置表达 |
| 3 | Observation registry | `lib/observation/rules.ts` = **rule definition registry（非用户授权 registry）**；`lib/observation/grants.ts` = MVP 最小静态授权 |
| 4 | Source event cardinality | Observation 支持 **一个或多个** evidence Events；**具体 cardinality 由 rule 定义**（`minEvidenceEvents`），非 Observation 通用 ≥2 |
| 5 | Output policy | `allowedOutcomes` 是 **output path whitelist（非 authority）**；进入每个 output 前还需对应 authority 检查 |
| 6 | L1 path | 复用 Phase 10 L1 管道；`allowedOutcomes` 含 `l1` 只是前提，实际呈现需 **L1 presentation authority** 通过 |
| 7 | Proposal path | `assignment-service.propose`（`createdBy: "observation:<ruleId>"`；**不 activate**） |
| 8 | Attention path | `attention-service.create`（仅 definition+authorization+allowedOutcomes 含 attention+Attention authority+handling warranted） |
| 9 | Persistence boundary | `agent.observation.recorded` 是 **product Event audit record**；其持久化属于 **product event persistence（系统审计）**，**不等同于 Memory / KB persistence authority**。`Event Persistence ≠ Memory Persistence Authority ≠ KB Persistence Authority`。`outcome` 是 **processing result**（非 Observation intrinsic field） |
| 10 | Confidence | 内部 runtime metadata 可选；产品判断用 warranted/not warranted |
| 11 | Frequency/cooldown | window + cooldownMs + subject scope + scheduler 节流；同 subject+rule+window 一次观察 |
| 12 | Security scope | rule 声明 subject/event scope；grant 声明授权 ruleId；禁全量扫描 |
| 13 | Agent Session boundary | Observation runtime 与 Talk 分离；MVP 确定性纯代码，LLM 走 bounded context（future） |
| 14 | MVP | `observation.market.repeated-decline`（minEvidenceEvents=3）→ Proposal（+ 可选 L1） |
| 15 | Delivery | 沿用 Phase 10；Observation → presentation → optional delivery（不直接 notification） |
| 16 | Memory/KB | 不自动写入；无 persistence authority → runtime judgment only |

---

## 26. Semantic Gap 检查（含评审后 Semantic Audit）

- PM §19 intelligent observation path 已完整描述（permitted observation rule + handling warranted）。**未发现需要修改 PM 的真实矛盾。**
- 唯一需留意的张力：PM §19 的示例是 **coding**（"Project 3 failed three times"），而 MVP 选 **market**（`market.rule.matched`）。这是 use-case 选择（market 有真实 Events 数据流，coding failure 无对应 product Events——opencode-tap 白名单不含 message.*/run failure）。**不构成 PM gap**，是 runtime 数据可得性决策。
- 若未来要观察 coding failure，需先把"运行失败"纳入 product Events 管道（新增事件类型属实现决策，非 PM 语义冲突）。

### 26.1 Semantic Audit（评审后确认）

```text
Observation Rule Definition  ≠  Observation Authorization    （§4/§5/§6）
Observation Authorization    ≠  L1 Authority                （§8）
Observation Authorization    ≠  Attention Authority          （§10）
Observation Authorization    ≠  Assignment Authorization     （§5.1）
Event Persistence            ≠  Memory Persistence Authority （§11/§16）
Event Persistence            ≠  KB Persistence Authority     （§11/§16）
Memory Persistence Authority ≠  KB Persistence Authority     （§11.0/§16）
Observation                 ≠  Output                       （§7/§11.2）
```

全文确认**不存在**以下语义：

```text
Rule registered                 → automatically authorized（§5.0/§6 禁止）
allowedOutcomes 声明             → automatically authorized（§4.2/§7 禁止）
Observation                     → automatically Attention（§7/§10 禁止）
Observation                     → automatically Assignment（§9 禁止）
Observation                     → automatically Notification（§17 禁止）
Observation Event 被持久化        → Agent automatically gets Memory write permission（§11/§16 禁止）
Observation Event 被持久化        → Agent automatically gets KB write permission（§11/§16 禁止）
```

**结论：无剩余 semantic gap。**

---

## 27. 最终报告索引（Phase 11 实现后填写）

1. Observation 最终定义 → §2
2. permitted observation authority → §4/§5
3. Observation → L1 → §8
4. Observation → Proposal → §9
5. Observation → Attention → §10
6. Observation persistence → §11
7. frequency/cooldown → §13
8. Agent Session boundary → §20
9. MVP use case → §18
10. 下一轮编码范围 → §19 runtime + §23 smoke + §25 decision points
11. PRODUCT_MODEL unchanged → 本轮未修改（§26）

---

**本轮不修改 PRODUCT_MODEL.md（冻结）。**

---

## 28. Implementation Status（Phase 11 编码落地，2026-09-11）

状态：**MVP 已实现**（`observation.market.repeated-decline` → Assignment Proposal）。PRODUCT_MODEL 未修改。

### 28.1 落地清单

| 组件 | 实现位置 |
|---|---|
| Observation Rule Definition | `lib/observation/rules.ts`（definition registry，非授权 registry） |
| Observation Authorization | `lib/observation/grants.ts`（MVP 静态单用户授权；definition + grant 同时命中才执行） |
| Detector | `lib/observation/observation-detector.ts`（纯 deterministic；same fund + 3 distinct tradeDate + all diff<0；无 LLM） |
| Service | `lib/observation/observation-service.ts`（judgment → `agent.observation.recorded` → Output Policy → proposal） |
| Runtime / Scheduler | `lib/observation/observation-runtime.ts` + `observation-sweep` job（每分钟；仅评估有新相关事件的 subject） |
| Event | `agent.observation.recorded`（source `agent-observation`；product audit persistence） |
| Proposal | `assignment-service.propose`（`createdBy=observation:<ruleId>`；`instructionRef=observation:<ruleId>:<eventId>`；不 activate） |

### 28.2 实际偏差（implementation deviations，不重开设计决策）

1. **MVP `allowedOutcomes` = `["proposal"]`**（设计 §18 示例为 `["proposal","l1"]`）。本轮实现任务冻结只允许 proposal output path；L1/Attention output path 未实现（§13）。
2. **cooldown = 72h**（`MARKET_REPEATED_DECLINE_COOLDOWN_MS = 3 × 24h`，一个完整 window 周期）；设计未指定具体数值。
3. **新增 migration**：`20260911-product-p11-observation-proposal-dedup`（`assignment_proposals.instruction_ref` 前缀 `observation:` 的部分唯一索引，作为 proposal 幂等的 DB 并发防线）。`agent.observation.recorded` 本身不需要 schema 变更（`product_events.type` 无 CHECK；`source` CHECK 已含 `agent-observation`）。
4. **真实数据条件**：当前 `market.rule.matched` 仅由 fund-estimation 在 `diff > 0` 时发出（现有 matched 证据全部为正 diff），因此真实 repeated-decline 不会触发（real sweep 实测 no-pattern，无 false positive）。detector 严格按 rule 定义要求 `diff < 0`；observation→proposal 全路径由 simulation（vitest fixture integration）覆盖（§23 允许）。
5. **未实现（与 §24 一致）**：LLM observation、coding / email / user-profiling / cross-domain、L1 / Attention output、Memory/KB 写入、direct notification、distributed scheduler、Observation API/UI。
