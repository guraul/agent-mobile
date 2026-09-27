# Pipeline 工作手册

> 面向**任何人或任何 coding agent** 的交付流程说明。所有能力都是幂等 bash 脚本（`scripts/pipeline/`），不依赖任何特定 agent 的插件。
> 进度台账见 [PROGRESS.md](PROGRESS.md)。

## 一、流程总览

```
1. 开任务        在 GitHub 开 issue（每任务一个；Projects board 看板化）
2. 建工作区      scripts/pipeline/new-task.sh <issue号>
                 → 分支 task/<issue号>-<slug> + worktree .worktrees/<issue号>-<slug>
3. 开发          cd 到 worktree 内开发；提交信息建议带 #<issue号>
4. 开 PR         （在 worktree 内）scripts/pipeline/open-pr.sh
                 → 自动推送 + 开 PR，body 首行 Closes #<issue号>
5. review        CI 过（tsc + vitest）+ 人工确认 → squash merge
                 → 合并自动关闭 issue，并触发自动部署
6. 自动部署      GitHub Actions：tsc/test → expo export → rsync → restart serve-9928
                 手动兜底: scripts/pipeline/deploy.sh（参数见下）
7. 回滚          scripts/pipeline/rollback.sh
```

规则：**merge 是人在环的最后一步**（agent 可以准备好 PR，合并需用户确认）；发版只由 `agent-mobile-app/**` 变更触发；BFF 走它自己仓库的 pipeline。

## 二、脚本用法

```bash
# 任务入口（issue → worktree）
scripts/pipeline/new-task.sh 12
#   输出 worktree 路径，cd 进去开发；重复运行幂等

# 开 PR（在 worktree 目录内运行）
cd .worktrees/12-xxx && ../../scripts/pipeline/open-pr.sh

# 手动部署兜底（Actions 不可用时；质量门槛默认开启）
scripts/pipeline/deploy.sh                 # tsc + test → export → rsync → restart → 验证
scripts/pipeline/deploy.sh --skip-tests    # 紧急跳过测试
scripts/pipeline/deploy.sh --with-bff      # 顺带触发 BFF pipeline（Phase 2 接入）
scripts/pipeline/deploy.sh --dry-run       # 只打印将执行的命令

# 回滚上一版（与 deploy.sh 的 dist.prev 快照配合）
scripts/pipeline/rollback.sh [--dry-run]

# 全链路状态（只读）
scripts/pipeline/status.sh
```

环境要求：本机 node 24.21.0（`nvm use`）、pnpm、gh CLI 已登录（`gh auth status`）、SSH 公钥已授权服务器。

## 三、服务器速查（106.13.181.13，Ubuntu 24.04）

| 项 | 值 |
|---|---|
| systemd 单元 | `serve-9928.service`（静态站）/ `bff-19234.service`（BFF）/ `opencode-4096.service`（opencode），全部 enabled |
| 静态站目录 | `/root/project/agent-mobile/agent-mobile-app/dist`（当前为覆盖式部署；Phase 2 改 `releases/<id>` + `current` 软链） |
| 仓库 checkout | `/root/project/agent-mobile`、`/root/project/family-finance` |
| node | v24.21.0（nodesource apt） |
| 已知问题 | BFF 生产跑的是 `next dev`（Phase 3 修）；19235 阶段2 BFF 未运行 |

## 四、关键约定（红线）

- 服务器**不安装任何 agent/ZCode 组件**；服务器操作只有 ssh + systemd
- **gzipCache 陷阱**：dist 覆盖后必须重启 serve-9928，否则返回旧 bundle
- BFF CORS 只放行 9928 的三个 origin（`106.13.181.13`/`127.0.0.1`/`localhost`）——静态站换端口前必须先改 BFF
- squash merge 为唯一合并方式；PR body 首行必须 `Closes #<issue号>`
- 凭据不入库：部署密钥只放 GitHub Secrets；服务器 root 密钥不进任何仓库

## 五、阶段状态

阶段 0（仓库瘦身）/ 阶段 S（服务器整备）已完成；阶段 1（本脚本层）当前；阶段 2（Actions + Secrets + board + releases 布局）、阶段 3（端到端演练 + BFF 生产化）未开始——明细见 [PROGRESS.md](PROGRESS.md)。
