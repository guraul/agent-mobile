# Pipeline 工作手册（guraul/agent-mobile）

<!-- >>> dsh-pipeline 生成区（勿手改；改模板后重跑 init） -->
> 本文件由共享包 `@guraul/dsh-pipeline` 的 `init` 生成。生成区之外可以追加本仓自己的内容；
> 生成区内的文字被改动后，`init --check` 会判为不一致。

## 一、流程总览

```text
1. 开 issue      每任务一个，写清现象 / 根因 / 方案 / 验收标准 / 回滚
2. 建工作区      scripts/pipeline/new-task.sh <issue号>   → task/<号>-<slug> 分支 + worktree
3. 开发          在 worktree 内改代码，提交信息带 #<issue号>
4. 本地门禁      scripts/pipeline/pipeline.sh check-all   → 逐包 test / check / typecheck
5. 开 PR         scripts/pipeline/open-pr.sh              → 推送 + 开 PR（body 首行 Closes #<issue号>）
6. 审核          控制面委派 reviewer，判定落成审核记录（.dsh-web/reviews/）
7. 合并          scripts/pipeline/merge-pr.sh --pr <号> --root <主工作区> --record <记录>
                 闸门 → CI → squash 合并 → 清理 worktree / 分支 → 快进 main
```

## 二、入口清单

| 入口 | 转发到 | 说明 |
|---|---|---|
| `scripts/pipeline/pipeline.sh` | 第一个参数即子命令 | 通用入口，等价于直接调包 |
| `scripts/pipeline/new-task.sh` | `task` | 建任务分支 + worktree |
| `scripts/pipeline/open-pr.sh` | `pr` | 推送分支 + 开 PR |
| `scripts/pipeline/merge-pr.sh` | `merge` | 闸门 → CI → squash 合并 → 清理 |
| `scripts/pipeline/review.sh` | `review` | `prepare` / `prompt` / `publish` |
| `scripts/pipeline/status.sh` | `status` | 审核记录概况（只读） |

入口全部是生成物，**禁止手改**；改一个字节 `shim check` 就会红。

## 三、四件套与自检

| 项 | 路径 | 校验 |
|---|---|---|
| 配置 | `.dsh/pipeline.json` | `pipeline.sh selftest --config` |
| 入口 shim | `scripts/pipeline/*.sh` | `pipeline.sh shim check` |
| pre-push 钩子 | `.git/hooks/pre-push`（或 `core.hooksPath` 指向的位置） | `pipeline.sh hooks check` |
| 文档骨架 | `docs/pipeline/` | `pipeline.sh init --check` |

一次跑完前两项：`pipeline.sh selftest --fast`（pre-push 钩子用的就是它）。

## 四、规范来源

契约是唯一规范来源：[`docs/CONTRACT.md`](https://github.com/guraul/dsh-pipeline/blob/main/docs/CONTRACT.md)。
本文件只写「怎么跑」，不重复参数与退出码——逐命令细节查契约 §3 / §4。
<!-- <<< dsh-pipeline 生成区结束（以下可追加本仓自己的内容） -->

## 五、本仓约定（手写区，不参与 init 比对）

> 标记之间是生成区，`init --check` 只比对那一段；本节及以下在标记之外，重跑 `init` 时原样保留。
> 接入 `init` 之前的手写手册见 [`docs/archive/pipeline/docs-pipeline-README.md`](../archive/pipeline/docs-pipeline-README.md)（仅作历史参考）。

- **工具链来源**：`tools/` 用 `link:` 指向 `~/workspace/dsh-pipeline/dist/pkg`（包仓 `pnpm run pack` 的唯一解包产物），**必须绝对路径**——相对路径在 worktree 下会错位（每个 worktree 各一份 `tools/`）。改包后重跑 pack，`dist/pkg` 原子切换即生效。
- **仓库解析（#108）**：脚本的 `REPO_ROOT` 取脚本自身位置，与 cwd 无关；`open-pr.sh` / `merge-pr.sh` 支持 `-C <dir>` / `--worktree <dir>` 覆盖目标。
- **worktree / 分支命名**：`.worktrees/<N>-<slug>`、`task/<N>-<slug>`；从主仓根用绝对路径创建。
- **合并与清理**：`merge-pr.sh` 负责「移除 worktree → 主工作区 `fetch --prune` → `merge --ff-only origin/main` → 删本地分支（`-D`）」；它**不做** `git worktree prune`，也**不删远端分支**（远端分支交给 `gh pr merge` 与仓库的 auto-delete 设置）。
- **门禁（在 `agent-mobile-app/` 内跑）**：

  ```bash
  ( cd agent-mobile-app && pnpm exec tsc --noEmit )
  ( cd agent-mobile-app && pnpm test )     # vitest，src/**/*.test.ts
  ( cd agent-mobile-app && pnpm lint )
  ```

  新 worktree 首次跑门禁前先 `( cd agent-mobile-app && pnpm install )`。
- **远端走 SSH**：本仓 origin 自 2026-11-06 起是 SSH；HTTPS 抖动时显式 `git push git@github.com:guraul/agent-mobile.git <branch>`。
- **`deploy-web.yml` 的 paths 过滤**：只认 `agent-mobile-app/**` 与 workflow 自身——合并流水线脚本、文档、知识库**不会触发部署**（homebase 不同，那边 `scripts/**` 在 paths 里）。
- **高风险 = 人工放行**：命中 `.dsh/pipeline.json` 的 `highRisk`（本仓为 `.github/**`）或包默认策略（`.dsh/**`、`AGENTS.md`、`scripts/pipeline/**`、`docs/pipeline/**`、依赖变更、单次 >400 行等）时报 `E_POLICY`，需用户当场同意后用 `--no-review --reason=`；跳过审计由脚本自动写，**PR 评论要自己发**。

## 六、服务器 / 部署 / 回滚

不在本文重复：服务器布局、systemd 单元、部署与回滚步骤 → `docs/knowledge-base/OPERATIONS.md`；`gzipCache` 陷阱、CORS、凭据红线 → `docs/knowledge-base/CONVENTIONS.md`。

## 七、改流程本身

脚本、配置、本文件同样走 issue → worktree → PR，不直推 main。
