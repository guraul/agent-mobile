#!/usr/bin/env bash
# merge-pr.sh — 薄转发：本仓的合并入口交给共享包 @guraul/dsh-pipeline
#
# 为什么只剩一个壳: 自 issue #187 起，「闸门 → CI → squash 合并 → 清理现场」的**唯一实现**
#   是共享包 dsh-pipeline；本仓只保留「文件名与参数都不变」的转发壳，免得两份实现各自漂移。
#
# 用法:
#   scripts/pipeline/merge-pr.sh                       # 在 worktree 内运行：用当前分支对应的 PR
#   scripts/pipeline/merge-pr.sh <PR号|分支名>          # 任意位置指定目标（分支名会解析成 PR 号）
#   scripts/pipeline/merge-pr.sh <PR号> --check-only    # 演练：跑到闸门/CI 为止，不合并、不清理
#   scripts/pipeline/merge-pr.sh -C <dir> ...          # 指定目标工作区（同 --worktree；映射成包的 --root）
#   scripts/pipeline/merge-pr.sh <PR号> --review-record=<文件>   # 审核记录（映射成包的 --record）
#   scripts/pipeline/merge-pr.sh <PR号> --no-review --reason=<文本>  # 显式跳过闸门（须用户当场同意，见全局 §7.7）
#   scripts/pipeline/merge-pr.sh <PR号> --checks-file=<文件>     # 用 JSON（{"state":"success"}）代替 gh pr checks
#   scripts/pipeline/merge-pr.sh <PR号> --force                  # CI 未过仍合并（慎用）
#
# 参数映射: --review-record=<f> → --record <f>；-C/--worktree <dir> → --root <dir>；
#   --no-review / --reason / --force / --check-only（旧别名 --dry-run）/ --checks-file 按包语义传递。
#   --no-review 现在**必须**配 --reason（包要求跳过留原因）。
#
# 包位置（顺序固定，解析只在 lib.sh 的 resolve_pipeline_cli 里实现一次）:
#   ① $DSH_PIPELINE_HOME；② 主工作区 tools/node_modules/dsh-pipeline（worktree 场景）；
#   ③ 当前脚本所属仓 tools/node_modules/dsh-pipeline（非 worktree）。
#   装的是 dist/latest.tgz 的打包产物（见 tools/package.json），不是源码 checkout。
#
# 部署不在本脚本里: 合并后由仓库 Actions 在 main 上完成构建/部署，本脚本只合并+清理，
#   不新增任何部署动作（原 deploy.sh 已于 2026-11-05 删除，部署由 .github/workflows/deploy-web.yml 承接）。
source "$(dirname "$0")/lib.sh"
require_gh
require_pipeline_pkg

TARGET=""; CHECK_ONLY=0; CHECKS_FILE=""; RECORD=""; NO_REVIEW=0; REASON=""; FORCE=0
HAS_CHECKS=0; HAS_RECORD=0; HAS_REASON=0
while [[ $# -gt 0 ]]; do
  a="$1"; shift
  case "${a}" in
    --force)                      FORCE=1 ;;
    --check-only|--dry-run)       CHECK_ONLY=1 ;;
    --no-review)                  NO_REVIEW=1 ;;
    --checks-file=*)              CHECKS_FILE="${a#*=}"; HAS_CHECKS=1 ;;
    --review-record=*)            RECORD="${a#*=}"; HAS_RECORD=1 ;;
    --reason=*)                   REASON="${a#*=}"; HAS_REASON=1 ;;
    --checks-file|--review-record|--reason|-C|--worktree)
      [[ $# -ge 1 ]] || die "${a} 缺少取值"
      case "${a}" in
        --checks-file)   CHECKS_FILE="$1"; HAS_CHECKS=1 ;;
        --review-record) RECORD="$1"; HAS_RECORD=1 ;;
        --reason)        REASON="$1"; HAS_REASON=1 ;;
        -C|--worktree)   TARGET_DIR_OVERRIDE="$1" ;;
      esac
      shift ;;
    --worktree=*)                 TARGET_DIR_OVERRIDE="${a#*=}" ;;
    -*) die "未知参数: ${a}（支持 <PR号|分支名> / -C <dir> / --force / --check-only / --review-record=<文件> / --checks-file=<文件> / --no-review --reason=<文本>）" ;;
    *)  TARGET="${a}" ;;
  esac
done
resolve_work_dir

if [[ $NO_REVIEW -eq 1 && -n "$RECORD" ]]; then
  die "--review-record 与 --no-review 不能同时使用（二选一）"
fi

# —— root 取主工作区（记录/审计落在主仓，不是随 worktree 一起被删的临时目录） ——
# git 保证 worktree list 的第一条是主工作区；-C 只影响「在哪个工作区找分支」，不影响 root。
MAIN_WT=$(git -C "${WORK_DIR}" worktree list --porcelain | awk '/^worktree /{print $2; exit}')
[[ -n "${MAIN_WT}" ]] || die "找不到主工作区"

# —— 目标 PR：包要求 --pr 是正整数，分支名/当前分支在这里先解析成 PR 号 ——
PR=""
if [[ -n "${TARGET}" ]]; then
  if [[ "${TARGET}" =~ ^[0-9]+$ ]]; then
    PR="${TARGET}"
  else
    PR=$(gh pr view "${TARGET}" --repo "${GH_REPO}" --json number -q .number 2>/dev/null) || PR=""
  fi
else
  BRANCH=$(git -C "${WORK_DIR}" branch --show-current) || BRANCH=""
  [[ "${BRANCH}" == task/* ]] \
    || die "在 task/* 分支（worktree）内运行，或用 <PR号|分支名> 指定目标"
  PR=$(gh pr view "${BRANCH}" --repo "${GH_REPO}" --json number -q .number 2>/dev/null) || PR=""
fi
[[ -n "${PR}" ]] || die "找不到 PR: ${TARGET:-$(git -C "${WORK_DIR}" branch --show-current)}"

# —— 只做参数映射，不做任何判定（判定全在包里）——
set -- merge --pr "${PR}" --root "${MAIN_WT}"
if [[ $HAS_RECORD -eq 1 ]]; then set -- "$@" --record "${RECORD}"; fi
if [[ $HAS_CHECKS -eq 1 ]]; then set -- "$@" --checks-file "${CHECKS_FILE}"; fi
if [[ $HAS_REASON -eq 1 ]]; then set -- "$@" --reason "${REASON}"; fi
if [[ $NO_REVIEW -eq 1 ]]; then set -- "$@" --no-review; fi
if [[ $CHECK_ONLY -eq 1 ]]; then set -- "$@" --check-only; fi
if [[ $FORCE -eq 1 ]]; then set -- "$@" --force; fi

info "共享 pipeline 包: ${PIPELINE_HOME}"
info "转发: node ${PIPELINE_CLI_PATH} $*"

set +e
node "${PIPELINE_CLI_PATH}" "$@"
RC=$?
set -e
exit "${RC}"
