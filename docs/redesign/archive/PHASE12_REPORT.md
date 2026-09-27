# PHASE12_REPORT.md — Observation → L1 Presentation 最终报告

> 完成日期：2026-09-11
> 状态：**已实现并通过全部验证**

---

## 1. 目标

Phase 12 将 Observation 的 judgment 结果接入用户产品体验：

```text
market.rule.evaluated（负 diff）
  → observation sweep（repeated-decline pattern）
    → L1 statement（"Noticed" informational）
      → Pulse "Noticed" section（mobile）
```

严格约束：不修改 `PRODUCT_MODEL.md`、不新增 Attention/LLM/delivery 路径、不改调度器。

---

## 2. 实现清单

| # | 任务 | 文件 | 状态 |
|---|------|------|------|
| 1 | G7：decline evidence 改用 `market.rule.evaluated` | `packages/web/lib/observation/rules.ts` | ✅ |
| 2 | Observation payload 扩展 `outcomes[]` | `packages/web/lib/observation/observation-service.ts` | ✅ |
| 3 | `L1Statement` 类型扩展（`kind="observation"` + `sourceKind`） | `packages/web/lib/product/l1-rules.ts`, `agent-mobile-app/src/services/l1.ts` | ✅ |
| 4 | `L1Source` 扩展 `relatedEvents` | `packages/web/lib/product/l1-rules.ts` | ✅ |
| 5 | Source-owned L1 frame composition | `packages/web/lib/product/l1-rules.ts` | ✅ |
| 6 | Market source 迁移到 source-owned | `packages/web/lib/product/l1-market-source.ts` | ✅ |
| 7 | Observation L1 presentation authority | `packages/web/lib/observation/observation-l1.ts` | ✅ |
| 8 | Observation sweep → L1 refresh 集成 | `packages/web/lib/observation/observation-runtime.ts` | ✅ |
| 9 | L1 validity（`expiresAt` = `l1ValidityMs`） | `packages/web/lib/observation/observation-l1.ts` | ✅ |
| 10 | Supersede 逻辑（新 statement 覆盖旧） | `mergeL1Sources()` in `l1-rules.ts` | ✅ |
| 11 | Pulse "Noticed" section | `agent-mobile-app/src/app/(tabs)/index.tsx` | ✅ |
| 12 | `useL1` hook 增加 `noticed` 投影 | `agent-mobile-app/src/hooks/useL1.ts` | ✅ |
| 13 | Phase 12 tests | `packages/web/lib/observation/observation.test.ts` | ✅ |

---

## 3. 架构变更

### 3.1 Source-owned L1 Frame（关键设计变更）

Phase 10 的 `setL1Statements()` 是整帧替换。Phase 12 引入 source 分片，支持多来源并存：

```typescript
// 每个 source 独立更新自己的分片
setL1SourceStatements("l1.market.estimate", marketStatements);
setL1SourceStatements("l1.observation.<ruleId>", observationStatements);

// 内部自动合并所有 sources → dedup → filter expired → 广播
// 对外 snapshot/SSE 协议不变
```

向后兼容：`setL1Statements()` 转发到 `setL1SourceStatements("legacy", items)`。

### 3.2 Observation Rule 变更

```typescript
// Before
eventTypes: ["market.rule.matched"]
allowedOutcomes: ["proposal"]

// After
eventTypes: ["market.rule.evaluated"]  // G7：matched 只在 diff>0 发出
allowedOutcomes: ["proposal", "l1"]
l1ValidityMs: cooldownMs  // 默认 3 天
```

### 3.3 Observation Payload

```typescript
// Before
payload: { ruleId, subject, evidenceEventIds, judgmentSummary, warranted, outcome: "proposal" }

// After
payload: {
  ruleId, subject, evidenceEventIds, judgmentSummary, warranted,
  outcomes: ["l1", "proposal"],     // 新：完整 outcome 列表
  outcome: "proposal"                // 保留：backward-compat（proposal 优先级 > l1）
}
```

### 3.4 L1Statement 扩展

```typescript
type L1Kind = "market-estimate" | "observation";  // 新增 observation
type L1SourceKind = "deterministic" | "observation";  // 新增

interface L1Statement {
  sourceKind?: L1SourceKind;  // 新增
  // ...
}
```

---

## 4. 数据流

```
fund-estimation scheduler
  → market.rule.evaluated event（含 diff, tradeDate）
    → observation sweep
      → detectRepeatedDecline（3 个负 diff 评估点）
        → agent.observation.recorded event（outcomes: ["l1", "proposal"]）
          → observation-l1.ts: refreshObservationL1(ruleId)
            → l1RulesFor("observation") → renderObservationRepeatedDecline()
              → L1Statement（kind="observation", sourceKind="observation", expiresAt）
                → setL1SourceStatements("l1.observation.<ruleId>", [...])
                  → mergeL1Sources() → l1Emitter.emit() → SSE → mobile
                    → Pulse "Noticed" section
```

---

## 5. 测试结果

### 5.1 BFF（family-finance）

```
Test Files  23 passed | 3 skipped (26)
Tests       228 passed | 5 skipped (233)
```

### 5.2 Mobile（agent-mobile-app）

```
Test Files  16 passed (16)
Tests       113 passed (113)
```

### 5.3 TypeScript

```
BFF:     npx tsc --noEmit → ✅ 无错误
Mobile:  pnpm exec tsc --noEmit → ✅ 无错误
```

### 5.4 Phase 12 新增测试

| 测试 | 验证点 |
|------|--------|
| sweep → observation + proposal + L1 statement | outcomes 含 l1 + proposal，proposal backward-compat 正确 |
| observation → L1 statement with sourceKind='observation' | observation event payload 含 l1 outcomes |
| observation rule with only proposal outcome → no L1 | 无 l1 outcome 时不产生 L1 statement |
| l1ValidityMs defaults to cooldownMs | 默认值 = cooldownMs（3 天） |

### 5.5 回归测试

Phase 11 的 28 个 observation 测试全部通过（其中 14 个需更新 event type 从 `market.rule.matched` → `market.rule.evaluated`），无 regression。

---

## 6. 实现偏差

| # | 偏差 | 原因 |
|---|------|------|
| 1 | `observation-l1.ts` 不再显式调用 `l1Emitter.emit()` | `setL1SourceStatements()` 内部已自动合并 + 广播，显式 emit 导致重复 |
| 2 | backward-compat `outcome` = `"proposal"`（当 outcomes 含 proposal 时） | proposal 优先级 > l1，保持旧 consumer 兼容 |
| 3 | `eventTypes` 从 `market.rule.matched` 改为 `market.rule.evaluated` | 修复 G7：matched 只在 diff>0 发出，decline 无法触发 |
| 4 | 测试中 "wrong event type" 用例改用 `market.rule.matched` | 因为 `market.rule.evaluated` 现在是正确类型 |

---

## 7. 文件变更清单

### BFF（family-finance/packages/web）

| 文件 | 变更类型 |
|------|----------|
| `lib/observation/rules.ts` | 修改：eventTypes → evaluated, allowedOutcomes += l1, +l1ValidityMs |
| `lib/observation/types.ts` | 修改：+l1ValidityMs? |
| `lib/observation/observation-service.ts` | 修改：decideObservationOutcomes[], payload outcomes[], refreshObservationL1() |
| `lib/observation/observation-runtime.ts` | 修改：+refreshAllObservationL1() |
| `lib/observation/observation-l1.ts` | **新增**：refreshObservationL1(), refreshAllObservationL1() |
| `lib/observation/observation.test.ts` | 修改：更新 event type, +4 Phase 12 tests |
| `lib/product/l1-rules.ts` | 修改：+L1Kind="observation", +L1SourceKind, +sourceKind, +setL1SourceStatements(), +mergeL1Sources(), +observation L1 rule |
| `lib/product/l1-market-source.ts` | 修改：迁移到 setL1SourceStatements() |

### Mobile（agent-mobile-app/src）

| 文件 | 变更类型 |
|------|----------|
| `services/l1.ts` | 修改：+L1Kind="observation", +L1Statement.sourceKind |
| `services/l1.test.ts` | 修改：+sourceKind in test fixture |
| `hooks/useL1.ts` | 修改：+noticed projection |
| `app/(tabs)/index.tsx` | 修改：+Noticed group rendering, fix L1Statement import |

### Documentation

| 文件 | 变更类型 |
|------|----------|
| `docs/redesign/PHASE12_DESIGN.md` | 修改：+§25 Implementation Status |
| `docs/redesign/PHASE12_REPORT.md` | **新增**：本报告 |
| `docs/redesign/BACKLOG.md` | 修改：Agent Observation 条目更新 |

---

## 8. 后续工作（Phase 12+）

| 优先级 | 项 | 说明 |
|--------|-----|------|
| Next | Observation → Attention 路径 | 设计已完成（PHASE12_DESIGN §5），待实现 |
| Next | Pulse L2 Proposal suggestion | 设计已完成（PHASE12_DESIGN §6），待实现 |
| Future | coding/email/user-profiling observation | 不同 pattern 的 observation rules |
| Future | LLM observation | 满足五个前置条件后再评估 |

---

> 本报告由 opencode 自动生成，覆盖 Phase 12 全部实现、测试、偏差与文件变更。
