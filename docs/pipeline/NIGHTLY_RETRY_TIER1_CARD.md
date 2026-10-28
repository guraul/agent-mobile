# 施工卡 · 夜间失败任务自动补跑（Tier 1 首个场景）

> 状态：待拍板（本卡不含代码）· 2026-10-28 · 依据：homebase `lib/scheduler/{engine,store,types}.ts`、`handlers/*`、`lib/delivery/*`、`lib/product/agent-activity.ts`；agent-mobile `src/hooks/useL1.ts`
> 结论先行：**补跑循环很小，真正的成本是「哪些任务允许补跑」；按当前 seed，夜间没有任何定时任务。**

## 1. 现状（读码确认，非推测）

| 项 | 事实 |
|---|---|
| 失败怎么记 | 只有抛异常才落 `scheduler_job_runs.status='error'`（`engine.ts:56-59`）；枚举里**没有 `failed`**，只有 `running/success/error`（`types.ts:1`） |
| 有没有人读 | **没有**。`getJobRuns()` 只被诊断接口用（`store.ts:123-140` ← `app/api/scheduler/[name]/runs/route.ts:18`）；补跑现状 = 人工 `POST /api/scheduler/:name/run`（`run/route.ts:17`） |
| 软失败 | handler 返回 `{ok:false}` 时引擎**仍写 success**（`engine.ts:54-55`）；现存 3 处（`market-brief.ts:19`、`ttskill-login-guard.ts:188,206`）→ 这类失败连行都查不到 |
| 夜间有哪些 job | **一个都没有**：seed 只有日内 brief（9:35/11:30/13:05/15:05）、14:50 `fund-estimation`、10-20 点 `ttskill-login-guard`（`store.ts:156-271`），其余是每分钟 sweep——它们的下一次 tick 天然就是重试 |
| 已成熟的重试机制 | 只在投递层：`delivery_jobs` 有 `attempt/max_attempts/next_attempt_at`（`migrations.ts:258-269`、`repository.ts:91-120`）；`scheduler_job_runs` 无这些列（`database.ts:109-117`） |

## 2. 规则

| 项 | 决定 |
|---|---|
| 触发 | 新 seed job `nightly-retry`，cron `0 6 * * *`，扫**前一日 00:00–24:00** 的 error 行 |
| 白名单 | **只有 `market-brief-*`**：slot 来自 `params`、handler 接受注入 `params.now`（`market-brief.ts:22-23`）、幂等窗 `brief:<tradeDate>:<slot>` + `INSERT OR IGNORE`（`:13,45` ← `repository.ts:49-66`）。**排除**：`fund-estimation`（内部 `Date.now()`，`:43`，实时估值不可注入）、`ttskill-login-guard`（重跑=再发二维码）、全部每分钟 sweep、`ttskill-login-renewal` |
| 补跑参数 | 必须 `{...job.params, now: failedRun.startedAt}` —— 用**原始窗口**，不是 06:00 |
| 失败原因过滤 | error 文本命中 `401/403/unauthorized/token/credential/登录态` → 不补跑（凭据类重跑必再失败，交回 guard 那条路） |
| 频次 | 同一条 error 行**只补一次**；新增 `scheduler_job_retries(run_id UNIQUE)` 记账，也用于「每天最多一次」判定 |
| 不可补跑 | 白名单外一切 job：只写日志，不动 |

## 3. 不变量

- **不重复投递**：补跑仍走 `enqueueDelivery`，dedup_key = `(kind,ref,channel,window)`，同窗重跑 `created=false`；原 run 已投递成功再补也不产生第二行。
- **不重复通知**：handler 不直连企微（`fund-estimation.ts:11-14` 的解耦约定），补跑报告本身也只 enqueue 一次（window `nightly-retry:<date>`）。
- **失败即退回现状**：补跑只做 1 次，再失败不连锁；写回 error，报告里明说「未恢复，留给你」。

## 4. 「报」落在哪

一句英文：`2 jobs failed last night; the 06:00 retry brought both back.`（0 失败不报，避免每日噪声）

**建议落 Pulse（L1 Noticed），不落 TodayDigest。** 理由：TodayDigest 的计数单位是 assignment 执行次数、数据只取 `source='assignment-runtime' AND type='assignment.trigger.fired'`（`agent-activity.ts:106,121`）；scheduler 运行不在其中，塞进去要扩 source 白名单（PM §14 授权）且「checked N things」会把分钟级 sweep 也数进来。L1 天生就是「说一条事实、无 lifecycle」（`l1-rules.ts:8-11`）。
**代价**：新增 L1 kind + 一条 rule；客户端 Noticed 目前只收 `kind === "observation"`（`useL1.ts:76`），要放开。

## 5. 改动面 / 工作量 / 最可能错在哪

| # | 文件 | 动作 |
|---|---|---|
| 1 | `lib/scheduler/handlers/nightly-retry.ts` | 新增：选行 → 白名单 → 鉴权过滤 → runNow + 账本 |
| 2 | `lib/scheduler/store.ts` | seed job；`scheduler_job_retries` 表 |
| 3 | `lib/scheduler/engine.ts:54` | **前置修复**：`finishJobRun` 尊重 `result.ok`，否则软失败永远进不了队列 |
| 4 | `lib/product/l1-rules.ts` + `useL1.ts:76` | 新 kind + 渲染放开 |

工作量：**中**（≈2 人日；重试逻辑小，贵在「可补跑」判定 + 软失败签名 + 一条 L1）。
风险排序：① 漏传 `now` → 06:00 重跑算成当日窗口，投出「盘中速览 06:00」+ 错误 tradeDate；② 软失败记为 success（`engine.ts:54`）→ 白名单任务永远不进队列，先修引擎；③ 鉴权过滤靠文本启发式，文案一变就漏（宁可漏补，不可重试鉴权）；④ 「0 失败也报」= 每天多一条 Pulse 噪声。
