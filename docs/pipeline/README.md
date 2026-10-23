# Pipeline 工作手册

> 面向**任何人或任何 coding agent** 的交付流程说明。所有能力都是幂等 bash 脚本（`scripts/pipeline/`），不依赖任何特定 agent 的插件。
> 进度台账见 [PROGRESS.md](PROGRESS.md)。

## 一、流程总览

```
1. 开任务        在 GitHub 开 issue（每任务一个；Projects board 看板化）
2. 建工作区      scripts/pipeline/new-task.sh <issue号>
                 → 分支 task/<issue号>-<slug> + worktree .worktrees/<issue号>-<slug>
3. 开发          cd 到 worktree 内开发；提交信息建议带 #<issue号>
4. 开 PR         （推荐：在 worktree 内）scripts/pipeline/open-pr.sh
                 → 自动推送 + 开 PR，body 首行 Closes #<issue号>
5. review        CI 过（tsc + vitest）+ **review 约定**（见下）→ squash merge
                 → 合并自动关闭 issue，并触发自动部署
6. 自动部署      GitHub Actions：tsc/test → expo export → rsync → restart serve-9928
                 手动兜底: scripts/pipeline/deploy.sh（参数见下）
7. 回滚          scripts/pipeline/rollback.sh（releases 任意秒切）
```

规则：发版只由 `agent-mobile-app/**` 变更触发；BFF 走它自己仓库的 pipeline。

**review 约定（人在环的唯一一步）**：agent 完成开发并开 PR 后，向用户询问"review 是否完成"；**用户回复 ok** 后，agent 运行 `merge-pr.sh` 执行 squash 合并（合并即触发自动部署）。除该确认外，从 issue 到部署全程自动化。

## 二、脚本用法

```bash
# 任务入口（issue → worktree）
scripts/pipeline/new-task.sh 12
#   输出 worktree 路径，cd 进去开发；重复运行幂等

# 开 PR（推荐在 worktree 目录内运行）
cd .worktrees/12-xxx && ../../scripts/pipeline/open-pr.sh
scripts/pipeline/open-pr.sh -C .worktrees/12-xxx    # 不 cd，显式指定目标 worktree（同 --worktree）
scripts/pipeline/open-pr.sh --worktree <dir>
#   目标解析（issue #108）：-C/--worktree > 脚本自身所在工作区；**cwd 不参与**
#     → 从主工作区用绝对路径调用 worktree 里的脚本，也会解析到那个 worktree，而不是 main
#   在 main 工作区跑（分支不是 task/*）会拒绝；报错一律带「目标工作区 / 分支 / 调用 cwd」
#   自检（PATH 打桩，不碰真实 git 远端/GitHub）：bash scripts/pipeline/test-open-pr.sh

# 合并（用户 review 通过后；推荐从主工作区运行，两种运行位置都会清理现场）
scripts/pipeline/merge-pr.sh            # 自动识别当前分支的 PR
scripts/pipeline/merge-pr.sh 34         # 指定 PR 号
scripts/pipeline/merge-pr.sh -C <dir>   # 指定目标工作区（同 --worktree）
scripts/pipeline/merge-pr.sh --force    # CI 失败时强行合并（慎用）
#   合并动作（无论从哪运行都会做）：squash merge → 删远端分支
#     → 删本地 task/* 分支（先移除检出它的 worktree → 主工作区 fetch + pull --ff-only main）
#   清理范围：
#     · 从主工作区运行（如 `merge-pr.sh 34`）：清掉该任务的 worktree + 本地分支，并把主工作区的
#       main 快进到 origin/main。✅ 推荐用法（shell 不会站在被删的目录里）
#     · 从 worktree 内运行（无参数）：同样会清理——被清的就是你所在的 worktree，shell 会被"连根
#       带走"（目录已删）；建议先 cd 回主工作区再运行
#   自检（PATH 打桩，不碰真实 git 远端/GitHub）：bash scripts/pipeline/test-merge-pr.sh

# 手动部署兜底（Actions 不可用时；质量门槛默认开启）
scripts/pipeline/deploy.sh                 # tsc + test → export → rsync releases/<id> → 切软链 → restart → 验证
scripts/pipeline/deploy.sh --skip-tests    # 紧急跳过测试
scripts/pipeline/deploy.sh --with-bff      # 顺带触发 BFF pipeline
scripts/pipeline/deploy.sh --dry-run       # 只打印将执行的命令

# 回滚（releases 任意版本秒切；无参数 = 回到上一版）
scripts/pipeline/rollback.sh [release-id] [--dry-run]

# 收敛生产 `opencode` 命令到 v2（E1 升级遗留的 npm v1 残留；issue #84）
scripts/pipeline/fix-opencode-binary.sh [--dry-run]
#   备份旧 symlink → /root/backups/opencode-v1-symlink.bak → 重指 v2 → 校验 --version；幂等

# 全链路状态（只读）
scripts/pipeline/status.sh
```

环境要求：本机 node 24.21.0（`nvm use`）、pnpm、gh CLI 已登录（`gh auth status`）、SSH 公钥已授权服务器。

**仓库解析约定（issue #108）**：所有 `scripts/pipeline/*.sh` 的 `REPO_ROOT` 取**脚本自身位置**（`git -C "$SCRIPT_DIR" rev-parse --show-toplevel`），与调用时的 cwd 无关；`open-pr.sh` / `merge-pr.sh` 还支持 `-C <dir>` / `--worktree <dir>` 覆盖目标工作区。失败信息统一附带「目标工作区 / 分支 / 调用 cwd」。

## 三、服务器速查（106.13.181.13，Ubuntu 24.04）

| 项 | 值 |
|---|---|
| systemd 单元 | `serve-9928.service`（静态站）/ `bff-19234.service`（BFF）/ `opencode-4096.service`（opencode），全部 enabled |
| 静态站目录 | `/root/project/agent-mobile/agent-mobile-app/dist`（当前为覆盖式部署；Phase 2 改 `releases/<id>` + `current` 软链） |
| 仓库 checkout | `/root/project/agent-mobile`、`/root/project/homebase` |
| node | v24.21.0（nodesource apt） |
| 已知问题 | BFF 生产跑的是 `next dev`（Phase 3 修）；19235 阶段2 BFF 未运行；生产 `opencode` 命令曾解析到 v1（E1 探针包残留，issue #84 → `fix-opencode-binary.sh` 收敛，需窗口执行） |

## 四、关键约定（红线）

- 服务器**不安装任何 agent/ZCode 组件**；服务器操作只有 ssh + systemd
- **gzipCache 陷阱**：dist 覆盖后必须重启 serve-9928，否则返回旧 bundle
- BFF CORS 只放行 9928 的三个 origin（`106.13.181.13`/`127.0.0.1`/`localhost`）——静态站换端口前必须先改 BFF
- squash merge 为唯一合并方式；PR body 首行必须 `Closes #<issue号>`
- 凭据不入库：部署密钥只放 GitHub Secrets；服务器 root 密钥不进任何仓库

## 五、阶段状态

阶段 0（仓库瘦身）/ 阶段 S（服务器整备）已完成；阶段 1（本脚本层）当前；阶段 2（Actions + Secrets + board + releases 布局）、阶段 3（端到端演练 + BFF 生产化）未开始——明细见 [PROGRESS.md](PROGRESS.md)。
