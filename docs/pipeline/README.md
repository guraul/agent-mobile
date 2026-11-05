# Pipeline 工作手册

> 面向**任何人或任何 coding agent** 的交付流程说明。所有能力都是幂等 bash 脚本（`scripts/pipeline/`），不依赖任何特定 agent 的插件。
> 目录里 6 个入口是共享包 `dsh-pipeline` 的**生成物**（见 [`scripts/pipeline/README.md`](../../scripts/pipeline/README.md)，禁止手改）；进度台账见 [PROGRESS.md](PROGRESS.md)。

## 一、流程总览

```
1. 开任务        在 GitHub 开 issue（每任务一个；Projects board 看板化）
2. 建工作区      scripts/pipeline/new-task.sh <issue号>
                 → 分支 task/<issue号>-<slug> + worktree .worktrees/<issue号>-<slug>
3. 开发          cd 到 worktree 内开发；提交信息建议带 #<issue号>
4. 开 PR         （推荐：在 worktree 内）scripts/pipeline/open-pr.sh
                 → 自动推送 + 开 PR，body 首行 Closes #<issue号>
5. review        CI 过（tsc + vitest）+ **审核闸门**（见全局 `~/.dsh/AGENTS.md` §7 第 6 条）→ squash merge
                 → 合并自动关闭 issue，并触发自动部署
6. 自动部署      GitHub Actions：tsc/test → expo export → rsync → restart serve-9928
                 手工部署已由 `.github/workflows/deploy-web.yml` 承接（`workflow_dispatch` 可手动触发）；
                 原 `deploy.sh`/`rollback.sh` 已于 2026-11-05 删除
7. 应急回滚      ssh + ln -sfn releases/<id> dist + systemctl restart serve-9928
```

规则：发版只由 `agent-mobile-app/**` 变更触发；BFF 走它自己仓库的 pipeline。

**审核闸门**：`merge-pr.sh` 已改成共享包 `dsh-pipeline` 的薄转发壳（issue #187），闸门判定、CI 校验、squash 合并与现场清理都在包里，本仓不再保留第二份实现。审核方 `APPROVE` 且未命中高风险 → 直接合并，不再问人；三种人工介入情形与绕过规则见全局 `~/.dsh/AGENTS.md` §7 第 6/7 条。

**任务入口与开 PR**：`new-task.sh` / `open-pr.sh` 同样是薄转发壳（issue #189），分别转发到包的 `task` / `pr` 子命令；`-C` / `--worktree` 映射成包的 `--root`，其余参数原样透传。退出码：**入口是生成物，不改写任何退出码**——只有两种壳自身错误：未知入口 `2`、找不到共享包 `3`；其余一律透传包的退出码（包用 `2` 表示用法错误、`1` 表示业务拒绝）。行为实现在包里，本仓只保留生成的文件名。

## 二、脚本用法

```bash
# 任务入口（issue → worktree）
scripts/pipeline/new-task.sh 12
#   输出 worktree 路径，cd 进去开发；重复运行幂等
#   自检（墓碑）：原 test-new-task.sh 已随生成物移除（#220），由 dsh-pipeline selftest --shims 覆盖

# 开 PR（推荐在 worktree 目录内运行）
cd .worktrees/12-xxx && ../../scripts/pipeline/open-pr.sh
scripts/pipeline/open-pr.sh -C .worktrees/12-xxx    # 不 cd，显式指定目标 worktree（同 --worktree）
scripts/pipeline/open-pr.sh --worktree <dir>
#   目标解析（issue #108）：-C/--worktree > 脚本自身所在工作区；**cwd 不参与**
#     → 从主工作区用绝对路径调用 worktree 里的脚本，也会解析到那个 worktree，而不是 main
#   在 main 工作区跑（分支不是 task/*）会拒绝；报错一律带「目标工作区 / 分支 / 调用 cwd」
#   自检（墓碑）：原 test-open-pr.sh 已随生成物移除（#220），由 dsh-pipeline selftest --shims 覆盖

# 审核（prepare 生成审核请求 + publish 判定落盘；共享包 review 子命令的薄转发壳，issue #194）
scripts/pipeline/review.sh prepare 34 [--model <模型>]
scripts/pipeline/review.sh publish 34 --response <文件> [--round <n>] [--model <m>] [--provider <p>] [--form <f>]
scripts/pipeline/review.sh prepare 34 -C <dir>   # 指定目标工作区（同 --worktree；只影响 WORK_DIR，--root 仍取主工作区）
#   prepare 产物写 <root>/.tmp/review/<pr>/request.json；publish 落 <root>/.dsh-web/reviews/<pr>-<sha>.json
#   退出码：0 成功 / 1 环境错误（die）/ 2 用法错误（缺参、未知参数）/ 其余为包退出码原样透传
#   自检（墓碑）：原 test-review.sh 已随生成物移除（#220），由 dsh-pipeline selftest --shims 覆盖

# 合并（审核方 APPROVE 且未命中高风险；绕过见全局 ~/.dsh/AGENTS.md §7.7）
#   前置：在主工作区 tools/ 里 `pnpm install`（装 dsh-pipeline 的 tgz 构建物，见 tools/package.json）
#   推荐从主工作区运行，两种运行位置都会清理现场
scripts/pipeline/merge-pr.sh            # 自动识别当前分支的 PR
scripts/pipeline/merge-pr.sh 34         # 指定 PR 号
scripts/pipeline/merge-pr.sh 34 --check-only        # 演练：跑到闸门/CI 为止，不合并、不清理
scripts/pipeline/merge-pr.sh 34 --review-record=.dsh-web/reviews/34-<sha>.json
scripts/pipeline/merge-pr.sh -C <dir>   # 指定目标工作区（同 --worktree；只影响找分支）
scripts/pipeline/merge-pr.sh --force    # CI 失败时强行合并（慎用）
#   --no-review --reason=<文本> 显式跳过闸门（须用户当场同意；包会落跳过审计，--reason 必填）
#   合并动作（无论从哪运行都会做）：squash merge → 删远端分支
#     → 删本地 task/* 分支（先移除检出它的 worktree → 主工作区 fetch + pull --ff-only main）
#   清理范围：
#     · 从主工作区运行（如 `merge-pr.sh 34`）：清掉该任务的 worktree + 本地分支，并把主工作区的
#       main 快进到 origin/main。✅ 推荐用法（shell 不会站在被删的目录里）
#     · 从 worktree 内运行（无参数）：同样会清理——被清的就是你所在的 worktree，shell 会被"连根
#       带走"（目录已删）；建议先 cd 回主工作区再运行
#   自检（墓碑）：原 test-merge-pr.sh 已随生成物移除（#220），由 dsh-pipeline selftest --shims 覆盖

# 手工部署 / 回滚（墓碑）
# 手工部署已由 .github/workflows/deploy-web.yml 承接（workflow_dispatch 可手动触发）；
# 原 scripts/pipeline/deploy.sh、rollback.sh 已于 2026-11-05 删除；
# 应急直接用 ssh + ln -sfn releases/<id> dist + systemctl restart serve-9928

# 收敛生产 `opencode` 命令到 v2（E1 遗留）：原 fix-opencode-binary.sh 已于 2026-11-05 删除
#   （它是 `scripts/pipeline/` 里最后一个手写脚本，依赖的 lib.sh 已随生成物移除；需要时查 git 历史）

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
| 已知问题 | BFF 生产跑的是 `next dev`（Phase 3 修）；19235 阶段2 BFF 未运行；生产 `opencode` 命令曾解析到 v1（E1 探针包残留，issue #84；原 `fix-opencode-binary.sh` 已于 2026-11-05 删除，收敛步骤见 git 历史） |

## 四、关键约定（红线）

- 服务器**不安装任何 agent/ZCode 组件**；服务器操作只有 ssh + systemd
- **gzipCache 陷阱**：dist 覆盖后必须重启 serve-9928，否则返回旧 bundle
- BFF CORS 只放行 9928 的三个 origin（`106.13.181.13`/`127.0.0.1`/`localhost`）——静态站换端口前必须先改 BFF
- squash merge 为唯一合并方式；PR body 首行必须 `Closes #<issue号>`
- `tools/` 的 `dsh-pipeline` 依赖只在本机存在，用绝对路径（`file:/Users/gubin/workspace/dsh-pipeline/dist/latest.tgz`）；相对路径会在 worktree 下错位
- 凭据不入库：部署密钥只放 GitHub Secrets；服务器 root 密钥不进任何仓库

## 五、阶段状态

阶段 0（仓库瘦身）/ 阶段 S（服务器整备）已完成；阶段 1（本脚本层）当前；阶段 2（Actions + Secrets + board + releases 布局）、阶段 3（端到端演练 + BFF 生产化）未开始——明细见 [PROGRESS.md](PROGRESS.md)。
