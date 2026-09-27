# PHASE13_FINAL_REPORT.md —— Assignment Proposal → Pulse L2 Suggestion 最终报告

> 完成日期：2026-09-12
> 状态：**已实现并通过全部验证**
> 依据：`PRODUCT_MODEL.md`（冻结，本轮零改动）+ `PHASE13_DESIGN.md`（implementation contract，零改动）

---

## 1. 目标

把已存在的 **Assignment Proposal**（Phase 11 Observation → Proposal 闭环产物）接到 **Pulse L2 Suggestion**：

```text
Observation（repeated-decline judgment）
  → assignment_proposals（proposed，BFF 权威）
    → proposal.created/updated（presentation 广播，/api/product/stream）
      → Pulse SUGGESTED 组（Suggestion 卡）
        ├── [确认]   → confirm API → Assignment activated（唯一 activation moment）
        └── [不用了] → reject API  → Proposal rejected
```

用户体验：`Pulse ├── Noticed（Observation L1）└── Suggested（Assignment Proposal：Confirm/Reject)`。
**Suggestion ≠ Proposal**：Suggestion 只是 Proposal 的 user-facing projection；`assignment_proposals` 仍是唯一 canonical source。

---

## 2. 实现清单

| # | 任务 | 文件 | 状态 |
|---|------|------|------|
| 1 | proposalEmitter（照 attentionEmitter 模式） | `packages/web/lib/product/proposal-emitter.ts` | ✅ 新增 |
| 2 | 五个迁移点广播（只加 emit） | `packages/web/lib/product/assignment-service.ts` | ✅ |
| 3 | product stream 重放 + 订阅 | `packages/web/app/api/product/stream/route.ts` | ✅ |
| 4 | 广播点测试（§10 #5/#10/#11/#14/#15 + risk-1） | `packages/web/lib/product/proposal-emitter.test.ts` | ✅ 新增（7 tests） |
| 5 | mobile `ProposalRow` 完整类型 + `fetchProposals` | `agent-mobile-app/src/services/assignment/client.ts` | ✅ |
| 6 | Suggestion 视图模型纯函数 | `agent-mobile-app/src/services/proposal/store.ts` + `store.test.ts`（9 tests） | ✅ 新增 |
| 7 | proposal SSE 订阅（只认 `proposal.*`） | `agent-mobile-app/src/services/proposal/client.ts` | ✅ 新增 |
| 8 | `useSuggestions` hook（镜像 useAttentions） | `agent-mobile-app/src/hooks/useSuggestions.ts` | ✅ 新增 |
| 9 | 投影文案：effect/reason | `agent-mobile-app/src/services/assignment/projection.ts` | ✅ |
| 10 | Pulse SUGGESTED 组 + Suggestion 卡（四问 + 双按钮 + busy + 409 对账） | `agent-mobile-app/src/app/(tabs)/index.tsx` | ✅ |
| 11 | E2E | `agent-mobile-app/scripts/e2e/phase13-e2e.mjs` | ✅ 新增（15/15） |
| 12 | Real isolated smoke | `packages/web/lib/product/phase13-sim.test.ts` | ✅ 新增（2 tests，PHASE13_SIM=1） |

---

## 3. 关键语义裁决（照设计执行，无偏离红线）

### 3.1 广播点（PHASE13_DESIGN §9.1 逐条落实）

| 时点 | 广播 | 备注 |
|---|---|---|
| `propose()` 且 proposal 停留 proposed | `proposal.created` | direct-activation 分支**不广播**（risk-1 有测试断言零广播） |
| `confirm()` 迁移+激活成功后 | `proposal.updated`（confirmed 行） | |
| `reject()` / `cancel()` 成功后 | `proposal.updated` | |
| `expireProposalsDue()` 每个 transitioned | `proposal.updated`（expired） | 重复 sweep 幂等零广播（有测试） |
| dedup/恢复路径返回既有 proposal | 不广播 | 无新事实 |

### 3.2 边界复验（设计 §6/§7 审计在实现后成立）

- `assignmentRepository.insert` 调用面不变：confirm / direct-activation / legacy-migration 三处（Phase 13 零新增）。
- 无新 canonical entity、无 schema 迁移、无新 `PRODUCT_EVENT_TYPES`（`PRODUCT_MODEL.md`/`migrations.ts`/`types.ts` 零改动，git diff 验证）。
- 无 Attention 路径（BFF sim：confirm/reject 全程 `attention_items` 计数不变；E2E S6：生产库 before=19 after=19）。
- 无 Delivery 路径（sim：`delivery_jobs` 计数恒 0）。
- 查看非授权：卡体无 press 动作；E2E S3 点卡体后 confirm 请求数 = 0、proposal 仍 proposed。
- 客户端无第二状态机：store 存 BFF 字段原样（含 status），渲染过滤 `status === 'proposed'`；无客户端过期倒计时（`expiresAt` 仅展示"有效至"）。

---

## 4. 数据流（实现后实测）

```text
eventIngestor（market.rule.evaluated ×3 负 diff）
  → sweepObservations（observation runtime）
    → agent.observation.recorded（outcomes=[l1,proposal]）
      ├→ refreshObservationL1 → L1 frame（kind="observation"）→ Pulse Noticed   [Phase 12 回归通过]
      └→ assignmentService.propose → proposal.created 广播
          → /api/product/stream SSE → useSuggestions → Pulse SUGGESTED 卡
              ├→ [确认] → confirm API → resolve 占坑 → activateProposalInternal
              │     （assignment row + assignment.created/activated + trigger 注册）
              │     → proposal.updated(confirmed) → 卡片消失 → Responsibilities 可见
              └→ [不用了] → reject API → resolve → proposal.updated(rejected) → 卡片消失
```

---

## 5. 测试结果

### 5.1 BFF（family-finance）

```
Test Files  25 passed | 3 skipped (28)      # 全量回归
Tests       242 passed | 7 skipped (249)    # 含新增 proposal-emitter.test.ts 7 项
npx tsc --noEmit → ✅
```

- 新增 `proposal-emitter.test.ts`（7 项）：created/updated 恰好一次、reject/expired 广播、risk-1 零广播、duplicate confirm/reject 确定性 409 + 单次广播、无 Attention/无 Delivery、退订。
- `phase13-sim.test.ts`（PHASE13_SIM=1，2 项）：**Real isolated smoke**（隔离临时 DB，2026-09-11 事故后 guard 生效——`FF_DB_PATH` 未设则拒连）：
  - Confirm 链：真实 sweep → proposal.created 广播 + L1 statement（Noticed）→ confirm → Assignment active + created/activated 事件 + 单次 proposal.updated；attention/delivery 恒 0。
  - Reject 链：cooldown（3 天）后新 observation opportunity → 新 proposal → reject → 无 Assignment（既有 Active 只产生 duplicateOf 提示，PM §10）。

### 5.2 Mobile（agent-mobile-app）

```
Test Files  17 passed (17)
Tests       122 passed (122)                # 含新增 proposal/store.test.ts 9 项
pnpm exec tsc --noEmit → ✅
```

### 5.3 E2E（`phase13-e2e.mjs`，9928 静态版 + BFF 19234，15/15 通过）

| 步骤 | 断言 |
|---|---|
| S2 | BFF 注入 proposal → Suggested 卡**不重开页面**经 SSE 出现；卡片四问齐备（我建议/为什么/确认后/撤销出口） |
| S3 | 点卡体 → confirm 请求 0 次，proposal 仍 proposed（查看 ≠ 授权） |
| S4 | 点 [确认] → 卡消失；proposal confirmed；Assignment active（经 `provenance.proposalId` 定位）；authorizationRef = `confirmation:<proposalId>:user` |
| S4b | Memory tab → Responsibilities 可见该 Assignment |
| S5 | 注入第二张 → 点 [不用了] → 卡消失；proposal rejected；未创建 Assignment |
| S6 | 全程 attention 计数不变（19 → 19） |
| S7 | 清理：E2E Assignment 已撤销（revoked 惰性残留，同 P8 smoke 惯例） |

E2E 数据策略（risk-6 落实）：全部经既有 API 注入/断言（Talk 结构化提案入口 + `createdBy="observation:e2e"` 模拟 observation 出处），不依赖真实行情时间窗、不触碰 DB。opencode runtime（127.0.0.1:4096）未运行导致的 `/api/opencode/*` 502 为环境噪音，已按 URL 排除。

### 5.4 部署

- Mobile web 静态版：`expo export --platform web --clear` + `systemctl restart serve-9928`（硬规定 7）。
- BFF：`app.sh restart`（`next dev` 19234）。CORS 无新增端点、无白名单变更。

---

## 6. 实现偏差（均为呈现层微调，无语义偏离）

| # | 偏差 | 原因 |
|---|---|---|
| 1 | `PulseSuggestion` 增加设计 §4.2 字段清单之外的 `effectLabel` | §8.2 卡片要求"确认后会发生什么"效果句（由 `describeProposalEffect(td)` 生成），而视图模型只保留 triggerLabel 无法重建条件语义（`condition.kind === "always"` → "到点提醒" vs 观察 → "命中条件时提醒"）。`describeProposalEffect` 是设计 §11 明文要求的投影函数，effectLabel 是其自然落点 |
| 2 | `PulseSuggestion.expiresAt` 类型为 `number \| null`（设计写 `number`） | BFF `ProposalRow.expiresAt` 可为 null；保持与 attention store 同构的 null 诚实性，不做 0 兜底（避免伪数据） |
| 3 | 409 对账判定按 BFF ProposalError 消息特征（`not proposed` / `resolved concurrently`）而非状态码 | 设计 §11 要求 confirm/reject 封装"已有不动"；封装抛出的 Error 只含 BFF error 文案。判定模式收敛在 `useSuggestions.act` 一处 |
| 4 | E2E S4 定位 Assignment 走 `GET /assignments` + `provenance.proposalId`，而非设计 §2.6 所述的 `resolution.assignmentId` | 见 §7 缺陷报告——resolution 回填实际不生效（既有行为，非本轮引入） |

---

## 7. 发现的既有缺陷（报告，未修改——超出本轮红线）

**`confirm()` 的 resolution 回填是 no-op**（设计 §2.6 步骤 4 与实际行为不符）：

```ts
// assignment-service.ts confirm()
const { transitioned } = proposalRepository.resolve(proposal.id, "confirmed", {});   // ① 占坑：status→confirmed
const assignment = activateProposalInternal(proposal, authorizationRef);
proposalRepository.resolve(proposal.id, "confirmed", { assignmentId, via: "confirmation" }); // ② 回填
```

`proposalRepository.resolve()` 的守卫是 `WHERE id = ? AND status = 'proposed'`——① 之后 status 已是 confirmed，**② 恒空转（changes=0）**，`resolution` 停留在 `{}`，`resolvedAt` 保留 ① 的值。

影响评估：canonical 链路完好（Assignment 行、`assignment.created/activated` 事件、`provenance.proposalId` 回链、authorizationRef 全部正确，E2E/sim 双重验证）；mobile 无任何代码消费 `resolution.assignmentId`（grep 验证）。属于**审计字段缺口**，不是活的 UX bug。

处置：按设计 §12 红线（"assignment-service propose/confirm/reject/cancel/expire 语义只加 emit，不改迁移/守卫"）本轮不动；E2E 改用 `provenance.proposalId` 定位。**建议后续单独修复**：confirm ① 的占坑 resolve 与 ② 合并为一次 resolve（把回填延后到 activate 之后用一次调用完成），或给 repo 增加无守卫的 `patchResolution`。修复后设计 §2.6 步骤 4 的描述即与实现一致。

---

## 8. 文件变更清单

### BFF（family-finance，独立 git）

| 文件 | 变更类型 |
|------|----------|
| `packages/web/lib/product/proposal-emitter.ts` | **新增** |
| `packages/web/lib/product/proposal-emitter.test.ts` | **新增**（7 tests） |
| `packages/web/lib/product/phase13-sim.test.ts` | **新增**（2 tests，PHASE13_SIM=1） |
| `packages/web/lib/product/assignment-service.ts` | 修改：+import proposalEmitter；五个迁移点 emit（迁移语义零改动） |
| `packages/web/app/api/product/stream/route.ts` | 修改：+proposed 重放 + proposalEmitter 订阅（attention 部分原样保留） |

### Mobile（agent-mobile-app）

| 文件 | 变更类型 |
|------|----------|
| `src/services/proposal/store.ts` / `store.test.ts` | **新增**（9 tests） |
| `src/services/proposal/client.ts` | **新增** |
| `src/hooks/useSuggestions.ts` | **新增** |
| `src/services/assignment/client.ts` | 修改：+`ProposalRow` 完整类型、+`fetchProposals`（confirm/reject 封装未动） |
| `src/services/assignment/projection.ts` | 修改：+`observationReasonLabel`、+`describeProposalEffect` |
| `src/app/(tabs)/index.tsx` | 修改：+suggestion GroupItem variant、SUGGESTED 组、Suggestion 卡（Box/Text/StatusPill/Button + theme token）、busy/409 对账 |
| `scripts/e2e/phase13-e2e.mjs` | **新增**（15/15） |

### Documentation

| 文件 | 变更类型 |
|------|----------|
| `docs/knowledge-base/API.md` | 修改：product stream 广播种类、proposal 列表/confirm/reject 用途 |
| `docs/knowledge-base/modules/pulse-stream.md` | 修改：Phase 13 Suggested 组 + 关键文件 + 页面结构 |
| `docs/redesign/FINAL_ARCHITECTURE.md` | 修改：§1 数据通道、§2 Pulse 行、新增 §3c Phase 13 登记 |
| `docs/redesign/PHASE13_FINAL_REPORT.md` | **新增**：本报告 |
| `docs/redesign/PRODUCT_MODEL.md` / `PHASE13_DESIGN.md` | **零改动**（git diff 验证为空） |

---

## 9. Definition of Done 复核（设计 §15）

1. ✅ Observation 产生的 proposal 以 Suggested 卡出现在 Pulse，四问可答（E2E S2 断言文案含"为什么：/确认后：/撤销"）。
2. ✅ Confirm（显式按钮）→ Assignment activated（行 + trigger + created/activated 事件）→ Responsibilities 可见（S4/S4b）；Reject → rejected、无 Assignment 痕迹（S5）。
3. ✅ 除两个显式按钮与既有 Talk 命令外无 activation 路径（S3 点卡体零 confirm 请求；BFF insert 调用面审计不变）。
4. ✅ SSE：新 proposal 不重开 App 进入 Pulse（S2）；confirm/reject 后卡片消失（S4/S5）；断线重连对账（hook onReconnect → snapshot，attention 同构模式）。
5. ✅ Noticed / Needs you / Today / Market 回归全绿（mobile 122 + E2E 同屏）；`[l1, proposal]` 并存呈现正确（sim + E2E）。
6. ✅ 无新 canonical entity、无新 product_event 类型、无 schema 迁移、PRODUCT_MODEL.md 零改动。
7. ✅ BFF vitest 242 passed、mobile vitest 122 passed、双端 tsc、E2E 15/15、sim smoke 2/2。
8. ✅ 知识库三处文档同步 + 本报告。

---

## 10. 后续工作（不在本轮）

| 优先级 | 项 | 说明 |
|--------|-----|------|
| Next | confirm resolution 回填修复 | §7 缺陷；独立小改动（repo patch 或合并 resolve），修后补 §2.6 一致性断言 |
| Next | Observation → Attention 路径 | PHASE12_DESIGN §5 已设计，待实现 |
| Backlog | Suggestion 观察链路 E2E 走真实 sweep 注入 | 当前 E2E 用 API 注入模拟 observation 出处（risk-6 裁决）；真实 sweep 依赖行情时间窗 |
| Backlog | Pulse 卡 duplicateOf 呈现 | 同基金 observation 提案 + Talk 提案并存时的指向提示（risk-3，MVP 接受并存） |

---

> 本报告覆盖 Phase 13 全部实现、测试、偏差与缺陷发现。实现严格按 `PHASE13_DESIGN.md` §14 计划顺序执行；PRODUCT_MODEL 与设计文档零改动。
