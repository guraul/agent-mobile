#!/usr/bin/env bash
# open-pr.sh — 薄转发：推送目标工作区的 task 分支 + 开 PR 交给共享包 dsh-pipeline
#
# 为什么只剩一个壳: 自 issue #189 起，「校验分支/工作区干净 → push → gh pr create」
#   的唯一实现是共享包 dsh-pipeline 的 pr 子命令；本仓只保留「文件名与 -C 用法都不变」的转发壳。
#
# 用法（推荐：在 worktree 内运行）:
#   cd .worktrees/<issue号>-<slug> && scripts/pipeline/open-pr.sh
#   scripts/pipeline/open-pr.sh -C .worktrees/<issue号>-<slug>    # 不 cd，显式指定
#   scripts/pipeline/open-pr.sh --worktree <dir>
#
# 目标解析（issue #108）: -C/--worktree > 脚本所在仓库；cwd 不参与。
# 参数映射: -C/--worktree <dir> → 包的 --root <dir>；不传时 --root 取脚本所在仓库（REPO_ROOT）。
# 退出码: 0 成功 / 1 本壳的用法或环境错误（die）/ 其它为包的退出码原样透传
#   （包用 2 表示用法或环境错误）。壳自身的用法错误走 die（exit 1），是 issue #189
#   要求保留的旧实现语义；只有包的退出码才原样透传。
#
# 包位置（顺序固定，解析只在 lib.sh 的 resolve_pipeline_cli 里实现一次）:
#   ① $DSH_PIPELINE_HOME；② 主工作区 tools/node_modules/dsh-pipeline（worktree 场景）；
#   ③ 当前脚本所属仓 tools/node_modules/dsh-pipeline（非 worktree）。
source "$(dirname "$0")/lib.sh"
require_gh
require_pipeline_pkg

parse_target_dir "$@"
resolve_work_dir

info "共享 pipeline 包: ${PIPELINE_HOME}"
info "转发: node ${PIPELINE_CLI_PATH} pr --root ${WORK_DIR}"

set +e
node "${PIPELINE_CLI_PATH}" pr --root "${WORK_DIR}"
RC=$?
set -e
exit "${RC}"
