#!/usr/bin/env bash
# merge-pr.sh — squash 合并当前任务的 PR 并清理现场（审核闸门的执行端）
#
# 审核闸门（见全局 ~/.dsh/AGENTS.md §7 第 6/7 条）：
#   审核方判定 APPROVE 且未命中高风险路径 → 直接合并（合并即触发自动部署）；
#   绕过闸门的规则与留痕要求见全局 ~/.dsh/AGENTS.md §7.7。
#
# 用法:
#   scripts/pipeline/merge-pr.sh                # 在 worktree 内运行：自动识别当前分支的 PR（连本 worktree 一起清掉）
#   scripts/pipeline/merge-pr.sh <PR号|分支名>   # 任意位置指定 PR（推荐在主工作区跑，见 docs/pipeline/README.md §二）
#   scripts/pipeline/merge-pr.sh -C <dir> ...    # 显式指定目标工作区（同 --worktree；优先于脚本所在仓库）
#   scripts/pipeline/merge-pr.sh --review-record=<文件>  # 审核记录（共享 gate 校验 APPROVE / head / 过期 / 高风险）
#   scripts/pipeline/merge-pr.sh --no-review [--reason=<文本>]  # 显式跳过闸门（须用户当场同意，见全局 §7.7）
#   scripts/pipeline/merge-pr.sh --force        # CI 失败/未配置时仍合并（慎用）
source "$(dirname "$0")/lib.sh"
require_gh

FORCE=0; TARGET=""; REVIEW_RECORD=""; NO_REVIEW=0; NO_REVIEW_REASON=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --force) FORCE=1; shift ;;
    --review-record)
      [[ $# -ge 2 ]] || die "$1 缺少文件参数"
      REVIEW_RECORD="$2"; shift 2 ;;
    --review-record=*) REVIEW_RECORD="${1#*=}"; shift ;;
    --no-review) NO_REVIEW=1; shift ;;
    --reason)
      [[ $# -ge 2 ]] || die "$1 缺少文本参数"
      NO_REVIEW_REASON="$2"; shift 2 ;;
    --reason=*) NO_REVIEW_REASON="${1#*=}"; shift ;;
    -C|--worktree)
      [[ $# -ge 2 ]] || die "$1 缺少目录参数"
      TARGET_DIR_OVERRIDE="$2"; shift 2 ;;
    --worktree=*) TARGET_DIR_OVERRIDE="${1#*=}"; shift ;;
    -*) die "未知参数: $1（支持 <PR号|分支名> / -C <dir> / --force / --review-record=<文件> / --no-review）" ;;
    *) TARGET="$1"; shift ;;
  esac
done
resolve_work_dir

if [[ $NO_REVIEW -eq 1 && -n "$REVIEW_RECORD" ]]; then
  die "--review-record 与 --no-review 不能同时使用（二选一）"
fi

# 检出 main 的主工作区：合并后快进 main 用。它与"当前是否就在主工作区"无关——
# 从主工作区运行（TARGET 为 PR 号）时 MAIN_WT 就是当前工作区，清理与快进两件事都必须照做（issue #102）。
MAIN_WT=$(git -C "$WORK_DIR" worktree list --porcelain | awk '/^worktree /{w=$2} /^branch refs\/heads\/main$/{print w; exit}')
[[ -n "$MAIN_WT" ]] || die "未找到检出 main 的主工作区"

# —— 定位 PR ——
if [[ -z "$TARGET" ]]; then
  BRANCH=$(git -C "$WORK_DIR" branch --show-current)
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

# —— 审核闸门（判定逻辑在 self-dsh-plugins 的共享 gate 里；本脚本只调用，不复制判定）——
if [[ $NO_REVIEW -eq 0 && -z "$REVIEW_RECORD" ]]; then
  info "未提供 --review-record：闸门将 fail-closed 拒绝（确需跳过请用 --no-review，见 ~/.dsh/AGENTS.md §7.7）"
fi
GATE_CLI="$HOME/workspace/self-dsh-plugins/dsh-subagents/lib/cli.js"
[[ -f "$GATE_CLI" ]] || die "找不到共享审核闸门: ${GATE_CLI}"
HEAD_SHA=$(gh pr view "$PR_NUM" --repo guraul/agent-mobile --json headRefOid -q .headRefOid) \
  || die "取 PR #${PR_NUM} 的 head sha 失败"
GATE_ARGS=(gate --pr "$PR_NUM" --root "$MAIN_WT" --head-sha "$HEAD_SHA")
if [[ -n "$REVIEW_RECORD" ]]; then
  GATE_ARGS+=(--record "$REVIEW_RECORD")
fi
if [[ $NO_REVIEW -eq 1 ]]; then
  if [[ -z "$NO_REVIEW_REASON" ]]; then
    NO_REVIEW_REASON="用户当场明确同意跳过审核（merge-pr.sh --no-review）"
  fi
  GATE_ARGS+=(--no-review --reason "$NO_REVIEW_REASON")
fi
info "审核闸门（共享 gate）"
node "$GATE_CLI" "${GATE_ARGS[@]}" \
  || die "审核闸门未通过，拒绝合并（绕过须用户当场同意，见 ~/.dsh/AGENTS.md §7.7）"

info "squash 合并 PR #${PR_NUM}（合并后自动部署即触发）"
gh pr merge "$PR_NUM" --repo guraul/agent-mobile --squash

# —— 清理现场（远端分支、本地分支及其 worktree；主工作区快进 main）——
# 「快进 main」与「清理 worktree/本地分支」是两件独立的事，各自判断，不再共用一个总开关。
info "清理分支与 worktree"
git -C "$WORK_DIR" push origin --delete "$BRANCH" 2>/dev/null || true

# 本地分支：先摘掉检出它的 worktree（通常就是本任务的 .worktrees/<issue>-<slug>），
# 否则 git branch -D 会以"该分支正被某 worktree 检出"拒绝。
BRANCH_WT=$(git -C "$WORK_DIR" worktree list --porcelain \
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
