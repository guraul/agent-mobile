# Pipeline 建设 · 总体进度记录

> 本文件是部署 pipeline 建设的**唯一进度台账**：做了什么、为什么、下一步是什么。
> 维护约定：每完成一个阶段/事项，更新对应条目并追加变更记录；决策变更要写明日期与理由。
> 流程手册见 [README.md](README.md)。

## 一、目标（2026-09-27 确认）

建立自动化交付流程：

```
GitHub Issue/Card（任务入口）
  → worktree 开发（scripts/pipeline/new-task.sh）
  → PR（Closes #N）→ review → squash 合并
  → 自动部署生产服务器 106.13.181.13
      ├─ agent-mobile-app 静态站（9928）：main push 且 agent-mobile-app/** 变更才发版
      └─ BFF（family-finance，私有独立仓库）：main push 自主部署（不联动）
  → 任何一步可用脚本手动兜底；任何 coding agent 可按手册使用全套工具
```

## 二、已定决策（含日期）

| # | 决策 | 日期 |
|---|------|------|
| D1 | 服务器不安装任何 ZCode/agent 组件；全部操作 = ssh + 原生 systemd，部署 = Actions rsync + ssh | 2026-09-27 |
| D2 | BFF 触发：family-finance 自己的 pipeline 监听 main push 自主部署；主 pipeline 只留手动兜底入口 | 2026-09-27 |
| D3 | agent-mobile 发版过滤：仅 `agent-mobile-app/**` 变更触发，纯文档变更不发版 | 2026-09-27 |
| D4 | 需要 GitHub Projects board（Backlog/In progress/Review/Done） | 2026-09-27 |
| D5 | 9928 归属：serve-9928.service 托管主应用静态版；showcase2-9928 已退役 | 2026-09-27 |
| D6 | 一期部署用 root（现状一致），二期再评估专用 deploy 用户 | 2026-09-27 |
| D7 | 构建一律在 GitHub Actions（服务器 2C/1.9G 内存不允许本地构建），服务器只收产物 | 2026-09-27 |
| D8 | 仓库瘦身：src/、showcase/、showcase2/ 删除（showcase2 设计已移植主应用）；test/ 不入库 | 2026-09-27 |

## 三、进度台账

### ✅ 阶段 0：仓库结构调整（2026-09-27 完成）

- `bf419ba` 删除 `src/`（设计期源码）、`showcase/`、`showcase2/`（17 组件已直移主应用，零运行时依赖）；`test/`（14M 临时产物）加入 .gitignore 并解除追踪；AGENTS.md 规定 7/8/9 与知识库同步
- `c62fff9` redesign 历史文档归档（21 个文件 → `docs/redesign/archive/`）
- `c070c50` Node 24.21.0 锁定（`.nvmrc` + 两个 package.json engines）
- 验证：tsc 通过、129 个单测通过

### ✅ 阶段 S：服务器清理与整备（2026-09-27 完成）

- **S2** 9928 收编：showcase2-9928.service 删除、nohup 孤儿杀掉、`serve-9928.service` 接管（enabled）
- **S3** 新建 `bff-19234.service`、`opencode-4096.service`（原样复刻现有启动命令，均为 enabled + 开机自启）
- **S4** 服务器 node v24.15.0 → **v24.21.0**（nodesource apt），三服务重启验证正常
- **S5** 磁盘 81% → **77%**（日志 ~350M + apt 缓存 112M + showcase2 残留 + pnpm store 146M）
- **S6** 服务器 checkout 对齐到 main 最新
- **S7** 外部验证 9928=200 / 19234=307；知识库过时记载全部更正（`ad9283f`）

遗留（记录在案，另行处理）：
- [ ] BFF 生产跑的是 `next dev` 开发模式（无生产构建）→ Phase 3 一并切 `next build + next start`
- [ ] family-finance 服务器 checkout 落后 origin/main 2 提交 → BFF pipeline 落地时处理
- [ ] 磁盘大头为其他项目：gcode-learn-agent 1.1G / openchamber 236M / opencode-src 222M，待用户决定是否清
- [ ] 服务器静态站为单 dist 覆盖式部署（无多版本）→ Phase 2 改 releases/current 软链布局

### ✅ 阶段 1：本地脚本层（2026-09-27 完成）

- [x] `scripts/pipeline/lib.sh`（公共常量/工具）
- [x] `scripts/pipeline/new-task.sh`（issue → worktree + 分支；fetch 失败自动重试一次）
- [x] `scripts/pipeline/open-pr.sh`（推送 + 开 PR，自动 Closes #N）
- [x] `scripts/pipeline/deploy.sh`（手动部署兜底：tsc/test → export → dist.prev 快照 → rsync → 重启；`--with-bff` 预留 / `--dry-run` / `--skip-tests`）
- [x] `scripts/pipeline/rollback.sh`（回退上一版：dist.prev 交换；Phase 2 升级为 releases 软链秒切）
- [x] `scripts/pipeline/status.sh`（线上/服务/仓库状态一览）
- [x] `docs/pipeline/README.md` 工作手册（本目录）
- [x] AGENTS.md / INDEX.md 路由入口
- [x] 实测：6 个脚本语法检查全过；`status.sh` 全链路实跑 ✓；`new-task.sh` 用真实 issue #1 演练 ✓（建/删 worktree 幂等）；`deploy.sh --dry-run` 序列核对 ✓
- 备注：`open-pr.sh` 将在阶段 2/3 的真实 PR 流程中首次实跑；issue [#1](https://github.com/guraul/agent-mobile/issues/1) 已创建，即 Phase 2 的正式任务

### 🔨 阶段 2：CI/CD（进行中，本 PR）

- [x] 服务器 releases/<id> 软链布局过渡完成：`dist → releases/legacy-20260927`（硬链接快照，线上无中断验证 200）
- [x] `.github/workflows/deploy-web.yml`（main push + paths `agent-mobile-app/**`：tsc/test → expo export → rsync → 切软链 → restart → 线上验证；concurrency 锁；workflow_dispatch 手动入口）
- [x] `scripts/pipeline/deploy.sh` 升级为 releases 布局（rsync 到 releases/manual-<ts> → 切软链 → 保留 5 版）
- [x] `scripts/pipeline/rollback.sh` 升级为任意 release 秒切（对真实服务器演练：正确列出 legacy-20260927 并拒绝无上一版回滚）
- [x] 部署专用 SSH 密钥对（ed25519，仅 Actions→服务器）→ 服务器 authorized_keys + 两仓库 `DEPLOY_SSH_KEY` Secrets；本地临时私钥已删除
- [x] `family-finance` 仓库 `deploy.yml`（main push 自主部署：服务器 git fetch + pnpm install + restart bff-19234 + 健康检查）——**已推送并实测通过**（首次运行 1m35s，服务器 checkout 已由 Actions 同步至 `ed3fce5`，bff-19234 active）
- [ ] Projects board + issue #1 挂板（Status: In Progress）——等待 gh token 补 `project` scope（`gh auth refresh -s project,read:project`）
- [ ] 用户 review 本 PR → squash merge → 首次 Actions 自动部署验证（进入阶段 3）

### ✅ 阶段 3：端到端演练（2026-09-27 完成）

- [x] 事件复盘：PR #2 merge 触发首次 deploy-web（run 36318236966）——push 触发 ✓、质量门拦截 ✓、issue #1 自动关闭 ✓、服务器未被触碰 ✓；vitest 失败根因 = `projection.test.ts` 硬编码 +08:00 期望（CI 为 UTC）
- [x] 修复 issue [#3](https://github.com/guraul/agent-mobile/issues/3)（PR #4 merged）：期望值随时区推导；`TZ=UTC` 单跑 14/14 过（模拟 CI 条件）
- [x] **deploy-web 首次全绿**（run 36321209576，10 步全过）：线上 release `run-36321209576-1d82c41`，外部 9928=200
- [x] 回滚演练：rollback.sh 切回 legacy-20260927（200）→ 指定切回新版（200），秒级切换
- [x] Projects board："Agent Mobile Delivery"（project #1）建成，issue #3 挂 In Progress；默认三列 Todo/In Progress/Done（GraphQL 不支持改选项，加列需网页设置）
- [x] **BFF 生产化**（family-finance issue #2，PR #3/#4/#5）：next dev → next build + next start。三次失败复盘：① 逐文件 rsync 传 91M 的 .next（86M 是 webpack cache）断连 → 改 tar 排除 cache + 重试；② 服务器 pnpm install --prod 无 TTY 中止 → CI=true；③ BUILD_ID 解压后消失（机制未定）→ 依赖安装挪到产物解压之前（PR #5）。期间生产由手工恢复并保持 307，内存 1.1Gi→726Mi
- [x] 手册补 merge-pr.sh 必须从主工作区运行的警告（worktree 曾被连根删除卡死会话）
- [ ] family-finance PR #5（顺序修复）merge 后自动重跑一次，确认顺序修复后的首次全自动生产部署

## 四、变更记录

| 日期 | 变更 |
|------|------|
| 2026-09-27 | 建档：记录阶段 0/S 完成情况与全部决策 D1-D8 |
| 2026-09-27 | 阶段 1 开工 |
| 2026-09-27 | 阶段 1 完成：6 脚本 + 手册 + 路由实测通过；issue #1（Phase 2 任务）已建 |
| 2026-09-27 | 阶段 2 完成（PR #2 merged cf10139）；首次 deploy-web 被时区测试拦截（流程按设计工作）；阶段 3 开工，issue #3 修复时区依赖（本 PR） |
| 2026-09-27 | 阶段 3 完成：deploy-web 全绿、回滚演练通过、board 建成、BFF 生产化落地（merge-pr.sh 自 merge-pr.sh #4 起均从主工作区执行） |
| 2026-09-29 | **双 chat 页 epic #35 五项收官**（PR #36-#40 全部 merged，9928 = #30 版本）：#29 路由骨架+chat 浅色化 / #31 chatcode 壳+弹层浅色化 / #32 信息层（工具折叠组+thinking+diff 卡）/ #33 交互层（composer 两态+agent 长按面板+排队队列）/ #30 气泡内白卡+Duties/Projects 卡（`a999f4a`）。epic checklist 五项已勾，仅 #34 抽屉待讨论 |
| 2026-09-29 | 收尾：补 `router.md` 双 chat 页分流段（单路由 + `resolveConversationKind` 运行时判据）、`INDEX.md` 路由/判据入口；epic #35 `#30` 勾选走 REST（`gh issue edit` 被 GraphQL projectCards 报错打断，一律 REST，见交底书 §5-4） |
| 2026-09-29 | 修 e2e 假失败：卡片步原固定 `waitForTimeout(4000)`，但 BFF `/api/product/{assignments,attention}` 请求被页面同时发出的十余条 opencode session 列表请求挤到 **+9s/+10s** 才回（HTTP/1.1 单域 6 连接上限）→ 改为 20s 轮询。三次连跑 12/12 稳定（`e8a1f90`） |
| 2026-09-29 | **生产故障修复（issue #41 / PR #42 merged `3af79f8`）**：9928 线上发任何消息无回复——`deepseek` provider 已下线 `deepseek-v4-flash`，而服务器 `opencode.json` 里 build/plan/design 仍配着它，opencode 在 loop 层抛 `ProviderModelNotFoundError` 且**不生成 assistant 消息**（故既无回复也无 error 气泡，`errors.length===0`）。用户拍板：手机端统一 `opencode/mimo-v2.6-flash-free`、不采纳 server `agent.model`、DeepSeek Pro 一律不用并从选择器排除、**服务器 opencode.json 不动**。新增 `services/model-registry.ts` 纯函数 + 9 单测；部署后线上实测 5s 拿到回复，e2e 12/12 |
| 2026-09-29 | 查实两处**代码与现实脱节**：① **#33 排队是死代码**——两态 composer 都 `{sending ? Stop : Send}` 互斥渲染，busy 时无 Send 键，`send()` 的 `if (sending)` 入队分支**无任何 UI 路径可达**（这才是 #33 e2e 一直挂起的真因）；另 TextInput 未绑 `onSubmitEditing`，Enter 不发送。② **`Alert.alert` 在 RN Web 是空函数**，全仓 25 处零反馈（issue #43，用户要求单独 PR）。另修正 CONVENTIONS.md 中"用 `Alert.alert` 替代 `window.alert`"那条——该建议仅对原生成立 |
| 2026-10-01 | **#33 追查到底并搁置（issue #44，PR 无，worktree 已清理）**：追查发现比"缺入口"严重——**busy 判定从根上就错了**。`doSend()` 的 `finally { setSending(false) }` 在 `prompt_async` 返回时即执行，而该端点**收到 204 立刻返回**（实测 1.4s）、不等 agent 跑完 → `sending` 只在 HTTP 往返瞬间为 true。实测确认：`session/status` 仍 `busy`、agent 文本仍在增长，界面 Stop 键却已消失。**chat.md 里"busy = sending（prompt_async 挂起整个 run）"这条设计前提实测不成立**，已改写。叠加入口缺失，排队功能几乎永不触发 → chip/排序/删除/失败重试整套逻辑走不到。**用户拍板：暂不修、回 backlog**（若重启须先换真实 busy 信号：SSE delta 或 `session/status`）。过程中验证过的 A 方案入口代码（tsc 通过）已随 worktree 丢弃。6 个 scratch 会话全部清理，用户真实会话零污染 |
| 2026-10-01 | **Alert 兜底修复（issue #43 / PR #45）**：`Alert.alert` 在 RN Web 是空函数 → 9928 上 25 处调用全部零反馈。新增 `services/alert.tsx`（`showAlert()`：原生仍走系统弹窗、Web 走 `AlertHost` + LightSheet；**AlertHost 须挂组件树最后**）+ `alert-core.ts`（纯逻辑，7 单测，因 vitest 环境是 node 载不动 JSX）。25 处替换、每次打 `console.error`。**截图审图后改两处**：正文 `grayText`(2.75:1 低于 AA) → `subtleText`(5.0:1)；destructive 描边 `hairline`(1.19:1) → 新 token `dangerBorder`。**顺带修 #41 遗漏**：`SettingsSheet` PREFERENCES 仍显示已下线的 `deepseek-v4-flash`（同一根因，#41 只改 chat 侧）。验证：tsc 0 错 / 201 测试全过 / 本地 Alert 验收 10/10 / 主 e2e 12/12。另记入 CONVENTIONS.md：Alert 叠在已开 sheet 上会双层 scrim（实测背景约 29.5% 明度），审图时勿误判为 token 配错 |
| 2026-10-12 | **E1 升级遗留收尾（issue #84）**：生产"升级已完成、CLI 没收敛"——v2 装在 `/root/.opencode/bin`（**不在 PATH**），`/usr/bin/opencode` 是 E1 当天 10:33 为确认"npm 线是否已发 v2"装的 `opencode-ai@1.19.0`（v1）留下的 symlink（真回滚物料是 10:15 的 `opencode-ai-1.18.34-installed.tgz`）→ 裸敲 `opencode` 用 v1 读 v2 配置，报 `V2 permissions are not supported by OpenCode V1 … or run opencode2`（**配置本身没错**）。连带：微信桥 `dist/opencode.js` 的 `which opencode` 同样拿到 v1，且它把 v2 的 `/api/health` **401** 判成"未运行"→ 下次启动必踩（另开 `guraul/wechat-opencode-bridge#1`）。新增幂等 ops 脚本 `scripts/pipeline/fix-opencode-binary.sh`（备份 + 重指 + `--version` 校验 + `--dry-run`）；**生产执行需窗口授权**。踩坑记录：macOS 自带 **bash 3.2** 不支持 `X=$(cat <<'EOS' …)`（把 heredoc 正文当代码解析），改用 `read -r -d '' X <<'EOS'` |
| 2026-10-02 | chat 批次（epic #35）收官：#29/#31/#32/#33（ZCode）+ #30（opencode）+ #34F 抽屉（PR #47 `4aac6f0`，A 方案：sessions 抽屉 + 边缘手势，chatcode 入口待定）；过程中额外修复模型失效（#42）与 Alert 静默（#45）；#33 排队查实不可用回 backlog（#44） |
| 2026-10-15~16 | **E3-d1 出口②（确认卡）上线 + #91 登录态 Attention 上线 + 一事故一缺陷收口 + memx 阶段 4 收尾**：① **确认卡**：homebase PR #27（`c4ba364`，`from-card` 单路由 propose→按需 confirm、`confirmedBy:"card"`、**propose 之前先查重**）+ agent-mobile PR #99（`50e4351`，隐藏块 `<!--assignment-card:{…}-->` → 气泡内白卡「内容+确认+补充」，解析失败优雅降级）；**用户真机验收通过**（授权痕迹 `confirmation:<prp>:card`）；prompt v0.3 同步生产 `agents.companion.system`（备份 `/root/backups/opencode.json.bak.20261015-222931`）。**DoD1/2/4/5 完成；DoD3（她只读查执行记录）待「companion 工具通道」**（与出口③只读回程工具同源）。② **#91 登录态到期 Attention**：homebase PR #26（`73af38e`：`subject_kind=credential` + `creation_reason_kind=system-credential-expiry` 迁移、**仅 20:10 未扫建卡**、扫成功即 handle、`POST /api/product/attention/:id/renew` 点卡关旧建新 + 每分钟 sweep、`expires_at=NULL` 永不过期）+ agent-mobile PR #97（凭据事项「重发二维码」+ 隐藏 Open Talk）。③ **生产事故（1 分钟恢复）**：PR #26 的迁移在**生产既有库**上被 **53 行 FK 孤儿行**（`attention_evidence` 3 + `attention_interactions` 50，FK 强制前遗留）挡住 → 整事务回滚 → BFF 启动失败、全站 500；按 `PRAGMA foreign_key_check` 精确删孤儿行后恢复；**加固 PR #29**（回填过滤孤儿 + 丢弃数 `console.warn` 审计 + 孤儿库回归测试 + 反证复现同款报错）+ 上线检查项「含表重建的迁移，合并前先在目标库副本跑 `foreign_key_check`」+ 潜在同类风险 issue #30（老迁移 `20260906-product-phase5-checks-rebuild` 同款写法）。④ **时区 bug（用户发现：14:50 任务 22:50 才发）**：根因 = `later.date.localTime()` 是**模块级全局副作用**、只作用于 instrumentation 那份 `later`；Next.js 生产构建把 app 路由与 instrumentation 拆成**两个 webpack layer（两份 later 实例）** → **运行期经 API 新建的 assignment 按 UTC 求值（晚 8 小时）**；**修复 PR #32**（`cron-tz.ts`：TZ 显式纯函数 `nextFireAt`/`previousOccurrenceAt`/`scheduleCronInterval` + 消费方 import + `Environment=TZ=Asia/Shanghai` + 注册日志打 `next=`），生产验证 `next=2026-10-16T06:50:00.000Z`（北京 14:50）✓；**既有缺陷**、非本批引入。⑤ **memx 阶段 4 收尾**：多机同步双机上线、alert 生命周期（`resolve`/7 天剪龄/成功即销账/`pnpm alerts:clear`）；`#87`/`#56`/`#82` 按证据关闭；**#86 记忆回执 chip 真机验收通过并关闭**；memx `#6`（远端无变化时 `ls-remote` 前置短路省空转 pull）+ `#8`（rebase 带兜底身份，修"非快进推送被误报 `SYNC_CONFLICT`"）双机生效；测试建的 assignment 已 revoke（in-process 定时器随注销） |
| 2026-10-16 | **E2 · homebase 改名迁移收官（两侧闭环，无功能遗留）**：① **服务端半场**（控制面独立复核，本次**未重启任何服务**）——`/root/project/family-finance` 目录**已不存在**（更早窗口完成迁移）、systemd 两行已指向 homebase（`Description=BFF (homebase web) production server on 19234` / `WorkingDirectory=/root/project/homebase/packages/web`）、repo remote = `git@github.com:guraul/homebase.git`；历史库文案残留替换 **`product_events.payload` 3 行 + `attention_items.summary` 3 行**（均 `retention_class='audit'` 历史行）→ 复扫 **0/0**，备份 `/root/project/homebase/data/backups/finance.db.pre-e2.20261016-211531`（`integrity_check=ok`，含改动前 3/3）；复核三服务 active / bff=307 / 9928=200 / memory shas 不变 / alerts 0/0/0。② **agent-mobile 半场**——main 经 **PR #73（`201103f`）** 已落地同名引用迁移（含 KB 文档），issue **#54 已于 2026-10-11 自动 CLOSED** → **PR #66 为零差异重复件**（合 main 后 `git diff origin/main` 为空），用户拍板按 **superseded 关闭**（评论 + 删本地/远端分支 + 清 worktree `e2-rename`）。③ **遗留（非阻断）**：homebase 仓仍有 **19 个 tracked 文件**含 `family-finance` 字样（`app.sh`/`prod/*.sh` 的 pid/log 文件名、cloudflare worker name、测试注释与夹具字符串、KB 与历史 runbook 叙事）——**无功能性路径引用**，属命名/历史残留，另立 backlog 清扫。 |
| 2026-10-16 | **#46 收尾拍板「①改 ②不加」落档**：① chat 侧 Layers → `SessionsDrawer` **保留**（PR #47 `4aac6f0`）；② **回退 chatcode 侧 Layers 入口**（撤销 #59/PR #64 `aeeed74` 的该项）——`ProjectChatZ.tsx` 入口包回 `kind !== "chatcode"` 条件，`edgeGesture={kind !== "chatcode"}` 未动；`pulse-e2e.mjs` Step 1c 断言反转（chatcode 壳不得出现 `[aria-label="Switch session"]`，原为"出现"）；`modules/chat.md`（#31 段 + #34F 段）与 `modules/router.md`（分流图 / 会话切换段 / 边界段）同步改为「chatcode 侧不加入口」。**真机边缘手势验证已移出**到 issue #100（APK 阶段），本次不碰手势实现 |
| 2026-10-16 | **#91 登录态到期 Attention 合成 E2E 验收通过并关闭**（用户批准合成验收；生产自然触发当天不会发生——真实 token 到期 `2026-11-12`）：在生产造 1 张**形状与真实建卡逐字段一致**的凭据到期卡（备份 `finance.db.pre-91synthetic.20261016-213900`）→ ① Pulse 可见 ② 点卡「重发二维码」：旧卡 `handled`（`handling_ref=ttskill-login-renew:tlr_01M52FRC4X20715SCKV5AHF2MW`）+ 二维码真发企业微信 ③ 判定点 22:13:20、每分钟 sweep 于 **22:14:00** 判 `unscanned` → **关旧建新**（新卡 `att_01M52GDRA9K8CP3A71M9MM8J33`），不变式「open 凭据卡 ≤1」成立。**未验支**：「扫成功 → 自动关闭」由 homebase 单测覆盖，待 **2026-11-11 20:10** guard 自然建真卡时补验。清理已完成（备份 `finance.db.pre-91cleanup.20261016-221356`；复核 open=0 / renewals=0 / 合成残留=0 / `foreign_key_check` 空 / 三服务 active / bff=307 / web=200）。同期：**E2 收官**（见上一行）、**#46 收尾合并 PR #101（`c74b532`）**（chatcode 侧 Layers 入口回退；issue 已自动 CLOSED；deploy-web run `38912072930` success）、新开 **#100**（边缘手势真机验证移至 APK 阶段）与 **#102**（`merge-pr.sh` 从主工作区运行时跳过 worktree 清理与 main 快进的缺陷）。 |
| 2026-10-17 | **#46 收尾合并 + #91 合成验收闭环 + memx 对外 CRUD 面落地 + 三条规则入档**：① **#46** 用户拍板「①改 ②不加」→ 回退 chatcode 侧 Layers 入口（PR #101 `c74b532`，deploy-web run `38912072930` success，issue 自动 CLOSED）；**真机边缘手势验证移出**到新 issue **#100**（浏览器自身边缘手势冲突，测不出结论，等 APK 阶段）。② **#91 登录态到期 Attention 合成 E2E 验收通过并关闭**（三步全通：卡可见 → 点卡重发（旧卡 handled + 二维码真发企微）→ 判定点 22:13:20 / sweep 22:14:00 判 `unscanned` 关旧建新；清理回验收前状态；**未验支**「扫成功→自动关闭」待 2026-11-11 20:10 自然触发补验）。③ **memx 路径 A 拍板**（并入 memx 做对外 CRUD 面，不另立 `personal-context`）→ 切片 1 落地：**memx PR #14 `4f32fbd`**（mem CLI `slug|list|search|get|status|write|forget`，只经 core 既有函数 + 同一把锁，`#13` CLOSED；**该 CLI 已于 2026-10-23 由 memx PR #25 退役**，规则 16 改走宿主工具）；DSH 接入约定写进 agent-mobile 规则 16 / memx 规则 17（**禁止直写 `~/.opencode/**` markdown**）。④ **规则入档**：worktree 纪律（agent-mobile 15 / homebase 9 / memx 16：issue 关闭必清现场、外仓分支必须落仓库外、绝对路径建 worktree）；free 档回退链插入 `glm-5.3-flash-free` + 补记**可用性随时间波动**（agent-mobile 11 / homebase 7）。⑤ **memx 四项立案**：#9（deprecate 空 content 被静默过滤 → 新旧并存）、#10（PII 规则无词边界 → `task-spec-*` 误报**锁死同步一天**）、#11（删除不传播 → 需 prune / pull 后对账）、#12（`no-change` 短路 → 未推提交静默滞留）；并**手工走通一次运维路径**：生产旧仓 `/root/project/opencode-memx` 退役（回收 142 MiB、备份 tar）+ 旧 slug 记忆清理（两端软删 + 一次性镜像 prune，两端与镜像 0 残留）。⑥ **3 条孤儿记忆重新登记**（`orphanFiles` 3→0；只追加不排序，`.bak` + 镜像 push）；**来源推断 = 后台 pull 带进「有文件无索引」的快照**（mtime 与 `lastPullAt` 同为 16:55）。⑦ 生产事故（本机）：**`github.com` 在 mDNSResponder 缓存里坏掉**约 1 小时（`dig` 正常、`getaddrinfo` 失败；浏览器因 DoH 不受影响），**自行恢复**；期间清理 12 个挂死 ssh 子进程。 |
| 2026-10-17 | **修 `merge-pr.sh` 从主工作区运行不清理的缺陷（#102 / PR #103 `1f38630`）**：删掉把「就在主工作区」等同于「无需清理」的总开关，拆成三个独立判断（删远端分支 / 找到**持有该分支的 worktree** 再 `worktree remove` + `branch -D` / **无条件** `fetch` + `pull --ff-only main`）；README 措辞改为「推荐从主工作区运行，两种运行位置都会清理现场」。新增 **PATH-shim 行为自检** `scripts/pipeline/test-merge-pr.sh`（伪造 git/gh、不碰真实远端）：两种调用形态各断言一遍；**反证有效**（拿修复前脚本跑同一自检 → 恰好挂在那 3 条 #102 断言）。⚠️ 遗留：**自检尚未接入 CI**；「主工作区形态」的真实端到端验证由本 PR 的合并动作完成（此前只有自检覆盖）。 |
| 2026-10-23 | **规则 16 改宿主工具（#106）**：memx **PR #25 `1de88b1`**（memx issue #24 已 CLOSED）删除 `scripts/mem.ts` + `package.json` 的 `mem` script，`pnpm mem …` 命令行**已不存在** → 规则 16 从「对外 CRUD 面 CLI」整段改写为**宿主工具**口径：写 `memory_write` / 查 `memory_search` / 删 `forget`，上下文由插件在**会话开始自动注入**（每会话一次）；禁直写 `~/.opencode/**` 红线保留（会绕过 `withFileLock` + 索引 + `.bak`，产生孤儿）。合并后 memx 门禁：`typecheck` 0、`pnpm test` **26 文件 / 396 用例全绿**；`scripts/mem.ts` 不存在、`package.json` 无 `"mem"`、md 中无 `pnpm mem` 残留；worktree `24-dsh-forget-search` + 分支已清。纯文档 → `agent-mobile-app/**` 未变，**不触发 deploy-web**。 |
| 2026-10-28 | **Tier 1 首个落地：夜间补跑**（#140/#141）。homebase `06b7042` `nightly-retry`（只补 market-brief、复用幂等窗）+ `4016aae` 报告落 `agent_reports`（L1 被 13 秒空跑覆盖）；`52ad06a`/`529ec1b`/`8fc3929` 修过滤/SSE 覆盖/冷启动竞态；`fce48f8` 加开关。 |
| 2026-10-28 | **Tier 1 第二场景：盘中速览取数自愈**。homebase `49a65d9`（#76）：腾讯行情/债市两源失败后各隔 400ms 重试一次，仍失败才走原降级；成功则正文加「短暂异常，已自动重试成功」。只改取数环，幂等窗与降级语义不动。 |
| 2026-10-28 | **外部域首步：只读 ICS**（#153）。homebase `0990500` 解析、`41a1964` 轮询 + L1 今日一句、`42c4e1e` 端点、`652e2c4`/`b5ccc98` RRULE；agent-mobile `0df5ef1` 录入 UI；`5dd1d2f` 校验按路径段（`/ics-all/china` 实测 200 被拒）。公开源实测后已删（生产双表 0 行）。 |
| 2026-10-28 | **缺陷审计：永久悬挂 + 假绿**。`expires_at=NULL` 三处：登录态 `d66babb`（7 天 TTL）、权限 `a05cb2b`（24h）、repair `f9eebb0`（撤销即 retire + 7 天），homebase #72 关；`fc4b565` `ok:false` 不再记 success（否则补跑筛不到失败）；`c869a58` 调度 API 补 CORS。 |
| 2026-10-28 | **工具链**。homebase `3aeb021` 脚本改 REST（`gh issue/pr view` 走废弃 Projects GraphQL 会 die）+ 自检入 CI，`b81db83` 修 mktemp；e2e 恢复（headless shell-1243、路径 glob、双斜杠，`bd3f6a0` 接进 deploy-web）；self-dsh `d773435` 会话审计脚本。 |
| 2026-10-28 | **其他**。i18n 四期收口（`573f246`，#136，283 key）；eslint 79→0（`2404db4`）；规则 12 增「禁止惯性沿用 codebuddy」（`5e75535`）；#138 任务书 ≤300 字立案（仍 OPEN）；self-dsh #12 关闭；memx #32/#33/#35、homebase #22 收口（#30/#40 前一日关）。 |
