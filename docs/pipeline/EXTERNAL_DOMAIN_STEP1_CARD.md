# 施工卡 · 只读外部域（日历/邮件）第一步

> 状态：待拍板（本卡不含代码）· 2026-10-28 · 只读调研，未连任何外部账号
> 依据：homebase `packages/web/{lib,app}` 全量 grep；`lib/{auth-shared,auth,database,emailService,cors}.ts`；`lib/scheduler/*`；`agent-mobile-app/app.json` + `src/services/{auth,bff-config}.ts`

## 0. 结论

先做 **① ICS 只读订阅**（用户自己贴私有日历 URL）。② Google OAuth、③ IMAP 都不进第一阶段。

## 1. 现状（读码事实）

| 项 | 事实 |
|---|---|
| 外部日历 | **零痕迹**。grep `calendar/gmail/oauth/google` 只命中 `lib/product/trading-calendar.ts`（A股交易日历，内部行情时间戳） |
| 邮件 | 只有**出站** SMTP（`nodemailer`，`lib/emailService.ts`）：配置落 `data/email_config.json` 或 env `SMTP_*`，密码明文存 json、GET 回包打码。**无 IMAP / 无收件** |
| 鉴权 | 自建：scrypt 口令 + `jose` HS256 JWT（1d）；cookie `auth_token`（httpOnly / SameSite=Lax / Secure 按环境）；`users` 表在 `data/finance.db`；登录按 IP 限流 |
| 第三方 OAuth 基建 | **不存在**。无回调路由、无 state/PKCE、无 token 加密存储、无 googleapis 依赖；`@homebase/personal-context` 是空骨架（issue #54） |
| 数据层 | 单文件 sqlite `finance.db` + `_migrations`；加表照迁移走 |
| 定时任务 | 自研 registry + `@breejs/later`（`lib/scheduler/`），可挂轮询 handler；`lib/delivery/` 已有出站分发 |
| App 深链 | `app.json` 有 `scheme: pulseapp`，但代码**零使用** `Linking`；token 在 AsyncStorage（非 SecureStore）；BFF base URL 运行时可改 |

## 2. 三个方案（成本低 → 高）

**① ICS 只读订阅**
- 做什么：设置页贴私有 ics URL → BFF 存 → 定时拉取解析 → 未来 N 小时事件进 Pulse。
- 改动面：BFF 新增 1 表 `calendar_feeds` + `GET/PUT/DELETE /api/product/calendar` + 1 个 scheduler handler；App 一个设置入口 + 一个列表块。≈4 文件 + 1 迁移。
- 风险：**URL 本身即凭据**（内嵌 token，可读整本日历），等同密码——只存服务端、GET 只回掩码+域名、可一键删；无刷新也无 scope 收窄，泄露即长期只读泄露。
- 工作量：**小**。

**② Google Calendar OAuth**
- 做什么：网页「连接 Google」→ 授权 → 回调换 refresh_token → 定时增量同步（syncToken）。
- 改动面：GCP 建项目、`/api/oauth/google/{start,callback}`、state+PKCE、**token 加密存储（现无此设施，要新造）**、刷新/撤销/失败降级。≈8–12 文件。
- 风险：refresh_token 长期有效，泄露面远大于 ICS；sensitive scope 需过 Google 验证；回调 URL 与「9928 静态页 + 19234 BFF」双域形态要对齐（CORS 只放行 9928 三个 origin）。
- 工作量：**中–大**。

**③ 邮件 IMAP 只读**
- 做什么：存 IMAP 账号/应用专用码 → 轮询收件箱 → 摘要。
- 改动面：新依赖 imapflow、UID 游标表、正文解析与截断、文件夹选择；BFF 现有只有发信。
- 风险：**最高**。应用专用码常是账号级权限；正文含验证码/银行/合同，进 LLM 上下文不可撤回；容错与限流工作量最大。
- 工作量：**大**。

## 3. 建议

1. **先做 ①**。理由：零新依赖、不需要 OAuth 基建与审核、不新增长期 token 类型；唯一凭据是用户可随时重置的 URL；解析是纯本地计算，失败不外溢。一周内可验证「今天还有什么会」的最小价值。
2. ① 有真实使用两周，再议 ②；且 ② 之前**必须先补 token 加密存储**。
3. **不建议做**：③（权限/隐私与收益不成比例）；②之前不建「通用连接中心 / 插件市场」（单 provider 时的投机抽象）；不让 App 端持有任何第三方凭据（现 token 存 AsyncStorage，非 SecureStore）；不做任何写操作（建/改/删事件）。
4. 第一步验收：贴 URL → 首页出现未来 24h 事件；URL 错误 → 一句失败提示且不落库；删除 → 立刻消失；GET 回包不含完整 URL。
