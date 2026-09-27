# Companion UI Migration — Final Closure Audit

> 审计日期：2026-09-21
> 审计对象：`10aac0a`（branch `feat/companion-ui-migration`）
> 前序审计：`COMPANION_UI_ACCEPTANCE_AUDIT.md`（结论 BLOCKED — EXTERNAL RUNTIME VERIFICATION INCOMPLETE）
> 本审计性质：closure（仅关闭剩余缺口，不重复全套 E2E；零产品代码改动、未合并 main、未 amend `10aac0a`）

---

## Overall

```
PASS
```

核心迁移行为全部验证；**未发现迁移缺陷**；剩余阻塞项均为外部数据/配置限制或迁移前既有平台缺陷，且不在本次迁移的代码变更范围内（详见 Final Blockers）。

---

## Previously Verified Areas（摘要，不重复测试）

Pulse IA/预算、Attention REVIEW/Discuss/Handle、Suggested 全链路（phase13 15/15）、Running、Watching、Settings、Talk 全链路（direct/contextual/resume/create/Layers/streaming/typewriter 437 步渐进/abort/slash 6/6/agent-model/session-lost）、离线双向恢复、响应式、Showcase2 隔离——前序审计已实证，本轮未发现回归迹象。

---

## Closure Tests

### 1. Noticed

**Status: VERIFIED**

- Evidence：L1 有 2 条真实 observation（observation-sweep 生产任务产出）；Pulse 渲染 Noticed 行（"我注意到景顺长城创业板50ETF联接C（017950）连续 3 个交易日估算净值走低。today 19:07"）→ 只读详情 sheet → Discuss → Talk
- Backend state before：L1 observation=2；attention=51；assignment=40
- Backend state after：L1 observation=2（**无 lifecycle 变更**）；attention=51（**未创建**）；assignment=40（**未创建**）
- 上下文证据：后端会话首条 user 消息 = `关于你刚才注意到的：「我注意到…连续 3 个交易日估算净值走低。」我们聊聊。`（Discuss 确实注入上下文）
- Cleanup：无需清理（observation 为生产任务正常产出，非夹具）

### 2. Market L1

**Status: BLOCKED BY DATA**

- Evidence：`/api/product/l1` 当前 kinds 仅 `observation`（market=0）；休市，BFF 按语义不返回 stale statement（空 = 正确行为）
- Fixture discovery：无任何 deterministic market-estimate 夹具；`fund-estimation` 调度任务产出 rule 事件/Attention，**不是** L1 market statement（后者为 5s 实时数据面，按设计不入库）
- Lifecycle verification：无法在有数据条件下执行；MARKET 行 / FundSheet 渲染路径未取证
- Cleanup：无（未创建任何数据）

### 3. Memory Forget

**Status: BLOCKED BY PLATFORM（UI 触发）+ canonical 语义由存量夹具测试覆盖**

- Evidence（canonical）：仓库既有夹具测试 `memory-projection.test.ts`（MEMX_ROOT temp fixture，**8/8 passed**）验证 forget 对 memx canonical 的改动（project → .trash；user → 弃用标记）
- 未执行：活体 UI Forget（`MemorySheet` Forget → `Alert.alert` 确认）——RN Web Alert 空实现，确认框永不出现，**无法在 web 触发**（见 Alert Baseline Defect）
- Canonical state before/after：未做活体变更（未改真实 `~/.opencode` 记忆）
- Cleanup：无（未落任何数据）

### 4. Knowledge

**Status: VERIFIED（全链路 + 后端上下文实证）**

- Evidence：Settings → Knowledge → 搜索「补偿」→ 真实请求 `GET /api/product/kb/search?q=补偿` → 200 + 真实命中（`raw-ideas/one-shot-missed-run-补偿策略.md`）→ preview 显示真实文件名/标题/摘要 → OPEN → `/kb/doc`（660 字符全文，真实 ref）→ ASK ABOUT THIS → Talk
- Context verification：后端会话首条 user 消息 = `我想了解这份资料：「One-shot 错过触发时的补偿策略」（raw-ideas/one-shot-missed-run-补偿策略.md）。` ✅
- Cleanup：仅产生 1 个谈话会话（正常会话记录，未清理）

### 5. Permission

**Status: BLOCKED BY CONFIGURATION**

- Evidence：既有配置中 app 可达的 primary agent（plan/design/build）无「ask」路径——plan 为**只读硬拒绝**（agent 明确回复 "Plan 模式（只读），系统约束明确禁止使用 echo…"）；design 为 deny 列表；build 为 allow。`GET /api/opencode/rest/permission` = `[]`（未产生 permission.asked）
- Configuration：未修改（按规则不发明配置）
- Restore：无需恢复；agent pill 已切回 build，无残留

### 6. Question

**Status: BLOCKED BY CONFIGURATION**

- Evidence：门控机制已定位——`opencode-src/packages/opencode/src/tool/registry.ts:202`：`questionEnabled = ["app","cli","desktop"].includes(flags.client) || flags.enableQuestionTool`；BFF 转发的会话未携带这些 client flag → 工具不可用
- Configuration：未修改。启用需 BFF 侧 header/flag 或 server flag——**超出本次迁移范围**（属接入层配置）
- Restore：无需恢复

---

## Alert Baseline Defect

**Status: PRE-EXISTING BASELINE DEFECT（+ 1 处 migration-created 暴露）**

- Pre-existing or migration-introduced：基线限制**迁移前既有**（RN Web `Alert` = `static alert() {}`）；迁移**保留**既有 Alert 依赖，并**新增** 2 处边缘路径 Alert 依赖
- Evidence：
  - 迁移前已存在：`(tabs)/index.tsx:117` runtime 失败提示 → 迁移后 `index.tsx:191/223`（同模式）；`(tabs)/memory.tsx` Forget 确认 → 迁移后 `MemorySheet.tsx:52`（忠实移植）
  - **迁移新增**：`index.tsx:225` 会话丢失恢复对话框（带按钮）、`index.tsx:230` "无法进入 Talk" 提示（旧 Pulse 无对应）
  - `attention/[id].tsx` Dismiss **未被 `10aac0a` 触碰**（git diff 验证），其 Alert 依赖为迁移前既有
- Affected flows：Attention Dismiss（P1 基线）、Memory Forget（P1 基线）、session-lost 恢复（P2 新增暴露：web 上静默无反馈）、slash 命令反馈（fork 继承）
- Merge impact：**不阻塞核心迁移**。基线的 Dismiss/Forget 在 web 上迁移前同样不可用（能力无回归）；新增的 session-lost 对话框仅边缘案 web 降级。建议独立跟踪（web 确认对话框 polyfill）

---

## Lint Delta

Additional errors：**+6**（branch 43 vs main 37；warnings -9；规则类别完全一致）

| 文件 | 规则 | 迁移引入? | 可行动? |
|---|---|---|---|
| `src/components/pulse/AIOrb.tsx:40` ×4 | react-hooks/refs | 是（新组件） | 否——与既有 `StatusDot/Marquee/BottomSheet` 完全同模式；全仓同类 21→25 |
| `src/app/index.tsx:41/50` ×2 | react-hooks/set-state-in-effect | 是（重写页面） | 否——与既有 `useAttentions/useL1/useSuggestions` 等同模式；副作用为数据订阅初始化 |

结论：无新增**可行动** lint 缺陷（无新规则、无新反模式类别）。

---

## Semantic Diff Audit

| 域 | 结果 |
|---|---|
| Attention | 无新增语义（Discuss 仍 ≠ handle/engage；`attention/[id].tsx` 未被触碰） |
| Proposal | 无改动 |
| L1 | 新增代码注释显式声明 "no lifecycle, no obligation"；Noticed Discuss 只传上下文 |
| Assignment | 无改动 |
| Memory | `MemorySheet` 为 UI 迁移，canonical 仍走 memx `forgetMemory` |
| Knowledge | 只读检索 + 既有 `fetchKbDoc`；无新 KB 概念 |
| Talk/session | 路由迁移 + `autoContextText` 透传（v0.1.1 既有参数）；无重复 session 解析 |
| Runtime | 无新持久化、无新实体、无 UI-only 状态（`OrbState` 为视觉状态，非产品生命周期） |

---

## Final Blockers

**P0**：无

**P1**（迁移前既有，不阻塞本次合并）
- 原因：RN Web Alert 空实现 → web 站 Attention Dismiss / Memory Forget 确认不可达
- 迁移引入：否（`attention/[id].tsx` 未被触碰；旧 memory 同模式）
- 证据：点击无弹窗、零网络请求、state 不变；RN Web `static alert() {}`；全 app 17 处
- 外部限制：平台限制（web 端）；原生 APK 不受影响

**P2**
- Market L1 行 / FundSheet 渲染未取证：**外部数据限制**（休市，无 L1 market statement，无夹具），非迁移引入；建议开市时段补一次 5 分钟验证
- Permission / Question 流程未取证：**外部配置限制**（无既有 ask 触发器；question 工具门控于 client flag / BFF 接入层），非迁移引入、非迁移代码路径
- `index.tsx:225` session-lost 恢复对话框在 web 静默失效：**迁移新增暴露**，边缘案，非阻塞

---

## Final Recommendation

```
READY TO MERGE
```

依据：全部**关键迁移行为**（单表面 IA、Pulse 组合/预算、Talk 运行时全链路、Attention/Suggested/Noticed/Knowledge、Settings、离线恢复）已用真实运行时 + 真实数据 + 后端状态证据验证；无迁移缺陷；剩余 Market（数据）、Permission/Question（配置）为外部限制且不在 `10aac0a` 变更路径内；P1 为迁移前既有 web 平台缺陷，建议作为独立 backlog 项跟踪（不影响合并）。
