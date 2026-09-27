#!/usr/bin/env bash
# lib.sh — pipeline 脚本公共常量与工具（被其他脚本 source，不直接执行）
# 手册：docs/pipeline/README.md

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "✗ 必须在 agent-mobile 仓库（或其 worktree）内运行" >&2; exit 1; }

SERVER_HOST="106.13.181.13"
SERVER_USER="root"
SERVER_WEB_DIR="/root/project/agent-mobile/agent-mobile-app"   # 服务器上 dist 所在目录
BFF_REPO="guraul/family-finance"
DEFAULT_BFF_URL="http://106.13.181.13:19234"

die()  { echo "✗ $*" >&2; exit 1; }
info() { echo "→ $*"; }
ok()   { echo "✓ $*"; }

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
