# scripts/pipeline/ — 生成的入口

本目录 6 个入口（`pipeline.sh` `new-task.sh` `open-pr.sh` `merge-pr.sh` `review.sh` `status.sh`）由共享包 `dsh-pipeline` 生成：
```bash
node tools/node_modules/dsh-pipeline/bin/cli.mjs shim install --root <仓库根>
```

**禁止手改**：`shim check` 会按当前包版本渲染模板后逐字节比对，手改即报红（`node tools/node_modules/dsh-pipeline/bin/cli.mjs shim check --root <仓库根>`）。

改生成逻辑去 `guraul/dsh-pipeline` 的 `docs/CONTRACT.md`（契约 §8 入口 shim），改完重新 `shim install` 覆盖本地入口。

本仓 worktree 用默认仓内 `.worktrees/`（`.dsh/pipeline.json` 不设 `worktreesDir`）；`fix-opencode-binary.sh` 是手写脚本，不在生成物之列。
