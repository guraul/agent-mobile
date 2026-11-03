#!/usr/bin/env bash
# new-task.sh — 薄转发：issue → task 分支 + worktree 的创建交给共享包 dsh-pipeline
#
# 为什么只剩一个壳: 自 issue #189 起，「读 issue 标题 → slug → 在主工作区建
#   task/<号>-<slug> 分支与 .worktrees/<号>-<slug>」的唯一实现是共享包 dsh-pipeline
#   的 task 子命令；本仓只保留「文件名与用法都不变」的转发壳，免得两份实现各自漂移。
#
# 用法:
#   scripts/pipeline/new-task.sh <issue号>
#
# 参数映射: <issue号> → `task <issue号> --root <脚本所在仓库>`。
#   --root 只回答「哪个仓」——包会把它折回主工作区（worktree 容器恒为主工作区 .worktrees/），
#   所以从 worktree 里调用不会套出嵌套 .worktrees。取脚本所在仓库而不是 cwd（issue #108 的约定）。
#
# 退出码: 0 成功 / 1 本壳的用法或环境错误（die）/ 其它为包的退出码原样透传
#   （包用 2 表示用法或环境错误）。壳自身的用法错误走 die（exit 1），是 issue #189
#   要求保留的旧实现语义；只有包的退出码才原样透传。
#
# 包位置（顺序固定，解析只在 lib.sh 的 resolve_pipeline_cli 里实现一次）:
#   ① $DSH_PIPELINE_HOME；② 主工作区 tools/node_modules/dsh-pipeline（worktree 场景）；
#   ③ 当前脚本所属仓 tools/node_modules/dsh-pipeline（非 worktree）。
source "$(dirname "$0")/lib.sh"

# 用法错误一律走 lib.sh 的 die（exit 1，带目标工作区上下文）：旧实现就是这个退出码，
# issue #189 要求保留，别改成 2——2 是**包**的用法错误码，只在透传时出现。
usage() {
  echo "用法: $0 <issue号>" >&2
  die "${1:-参数错误}"
}

# 用法校验放在依赖检查之前：没装包时也应该先看到「怎么用」，而不是包缺失
[[ $# -eq 1 ]] || usage "需要且只需要 1 个参数（issue 号），实际 $# 个"
ISSUE="$1"
is_issue_number "$ISSUE" || usage "issue 号必须是正整数: ${ISSUE}"

require_gh
require_pipeline_pkg

info "共享 pipeline 包: ${PIPELINE_HOME}"
info "转发: node ${PIPELINE_CLI_PATH} task ${ISSUE} --root ${REPO_ROOT}"

set +e
node "${PIPELINE_CLI_PATH}" task "${ISSUE}" --root "${REPO_ROOT}"
RC=$?
set -e
exit "${RC}"
