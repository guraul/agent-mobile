# MVP Acceptance

> Agent Mobile / Pulse MVP 最终验收审计
> 审计日期：2026-09-12
> 审计对象：BFF family-finance（Phase 1–13 全部在库）+ agent-mobile-app（Phase 1–13）+ 全部 docs
> 审计依据：`PRODUCT_MODEL.md`（冻结基线）、`FINAL_ARCHITECTURE.md`、Phase 10–13 设计与最终报告、Knowledge Base、**当前真实代码与真实运行时行为**
> 审计性质：最终 Architecture Review + MVP Acceptance。本阶段零功能开发，PRODUCT_MODEL.md 零改动（git diff 验证）。

---

## Executive Decision

**MVP STATUS: ACCEPTED WITH NON-BLOCKING GAPS**

- **Blocker：0。** 未发现任何破坏产品语义、authority 边界、lifecycle 完整性或数据安全的实现。
- **Non-blocking correctness issue：3**（confirm resolution 回填 no-op；E2E observation 注入为 API 模拟而非真实 sweep；一处知识库描述行滞后——本次已顺手修正）。全部记录为 Post-MVP / Hardening，均不影响 canonical 行为与用户体验主链路。
- 产品模型（PM §1–§36）与实现一致；四条 authority 家族相互独立；三个 lifecycle 无重复实现、无第二状态源；DB 是唯一 canonical state，SSE/mobile 皆为 projection。
- 宣布：**«Agent Mobile / Pulse MVP mainline is closed.»**

---

## Product Model Integrity

`PRODUCT_MODEL.md`（2470 行，冻结）逐域核对：

| PM 域 | 实现一致性 | 证据 |
|---|---|---|
| §10 Assignment / Activation / Unconfirmed proposal / 确认矩阵 | ✅ | matrix 三轴在 propose 时评估（`assessConfirmation`）；market/ongoing 必然停留 proposed；direct-activation 仅三轴全低；proposal 无 trigger、无 Attention、无 lifecycle |
| §10 四种 proposal 结局 | ✅ | accepted/rejected/canceled/expired 全部由 `proposalRepository.resolve()` 单点原子迁移；被拒提案永不进入 Assignment lifecycle |
| §11 One-shot/Ongoing、Revocation 与 Attention 独立 | ✅ | revoke 不触碰 Attention（代码无调用路径）；Completed ≠ Attention Handled；P8 missed-run 补偿语义（run-now/skip）落地 |
| §15 Event = fact | ✅ | `product_events` append-only + 确定性 id 幂等；入库 ≠ Attention |
| §16/§17 Attention 判断与生命周期 | ✅ | creation authority 三源（named-rule / assignment-authorization / user-instruction-CHECK）；OPEN→HANDLED(强制 artifact)/DISMISSED/EXPIRED；seen 只写 interaction 表 |
| §19 Event→Attention 双路径 | ✅ | deterministic path（rules.ts）已实现；intelligent observation path 的 **Attention 出口未实现**——与 PM 兼容：PM 定义的是 authority 形状，MVP 无 observation→Attention 生产者（→ Post-MVP） |
| §20/§22/§23 Pulse 与交互级 | ✅ | L1 statement / L2 Proposal / Attention rendering 三种呈现各自独立 authority；"two kinds" 措辞张力按 PHASE13_DESIGN §13 gap-1 解释消解（来源分类 vs 交互级），无需修订 PM |
| §24–§28 Open Thread / Raw Idea / Memory / KB 分界 | ✅（部分未实现，见下） | Raw Idea → KB vault raw-ideas/（保存≠执行）；Memory = memx；**Open Thread 未实现**（PM §36 MVP 边界不要求，Backlog Future，FINAL_ARCHITECTURE §2 已登记） |
| §35 产品原则 32 条 | ✅ | 逐条有对应代码结构（无 runtime 态进 Attention、无静默激活、dismiss 显式、expiry 来自 creation reason 等） |
| §36 MVP 边界 | ✅ | Attention 两源（permission request + fund trade alert 经 Assignment trigger）；无多 runtime、无 universal context、无独立 Assignment 管理屏（Phase 9 Responsibilities 属 Memory tab 投影，非新屏） |

**结论：CONSISTENT。** 唯一"未实现"项（Open Thread）位于 PM 明示的 MVP 边界之外。

---

## Architecture Integrity

目标模型（User → Agent Session → conversation/decision → Assignment/Open Thread/Raw Idea；Assignment → Trigger → Execution → Event → Observation/Rule → L1/Proposal → Pulse；Attention → Needs Attention → Talk）与实现逐段核对：

| 模型边 | 实现 | 判定 |
|---|---|---|
| User → Agent Session | OpenCode session（Resume/Create，PM §4/§8），mobile 不持有 session 语义副本 | ✅ |
| conversation → Assignment/Raw Idea | Talk 结构化提案（`/assign` → propose → matrix）+ KB raw-ideas 原子写 | ✅ |
| Assignment → Trigger → Execution → Event | trigger cron（later.js）→ `fireAssignmentTrigger`（exactly-once 执行锁 + attempt 幂等）→ `assignment.trigger.fired` 等 append-only 事件 | ✅ |
| Event → Observation/Rule → L1 → Noticed | market-scheduler 事件 → observation sweep（授权 rule）→ `agent.observation.recorded` → L1 frame → `/api/product/l1/stream` → Noticed | ✅ |
| Event → Observation/Rule → Proposal → Suggested → Confirm/Reject → Assignment | 同一 observation 的 outcomes 白名单双出口：propose（绝不 activate，运行时守卫）→ `proposal.created` SSE → Suggested 卡 → confirm（唯一 activation moment）→ Assignment 行 + created/activated 事件 + trigger 注册 | ✅ |
| Event → Attention → Needs Attention → Talk → Handling | rules（permission blocking / market target-nav）+ assignment-authorization（trigger fire）→ attention_items → Needs you → engage（Resume/Create）→ handle（artifact 强制） | ✅ |

无任何一条语义边界被破坏。注：模型图中 "Open Thread" 一支当前无实现（Post-MVP）；模型图其余全部有真实 runtime 对应。

---

## Canonical Entities

| Entity | Canonical? | Persistence | Lifecycle | Owner |
|---|---|---|---|---|
| Agent Session | ✅（canonical 在 OpenCode Server） | opencode `:4096`（session 存储） | Create/Resume/Reconstruct（product 侧只存 sessionId 引用） | opencode-tap / opencode REST proxy |
| Event | ✅ | SQLite `product_events`（append-only、INSERT OR IGNORE、确定性 id） | 无 lifecycle（fact） | eventIngestor（无 HTTP 暴露） |
| Attention | ✅ | SQLite `attention_items` + `attention_evidence` + `attention_interactions` | OPEN→HANDLED/DISMISSED/EXPIRED，唯一入口 attentionService | attention-service |
| Assignment Proposal | ✅ | SQLite `assignment_proposals` | proposed→confirmed/rejected/cancelled/expired，唯一入口 `proposalRepository.resolve()` | assignment-service |
| Assignment | ✅ | SQLite `assignments` | Active/Revoked/Completed（+ retention archived），唯一入口 assignment-service | assignment-service + assignment-triggers |
| Memory | ✅（canonical 在 memx 文件） | `~/.opencode` `.mem/*.md`、`USER.md`/`MEMORY.md` | memx 自有（BFF 只读投影 + forget bridge） | opencode memory plugin |
| Knowledge Base | ✅（canonical 在 vault 文件） | llm-wiki vault（含 `raw-ideas/`） | vault 自有（BFF rg 检索 + Raw Idea 原子写） | llm-wiki skill |
| Open Thread | ❌ 未实现 | 无 | 无 | —（Backlog Future，PM §24 语义预留） |
| Raw Idea | ✅（KB vault 的一部分） | vault `raw-ideas/*.md` | 无独立 lifecycle（保存≠执行） | kb-adapter |
| **L1** | **❌ 非 canonical** | **无表**——进程内 frame（l1-rules 内存 + emitter），重启由 market source / observation sweep 重建 | 无 lifecycle（只有 expiresAt 有效性） | l1-rules / l1-market-source / observation-l1 |
| **L2 Suggestion** | **❌ 非 canonical** | **无表**——`assignment_proposals` 的只读投影（mobile store 为缓存） | **无自有 lifecycle**（status 原样透传，渲染过滤 proposed） | proposal store（纯函数） |
| **Pulse** | **❌ 非 canonical state store** | 无持久化 | 无 | 五组皆为 presentation surface |
| **Delivery** | **❌ 非 product state** | `delivery_jobs` = infra outbox（migration 注释明示 NOT product entity） | outbox 重试语义，非产品 lifecycle | delivery worker（scheduler job） |

**presentation 层未发现任何偷偷 canonical 化**：L1/Suggestion/Pulse 均无表、无 schema、无迁移；delivery_jobs 的 CHECK 仅允许 attention/l1 两类 presentation，proposal 无 delivery 路径。

---

## Authority Model

六类 authority 独立性逐条代码验证：

| Authority | 实现位置 | 独立性判定 |
|---|---|---|
| Observation authority | `observation/grants.ts`（静态清单）+ `observation-runtime.ts` sweep | ✅ rule registry ≠ grants；观察授权不借用 Assignment 授权（PM §16.2） |
| L1 presentation authority | `lib/product/l1-rules.ts` registry（`l1.market.estimate` + observation rule） | ✅ 与 attention rules 完全分离；会建 Attention 不等于会说话，反之亦然 |
| Attention creation authority | `lib/product/rules.ts`（permissionBlocking / marketTargetNavThreshold）+ assignment-authorization（trigger fire） | ✅ `market.rule.evaluated` 显式登记"恒不建 item"；observation 当前无 Attention 出口 |
| Assignment proposal authority | `assignmentService.propose` 两个调用方：JWT API（用户显式）+ `ensureProposalForObservation`（授权 rule） | ✅ 另有运行时不变式守卫：`result.assignment` 非空即抛错（observation-service.ts:151） |
| Assignment activation authority | ① confirm（用户显式，`confirmation:<proposalId>`）② direct-activation（matrix 三轴全低）③ legacy migration（运维层一次性，登记在案） | ✅ `POST /api/product/assignments` = 405；除上述三处 `assignmentRepository.insert` 无其他调用方（grep 复验） |
| Runtime action permission | opencode permission bridge（tap 白名单）→ Attention → 用户 reply → handle | ✅ Assignment 执行只读行情数据（EstimationFetcher）；交易永远 action-time approval，activation 不授予 |

**关键不变式实测：**
- Observation → Proposal **不能**自动变成 Assignment：matrix required=true（market/ongoing）+ 运行时守卫 + E2E S3（点卡体零 confirm 请求）+ sim（sweep 后 `assignments` 计数 0）。
- **User sees Suggestion ≠ authorizes Assignment**：Suggestion 卡唯一推进路径是 [确认]/[不用了] 两个显式按钮 → 既有 confirm/reject API；view/open/scroll/expand/Talk/resume/SSE 接收/前台化/notification click 均无 confirm 调用点（mobile mutation 面全量 grep 审计：所有 POST 均为用户显式动作转发）。

**结论：SAFE。«Presentation must never silently become authority» 成立。**

---

## Lifecycle Integrity

| 状态机 | 审计结论 |
|---|---|
| **Attention** OPEN/HANDLED/DISMISSSED/EXPIRED | ✅ 唯一入口 attention-service；`transitionOpen` 仅对 open 行生效（终态不可逆、无 reopen）。**Seen ≠ Handled**（interaction 表独立）；**Talk ≠ Handled**（engage 只记录交互 + 回填 session）；**Session completion ≠ Handled**（idle 不进 product 管道）。EXPIRED 仅命中 `expires_at` 非空且到期的行——**无窗口不过期**（PM §17） |
| **Proposal** PROPOSED/CONFIRMED/REJECTED/CANCELLED/EXPIRED | ✅ 单行原子迁移 `UPDATE … WHERE status='proposed'`；proposed→confirmed 只经用户显式 confirm；rejected/expired → confirm 抛 ProposalError（409，既有测试覆盖）；duplicate confirm / duplicate reject deterministic（phase55 + P13 emitter 测试：恰好一次迁移 + 恰好一次广播）；并发双确认由 resolve 占坑拦截 |
| **Assignment** ACTIVE/REVOKED/COMPLETED | ✅ 无 Pause（状态集合封闭）；Revoked 不可恢复（revoke 仅对 active 行生效 + timer 注销 + state 守卫双保险）；Completed = responsibility discharged（one-shot 消费即 commit point；ongoing 只被 revoke 或授权内 end condition 终结） |
| **Event** | ✅ append-only、幂等；**不承担** Attention lifecycle（disposition 在 attention_items 行）也**不承担** Assignment lifecycle（state 在 assignments 行）——proposal disposition 同样无 product_event（与 Attention 家族一致） |

**无任何 lifecycle 被实现两次**：Attention 迁移只在 attention-service；proposal 迁移只在 `proposalRepository.resolve`；Assignment 状态迁移只在 assignment-repo（经 assignment-service 唯一入口）。mobile 侧零状态权威（所有 store 只做缓存投影 + 渲染过滤；全部 mutation 走 BFF API）。

---

## Runtime Flows

三条主链路端到端验证（真实代码路径 + 测试 + E2E）：

**① Passive observation（Noticed）**
`market.rule.evaluated` → observation sweep（grants 授权）→ `agent.observation.recorded`（outcomes 含 l1）→ `refreshObservationL1` → L1 frame → `/api/product/l1/stream` → Pulse Noticed。
✅ P13 sim（隔离 DB）+ P12 回归全绿；E2E 同屏共存断言通过。

**② Proactive responsibility suggestion（Suggested → Assignment）**
`market.rule.evaluated`（负 diff ×3）→ Observation → Proposal（proposed，绝不 activate）→ `proposal.created` → Suggested 卡 → **Confirm** → Assignment active（行 + created/activated + trigger 注册）→ Trigger（cron）→ Execution（exactly-once 锁）→ `assignment.trigger.fired` Event → （条件命中）→ Attention → Needs you。
✅ E2E 15/15（SSE 不重开页面出卡、确认→Responsibilities 可见、拒绝→无 Assignment）+ P13 sim Confirm/Reject 双链 + P5/P8/P55 既有回归。

**③ User attention（Needs you → Talk → Handling）**
Event → rules/assignment-authorization → Attention（OPEN）→ Pulse Needs you → 用户 engage（Resume 既有 session / Create market 工作区）→ Talk 处理 → handle（artifact 强制）/ dismiss（显式）/ expire（仅带窗口项）。
✅ Phase 3/4/9 既有测试 + E2E attention 计数不变断言。

**错位检查**：未发现 Event 被当 Attention（`market.rule.evaluated` 显式不建 item）、L1 被当 Attention（L1 无 item 无义务）、Proposal 被当 Assignment（激活仅两路径）、Suggestion 被当 Proposal lifecycle（纯投影）、Assignment 被当 Session（二者无写路径交叉）。

---

## Persistence & Recovery

**DB 是唯一 canonical state；SSE / mobile store 皆 projection/cache** ✅

| 场景 | 恢复机制 | 验证 |
|---|---|---|
| BFF restart | instrumentation 启动序：initDatabase → runMigrations → legacy seed exactly-once → scheduler engine（5 个 job：fund-estimation / attention-expiry / assignment-proposal-expiry / delivery-sweep / observation-sweep）→ Assignment trigger timers 从 DB 重建 → opencode tap 回填 → L1 market source 重启 | phase55 restart 测试 + P8 启动扫描日志 |
| proposed Proposal recovery | DB 行即权威；sweep 每分钟把到期 proposed → expired；SSE 连接时重放 proposed 快照 | P13 E2E + emitter 测试 |
| Attention recovery | DB 权威；连接重放 open 快照；sweep 每分钟 expiry | phase55 + attention-service 测试 |
| current L1 recovery | 进程内 frame 重建：market source 5s 现算 + observation sweep 每分钟 refreshAll | P12 测试 |
| mobile restart / SSE reconnect | token 恢复 → snapshot 对账（attention / proposals / L1）→ SSE 重连 onReconnect 再对账 | hooks 三套同构 + E2E |
| Concurrency | duplicate confirm/reject（409 确定性）；confirm race（resolve 占坑）；execution/revoke race（phase55 §concurrency） | 既有测试全绿 |
| Expiry | Proposal 7 天 TTL sweep；Attention 按 creation-reason 窗口 sweep；L1 expiresAt（observation 3 天 / market 实时帧）；客户端零 TTL 权威 | 各 phase 测试 |
| Failure | execution error → 锁释放 + failure 记录 + repair Attention（one-shot）/ 连续 ≥3 次（ongoing）；retry = 新 attempt；missed one-shot → pendingCompensation → run-now/skip；恢复 → repair Attention EXPIRED | phase8-resilience（10 项）+ P8 sim |

---

## Pulse / Talk / Memory / KB Boundaries

| 表面 | 职责 | 边界判定 |
|---|---|---|
| **Pulse** | 五组呈现：Needs you（Attention）/ Suggested（Proposal L2）/ Noticed（observation L1）/ Today（项目 running，deterministic informational）/ Market（行情 L1） | ✅ 不创建 product state（全部只读 + 显式动作转发）、不拥有 lifecycle、不拥有 authorization、不决定 Assignment——presentation surface only。**不是 dashboard**：每组对应一个明确 authority，无 raw event 流 |
| **Talk** | interaction / conversation / handling / decision（OpenCode session surface） | ✅ 打开 Talk 不迁移任何状态；HANDLED 只发生在显式 handle（artifact）或 permission reply；`/confirm` `/reject` 是用户显式斜杠命令（≠ 自动激活） |
| **Memory** | durable user understanding（memx canonical；BFF 只读投影 + forget bridge） | ✅ Event ≠ Memory（observation 不写 Memory——P11 边界测试）；Attention ≠ Memory；Assignment ≠ Memory |
| **Knowledge Base** | domain/project knowledge + raw ideas（vault canonical；rg 检索 + 原子写） | ✅ Conversation ≠ KB（无自动写入）；Raw Idea 保存 ≠ 执行（无 product store 写路径）；Raw Idea ≠ Assignment |

跨边界自动写入扫描：未发现无 authority 的跨域写（P11 专项测试：observation 全程 Memory/KB 零写入）。

---

## Security & Trust

| 检查项 | 结论 |
|---|---|
| implicit authorization | ❌ 无——激活仅 confirm / matrix all-low / legacy（登记）；"用户看过/聊过"从不产生授权 |
| hidden activation | ❌ 无——`assignmentRepository.insert` 三个调用方全部有名有据（grep 复验）；`POST /api/product/assignments` 405 |
| client-side lifecycle authority | ❌ 无——mobile 无 DB 访问；全部 mutation 经 JWT API 到 BFF 权威入口；store 无状态迁移函数 |
| client-side expiry authority | ❌ 无——`expiresAt` 仅展示"有效至"；无倒计时强制移除（第二状态源被设计明确禁止） |
| SSE-driven mutation | ❌ 无——`/api/product/stream`、`/api/product/l1/stream` 均 GET-only、只广播；客户端 SSE 解析纯读取 |
| notification-driven mutation | ❌ 无——delivery 只对外发送（outbox → adapters），不入 product 状态 |
| Talk-driven assignment activation | ❌ 无自动——Talk 内激活只经 `/confirm` 显式命令（= 用户动作）或 propose 内 matrix all-low（用户显式指令本身） |
| presentation-driven state mutation | ❌ 无——Suggestion 卡体无 press 动作；Noticed 卡无动作；engage/handle 严格分离（P4 既有断言） |

**结论：«Presentation must never silently become authority» 在实现层成立。**

---

## Operational Safety

Phase 12 生产库事故（2026-09-11）后的防线复验：

| 防线 | 状态 |
|---|---|
| **VITEST + 无 FF_DB_PATH → FAIL FAST** | ✅ `database.ts` resolveDbPath：`process.env.VITEST` 且未显式指定 `FF_DB_PATH` → 抛错拒绝解析生产库（本轮审计逐行复确认） |
| test DB isolation | ✅ 全部 product/observation/sim 测试经 `vi.hoisted(() => { process.env.FF_DB_PATH = /tmp/... })` 在 import 前固定隔离 DB（import order 意外已被 hoisted 机制消除） |
| production DB protection | ✅ 事故备份保留（`data/finance.db.bak-1789117689` / `-wal.bak-*` / `*.corrupted-*`）；本轮全部验证（242 tests + sim + E2E）后生产库 integrity ok、无 fake 数据残留（P12 恢复报告） |
| scheduler isolation | ✅ 测试 beforeEach 清 scheduler_jobs/job_runs + 注销全部 trigger timer；生产 scheduler 只在 instrumentation 启动 |
| smoke isolation | ✅ P13 sim 遵循 P8 sim 模式：隔离 DB + 明确标注 simulation vs real |
| E2E isolation | ✅ E2E 只经既有 HTTP API 注入/断言/清理（不直接触碰 DB）；E2E 创建的 Assignment 显式 revoke 清理（惰性 revoked 行同 P8 惯例） |

**结论：测试不会再误写 production DB。**

---

## Known Non-Blocking Issues

| # | 类型 | 描述 | 影响 | 处置建议 |
|---|---|---|---|---|
| 1 | Non-blocking correctness | **confirm() resolution 回填 no-op**：第一次 `resolve(…, "confirmed", {})` 占坑后 status 已是 confirmed，第二次回填 `{assignmentId, via:"confirmation"}` 因 `WHERE status='proposed'` 守卫恒空转 → `resolution` 停留 `{}` | **无 canonical 影响**：Assignment 行、created/activated 事件、`provenance.proposalId` 回链、authorizationRef 全部正确（E2E + sim 双验证）；消费方审计：mobile 零消费（仅类型声明），BFF `assignments/[id]` 的 `resolution?.via` fallback 因 `authorizationRef` 恒非空而不可达 | Post-MVP Hardening：合并两次 resolve 或加无守卫 `patchResolution`；修后补 §2.6 一致性断言。**本轮不修（审计阶段零改动原则）** |
| 2 | Non-blocking correctness | **E2E observation 注入为 API 模拟**：phase13-e2e 经 Talk 提案入口 + `createdBy="observation:e2e"` 模拟 observation 出处，真实 sweep 依赖行情时间窗（risk-6 裁决） | 核心链路已由 P13 sim（真实 sweep、隔离 DB）+ E2E（真实 UI/SSE/API）分段覆盖；仅"真实 sweep → 真实 UI"一跳无自动化 | Post-MVP Hardening：可加 nightly 全链路 E2E |
| 3 | Non-blocking correctness | **知识库描述滞后**：INDEX.md Pulse 行缺 Noticed/Suggested 组（**本轮已修**）；FINAL_ARCHITECTURE 缺 Phase 11/12 登记（**本轮已补** §1b/§3d） | 已消除 | — |
| 4 | Non-blocking operational | opencode server（127.0.0.1:4096）停机时 Pulse "Today" 组 502（chat/project 代理不可达），Pulse 其余四组（Attention/Suggested/Noticed/Market）不受影响 | 环境依赖，非代码缺陷 | 运维项：opencode 进程托管/探活 |

---

## Post-MVP Evolution

（不构成 MVP blocker，逐一登记）

**Hardening 类**
- resolution.assignmentId 回填修复（见上 #1）
- 全链路 E2E（真实 sweep → UI）
- duplicateOf 呈现（同基金 observation 提案与 Talk 提案并存时的指向提示，risk-3 MVP 接受并存）

**Evolution 类**（按 PM/设计既定方向）
- Observation → Attention 路径（PHASE12_DESIGN §5 已设计）
- Observation rule 扩展：coding / email / user-profiling / LLM observation（需先满足 P11 §五前置条件）
- Open Thread 实体（PM §24 语义已定义，MVP 未实现、未需要）
- 更丰富 proactive behavior / 更深 Memory-KB 整合
- Delivery 策略扩展（Push 通道、按用户偏好路由）
- Agent Runtime 抽象（替换 OpenCode，PM §34）

---

## Final Definition of Done

| # | 标准 | 判定 |
|---|---|---|
| 1 | PM 全部 MVP 域语义与实现一致 | ✅（§Product Model Integrity） |
| 2 | 无 presentation 层 canonical 化（L1/L2/Pulse/Delivery 全部非 canonical） | ✅（§Canonical Entities） |
| 3 | 六类 authority 相互独立，无静默授权路径 | ✅（§Authority Model） |
| 4 | 三个 lifecycle 唯一实现、终态不可逆、无重复状态源 | ✅（§Lifecycle Integrity） |
| 5 | 三条 runtime 主链端到端可运行、可恢复、可审计 | ✅（§Runtime Flows + Persistence） |
| 6 | DB 唯一 canonical；SSE/mobile 为 projection；restart/reconnect 收敛 | ✅ |
| 7 | Pulse 是 presentation surface 而非 dashboard | ✅ |
| 8 | Talk/Memory/KB 边界无越权自动写入 | ✅ |
| 9 | 测试不触碰生产库（fail-fast guard + 全量隔离验证） | ✅ |
| 10 | 测试全绿：BFF 242 passed / 7 skipped；mobile 122 passed；双端 tsc 通过；E2E 15/15；P13 sim 2/2 | ✅ |
| 11 | 文档与代码一致（发现的滞后项已修） | ✅ |
| 12 | PRODUCT_MODEL.md 零改动；无新 canonical entity；无 Phase 14 | ✅ |

---

## Final Decision

```text
Blocker:                0
Non-blocking gaps:      3（resolution 回填 no-op / E2E observation 模拟注入 / opencode 停机环境项）
Architecture:           COHERENT
Semantic Model:         CONSISTENT
Authorization:          SAFE
Persistence:            RECOVERABLE
MVP:                    ACCEPTABLE
```

# MVP STATUS: ACCEPTED WITH NON-BLOCKING GAPS

**«Agent Mobile / Pulse MVP mainline is closed.»**

> 依据：所有核心语义（PM 冻结基线）、authority（六类独立）、lifecycle（三个唯一实现）、runtime（三条主链）、persistence（DB 唯一权威 + 全场景恢复）、UX boundary（Pulse/Talk/Memory/KB）均经当前真实代码验证成立；发现的三个缺口均为 non-blocking，已登记 Post-MVP/Hardening，不影响主链路正确性、安全性或可运维性。
