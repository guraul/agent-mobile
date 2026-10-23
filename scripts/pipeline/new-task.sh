#!/usr/bin/env bash
# new-task.sh — 从 GitHub issue 创建开发 worktree + 分支
# 用法: scripts/pipeline/new-task.sh <issue号>
# 效果: 分支 task/<issue号>-<slug>，worktree .worktrees/<issue号>-<slug>（基于 origin/main）
# 幂等: worktree 已存在时直接打印路径退出
source "$(dirname "$0")/lib.sh"
require_gh

ISSUE="${1:-}"
is_issue_number "$ISSUE" || die "用法: $0 <issue号>"

TITLE=$(gh issue view "$ISSUE" --repo guraul/agent-mobile --json title -q .title) \
  || die "issue #${ISSUE} 不存在或无法访问"
SLUG=$(slugify "$TITLE")
BRANCH="task/${ISSUE}-${SLUG}"

# worktree 一律建在**主工作区**的 .worktrees/ 下。REPO_ROOT 现在取脚本自身位置（issue #108），
# 若脚本是从某个 worktree 的副本被调起，REPO_ROOT 会是那个 worktree——直接用会套出嵌套 .worktrees。
MAIN_WT=$(git -C "$REPO_ROOT" worktree list --porcelain \
  | awk '/^worktree /{w=$2} /^branch refs\/heads\/main$/{print w; exit}')
[[ -n "$MAIN_WT" ]] || die "未找到检出 main 的主工作区"
WT="${MAIN_WT}/.worktrees/${ISSUE}-${SLUG}"

if git -C "$MAIN_WT" worktree list --porcelain | grep -q "^worktree ${WT}$"; then
  ok "worktree 已存在: ${WT}"
  echo "  cd ${WT}"
  exit 0
fi

info "同步 origin/main"
git -C "$MAIN_WT" fetch origin main --quiet || {
  info "fetch 失败，3 秒后重试一次"
  sleep 3
  git -C "$MAIN_WT" fetch origin main --quiet || die "无法访问 GitHub（origin fetch 两次失败）；稍后重试"
}
info "创建分支 ${BRANCH}（基于 origin/main）+ worktree"
git -C "$MAIN_WT" worktree add -b "$BRANCH" "$WT" origin/main >/dev/null
ok "issue #${ISSUE}: ${TITLE}"
echo "  分支:   ${BRANCH}"
echo "  worktree: ${WT}"
echo "  下一步: cd ${WT} && 开发（提交信息建议带 #${ISSUE}）"
