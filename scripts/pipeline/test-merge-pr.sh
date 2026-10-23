#!/usr/bin/env bash
# test-merge-pr.sh — merge-pr.sh 的行为自检（issue #102）
#
# 用法: bash scripts/pipeline/test-merge-pr.sh [被测脚本路径]
#       该参数可选，默认同目录的 merge-pr.sh（用于拿旧版本做反证对照）
#
# 原理: 在临时目录里伪造 git/gh（argv 记入日志、按剧本回放），把 merge-pr.sh 的两种
#       运行形态各跑一遍，再对日志做断言。**全程不碰真实 git 远端与 GitHub**。
#   ① 主工作区形态: 指定 PR 号 → 必须移除持有该分支的 worktree、删本地分支、快进 main
#   ② worktree 形态: 自动识别当前分支的 PR → 既有行为不变（不反向清理主仓）
# 约定: 断言失败打印失败项 + 实际命令日志，退出码非 0；全部通过退出 0。

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SUT="${1:-$HERE/merge-pr.sh}"
[[ -f "$SUT" ]] || { echo "✗ 找不到被测脚本: $SUT" >&2; exit 2; }
[[ -f "$HERE/lib.sh" ]] || { echo "✗ 缺少 $HERE/lib.sh（被测脚本需与 lib.sh 同目录）" >&2; exit 2; }

TMP="$(mktemp -d "${TMPDIR:-/tmp}/merge-pr-selftest.XXXXXX")"
TMP="$(cd "$TMP" && pwd -P)"   # macOS /var → /private/var：归一化，避免与脚本内 pwd -P 比对失配
trap 'rm -rf "$TMP"' EXIT

REPO_SLUG="guraul/agent-mobile"
BRANCH="task/102-fix-pipeline-merge-pr-sh-worktree-main"
FAKE_MAIN="$TMP/main"                              # 伪造的主工作区（检出 main）
FAKE_WT="$FAKE_MAIN/.worktrees/102-fix-pipeline"   # 伪造的任务 worktree（检出 BRANCH）
FAKE_WT_LIST="$TMP/worktree-list.txt"
SHIM_LOG="$TMP/cmd.log"
mkdir -p "$TMP/bin" "$FAKE_WT"

# 剧本：worktree 列表（仓库级，两种形态相同）
cat > "$FAKE_WT_LIST" <<EOF
worktree ${FAKE_MAIN}
HEAD aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111
branch refs/heads/main

worktree ${FAKE_WT}
HEAD bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222
branch refs/heads/${BRANCH}

EOF

# —— 伪造 git（记录 argv；回放剧本；一切写操作视为成功）——
cat > "$TMP/bin/git" <<'SHIM'
#!/usr/bin/env bash
printf 'git %s\n' "$*" >> "$SHIM_LOG"
sub=()
skip=0
for a in "$@"; do
  if [[ $skip -eq 1 ]]; then skip=0; continue; fi
  if [[ "$a" == "-C" ]]; then skip=1; continue; fi
  sub[${#sub[@]}]="$a"
done
case "${sub[0]:-}" in
  rev-parse) printf '%s\n' "$FAKE_ROOT" ;;
  branch)    [[ "${sub[1]:-}" == "--show-current" ]] && printf '%s\n' "$FAKE_BRANCH" ;;
  worktree)  [[ "${sub[1]:-}" == "list" ]] && cat "$FAKE_WT_LIST" ;;
  log)       printf '%s\n' "$FAKE_MAIN_SHA 假提交（自检桩）" ;;
  *)         : ;;
esac
exit 0
SHIM

# —— 伪造 gh（PR #102 已 OPEN；无 CI checks；其余回放成功）——
cat > "$TMP/bin/gh" <<'SHIM'
#!/usr/bin/env bash
printf 'gh %s\n' "$*" >> "$SHIM_LOG"
if [[ "${1:-}" == "pr" && "${2:-}" == "view" ]]; then
  field=""; prev=""
  for a in "$@"; do
    [[ "$prev" == "--json" ]] && field="$a"
    prev="$a"
  done
  case "$field" in
    number)      printf '102\n' ;;
    headRefName) printf '%s\n' "$FAKE_BRANCH" ;;
    state)       printf 'OPEN\n' ;;
    title)       printf 'fix(pipeline): 自检桩标题 (#102)\n' ;;
    *)           printf '\n' ;;
  esac
  exit 0
fi
if [[ "${1:-}" == "pr" && "${2:-}" == "checks" ]]; then exit 1; fi   # 无 checks → CI 门槛自动跳过
exit 0
SHIM

chmod +x "$TMP/bin/git" "$TMP/bin/gh"

FAIL=0
RC=0

# run_sut <cwd> <fake_root> [merge-pr 参数...]
run_sut() {
  local cwd="$1" root="$2"; shift 2
  : > "$SHIM_LOG"
  ( cd "$cwd" && env PATH="$TMP/bin:$PATH" \
      FAKE_ROOT="$root" FAKE_MAIN="$FAKE_MAIN" FAKE_WT="$FAKE_WT" \
      FAKE_BRANCH="$BRANCH" FAKE_WT_LIST="$FAKE_WT_LIST" \
      FAKE_MAIN_SHA="cccc3333" SHIM_LOG="$SHIM_LOG" \
      bash "$SUT" "$@" ) >"$TMP/sut.out" 2>&1
  RC=$?
}

# 整行匹配（日志每行 = 一条完整命令），避免 worktree 路径前缀造成误判
has()  { grep -Fxq -- "$1" "$SHIM_LOG" || { echo "  ✗ 应出现: $1（$2）"; FAIL=1; }; }
hasnt(){ grep -Fxq -- "$1" "$SHIM_LOG" && { echo "  ✗ 不应出现: $1（$2）"; FAIL=1; }; return 0; }

# ═══ ① 主工作区形态：指定 PR 号 ═══
echo "── ① 主工作区形态: bash merge-pr.sh 102（cwd=${FAKE_MAIN##*/}）"
run_sut "$FAKE_MAIN" "$FAKE_MAIN" 102
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || { echo "  ✗ 退出码应为 0，实为 $RC"; FAIL=1; }
has "gh pr merge 102 --repo ${REPO_SLUG} --squash"                     "squash 合并"
has "git -C ${FAKE_MAIN} push origin --delete ${BRANCH}"               "删远端分支"
has "git -C ${FAKE_MAIN} worktree remove --force ${FAKE_WT}"           "清理任务 worktree（#102 修复点）"
has "git -C ${FAKE_MAIN} branch -D ${BRANCH}"                          "删本地任务分支"
has "git -C ${FAKE_MAIN} pull --ff-only origin main --quiet"           "快进主工作区 main（#102 修复点）"
hasnt "git -C ${FAKE_MAIN} worktree remove --force ${FAKE_MAIN}"       "不得移除主工作区本身"
hasnt "git -C ${FAKE_MAIN} branch -D main"                             "不得删 main 分支"

# ═══ ② worktree 形态：无参数自动识别当前分支的 PR ═══
echo "── ② worktree 形态: bash merge-pr.sh（cwd=${FAKE_WT##*/}，自动识别分支）"
run_sut "$FAKE_WT" "$FAKE_WT"
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || { echo "  ✗ 退出码应为 0，实为 $RC"; FAIL=1; }
has "git -C ${FAKE_WT} branch --show-current"                          "自动识别当前分支（取目标工作区）"
has "gh pr merge 102 --repo ${REPO_SLUG} --squash"                     "squash 合并"
has "git -C ${FAKE_MAIN} worktree remove --force ${FAKE_WT}"           "既有行为: 清理该 worktree"
has "git -C ${FAKE_MAIN} branch -D ${BRANCH}"                          "既有行为: 删本地任务分支"
has "git -C ${FAKE_MAIN} pull --ff-only origin main --quiet"           "既有行为: 快进主工作区 main"
hasnt "git -C ${FAKE_MAIN} worktree remove --force ${FAKE_MAIN}"       "不反向清理主仓 worktree"
hasnt "git -C ${FAKE_MAIN} branch -D main"                             "不反向清理 main 分支"

if [[ $FAIL -ne 0 ]]; then
  echo
  echo "✗ 自检失败（被测脚本: ${SUT}）——实际执行的命令："
  sed 's/^/    /' "$SHIM_LOG"
  echo "  --- 被测脚本输出 ---"
  sed 's/^/    /' "$TMP/sut.out"
  exit 1
fi

echo
echo "✓ 自检通过：主工作区形态会清理 worktree/本地分支并快进 main；worktree 形态行为不变"
exit 0
