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
| 2026-10-02 | chat 批次（epic #35）收官：#29/#31/#32/#33（ZCode）+ #30（opencode）+ #34F 抽屉（PR #47 `4aac6f0`，A 方案：sessions 抽屉 + 边缘手势，chatcode 入口待定）；过程中额外修复模型失效（#42）与 Alert 静默（#45）；#33 排队查实不可用回 backlog（#44） |