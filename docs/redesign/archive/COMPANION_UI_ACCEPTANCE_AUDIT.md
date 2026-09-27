# Companion UI Migration — Final Acceptance Audit

> 审计日期：2026-09-21
> 审计对象：`10aac0a`（branch `feat/companion-ui-migration`）生产 Companion UI 迁移
> 审计依据：`PRODUCTION_UI_MIGRATION_MAPPING.md`（锁定决策 D1–D9 / §40–§42）、`PRODUCT_MODEL.md`、`SHOWCASE2_VISUAL_SPEC.md`、**真实运行时服务 + 真实浏览器交互 + 真实后端状态**
> 审计性质：verification-first 最终验收。审计过程零产品代码改动、零 IA/语义变更、未合并 main、未 amend `10aac0a`。

---

## Executive Decision

> ⚠️ **已被后续 closure 审计取代**：`COMPANION_UI_CLOSURE_AUDIT.md`（2026-09-21）关闭了 Noticed/Knowledge 等缺口并复核 Alert 溯源，结论 **PASS / READY TO MERGE**。本文件保留为首次全量验收记录。

```
Overall: BLOCKED — EXTERNAL RUNTIME VERIFICATION INCOMPLETE
```

- **未发现任何由 `10aac0a` 引入的实现缺陷/回归。**
- 所有可执行的关键路径均以真实运行时（BFF 19234 + OpenCode 4096 + 生产静态站 9928）跑通：Pulse 组合/预算、Talk 全链路（流式/打字机/abort/Layers/会话/agent/model/slash）、Attention 主要路径、Suggested 全链路、离线双方向恢复、Settings、路由与响应式、Showcase2 隔离。
- 剩余验收项因**外部数据/配置不可得**无法取证：Noticed/Market（休市无 L1 数据）、Memory/Knowledge（canonical 数据为空）、question/permission（当前 agent 未配置相应工具、权限全放行）。
- 发现 1 项 **P1（迁移前既有，非本次引入）**：RN Web 的 `Alert` 为空实现，导致 web 站（9928）上 Attention Dismiss / Memory Forget 等确认类交互无效，直接影响两个验收项在 web 环境不成立。
- 结论：**代码层面迁移完成且未引入回归；验收层面 3 组数据依赖项待补证 + 1 项 web 既有缺陷待决策。**

---

## 1. 审计环境与基础设施

| 项 | 状态 | 证据 |
|---|---|---|
| 生产静态站 9928 | ✅ | 停止 showcase2（`showcase2-9928.service`）后由 `serve-9928.service`（node `scripts/serve-static.mjs`，gzip）托管生产 dist；全路由 200 |
| BFF 19234 | ✅ | 审计起时已在运行；离线测试中被停止（000）→ 以 `app.sh start` 恢复（307） |
| OpenCode 4096 | ✅（审计中启动） | 审计起时离线；按 `OPERATIONS.md` 规范以 `OPENCODE_SERVER_PASSWORD`（取自 `family-finance/packages/web/.env.local`）启动 `opencode serve --port 4096 --hostname 127.0.0.1`；`{"healthy":true,"version":"1.18.31"}` |
| 浏览器 | ✅ | headless chromium（playwright-skill 复用），430×900 / 1280×900 |
| Git | ✅ | HEAD=`10aac0a`；工作树仅 2 个早前遗留未跟踪 png；无未提交产品改动 |

---

## 2. 构建 / 静态验证

| 项 | 结果 | 说明 |
|---|---|---|
| `tsc --noEmit` | ✅ clean | |
| `pnpm test` | ✅ 129 passed | vitest |
| `pnpm lint` | ✅ 无新增规则类别 | branch `10aac0a`：**43 errors / 30 warnings**；main `f15c0b1` 基线：**37 errors / 39 warnings**。两侧规则集合完全相同（react-hooks/refs、react-hooks/set-state-in-effect、@typescript-eslint/no-unused-vars、react-hooks/exhaustive-deps、@typescript-eslint/array-type）；errors +6 全部落在存量类别（新组件沿用既有 ref 模式） |
| `expo export --platform web --clear` | ✅ | 注入 `EXPO_PUBLIC_OPENCODE_URL=http://106.13.181.13:19234`；产出 index/talk/memory/me/assignments/attention/[id]/kb/doc |

---

## 3. 路由验证（真实静态服务器）

| 路由 | 结果 | 说明 |
|---|---|---|
| `/` | ✅ | Pulse 渲染；`tablist=0`、`textarea=0` |
| `/talk` | ✅ | 输入框存在；direct 进入 4.2s（冷启动曾观测 7–16s，含全会话扫描） |
| `/assignments` | ✅ | Responsibilities + ACTIVE 行 |
| `/attention/[id]` | ✅ | `attention-detail-main` + summary + evidence |
| `/kb/doc` | ✅ | 骨架渲染（无 `ref` 参数时 Loading…，属参数缺失非缺陷） |
| `/memory` | ✅ | Redirect → `/`（最终 URL=/，渲染 Pulse） |
| `/me` | ✅ | Redirect → `/` |

全路由 **零 pageerror、零 5xx**（离线测试窗口内的 502 为预期）。

---

## 4. 真实 E2E 结果

| 域 | 结果 | 关键证据（真实后端状态） |
|---|---|---|
| Attention · REVIEW | ✅ 7/7 | 经生产 scheduler 任务（`POST /api/scheduler/fund-estimation/run`）产生真实 open attention → 经 SSE 实时进入 Featured → REVIEW → `/attention/[id]`；**浏览 Pulse / 详情前后 state 均 `open`（viewing ≠ mutate）**；Pulse 与详情页均无 Mark handled 入口 |
| Attention · Discuss→Handle | ✅ 7/7 | Discuss → `/talk?sessionId=…&attId=…&autoSendContext=1`；**engage 后 state 仍 `open`（engage ≠ handled）**；Talk 内 Mark handled → **`state=handled`，`handlingRef=handling:<sessionId>`** |
| Attention · Dismiss | ❌ 0/1 | 点击 `attention-dismiss` 后**无任何网络请求**、state 保持 `open`（P1，迁移前既有） |
| Suggested / Proposal | ✅ 15/15 | `phase13-e2e.mjs` 全量通过：注入→SSE 行出现；点卡体（Discuss）后仍 proposed 且 confirm 请求=0；Confirm→proposal confirmed + Assignment active + `authorizationRef=confirmation:<proposalId>`；Reject→无 Assignment；全程无意外 Attention（43→43）；清理 revoke 成功 |
| Noticed | ⛔ 数据阻塞 | L1 `items=0`（休市，BFF 不返回 stale statement）→ 正确行为为不渲染；真实数据链路待开市补证 |
| Running | ✅ | Supporting RUNNING 行（数据源 = 锁定映射指定的 `useProjectEvents().events`，当日活跃项目）；tap → Talk |
| Watching | ✅ | "Watching 1 thing for you" → `/assignments`；assignment `history`（4 条）与 detail/authorization 投影 API 可用 |
| Market L1 | ⛔ 数据阻塞 | 同 L1（funds=0） |
| Memory | ⛔ 数据+平台 | canonical 记忆 0 条，空态渲染正常；Forget 受 P1 阻塞 |
| Knowledge | ⛔ 数据阻塞 | KB 检索 0 条；sheet 与搜索入口渲染正常 |
| Settings | ✅ 4/4 | 打开；Responsibilities/Preferences/What I remember/Knowledge 齐备；Advanced→BFF 地址输入；→ `/assignments` 导航正常 |

---

## 5. Talk Runtime（本次审计核心，前报告的最大缺口）

| 项 | 结果 | 证据 |
|---|---|---|
| Direct Talk | ✅ | Pulse entry → `/talk`，textarea 4.2s |
| Contextual Talk | ✅ | `projectPath` 无会话 → 空态 + "New session" → 2s 进入聊天；attention 上下文参数正确透传 |
| Resume / Create | ✅ | sessionId 精确 resume；New session 后端会话数 4→5（真实创建） |
| Layers | ✅ | picker 打开；切换会话后 SSE 重订阅（`ses_f3c71d…` → `ses_f3c68c…`）且会话内容变化 |
| Streaming | ✅ | 真实 `POST /api/opencode/rest/session/{id}/prompt_async`；回复真实落库（实测单条 9083 / 10704 / 8088 字符） |
| Typewriter | ✅ | 500 采样 / 437 次渐进增长；中位 delta ≈ **30 chars/200ms（≈150 chars/s 渐显）**，非整块弹出；实现层 `revealChars` + `extraData={revealChars}` + `TYPING_CHARS_PER_TICK` 完好 |
| Chronological | ✅ | 两条消息顺序审计：`AUDIT-OK-1` < `user-2` < `AUDIT-OK-2` |
| Pagination | ⚠️ 未触发 | 现有会话历史量不足以触发（数据条件不满足，非缺陷） |
| Abort | ✅ | 42ms 捕获 Stop → `POST /session/{id}/abort` → 文本停止增长（delta=0） |
| Permission | ⛔ 配置限制 | 当前 agent `bash/edit=allow`，无法确定性触发权限请求 |
| Question | ⛔ 配置限制 | 模型自述 "I don't have a `question` tool available"（agent 未配置该工具） |
| Slash commands | ✅ 6/6 | `/assign fund <code> below <v>`→proposed（market 需 confirm）；`/confirm`→Assignment active；`/revoke`→revoked；`/assign remind … at HH:MM`→低风险**直接激活**；`/assign fund … above-target`→被在效同责监控去重（正确语义，提示先 revoke）；**命令未发给 Agent**（会话消息数不变、无 slash 文本泄漏） |
| Agent / model | ✅ | agent pill 循环切换（build→design）；model 选择器展示真实模型（deepseek-v4-flash 等，`listProviders`） |
| Session-lost | ✅ | 无效 sessionId → 回落项目空态 + New session，无死路 |

---

## 6. UX 硬约束核对（§42）

| 约束 | 结果 |
|---|---|
| NO bottom tab bar | ✅ `tablist=0`（DOM 实证） |
| NO Pulse TextInput / Send | ✅ `textarea=0`、`input=0`；entry 为 Pressable 胶囊 |
| NO WATCHING section / ON MY PLATE / Defer | ✅ 均无（WATCHING 仅 Hero 一行） |
| Featured ≤1 / Supporting ≤4 / Noticed ≤5 | ✅ 未超（实测 Supporting 2 行 + `More projects (9)` 溢出；Noticed 0） |
| NO generic AI bubble wall | ✅ AI 纯文本、user 淡紫气泡、error 语义 pill |
| NO fake Voice | ✅ Mic 已移除 |
| NO Showcase2 runtime dependency | ✅ 仅注释引用；无 mock runtime；无 UI-only 状态（deferred / hidden-for-later / locally-* 全无） |
| 响应式 | ✅ 430 / 1280 无横向溢出，控制件无裁切，sheet 可达 |
| 视觉（vs SHOWCASE2_VISUAL_SPEC） | ✅ 近黑底 + 克制紫罗兰、orb 唯一发光元素、层级靠表面色与细边框；（P2 项见下） |
| Offline / Recovery | ✅ opencode 停 → 伴侣级离线卡（"AI is offline / The agent runtime is currently unavailable"）+ Retry → 重启 → Retry 恢复（5/5）；BFF 停 → `● OFFLINE` + "I'm having trouble reaching my runtime."（无裸错误）→ 重启恢复（6/6） |

---

## 7. 缺陷清单

### P0
无。

### P1 — Web 版确认类交互整体失效（**迁移前既有，非 `10aac0a` 引入**）

- **复现**：`/attention/<open id>` → 点 Dismiss
- **期望**：弹确认 → `POST /api/product/attention/{id}/dismiss` → `state=dismissed`
- **实际**：无弹窗、**零网络请求**、state 保持 `open`（实测）
- **根因**：`doDismiss` 使用 `Alert.alert`（`src/app/attention/[id].tsx`），而 RN Web 的 Alert 为空实现（`static alert() {}`）；全 app 17 处使用
- **引入判定**：**否**。`attention/[id].tsx` 未被 `10aac0a` 触碰；迁移前 Memory tab（`(tabs)/memory.tsx:62`）同样以 Alert 做 Forget 确认
- **影响面**：生产 **web 站（9928）** 的验收项「Dismiss → DISMISSED」「Forget works」不成立；slash 命令反馈文本不可见；原生 APK 不受影响
- **同类但未验证**：Memory Forget（新 sheet 忠实移植了既有 Alert 模式）

### P2（cosmetic / 设计取舍 / 环境）

1. 离线时 `ConversationEntry` 发送键仍亮紫，与灰化 orb 形成双焦点（新组件无 offline 变体）
2. Talk header 副标题对未命名会话显示裸 ISO 时间戳（`sessionLabel` 未被迁移改动；来源为运行时默认标题）
3. attention 上下文卡使用暖色警示图标，在紫罗兰克制画面中引入第二强调色（语义色，可接受）
4. 无数据时 Pulse 中部大片空白（composition 数据驱动，符合设计但观感偏空）
5. question / permission 流程在当前 agent 配置下不可触发
6. `scripts/e2e/pulse-e2e.mjs` 的 15s 冷启动等待存在竞态（首次运行 textarea=false，二次通过）——测试脚本时序问题，非产品缺陷

---

## 8. 待补证清单（开市 / 有数据环境）

| # | 项 | 前置条件 | 方式 |
|---|---|---|---|
| 1 | Noticed 只读详情 + Discuss + 无 L1 lifecycle 变更 | 开市 / BFF 有 L1 observation | 打开 Pulse → Noticed 行 → 详情 sheet/`noticed-detail`；Discuss → Talk；API 校验无 Attention/Assignment 产生 |
| 2 | Market L1 行 + FundSheet + 无 Dismiss/Confirm/Handle | 开市 L1 有 market statement | Pulse → MARKET 行 → FundSheet |
| 3 | Memory Forget（真实数据） | canonical 有记忆 | Settings → What I remember → Forget（**需先解决 P1 或改用原生端**） |
| 4 | Knowledge source chip → preview → OPEN → ASK ABOUT THIS | KB vault 有文档 | Talk 内 source chip 全链路 |
| 5 | question / permission 弹窗 | agent 配置 question 工具 / 权限非全放行 | 真实触发后核对 sheet 与回填 |

---

## 9. 审计后环境状态

- 9928：生产静态应用（`serve-9928.service` active）；showcase2 保持 inactive（按审计指令 9928 归生产）
- BFF 19234：307（app.sh 拉起）；OpenCode 4096：healthy
- 数据清理：目标净值全部复原（011609=1.2995、162412=0.6441，其余归 0）；3 条审计遗留 proposal 已 reject（proposed=0）；审计会话已删除（仅剩原有 `ses_f3d69493…`）；active assignment 回到原有 1 条；审计产生的 attention 记录为历史 expired/handled/dismissed（与正常运行语义一致）

---

## 10. Merge Recommendation

```
BLOCKED — EXTERNAL RUNTIME VERIFICATION INCOMPLETE
```

**没有代码层面的合并阻碍**（零迁移引入缺陷、tsc/tests/export 全绿、lint 无新类别）。阻塞仅在于 §8 的数据依赖项无法在当前环境取证，以及 P1 在 web 站的既有影响需产品决策。建议路径：

1. 开市时段复跑 §8 的 1–4 项（预计 30 分钟内可完成）；
2. 决策 P1：接受（原生可用）或在 web 端引入确认对话框 polyfill（独立小改动，不属本次迁移范围）；
3. 完成后再合并 main。
