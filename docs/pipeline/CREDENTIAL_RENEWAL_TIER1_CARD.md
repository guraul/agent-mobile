# 施工卡 · 登录凭据到期「先做后报」判定（Tier 1 候选 → **判定不成立，建议换场景**）

> 状态：待拍板（本卡不含代码）· 2026-10-28
> 依据：`agent-mobile#91`（已关闭，2026-10-16 合成 E2E 验收）、homebase `lib/scheduler/handlers/ttskill-login-{guard,attention,renewal}.ts`、`lib/product/{agent-activity,l1-rules}.ts`、PM §14、`VISION_REVIEW.md` §5.2

## 0. 结论

**不算 Tier 1。** 她能做的最后一公里是「把二维码发出去」；登录完成必须用户拿手机扫。归「先准备，你只剩一步」。建议不做本场景。

## 1. 现状（读码 + 生产验收记录）

| 项 | 事实 |
|---|---|
| 检测 | `ttskill-login-guard`，cron `0 10,12,15,18,20 * * *`，读 `ttskill status --json` 的 `expires_at/daysLeft`（`ttskill-login-guard.ts:192`） |
| 触发 | `daysLeft <= 1` 或已过期；否则直接返回 → **一个周期约 30 天**（续期成功 +30 天），不是每天 |
| 到期前动作 | **已经自动**发 5 次二维码到企微，每轮监控 10 分钟（`runRenewScript`）；用户无需点任何东西 |
| 扫到 | 脚本本地回填 token → `closeLoginExpiryAttentions()` 关掉该凭据 open 卡（artifact = 新 token） |
| 20:10 未扫 | 建 Attention（`subject_kind=credential` / `creation_reason_kind=system-credential-expiry` / `expires_at=NULL`）+ 企微收口消息 |
| 谁处理卡 | 仅三条：后续某轮扫成功自动 handle / 用户点「重发二维码」/ 用户 Dismiss。`expires_at=NULL` ⇒ `attention-expiry` 永不收口，**没人管就长期挂着** |
| 片2 重发 | `POST /attention/:id/renew` → 落 `ttskill_login_renewals` → **立即关旧卡** → 发码 → 每分钟 sweep 在 +11 分钟判定：扫到=不建卡，未扫=`关旧建新`（任一时刻 ≤1 张 open） |
| App 侧 | `/attention/[id]`：credential 只显示 Resend QR code，隐藏 Open Talk（`services/attention/store.ts:104-119`） |
| 已知瑕疵 | 卡片文案在**建卡时冻结**（"将于明天到期"），过期后不再更新；旧二维码在企微里不会被撤回（会话 ~600s 自然失效，但历史图会诱使扫错） |

## 2. 判定：不算「她做完了」

Tier 1 的门槛是**用户零动作**（VISION_REVIEW §5.2：低风险 + 可逆 + 已学到偏好，事后简报）。这里缺的不是授权，是**物理不可能**：`ttskill login` 的设计就是浏览器侧生成二维码、手机 App 侧批准，没有无人值守路径。
所以「自动发码」= 准备动作，不是完成动作。把它叫 Tier 1 会让 Pulse 说「已续期」而实际没续——比不报更坏。

## 3. 若仍要做：最小可行版（不建议，仅备选）

1. 只在**进入窗口首轮（10:00）发码后**写一条活动，文案一句：「天天基金登录态 11-11 到期，二维码已发企微，扫一下就好」。同一 `expiresAt` 窗口**只报一次**（不加这条，30 天一次但一天 5 轮会变 5 条）。
2. **不建 Attention**；现有 20:10 建卡逻辑原样保留，作为唯一失败升级路径（失败回退 = 现状，零新增兜底）。
3. 旧码处理：Pulse 不渲染二维码，只指向企微，文案带确认码 + 「旧图作废」。
4. 扫码成功后再写一条「已续期至 X」收尾。
5. 风险：周期 30 天，一年只发生 12 次 → **样本太稀，撑不起一条产品能力**。

## 4. 替代场景（真·零补步，可逆、无外部副作用、每天发生）

- **A. 简报数据源自愈**：`market-brief` / 14:50 回执取值源超时 → 自动换备用源或延后重取，简报照发，Pulse 一句「11:30 简报主源超时，已用备用源补齐」。每天 4 个时点，纯内部读，可重跑。量级：小。
- **B. 夜间失败任务自动补跑**：`scheduler_job_runs` 里 status=failed 的幂等任务在 06:00 再跑一次，一句话「昨夜 3 个任务失败，2 个补跑成功」。只改自家库，可逆，每天都有。量级：小-中。

## 5. 改动面与工作量

- homebase：`agent-activity.ts` 现只读 `source='assignment-runtime' AND type='assignment.trigger.fired'`，系统任务进不了 TodayDigest → 要么扩 source 白名单，要么新开一条 L1 rule（§22 presentation authority）。**两者都要改 PM 授权，不是纯代码**。
- agent-mobile：`services/activity/digest.ts` 文案 + TodayDigest 一行，改动小。
- 总量：**中**（代码小、语义授权大、收益低）。替代场景 A/B 都在**已有** assignment-runtime 通道内，不动 PM。

## 6. 建议

**换场景。** 本场景的自动化早已做完（自动发码 + 自动关卡拉升），剩下的只有「扫码」这一步在用户手里，再加一句 Pulse 播报只是换皮，且一年 12 次还伴随 5 轮/天的打扰风险。优先做 **A（简报数据源自愈）**：同一域、每天可验证、对外零副作用。
