# IMPLEMENTATION_MODEL.md —— Product Model → Implementation Architecture (v1)

> 状态：v1 草案（实现映射文档）
> 语义唯一来源：`docs/redesign/PRODUCT_MODEL.md`（已冻结；下文以 **PM §n** 引用）
> 代码基线：agent-mobile @ `0af5829` · family-finance @ `2c38301` · opencode-memx @ `100681b` · llm-wiki / llm-wiki-mcp 现版
> 本文不重定义产品语义；所有语义裁决以 PRODUCT_MODEL 为准。实现与产品冲突时，记为 **implementation gap**，不改产品模型。

---

## 0. 与 PRODUCT_MODEL 的关系

- PM = 产品语义（是什么、为什么）；本文 = 实现映射（存在哪、怎么流转、缺什么）。
- 本文引入的任何字段/表/接口都是**实现决策**，若与 PM 冲突 → 降级为 gap 记录，不回改 PM。
- PM 中"留待后续设计"的三项（per-domain confirmation matrix 条款、observation rule registry、retention 期限）在本文中保持**待定**，只留边界。

---

## 1. 现状盘点（As-Is）

| 组件 | 现状 | 与本模型的关系 |
|---|---|---|
| OpenCode Server (4096) | 会话/消息/权限的持久化与 SSE（`/global/event`）；仅 BFF 可达 | Agent Runtime；PM §34 意义上的 runtime，产品态不落在它身上 |
| BFF opencode 代理 | `/api/opencode/rest/*` + `/api/opencode/stream`（`lib/opencode-stream.ts`：32ms delta 缓冲、sessionID 过滤、Basic→Bearer） | 手机端唯一通道；**未来 product event bridge 的接入点**（服务侧已在 BFF 进程内看到全部 opencode 事件） |
| BFF events publisher | `lib/events/publisher.ts`：进程内存 `lastEvents`（每类型单槽）、`getLastEvent`/`ackEvent`；`/api/events/stream` 重连补推、`/api/events/ack` | 易失、单槽、无历史——Event/Attention 持久化的**替换对象**（见 §3/§11） |
| BFF scheduler | `lib/scheduler/`：better-sqlite3 `scheduler_jobs/scheduler_job_runs`，seed job `50 14 * * 1-5`；handler 内部 `estimated_nav > target_nav` → **先发 email/企微/微信通知，成功后才 `publish(fund.trade-alert)`**（`fund-estimation.ts:76-88`） | Market 事件源；**notification 耦合是 P0 修复点**（见 §11） |
| BFF SQLite | `lib/database.ts`：better-sqlite3 + WAL + `_migrations`；表：funds/trades/users/scheduler_jobs/scheduler_job_runs | 产品层持久化的**宿主基础设施** |
| 手机端 Pulse | `useProjectEvents`（30s 轮询 + SSE 推导）+ `determineProjectStatus`：**pending 权限或 idle → needs-you**；`useFundEvents`（`fund.estimate` 跑马灯 / `fund.trade-alert` → needs-you + ack） | Attention 的**临时替身**；Phase 3 后改读 attention store（idle 误判随之消除） |
| 手机端 Chat | ProjectChatZ（auto-Resume 最近会话 + 显式 New session）+ ChatPanelZ（permission/question 弹窗） | PM §8.2 Resume 语义已对齐；Phase 4 接 handlingRef |
| opencode-memx | OpenCode 插件：`session.idle`/`reflect` 触发 → 双轨提炼（`~/.opencode/USER.md` + `~/.opencode/projects/<slug>/.mem/*.md` + MEMORY.md 索引），静默写入+备份，`instructions` 开场注入 | **Memory 的 runtime 侧实现**；无产品面（见 §10） |
| llm-wiki / llm-wiki-mcp | skill（知识编译入 Obsidian vault，如 `gbwikis`）+ MCP `search_wiki`（minisearch+nodejieba 全文检索） | **KB 的 runtime 侧实现**；App/BFF 无访问路径（见 §10） |

文档依据：`docs/knowledge-base/{ARCHITECTURE,DATA,API,AI_INTERACTION_DESIGN,DESIGN_DIRECTION}.md` + 上表源码。

---

## 2. Product → Implementation Mapping

判定口径：**persistent entity** = 需要跨进程/重启存活的第一方记录；**runtime state** = 只在运行中有意义的瞬态；**reference/marker** = 指向他物的记录；**current** = 今天代码里真实存在的东西。

| Product concept | persistent entity? | runtime state? | reference/marker? | current implementation? |
|---|---|---|---|---|
| **Agent Session**（PM §4） | ❌ 不在产品层——会话与消息由 OpenCode Server 持有；产品层只存引用 | ✅ `/session/status` busy/retry（瞬态） | ✅ `sessionId`（Attention.handlingRef / Assignment.trigger ref / Open Thread marker 均指向它） | ✅ opencode-client + 聊天 UI |
| **Assignment**（PM §10-13） | ✅ 应有（proposal/authorization/trigger 定义/状态）——**当前缺失** | ✅ trigger mechanism 的评估运行 | ✅ authorization ref（→ 确认指令）、trigger ref | ❌ 无对象；BFF seed job 是运维配置物（`scheduler_jobs`），不是对话产生的 Assignment |
| **Event**（PM §15） | ✅ 应有（事实日志）——**当前缺失** | 🔶 今天只有瞬态 SSE + 内存单槽 | ✅ 作为 Attention 的 supporting evidence 引用 | 🔶 publisher lastEvents（易失）+ fund-estimation 里的内联通知逻辑 |
| **Attention**（PM §16-17） | ✅ 应有（第一方记录）——**当前最大缺口** | ❌ 生命周期态必须持久（OPEN 跨重启） | ✅ sessionId / handlingRef / evidence refs | 🔶 派生态（project needs-you）+ 内存单槽 trade-alert + 前端 `alert` state |
| **Open Thread**（PM §24） | 🔶 一条 **marker 记录**（挂在 Session 引用上），不是拥有对话的实体 | ❌ | ✅ 本质就是 marker：`sessionId + why + status` | ❌ 无 |
| **Memory**（PM §6） | ✅ 但在 **runtime 侧**（USER.md / .mem/*.md 文件，opencode 宿主机上） | ✅ session.idle 提炼过程 | 🔶 文件即表示；产品层未来只做读取/展示 | 🔶 memx 完整实现提炼/注入；产品面（Memory tab）为零 |
| **Knowledge Base**（PM §5） | ✅ runtime 侧（Obsidian vault，llm-wiki 编译） | ✅ MCP 进程内 minisearch 索引 | 🔶 vault 页面即表示 | 🔶 agent 会话内可用（skill+MCP）；App/BFF 无路径 |

**原则**：不给每个概念发一张表。Assignment/Event/Attention 三者是真正的产品态（表）；Open Thread 是 marker 行；Memory/KB 的存储**留在 runtime 侧现有载体**，产品层只做集成（PM §5/§6 已定义其宿主）。

---

## 3. Event implementation model

### 3.1 职责

Event = fact（PM §15）。它**不是**：Attention、Pulse statement、Assignment、UI 通知。判定一个字段是否该存在的标准：**它是"发生了什么"的证据吗？**不是就不进 Event。

### 3.2 持久化字段（`product_events` 表）

| 字段 | 必要性 | 说明 |
|---|---|---|
| `id` | ✅ | ULID（时间有序，省一次排序索引）；主键 |
| `type` | ✅ | 命名空间化：`opencode.session.completed` / `opencode.permission.asked` / `market.rule.evaluated` / `market.rule.matched` / `agent.observation.recorded` / `assignment.trigger.fired` |
| `subject_kind` + `subject_id` | ✅ | 事件关于谁：`session:sess_xxx` / `fund:000001` / `project:/path`。Attention 的 subject 引用与 dedup 都建在它上面 |
| `occurred_at` | ✅ | 事实发生时刻（世界时间）；与 `created_at`（入库时刻）分离——迟到/重放的事件不篡改历史 |
| `source` | ✅ | `opencode-sse` / `market-scheduler` / `agent-observation`（预留）。用于审计与 retention 分类 |
| `payload` | ✅（精简） | 紧凑 JSON 证据（如阈值命中时的 estimated/target/diff）。大对象不进 payload，放引用 |
| `refs` | ✅（JSON） | 关联标识（sessionId、messageId、jobRunId）——Attention supporting evidence 指向这里 |
| `created_at` | ✅ | 入库时间（审计） |
| `retention_class` | ✅ | `transient`（会话噪音，TTL 短）/ `audit`（默认保留）——retention 是**策略字段**，不是生命周期态 |

**不持久化**：展示文案（属于 L1/Attention 的呈现层）、规则评估结果（evaluation 记录见 §6，可归入 audit 事件而非 Event 本体）。

### 3.3 Source 标准化

三类 source 统一走同一入库口（`product_events` + 单一 `ingest()` 函数），但**不需要**同一种传输：

- `opencode-sse`：BFF 内**服务侧桥**（见 §6）——BFF 的 opencode 代理进程本来就能看到全部上游事件，按 type 白名单过滤入库；手机端现有的客户端 SSE 消费**不变**。
- `market-scheduler`：handler 计算完成即入库事件（`market.rule.evaluated` 无论命中与否；`market.rule.matched` 仅命中时）——**与通知完全解耦**（§11）。
- `agent-observation`（未来）：Agent 经 BFF 鉴权端点写入 `agent.observation.recorded`；本轮只定边界，不定义 prompt/格式。
- email/外部事件：预留同上，无现状。

**source 标准化的程度**：统一 envelope（type/subject/occurred_at/source/payload/refs）+ 各 source 自管 payload 结构。不做统一 schema registry。

### 3.4 当前问题 → 目标

现状两处违反目标架构：

1. `lastEvents` 内存单槽：易失、无历史、`ackEvent` 按类型清除——被 `product_events`（append-only）+ Attention 状态取代。
2. **通知决定事件存在**：`fund-estimation.ts:76-88` 只有 ≥1 个通知通道发送成功才 publish。目标顺序恒为：

```text
source
  ↓
Event（入库，无条件——事实发生了就是发生了）
  ↓
persistent event store
  ↓
rule / observation evaluation
  ↓
Attention（若 authorized condition + handling warranted）
```

通知改为从 Attention/L1 呈现层**读取后投递**（§11），投递失败绝不回删事件。

---

## 4. Attention implementation model

### 4.1 持久化字段（`attention_items` 表）

| 字段 | 必要性 | 说明 |
|---|---|---|
| `id` | ✅ | ULID |
| `dedup_key` | ✅ | `hash(creation_reason_identity, subject_id, window_id)`；同键存在 open item → 事件只追加 evidence，不新建（§7） |
| `subject_kind` + `subject_id` | ✅ | PM §16 的 subject：`fund:000001` / `project:/path` / `session:sess_xxx` |
| `domain` | ✅ | `coding` / `market` / …（来源面，用于权限与呈现路由） |
| `creation_reason_kind` | ✅ | `assignment-authorization` \| `named-rule` \| `user-instruction`（PM §16.2 三源；**必填**，可审计锚点） |
| `creation_reason_ref` | ✅ | 指向授权物：assignmentId / ruleId / 指令记录。无 Event 前置也必须有它（PM §16.2：Event 不是绝对前提） |
| `evidence_refs` | ✅（JSON，可为空） | 支撑 Event id 列表；后续命中向 open item 追加 |
| `session_id` | 🔶 可空 | PM §16.4：存在即引用（permission 类必有）；Market 类创建时为空 |
| `state` | ✅ | `open` / `handled` / `dismissed` / `expired`——唯一生命周期枚举，**不加** SEEN/IN_PROGRESS/ACKNOWLEDGED/RESOLVED |
| `created_at` | ✅ | **trigger time**（PM §16.3），非 instruction time |
| `expires_at` | 🔶 可空 | 仅当 creation reason 定义了 validity window（§17 Expiration）；无窗口 = NULL = 永不因时间过期 |
| `handled_at` / `dismissed_at` / `expired_at` | ✅ 可空 | 状态迁移时刻（审计轨迹；`expired_at` 由系统清扫写入） |
| `handling_ref` | 🔶 可空 | 处理产物：concluded conversation 的 sessionId / permission reply id（PM §17；单一引用，§16.4） |
| `title` + `summary` | ✅ | 呈现 payload（创建时生成，Agent 措辞或模板）；Pulse 渲染用，不是语义字段 |
| `provenance` | ✅（JSON） | `{createdBy: source, instructionRef?, confirmedAt?}`——与 creation_reason_ref 共同构成可审计链 |

### 4.2 derived / runtime（不进 `attention_items`）

| 数据 | 处理 |
|---|---|
| seen（first/last/viewCount） | `attention_interactions` append-only 表（或 JSON 元数据）——PM §17：seen 是交互元数据；未读/badge 为派生视图 |
| in-progress | **派生**：`handling_ref != NULL` 即 in-progress，不落独立字段/状态 |
| 未读数、按域分组 | 查询时派生 |

### 4.3 创建路径的双通道表达

实现必须同时支持 PM §16.2 的两条入口，且**不强制 Event 前置**：

```text
通道 A（evidence-backed）：
Event(ingest) → authorized rule / permitted observation
  → judgment（authorized condition 成立？）
  → handling warranted？
  → Attention（creation_reason_kind = named-rule | assignment-authorization，
    evidence_refs = [eventId...]）

通道 B（instruction-backed）：
explicit user instruction / Assignment authorization
  → Attention（creation_reason_kind = user-instruction | assignment-authorization，
    evidence_refs 可为空——不制造 artificial Event）
```

通道 B 的现实来源：one-shot reminder 的 trigger fire（`assignment.trigger.fired` 事件可以作为 evidence 存在，但**不作为存在前提**——指令本身即 creation reason）。

---

## 5. Attention lifecycle implementation

状态机（与 PM §17 一字不差，无增补态）：

```text
OPEN → HANDLED    （处理产物落定）
OPEN → DISMISSED  （用户显式退出）
OPEN → EXPIRED    （expires_at 非 NULL 且 now > expires_at，系统清扫）
```

迁移规则与守卫：

| 触发 | 行为 |
|---|---|
| 用户显式动作（approve/reject、item 上的决定） | `POST /api/product/attention/:id/handle {artifactRef}` → HANDLED |
| permission 回复桥（BFF 侧看到 `permission.replied`） | 命中该 session 的 open item → 自动 HANDLED，artifact = reply 记录（coding 域唯一自动迁移） |
| 用户点 Ignore/不用了 | `POST .../dismiss` → DISMISSED |
| 查看类操作（GET item、Pulse 打开、badge 计算） | **零写入状态**；只写 `attention_interactions`（seen 元数据） |
| 进入/结束 Talk | **零写入状态**（PM §16.4：viewing ≠ handling；session completion ≠ HANDLED）——只有对话的 *outcome* 经由 handle 调用落定 |
| Assignment Revoked / Completed | **不触碰**任何 item（PM §10/§11）；revocation 只停止未来 trigger 评估 |
| now > expires_at | 清扫任务批量 → EXPIRED（只处理 expires_at 非空且 state=open 的行） |
| Session 被删除 | **实现期决策点**（见 §14 报告）：无窗口 item 不得自动 EXPIRED（PM §17），保持 OPEN 作为历史，呈现层标注 subject 已不可用；最终策略待定 |
| seen / in-progress | 永不推进 state（元数据 / handlingRef 派生） |

---

## 6. Event → Attention evaluation architecture

两条**不同机制**的评估路径，共享同一个 store 与 dedup（PM §19：两者必须都被允许，但不必同机制）：

```text
【deterministic pipeline】
Event ingest
  ↓
product_events（append）
  ↓
rule evaluator（对 type 命中的规则逐条执行）
  ├─ authorized condition 判定（规则条件）
  ├─ 不成立 → 记 evaluation outcome（无 item），结束
  ├─ 成立 → handling warranted 判定（规则的 warranted 语义；fire-time 可 suppress）
  │     └─ suppress → 记 outcome（PM §16.3：suppression ≠ expiration，无 item）
  ↓
dedup check（dedup_key）
  ├─ open item 存在 → evidence_refs 追加，结束
  ├─ 同窗口已 dismissed → 不再创建（PM §16.4：同窗口不 re-nag）
  ↓
Attention 创建（OPEN）

【agent observation pipeline】（未来，边界先立）
multiple Events（可跨时间）
  ↓
Agent / pattern detection（runtime 侧，机制任意）
  ↓
写入 agent.observation.recorded（Event，审计）
  ↓
permitted observation rule 校验（是否有 permitted rule 覆盖该观察）
  ↓
judgment + handling warranted
  ↓
Attention（creation_reason_kind = named-rule，rule 指向 permitted observation rule）
```

**规则表示**（Phase 2 落地时的最小形态，行式配置而非代码）：`{ruleId, eventTypeFilter, condition, subjectExtractor, attentionTemplate(title/summary), expiresAtPolicy, windowPolicy}`。`expiresAtPolicy` 例：market → 当日收盘；reminder → 指令隐含期限；permission → NULL（无窗口不过期，PM §17）。

**调度执行**：evaluator 挂在 ingest 后同步执行（事件量级小）；expiry sweep 挂在现有 scheduler 引擎（新增一个产品 job）。

---

## 7. Deduplication

PM 定义：`dedupe per (creation reason, subject, validity window)`。实现映射：

- **key 生成**：`dedup_key = sha256(creation_reason_identity || subject_id || window_id)`。`creation_reason_identity`：named rule → ruleId + 其条件参数指纹；Assignment → assignmentId + trigger id；user-instruction → 指令记录 id。`window_id`：由规则的 windowPolicy 生成（market → 交易日；reminder → 日历日；无窗口 → `∞`）。
- **dismissed 在同窗口内**：evaluation 命中"同 dedup_key 且 state=dismissed" → 不创建、不复活（PM §16.4）；evidence 也不追加（用户已退出该窗口的该事项）。
- **expired 后新 trigger**：window_id 已滚动 → dedup_key 不同 → **允许创建新 item**（PM §18）。
- **多 Event → 同一 Attention**：同 dedup_key 且 state=open → `evidence_refs` 追加（PM §19 基数规则）。
- **一 Event → 多 Attention**：允许——规则可按 subject 拆分发射（如市场摘要覆盖多基金）；每条各自走 dedup。
- **不提前锁索引**：Phase 1 只要求 `dedup_key` 列 + 普通查询；唯一性由 evaluator 的 check-then-insert 串行化保证（BFF 单进程 better-sqlite3 天然串行），不加 DB 级唯一约束的特判。

---

## 8. Session relationship

- **Attention 只保存引用**：`session_id`（既存会话）与 `handling_ref`（处理产物/处理会话）。Attention 不拥有 Session——会话与消息留在 OpenCode Server。
- **引用建立时机**：
  - `session_id`：创建时已知（permission 类，来自事件 subject）→ 直接写入；创建时未知（market 类）→ NULL。
  - `handling_ref`：用户经 item 进入 Talk 并产生结果时建立——Resume 既有会话则 `handling_ref = 该会话 id`；无会话则先 `Create`（带 item 上下文，§8.2）再回填；跨对话续处理时**重指向**新会话（单一引用语义，PM §16.4）。
- **一个 Session ↔ 多个 Attention**：允许（Session 是处理面）；**一个 Attention ↔ 至多一个当前 session 引用**。无 m:n 簿记。
- **路由实现归属**：Resume/Create 的判定在手机端现有 ProjectChatZ 逻辑（auto-Resume + 显式 New）——Phase 4 只需加"从 Attention 进入时携带 item 上下文 + engage 回填"一条链路。Reconstruct 仍无实现（PM §4.2 条件未在现实出现）。

---

## 9. Assignment（implementation boundary only）

目标流水线：

```text
Assignment proposal（对话产物，§13）
  ↓ activation / confirmation（§10 Activation；低风险直激 / 高风险确认）
Active Assignment（含 trigger mechanism：条件 + 浮出动作 + 授权引用）
  ↓ trigger evaluation（挂现有 scheduler 引擎：条件到点 → assignment.trigger.fired 事件）
Event and/or Attention（Attention 的 creation_reason_kind = assignment-authorization）
  ↓
Completed（one-shot 消费 / ongoing end-condition）或 Revoked（用户显式）
```

边界与缺口：

- **Assignment ≠ Event**：Assignment 是责任对象（proposal/状态/trigger 定义）；Event 是其运行的事实流（trigger fired、completed）。两者引用不合并。
- **Assignment authorization ⊃ Attention creation authority**：`which future trigger conditions may create Attention Items` 是授权的一部分（PM §12）——实现上授权引用进入 Attention 的 `creation_reason_ref`。
- **runtime action permission ≠ Assignment**：OpenCode `once/always/reject`（含跨会话持久的 always）是**逐操作、运行时层**的审批；Assignment authorization 是**产品层责任授权**。PM §12/§14 已声明过渡态：前者先于后者存在，前者不被当作后者。
- **当前代码缺口**：无 Assignment 对象/表/激活流；seed job（14:50 fund 监控）是运维配置物——Phase 5 将其迁移为"用户经对话创建的 ongoing Assignment + trigger registration"，scheduler 引擎从 `assignments` 读 trigger 定义（现有 `scheduler_jobs` 机制可承载，但语义来源变为对话授权）。

---

## 10. Open Thread / Memory / KB mapping

### Open Thread

PM §24：marker，非实体。当前数据模型（OpenCodeSession 无自定义字段）下最自然的表达：**BFF 产品层一条 marker 行**——`session_thread_markers {id, session_id, why, created_by, created_at, status: open|closed}`。它不拥有对话/历史（对话在 OpenCode）；"值得继续/为什么"是它的全部内容；浮出走 creation authority（§16.3）；继续 = Resume。**不做 OpenThread 实体**，不做独立表外的任何对象。

### Memory

opencode-memx ↔ 产品 Memory 映射：

| PM 概念 | memx 实现 | 状态 |
|---|---|---|
| durable user understanding | Track 1：`~/.opencode/USER.md`（STYLE_SIGNAL 捕获 → 子会话精炼 → 200 行压缩 + 备份） | ✅ 已实现 |
| durable project understanding | Track 2：`~/.opencode/projects/<slug>/.mem/*.md` + MEMORY.md 索引 | ✅ 已实现 |
| 静默形成（PM §29 persistence authority） | `session.idle`/`reflect` 触发、auto-write、备份 | ✅ 已实现——与"explicit and stable context"原则需对齐校验（memx 现按信号注释提炼，粒度符合 durable 要求） |
| 注入 Session 上下文 | `instructions` 字段开场注入 USER.md + MEMORY.md | ✅ 已实现 |
| **产品面（Memory tab）** | ❌ 无：App/BFF 读不到 opencode 宿主机文件；无查看/审校/遗忘入口 | **缺口**（Phase 6） |

连接方式（Phase 6 方向，不实现）：BFF 增只读投影 API 读取 USER.md/.mem（或 memx 增查询端点），Memory tab 呈现 + forget 入口回调 memx `forget` 工具。**产品层不重建 Memory 存储。**

### Knowledge Base

llm-wiki（知识编译写 Obsidian vault）+ llm-wiki-mcp（`search_wiki` 全文检索）↔ 产品 KB：

- durable knowledge 的**写**：Agent 会话内经 skill 完成（现有）；Raw Idea 入 KB = skill 的一次写入（PM §27），产品侧无独立写路径（缺口，Phase 6）。
- durable knowledge 的**读**：Agent 侧经 MCP（现有）；App/BFF 侧无检索面（缺口，Phase 6）。
- **不重新设计 KB**：vault + skill + MCP 即 PM §5 的实现，产品层只做集成边界。

---

## 11. Pulse / notification boundary

目标边界：

```text
Event
 ├── evaluation（→ Attention 或无产物）
 ├── Attention（持久，Pulse 渲染 L2/L3）
 ├── L1 presentation（有 speaking authority 的信息，Pulse 呈现）
 └── optional notification delivery（把"有新 Attention / 有新 L1"投递到外部通道）
```

现状违反点与修法：

- **耦合**：`fund-estimation.ts` 通知成功 → 才 publish trade-alert；通知通道全关 → App 永远收不到 Attention。**修法**：handler 无条件入 `market.rule.evaluated/matched` 事件；通知降级为 delivery 订阅者。
- **通知失败 ≠ Event 消失 / Attention 消失**：delivery 层重试/降级，永不回删 store 记录。
- **Event ≠ notification，Attention ≠ notification**：notification channel 只是 delivery mechanism；Pulse 是呈现面（App 内），通道是推送（App 外）。两者消费同一 Attention/L1 事实，互不拥有。
- 现有 `fund.estimate` 5s 推送 → 重分类为 **L1 presentation** 的数据源（有 named standing rule 授权的行情信息面，PM §22），不再是"事件流的一部分被当通知"。

---

## 12. Recommended implementation phases

**P0 implementation gaps**（不修则模型无法落地 / 现有行为违背已冻结语义）：

1. `determineProjectStatus` 的 `knownIdle → needs-you`（`project-status.ts:73-77`）——Phase 3 随 Pulse 改造消除。
2. 通知-事件耦合（`fund-estimation.ts:76-88`）——Phase 1 拆除。
3. Event 无持久化（内存单槽、易失、单条）——Phase 1。
4. Attention 无持久化（派生态 + 前端 state）——Phase 1。

**P1**：Assignment runtime 缺失（对象/激活/trigger 注册）；Open Thread marker 缺失；L1 speaking-rule 治理未落地（现仅 fund.estimate 数据面 + 静态 presence）；`/session/status` 幽灵条目未交叉校验（services.md 已录）。

**P2**：Memory/KB 产品面；agent observation pipeline；notification delivery 层重设计；retention 策略具体化；死代码清理（`screens/events.ts`、`SessionPanel.tsx`）。

| Phase | 内容 | 交付判据 |
|---|---|---|
| **1** | `product_events` + `attention_items`（+ interactions）表、`ingest()`、lifecycle API、expiry sweep；BFF 拆通知耦合 | 重启后 OPEN item 存活；事件可查历史；通知失败不影响事件 |

> Phase 1 + Phase 2 的编码级设计（DDL 草案 / 服务签名 / dedup / 迁移 / DoD 矩阵）见 `PHASE1_IMPLEMENTATION.md`；两者合并为第一个编码增量，Pulse 改造（Phase 3）仍单独一轮。
| **2** | deterministic pipeline：permission bridge（opencode-sse → event → attention 绑 session）+ market rule（threshold → attention + 收盘过期） | PM §36 两源全部经持久 Attention 出现；idle 不再产生任何 item |
| **3** | Pulse 改造：Needs you 读 attention store；idle 项目归中性分组（删 `knownIdle→needs-you`）；fund.estimate 归 L1 数据面 | Pulse 噪音消失；两个 P0 语义修复完成 |
| **4** | Talk routing + handlingRef：engage 回填、permission reply → HANDLED、对话 outcome → handle | §16.4 路由与 §17 HANDLED 语义可演示 |
| **5** | Assignment runtime：proposal/activation/trigger 注册/Completed/Revoked；seed job 迁移为对话创建的 ongoing Assignment | "Monitor Fund X daily" 可由对话产生并可撤销 |
| **6** | Memory/KB 集成：Memory tab 读 memx 投影 + forget；KB 检索/写入边界（skill/MCP 桥） | 四 surface 全部有真实数据来源 |

---

## 13. Architecture invariants（实现层必须遵守）

1. Event is a persistent fact — append-only, with `occurred_at` ≠ ingested time.
2. Event does not imply Attention; Attention does not require an Event (requires creation reason).
3. Attention creation requires an auditable creation reason (`creation_reason_kind` + `creation_reason_ref`), never Agent interest alone.
4. Attention is persistent; its lifecycle survives restarts and reconnects.
5. Attention state is exactly `open | handled | dismissed | expired`; seen/in-progress are metadata or derived, never states.
6. Viewing, Talk open/close, and Session completion never mutate Attention state.
7. Assignment Revocation/Completion never mutates existing Attention Items; Attention expiry never mutates the Assignment.
8. Attention carries at most one current session/handling reference; a Session may serve many Attention Items.
9. Open Thread is a marker row on a Session reference — never an entity with conversation or history.
10. Agent Session owns conversation history; the product store only holds references to it.
11. Resume never creates a Session; Create only on explicit user engagement; Reconstruct only when the original is unavailable/unsuitable.
12. Assignment authorization is not runtime action permission (opencode once/always ≠ Assignment).
13. Notification delivery is a downstream consumer; delivery success/failure never determines Event existence or Attention state.
14. Persistence (Thread/Idea/Memory/KB) never activates a responsibility — Assignment governance is the only path to Active.
15. Memory and KB live in their runtime-side stores (memx files / llm-wiki vault); the product layer integrates, it does not duplicate them.

---

## 14. 需要产品侧裁决的实现期决策（非语义冲突，均可在 PM 原则内推导）

1. **Session 删除后其 permission Attention 的归宿**：无窗口 → 不自动 EXPIRED（PM §17）；agent 已消失使处理失去对象。默认实现：保持 OPEN + 呈现层标注；是否补"subject 终止 → 系统侧关闭"的 PM 例外，留产品判断。
2. **L1 speaking rule 的默认清单**：哪些信息类默认可说（市场估值✅已有面、delegated work 完成播报✅由 commission 覆盖）——语义已定，清单属策略。
3. **retention 期限**：`retention_class` 的具体 TTL——纯策略。
4. **deterministic rule 的存储形态**（配置行 vs 代码内注册）：Phase 2 实现决策，语义无差。

**结论：未发现需要重新打开 PRODUCT_MODEL 的语义矛盾。**PM 的全部已冻结语义（Event 无条件入库、Attention 双通道创建、四态生命周期、dedup 三元组、Session 三路由、通知解耦、persistence authority 分域）在现有基础设施（better-sqlite3 / scheduler / opencode SSE 代理）上均可直接表达；上述四项均为 PM 原则内的参数级决策。
