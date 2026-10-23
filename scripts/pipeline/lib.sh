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
