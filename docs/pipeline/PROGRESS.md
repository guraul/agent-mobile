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

### ⏳ 阶段 3：端到端演练（未开始）

- [ ] 全流程演练：真实 issue → worktree → PR → review → merge → 自动部署 → 线上验证
- [ ] 回滚演练一次
- [ ] BFF `next dev` → `next build + next start` 生产化
- [ ] 手册/知识库终稿核对

## 四、变更记录

| 日期 | 变更 |
|------|------|
| 2026-09-27 | 建档：记录阶段 0/S 完成情况与全部决策 D1-D8 |
| 2026-09-27 | 阶段 1 开工 |
| 2026-09-27 | 阶段 1 完成：6 脚本 + 手册 + 路由实测通过；issue #1（Phase 2 任务）已建 |
