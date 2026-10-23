#!/usr/bin/env bash
# test-open-pr.sh — open-pr.sh 的行为自检（issue #108）
#
# 用法: bash scripts/pipeline/test-open-pr.sh
#
# 原理: 临时目录里伪造 git/gh（argv 记入日志、按剧本回放），把 open-pr.sh 的四种运行形态
#       各跑一遍，再对日志做断言。**全程不碰真实 git 远端与 GitHub**。
#   ① 主工作区运行（分支 main）                    → 拒绝（退出码非 0），不 push、不建 PR
#   ② worktree 内运行（task/*）                    → 通过，push / PR 都指向该 worktree
#   ③ 从主工作区用绝对路径调用 worktree 里的脚本   → 解析到 worktree（而不是 main）
#   ④ 主工作区脚本 + `-C <worktree>`               → 同上
#   ⑤ 目标 detached HEAD                           → 明确报错
# 约定: 断言失败打印失败项 + 实际命令日志，退出码非 0；全部通过退出 0。

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SUT="$HERE/open-pr.sh"
[[ -f "$SUT" && -f "$HERE/lib.sh" ]] || { echo "✗ 缺少 $HERE/open-pr.sh 或 lib.sh" >&2; exit 2; }

# pwd -P 归一化：macOS 的 /var → /private/var 会让路径字符串比对（日志断言）失配
TMP="$(mktemp -d "${TMPDIR:-/tmp}/open-pr-selftest.XXXXXX")"
TMP="$(cd "$TMP" && pwd -P)"
trap 'rm -rf "$TMP"' EXIT

BRANCH="task/108-fix-pipeline-open-pr-sh-worktree-main-di"
TITLE="fix(pipeline): 自检桩标题"
FAKE_MAIN="$TMP/main"
FAKE_WT="$FAKE_MAIN/.worktrees/108-fix-pipeline"
FAKE_DETACHED="$TMP/detached"
SHIM_LOG="$TMP/cmd.log"
mkdir -p "$TMP/bin" "$FAKE_MAIN" "$FAKE_WT" "$FAKE_DETACHED"

# 三个"工作区"里各放一份脚本副本，模拟 git worktree 的真实布局
for d in "$FAKE_MAIN" "$FAKE_WT" "$FAKE_DETACHED"; do
  mkdir -p "$d/scripts/pipeline"
  cp "$HERE/lib.sh" "$HERE/open-pr.sh" "$d/scripts/pipeline/"
done

# —— 伪造 git：`-C <dir>` 决定回放哪个工作区；写操作一律视为成功 ——
cat > "$TMP/bin/git" <<'SHIM'
#!/usr/bin/env bash
printf 'git %s\n' "$*" >> "$SHIM_LOG"
dir=""; sub=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -C) dir="$2"; shift 2 ;;
    *)  sub[${#sub[@]}]="$1"; shift ;;
  esac
done

map_root() {
  local d="$1"
  case "$d" in
    "$FAKE_WT"|"$FAKE_WT"/*)             printf '%s' "$FAKE_WT" ;;
    "$FAKE_DETACHED"|"$FAKE_DETACHED"/*) printf '%s' "$FAKE_DETACHED" ;;
    "$FAKE_MAIN"|"$FAKE_MAIN"/*)         printf '%s' "$FAKE_MAIN" ;;
    *)                                   printf '%s' "$FAKE_MAIN" ;;
  esac
}
map_branch() {
  case "$1" in
    "$FAKE_WT")       printf '%s' "$FAKE_BRANCH" ;;
    "$FAKE_MAIN")     printf 'main' ;;
    *)                printf 'HEAD' ;;
  esac
}

root="$(map_root "${dir:-$PWD}")"
case "${sub[0]:-}" in
  rev-parse)
    case "${sub[1]:-}" in
      --show-toplevel) printf '%s\n' "$root" ;;
      --abbrev-ref)    printf '%s\n' "$(map_branch "$root")" ;;
      *)               printf '%s\n' "$root" ;;
    esac ;;
  branch)   printf '%s\n' "$(map_branch "$root")" ;;
  status)   : ;;                                     # 工作区干净
  push)     : ;;                                     # 推送成功
  *)        : ;;
esac
exit 0
SHIM

# —— 伪造 gh（issue 标题可读；pr create 回放假 URL）——
cat > "$TMP/bin/gh" <<'SHIM'
#!/usr/bin/env bash
printf 'gh %s\n' "$*" >> "$SHIM_LOG"
if [[ "${1:-}" == "issue" && "${2:-}" == "view" ]]; then
  printf '%s\n' "$FAKE_TITLE"; exit 0
fi
if [[ "${1:-}" == "pr" && "${2:-}" == "create" ]]; then
  printf 'https://github.com/guraul/agent-mobile/pull/999\n'; exit 0
fi
exit 0
SHIM

chmod +x "$TMP/bin/git" "$TMP/bin/gh"

FAIL=0
RC=0

# run_sut <cwd> <脚本路径> [参数...]
run_sut() {
  local cwd="$1" sut="$2"; shift 2
  : > "$SHIM_LOG"
  ( cd "$cwd" && env PATH="$TMP/bin:$PATH" \
      FAKE_MAIN="$FAKE_MAIN" FAKE_WT="$FAKE_WT" FAKE_DETACHED="$FAKE_DETACHED" \
      FAKE_BRANCH="$BRANCH" FAKE_TITLE="$TITLE" SHIM_LOG="$SHIM_LOG" \
      bash "$sut" "$@" ) >"$TMP/sut.out" 2>&1
  RC=$?
}

expect_rc() { [[ $RC -eq $1 ]] || { echo "  ✗ 退出码应为 $1，实为 $RC"; FAIL=1; }; }
has()      { grep -Fxq -- "$1" "$SHIM_LOG" || { echo "  ✗ 应出现: $1（$2）"; FAIL=1; }; }
hasnt_sub(){ grep -Fq -- "$1" "$SHIM_LOG" && { echo "  ✗ 不应出现: $1（$2）"; FAIL=1; }; return 0; }
has_sub()  { grep -Fq -- "$1" "$SHIM_LOG" || { echo "  ✗ 应出现: $1（$2）"; FAIL=1; }; }
out_has()  { grep -Fq -- "$1" "$TMP/sut.out" || { echo "  ✗ 输出应含: $1（$2）"; FAIL=1; }; }

# ═══ ① 主工作区运行：必须拒绝 ═══
echo "── ① 主工作区形态: bash open-pr.sh（cwd=main，分支 main）"
run_sut "$FAKE_MAIN" "$FAKE_MAIN/scripts/pipeline/open-pr.sh"
echo "  退出码: $RC"
[[ $RC -ne 0 ]] || { echo "  ✗ 应拒绝（退出码非 0），实际通过"; FAIL=1; }
out_has "目标工作区: ${FAKE_MAIN}"                       "报错应带解析到的仓库路径"
out_has "分支: main"                                     "报错应带当前分支"
out_has "调用 cwd: ${FAKE_MAIN}"                         "报错应带调用 cwd"
hasnt_sub " push "                                       "拒绝时不得 push"
hasnt_sub "gh pr create"                                 "拒绝时不得建 PR"

# ═══ ② worktree 内运行：通过 ═══
echo "── ② worktree 形态: bash open-pr.sh（cwd=worktree，分支 ${BRANCH}）"
run_sut "$FAKE_WT" "$FAKE_WT/scripts/pipeline/open-pr.sh"
echo "  退出码: $RC"
expect_rc 0
has "git -C ${FAKE_WT} push -u origin ${BRANCH}"         "push 指向 worktree"
has_sub "gh pr create --repo guraul/agent-mobile --base main --head ${BRANCH}" "PR head 为本任务分支"
has_sub "--body Closes #108"                             "PR body 首行 Closes #108"

# ═══ ③ 主工作区 cwd + 绝对路径调 worktree 里的脚本：解析到 worktree ═══
echo "── ③ 跨目录形态: cwd=main，执行 ${FAKE_WT##*/}/scripts/pipeline/open-pr.sh"
run_sut "$FAKE_MAIN" "$FAKE_WT/scripts/pipeline/open-pr.sh"
echo "  退出码: $RC"
expect_rc 0
has "git -C ${FAKE_WT} push -u origin ${BRANCH}"         "按脚本位置解析到 worktree（#108 修复点）"
hasnt_sub "git -C ${FAKE_MAIN} push"                     "不得按 cwd 取主工作区"

# ═══ ④ 主工作区脚本 + -C：显式覆盖优先于脚本位置 ═══
echo "── ④ 显式形态: cwd=main，bash open-pr.sh -C ${FAKE_WT##*/}"
run_sut "$FAKE_MAIN" "$FAKE_MAIN/scripts/pipeline/open-pr.sh" -C "$FAKE_WT"
echo "  退出码: $RC"
expect_rc 0
has "git -C ${FAKE_WT} push -u origin ${BRANCH}"         "-C 指定的 worktree 生效"
hasnt_sub "git -C ${FAKE_MAIN} push"                     "不得落到脚本所在的 main"

# ═══ ⑤ detached HEAD：明确报错 ═══
echo "── ⑤ detached 形态: cwd=main，bash open-pr.sh --worktree detached"
: > "$SHIM_LOG"
( cd "$FAKE_MAIN" && env PATH="$TMP/bin:$PATH" \
    FAKE_MAIN="$FAKE_MAIN" FAKE_WT="$FAKE_WT" FAKE_DETACHED="$FAKE_DETACHED" \
    FAKE_BRANCH="$BRANCH" FAKE_TITLE="$TITLE" SHIM_LOG="$SHIM_LOG" \
    bash "$FAKE_MAIN/scripts/pipeline/open-pr.sh" --worktree "$FAKE_DETACHED" ) >"$TMP/sut.out" 2>&1
RC=$?
echo "  退出码: $RC"
[[ $RC -ne 0 ]] || { echo "  ✗ detached HEAD 应报错"; FAIL=1; }
out_has "detached HEAD"                                  "应说明 detached 原因"
out_has "目标工作区: ${FAKE_DETACHED}"                   "报错应带解析到的仓库路径"
hasnt_sub " push "                                       "detached 时不得 push"

if [[ $FAIL -ne 0 ]]; then
  echo
  echo "✗ 自检失败（被测脚本: ${SUT}）——实际执行的命令："
  sed 's/^/    /' "$SHIM_LOG"
  echo "  --- 被测脚本输出 ---"
  sed 's/^/    /' "$TMP/sut.out"
  exit 1
fi

echo
echo "✓ 自检通过：主工作区会拒绝且报错带上下文；worktree / 跨目录 / -C 三种形态都解析到 worktree；detached 报错"
exit 0
