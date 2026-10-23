#!/usr/bin/env bash
# open-pr.sh — 推送**目标工作区**的分支并开 PR
#
# 用法（推荐：在 worktree 内运行）:
#   cd .worktrees/<issue号>-<slug> && scripts/pipeline/open-pr.sh
#   scripts/pipeline/open-pr.sh -C .worktrees/<issue号>-<slug>    # 不 cd，显式指定
#   scripts/pipeline/open-pr.sh --worktree <dir>
# 目标解析（issue #108）: -C/--worktree > 脚本所在仓库；cwd 不参与。
# 约定: 分支名必须为 task/<issue号>-<slug>；PR body 首行 Closes #<issue号>
source "$(dirname "$0")/lib.sh"
require_gh

parse_target_dir "$@"
resolve_work_dir

BRANCH="$(git -C "$WORK_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
[[ -n "$BRANCH" && "$BRANCH" != "HEAD" ]] \
  || die "目标是 detached HEAD，无法确定分支（请 cd 进 worktree，或传 -C <worktree 路径>）"
[[ "$BRANCH" == task/* ]] \
  || die "目标不是 task/* 分支（取到主工作区了？请 cd 进 worktree，或传 -C <worktree 路径>）"
ISSUE="$(printf '%s' "$BRANCH" | sed -E 's|^task/([0-9]+)-.*|\1|')"
is_issue_number "$ISSUE" || die "无法从分支名解析 issue 号: ${BRANCH}"

TITLE=$(gh issue view "$ISSUE" --repo guraul/agent-mobile --json title -q .title) \
  || die "issue #${ISSUE} 无法访问"

if [[ -n "$(git -C "$WORK_DIR" status --porcelain)" ]]; then
  die "工作区有未提交改动，先 commit（或 stash）"
fi

info "推送 ${BRANCH}（来自 ${WORK_DIR}）"
git -C "$WORK_DIR" push -u origin "$BRANCH"

info "创建 PR（base: main ← ${BRANCH}）"
BODY="Closes #${ISSUE}

---
由 scripts/pipeline/open-pr.sh 创建；合并前确认 CI（tsc + vitest）通过。"
gh pr create --repo guraul/agent-mobile --base main --head "$BRANCH" \
  --title "${TITLE} (#${ISSUE})" --body "$BODY"
ok "PR 已创建；合并方式：squash merge（合并后自动关闭 issue #${ISSUE} 并触发部署）"
