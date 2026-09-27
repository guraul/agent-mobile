#!/usr/bin/env bash
# open-pr.sh — 推送当前分支并开 PR（在对应 worktree 目录内运行）
# 用法: cd .worktrees/<issue>-<slug> && scripts/pipeline/open-pr.sh
# 约定: 分支名必须为 task/<issue号>-<slug>；PR body 首行 Closes #<issue号>
source "$(dirname "$0")/lib.sh"
require_gh

BRANCH=$(git -C "$REPO_ROOT" branch --show-current)
[[ "$BRANCH" == task/* ]] || die "当前不在 task/* 分支上（在 worktree 里运行本脚本）：${BRANCH:-<detached>}"
ISSUE=$(printf '%s' "$BRANCH" | sed -E 's|^task/([0-9]+)-.*|\1|')
is_issue_number "$ISSUE" || die "无法从分支名解析 issue 号: ${BRANCH}"

TITLE=$(gh issue view "$ISSUE" --repo guraul/agent-mobile --json title -q .title) \
  || die "issue #${ISSUE} 无法访问"

if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
  die "工作区有未提交改动，先 commit（或 stash）"
fi

info "推送 ${BRANCH}"
git -C "$REPO_ROOT" push -u origin "$BRANCH"

info "创建 PR（base: main ← ${BRANCH}）"
BODY="Closes #${ISSUE}

---
由 scripts/pipeline/open-pr.sh 创建；合并前确认 CI（tsc + vitest）通过。"
gh pr create --repo guraul/agent-mobile --base main --head "$BRANCH" \
  --title "${TITLE} (#${ISSUE})" --body "$BODY"
ok "PR 已创建；合并方式：squash merge（合并后自动关闭 issue #${ISSUE} 并触发部署）"
