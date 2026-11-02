#!/usr/bin/env bash
# lib.sh — pipeline 脚本公共常量与工具（被其他脚本 source，不直接执行）
# 手册：docs/pipeline/README.md

set -euo pipefail

# 仓库根一律以**脚本自身位置**解析，不再看 cwd（issue #108）。
# 旧实现用 `git rev-parse --show-toplevel`（跟随 cwd）：在主工作区用绝对路径调用某个 worktree
# 里的脚本、或编排时 cwd 没切进 worktree，就会取到主工作区的 main。脚本总是躺在自己所属的
# 工作区里，位置才是唯一可靠来源；想指定别的工作区请用 -C/--worktree（见 resolve_work_dir）。
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel 2>/dev/null)" || {
  echo "✗ 脚本所在目录不在任何 git 仓库内: ${SCRIPT_DIR}（需从 agent-mobile 仓库或其 worktree 内运行）" >&2
  exit 1; }

SERVER_HOST="106.13.181.13"
SERVER_USER="root"
SERVER_WEB_DIR="/root/project/agent-mobile/agent-mobile-app"   # 服务器上 dist 所在目录
BFF_REPO="guraul/family-finance"
DEFAULT_BFF_URL="http://106.13.181.13:19234"
GH_REPO="guraul/agent-mobile"

# 目标工作区：分支读取 / status / push / worktree 清理都必须落在同一个工作区上。
# 解析优先级：显式 -C/--worktree > 脚本所在仓库（REPO_ROOT）；cwd 不参与。
TARGET_DIR_OVERRIDE=""
WORK_DIR=""

# 失败即退出，并把「解析到的目标工作区 + 当前分支 + 调用 cwd」一起打印（issue #108）。
# 只报分支名会把"取错了工作区"说成"分支不对"，排查成本极高。
die() {
  local dir branch ctx
  dir="${WORK_DIR:-${REPO_ROOT:-}}"
  ctx="调用 cwd: ${PWD}"
  if [[ -n "$dir" ]] && command -v git >/dev/null 2>&1; then
    branch="$(git -C "$dir" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
    ctx="目标工作区: ${dir} | 分支: ${branch:-<未知>} | ${ctx}"
  fi
  echo "✗ $*（${ctx}）" >&2
  exit 1
}
info() { echo "→ $*"; }
ok()   { echo "✓ $*"; }

# 消费 open-pr.sh 这类「只有目标目录参数」脚本的 -C/--worktree（issue #108）。
# 其它参数一律报错，不静默忽略。
parse_target_dir() {
  TARGET_DIR_OVERRIDE=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -C|--worktree)
        [[ $# -ge 2 ]] || die "$1 缺少目录参数"
        TARGET_DIR_OVERRIDE="$2"; shift 2 ;;
      --worktree=*) TARGET_DIR_OVERRIDE="${1#*=}"; shift ;;
      *) die "未知参数: $1（支持 -C <dir> / --worktree <dir>）" ;;
    esac
  done
}

# 把 TARGET_DIR_OVERRIDE（可空）解析成绝对物理路径写入 WORK_DIR
resolve_work_dir() {
  local dir="${TARGET_DIR_OVERRIDE:-$REPO_ROOT}"
  if [[ ! -d "$dir" ]]; then
    WORK_DIR="$dir"   # 让 die 的上下文显示的是那个不存在目标，而不是默认值
    die "目标目录不存在: ${dir}"
  fi
  WORK_DIR="$(cd "$dir" && pwd -P)"
}

require_gh() {
  command -v gh >/dev/null || die "需要 gh CLI（https://cli.github.com），且已 gh auth login"
}

# 从 issue 标题生成文件名安全的短 slug（仅 [a-z0-9-]，截断 40）
slugify() {
  local title="$1"
  local slug
  slug=$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g' | cut -c1-40)
  [ -n "$slug" ] || slug="task"
  printf '%s' "$slug"
}

# 校验参数是正整数 issue 号
is_issue_number() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

# 远端执行 ssh 命令（统一入口，便于 dry-run 与后续换 deploy 用户）
remote() {
  ssh -o ConnectTimeout=8 "${SERVER_USER}@${SERVER_HOST}" "$@"
}

# —— 共享 pipeline 包（dsh-pipeline）解析 ——
# 为什么需要集中解析: 转发壳通常在 worktree 里被调用，而依赖装在**主工作区**的
#   tools/node_modules；用 REPO_ROOT（= 当前 worktree 根）拼路径会落空。
# 查找顺序（与 self-dsh-plugins 的 resolve_pipeline_cli 一致，别再各写一份）：
#   ① $DSH_PIPELINE_HOME（显式覆盖：设了就是权威来源，不再回退——免得设错却静默用到别的包）
#   ② <主工作区>/tools/node_modules/dsh-pipeline
#      （主工作区 = git common dir 的父目录；worktree 里 common dir 指向主仓 .git）
#   ③ <当前脚本所属仓>/tools/node_modules/dsh-pipeline（非 worktree 的常规场景）
# 结果: 成功设置 PIPELINE_CLI_PATH / PIPELINE_HOME；失败返回 1，并把试过的路径写进 PIPELINE_TRIED
#   （用全局变量而不是 stdout：调用方若在 $(...) 里取值，子 shell 里改的变量传不回来）。
PIPELINE_CLI_PATH=""
PIPELINE_HOME=""
PIPELINE_TRIED=""

_pipeline_cli_candidates() {
  local common main
  if [[ -n "${DSH_PIPELINE_HOME:-}" ]]; then
    printf '%s\n' "${DSH_PIPELINE_HOME%/}/bin/cli.mjs"
    return 0
  fi
  # 旧 git 可能返回相对路径（主工作区里就是 `.git`）：先按 REPO_ROOT 折成绝对路径，再取父目录
  common=$(git -C "${REPO_ROOT}" rev-parse --git-common-dir 2>/dev/null) || common=""
  if [[ -n "${common}" && "${common}" != /* ]]; then
    common="${REPO_ROOT}/${common}"
  fi
  if [[ -n "${common}" ]]; then
    common=$( (cd "${common}" 2>/dev/null && pwd -P) ) || common=""
  fi
  if [[ -n "${common}" ]]; then
    main=$(dirname "${common}")
    printf '%s\n' "${main}/tools/node_modules/dsh-pipeline/bin/cli.mjs"
  fi
  printf '%s\n' "${REPO_ROOT}/tools/node_modules/dsh-pipeline/bin/cli.mjs"
}

resolve_pipeline_cli() {
  local candidate seen=""
  PIPELINE_CLI_PATH=""
  PIPELINE_TRIED=""
  while IFS= read -r candidate; do
    [[ -n "${candidate}" ]] || continue
    # 主工作区 == 当前仓时候选会重复，只报一次
    case "${seen}" in *"|${candidate}|"*) continue ;; esac
    seen="${seen}|${candidate}|"
    if [[ -f "${candidate}" ]]; then
      PIPELINE_CLI_PATH="${candidate}"
      return 0
    fi
    PIPELINE_TRIED="${PIPELINE_TRIED}${candidate} "
  done < <(_pipeline_cli_candidates)
  return 1
}

# 供转发壳调用：成功则设置 PIPELINE_CLI_PATH / PIPELINE_HOME；失败 die
require_pipeline_pkg() {
  if ! resolve_pipeline_cli; then
    die "找不到共享 pipeline 包（dsh-pipeline）。已尝试: ${PIPELINE_TRIED}；请在主工作区的 tools/ 里跑 pnpm install，或设置 DSH_PIPELINE_HOME 指向包目录"
  fi
  PIPELINE_HOME=$(dirname "$(dirname "${PIPELINE_CLI_PATH}")")
  command -v node >/dev/null 2>&1 || die "需要 node：共享包是 Node CLI"
}
