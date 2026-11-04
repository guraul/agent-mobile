#!/usr/bin/env bash
# review.sh — 薄转发：审核的准备与判定落盘交给共享包 @guraul/dsh-pipeline
#
# 为什么只剩一个壳: 自 issue #194 起，「读 PR 的 head/diff 生成审核请求 / 把判定写成
#   审核记录」的唯一实现是共享包 dsh-pipeline 的 review 子命令；此前这一步没有脚本入口，
#   审核记录只能手敲包的 record 子命令拼参数。本仓只保留参数校验与转发（由来同 merge-pr.sh）。
#
# 用法:
#   scripts/pipeline/review.sh prepare <PR号> [--model <m>]
#   scripts/pipeline/review.sh publish <PR号> --response <文件> [--round <n>] [--model <m>] [--provider <p>] [--form <f>]
#   scripts/pipeline/review.sh <动作> ... -C <dir>     # 指定目标工作区（同 --worktree）
#
# 参数映射: <PR号> → 包的 --pr；-C/--worktree <dir> → parse_target_dir → resolve_work_dir
#   → 包的 --root（缺省为脚本所在仓库，cwd 不参与，issue #108）；
#   --model / --round / --provider / --form / --response 原样追加，
#   --flag=值 与 --flag 值 两种写法都支持（同 merge-pr.sh）。
#   prepare 只接受 --model；publish 必须给 --response；其余判定全在包里。
#
# 退出码: 0 成功 / 1 环境错误（die：缺 gh、缺共享包、目标目录不存在）/
#   2 用法错误（usage，缺参/未知参数）/ 其它为包的退出码原样透传（包也用 2 表示用法错误）。
#
# 包位置（顺序固定，解析只在 lib.sh 的 resolve_pipeline_cli 里实现一次）:
#   ① $DSH_PIPELINE_HOME；② 主工作区 tools/node_modules/dsh-pipeline（worktree 场景）；
#   ③ 当前脚本所属仓 tools/node_modules/dsh-pipeline（非 worktree）。
source "$(dirname "$0")/lib.sh"

usage() {
  if [[ $# -ge 1 ]]; then printf '✗ %s\n' "$1" >&2; fi
  cat >&2 <<'USAGE'
用法:
  scripts/pipeline/review.sh prepare <PR号> [--model <m>]
  scripts/pipeline/review.sh publish <PR号> --response <文件> [--round <n>] [--model <m>] [--provider <p>] [--form <f>]
  scripts/pipeline/review.sh <动作> ... -C <dir>      # 指定目标工作区（同 --worktree）
USAGE
  exit 2
}

require_gh
require_pipeline_pkg

# —— 动作与 PR 号（位置参数在前，旗标在后；校验写法同 merge-pr.sh 的循环）——
ACTION="${1:-}"
case "${ACTION}" in
  prepare|publish) shift ;;
  "")              usage "缺少动作（prepare / publish）" ;;
  *)               usage "未知动作: ${ACTION}（允许 prepare / publish）" ;;
esac
[[ $# -ge 1 ]] || usage "缺少 <PR号>"
PR="$1"; shift
[[ "${PR}" =~ ^[1-9][0-9]*$ ]] || usage "<PR号> 需要正整数: ${PR}"

HAS_MODEL=0; HAS_RESPONSE=0; HAS_ROUND=0; HAS_PROVIDER=0; HAS_FORM=0
MODEL=""; RESPONSE=""; ROUND=""; PROVIDER=""; FORM=""
TARGET_ARGS=()   # -C/--worktree 原样收集，稍后交给 lib.sh 的 parse_target_dir
while [[ $# -gt 0 ]]; do
  a="$1"; shift
  case "${a}" in
    --model=*)    MODEL="${a#*=}";    HAS_MODEL=1 ;;
    --response=*) RESPONSE="${a#*=}"; HAS_RESPONSE=1 ;;
    --round=*)    ROUND="${a#*=}";    HAS_ROUND=1 ;;
    --provider=*) PROVIDER="${a#*=}"; HAS_PROVIDER=1 ;;
    --form=*)     FORM="${a#*=}";     HAS_FORM=1 ;;
    --model|--response|--round|--provider|--form)
      [[ $# -ge 1 ]] || usage "${a} 缺少取值"
      case "${a}" in
        --model)    MODEL="$1";    HAS_MODEL=1 ;;
        --response) RESPONSE="$1"; HAS_RESPONSE=1 ;;
        --round)    ROUND="$1";    HAS_ROUND=1 ;;
        --provider) PROVIDER="$1"; HAS_PROVIDER=1 ;;
        --form)     FORM="$1";     HAS_FORM=1 ;;
      esac
      shift ;;
    -C|--worktree)
      [[ $# -ge 1 ]] || usage "${a} 缺少取值"
      TARGET_ARGS+=("$a" "$1"); shift ;;
    --worktree=*) TARGET_ARGS+=("$a") ;;
    -*) usage "未知参数: ${a}" ;;
    *)  usage "多余的位置参数: ${a}" ;;
  esac
done

# —— 动作各自的必填/允许项：在壳里先拒，省掉一次包调用（判定仍在包里）——
if [[ "${ACTION}" == "prepare" ]]; then
  [[ $HAS_RESPONSE -eq 0 && $HAS_ROUND -eq 0 && $HAS_PROVIDER -eq 0 && $HAS_FORM -eq 0 ]] \
    || usage "prepare 只支持 --model"
else
  [[ $HAS_RESPONSE -eq 1 && -n "${RESPONSE}" ]] || usage "publish 必须给 --response <文件>"
fi

if [[ ${#TARGET_ARGS[@]} -gt 0 ]]; then
  parse_target_dir "${TARGET_ARGS[@]}"
else
  parse_target_dir
fi
resolve_work_dir

# —— 只做参数映射，不做任何判定（判定全在包里）——
set -- review "${ACTION}" --pr "${PR}" --root "${WORK_DIR}"
if [[ "${ACTION}" == "publish" ]]; then set -- "$@" --response "${RESPONSE}"; fi
if [[ $HAS_ROUND -eq 1 ]];     then set -- "$@" --round "${ROUND}"; fi
if [[ $HAS_MODEL -eq 1 ]];     then set -- "$@" --model "${MODEL}"; fi
if [[ $HAS_PROVIDER -eq 1 ]];  then set -- "$@" --provider "${PROVIDER}"; fi
if [[ $HAS_FORM -eq 1 ]];      then set -- "$@" --form "${FORM}"; fi

info "共享 pipeline 包: ${PIPELINE_HOME}"
info "转发: node ${PIPELINE_CLI_PATH} $*"

set +e
node "${PIPELINE_CLI_PATH}" "$@"
RC=$?
set -e
exit "${RC}"
