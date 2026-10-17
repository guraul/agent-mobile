#!/usr/bin/env bash
# merge-pr.sh — squash 合并当前任务的 PR 并清理现场（review 约定的执行端）
#
# review 约定（见 docs/pipeline/README.md §一）：
#   agent 完成开发并开 PR 后，向用户询问"review 是否完成"；
#   用户回复 ok 后，agent 运行本脚本完成合并——合并即触发自动部署。
#
# 用法:
#   scripts/pipeline/merge-pr.sh                # 在 worktree 内运行：自动识别当前分支的 PR（连本 worktree 一起清掉）
#   scripts/pipeline/merge-pr.sh <PR号|分支名>   # 任意位置指定 PR（推荐在主工作区跑，见 docs/pipeline/README.md §二）
#   scripts/pipeline/merge-pr.sh --force        # CI 失败/未配置时仍合并（慎用）
source "$(dirname "$0")/lib.sh"
require_gh

FORCE=0; TARGET=""
for a in "$@"; do
  case "$a" in
    --force) FORCE=1 ;;
    *) TARGET="$a" ;;
  esac
done

# 检出 main 的主工作区：合并后快进 main 用。它与"当前是否就在主工作区"无关——
# 从主工作区运行（TARGET 为 PR 号）时 MAIN_WT 就是当前工作区，清理与快进两件事都必须照做（issue #102）。
MAIN_WT=$(git worktree list --porcelain | awk '/^worktree /{w=$2} /^branch refs\/heads\/main$/{print w; exit}')
[[ -n "$MAIN_WT" ]] || die "未找到检出 main 的主工作区"

# —— 定位 PR ——
if [[ -z "$TARGET" ]]; then
  BRANCH=$(git branch --show-current)
  [[ "$BRANCH" == task/* ]] || die "在 task/* 分支（worktree）内运行，或用 <PR号|分支名> 指定"
  TARGET="$BRANCH"
fi
PR_NUM=$(gh pr view "$TARGET" --repo guraul/agent-mobile --json number -q .number 2>/dev/null) \
  || die "找不到 PR: ${TARGET}"
BRANCH=$(gh pr view "$PR_NUM" --repo guraul/agent-mobile --json headRefName -q .headRefName)
STATE=$(gh pr view "$PR_NUM" --repo guraul/agent-mobile --json state -q .state)
[[ "$STATE" == "OPEN" ]] || die "PR #${PR_NUM} 状态为 ${STATE}，无法合并"

info "PR #${PR_NUM}: $(gh pr view "$PR_NUM" --repo guraul/agent-mobile --json title -q .title)"

# —— CI 门槛（deploy-web 只在 main 上跑，PR 阶段通常无 checks；有且失败则拦）——
if [[ $FORCE -eq 0 ]] && gh pr checks "$PR_NUM" --repo guraul/agent-mobile >/dev/null 2>&1; then
  gh pr checks "$PR_NUM" --repo guraul/agent-mobile --fail-fast >/dev/null 2>&1 \
    || die "存在未通过/进行中的 CI checks（--force 可跳过）"
  ok "CI checks 全部通过"
fi

info "squash 合并 PR #${PR_NUM}（合并后自动部署即触发）"
gh pr merge "$PR_NUM" --repo guraul/agent-mobile --squash

# —— 清理现场（远端分支、本地分支及其 worktree；主工作区快进 main）——
# 「快进 main」与「清理 worktree/本地分支」是两件独立的事，各自判断，不再共用一个总开关。
info "清理分支与 worktree"
git push origin --delete "$BRANCH" 2>/dev/null || true

# 本地分支：先摘掉检出它的 worktree（通常就是本任务的 .worktrees/<issue>-<slug>），
# 否则 git branch -D 会以"该分支正被某 worktree 检出"拒绝。
BRANCH_WT=$(git worktree list --porcelain \
  | awk -v b="refs/heads/${BRANCH}" '/^worktree /{w=$2} $0 == "branch " b {print w; exit}')
if [[ -n "$BRANCH_WT" && "$BRANCH_WT" != "$MAIN_WT" ]]; then
  info "移除 worktree: ${BRANCH_WT}"
  git -C "$MAIN_WT" worktree remove --force "$BRANCH_WT" 2>/dev/null || true
fi
git -C "$MAIN_WT" branch -D "$BRANCH" 2>/dev/null || true

# 主工作区快进 main（与上面是否清理 worktree 无关）
info "主工作区快进 main"
if git -C "$MAIN_WT" fetch origin main --quiet && git -C "$MAIN_WT" pull --ff-only origin main --quiet; then
  git -C "$MAIN_WT" log --oneline -1 | sed 's/^/  main → /'
else
  info "main 快进失败（可手动: git -C \"${MAIN_WT}\" pull --ff-only origin main）"
fi
ok "PR #${PR_NUM} 已合并并清理现场；部署进度见仓库 Actions 页"
