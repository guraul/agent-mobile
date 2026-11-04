#!/usr/bin/env bash
# test-review.sh — review.sh 的**转发契约**自检（issue #194）
#
# 用法: bash scripts/pipeline/test-review.sh [被测脚本路径]
#       该参数可选，默认同目录的 review.sh（用于拿旧版本做反证对照）
#
# 原理: 临时目录里伪造 git/gh/node 与一个假的 dsh-pipeline 包（argv 记入日志、按剧本回放），
#       把 review.sh 的几种运行形态各跑一遍，再对日志做断言。**全程不碰真实 git 远端、GitHub 与真包**。
#       假 git 的 `worktree list --porcelain` 输出两条：主工作区 $TMP/repo（第一条）与
#       当前 worktree $TMP/repo-wt（脚本所在仓）——两条不同才能验出 root 取的是哪一条。
#   ① prepare 正常            → 包收到 `review prepare --pr <号> --root <主工作区>`（不是脚本所在 worktree，cwd 也不参与）
#   ② prepare --model 两种写法 → --model 追加给包（--model <m> 与 --model=<m> 等价）
#   ③ publish 全参数           → `review publish --pr <号> --root <主工作区> --response <文件>` + 其余原样追加
#   ④ -C 形态                 → -C 只决定 WORK_DIR（git -C 查询落点），--root 仍是主工作区
#   ⑤ 缺参                    → usage 退出 2，且不调用包（无动作 / prepare 缺 PR号 / publish 缺 --response）
#   ⑥ 包退出码非 0            → 原样透传（不吞错误）
#   ⑦ 包缺失                  → 拒绝执行并给出试过的路径，连 node 都不调
#   ⑧ 空取值                  → --response= / --model= / --round= / --provider= / --form= 拒绝（usage 退出 2，不调用包）
# 说明: 请求生成与记录落盘的**行为**由包自测覆盖（dsh-pipeline 的 node --test），本脚本只验转发壳。
#       ⑤ 断言退出 2——壳自身的用法错误走 usage（exit 2，与包的用法错误码一致）；环境错误（die）才是 1。
# 约定: 断言失败打印失败项 + 实际命令日志，退出码非 0；全部通过退出 0。

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SUT="${1:-$HERE/review.sh}"
[[ -f "$SUT" ]] || { echo "✗ 找不到被测脚本: $SUT" >&2; exit 2; }
[[ -f "$HERE/lib.sh" ]] || { echo "✗ 缺少 $HERE/lib.sh（被测脚本需与 lib.sh 同目录）" >&2; exit 2; }

# pwd -P 归一化：macOS 的 /var → /private/var 会让路径字符串比对（日志断言）失配
TMP="$(mktemp -d "${TMPDIR:-/tmp}/review-selftest.XXXXXX")"
TMP="$(cd "$TMP" && pwd -P)"
CWD="$TMP/cwd"
trap 'rm -rf "$TMP"' EXIT

FAKE_MAIN="$TMP/repo"                     # 伪造的主工作区（worktree list 第一条）
FAKE_WT="$TMP/repo-wt"                    # 伪造的当前 worktree（脚本所在仓，worktree list 第二条）
FAKE_TARGET="$TMP/target-wt"              # -C 指向的目标工作区
FAKE_WT_LIST="$TMP/worktree-list.txt"
SHIM_LOG="$TMP/cmd.log"
RESP="$TMP/response.md"
PKG_HOME="$TMP/pkg/dsh-pipeline"
PKG_HIDDEN="$TMP/pkg-hidden"
PKG_CLI="$PKG_HOME/bin/cli.mjs"
mkdir -p "$TMP/bin" "$CWD" "$FAKE_WT/scripts/pipeline" "$FAKE_TARGET" "$(dirname "$PKG_CLI")" "$FAKE_MAIN/.git"
: > "$PKG_CLI"
printf '# 判定: APPROVE\n' > "$RESP"

# 剧本：worktree 列表（主工作区排第一条，与 git 的实际顺序一致）
cat > "$FAKE_WT_LIST" <<EOF
worktree ${FAKE_MAIN}
HEAD aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111
branch refs/heads/main

worktree ${FAKE_WT}
HEAD bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222
branch refs/heads/task/194-chore-pipeline-review-sh-prepare-publish

EOF

# 脚本副本放进伪造的 worktree，模拟「脚本自身位置」解析（REPO_ROOT 取脚本所在仓 = worktree）
cp "$HERE/lib.sh" "$SUT" "$FAKE_WT/scripts/pipeline/"
SUT_COPY="$FAKE_WT/scripts/pipeline/$(basename "$SUT")"

# run_sut 借 mv 隐藏包目录来模拟「包缺失」；中途被杀会把它停在 $PKG_HIDDEN。
# 退出时先兜底挪回原位，再删临时目录——否则残留的隐藏目录会让后续排查误以为包真的丢了。
restore_pkg() {
  [[ -d "$PKG_HIDDEN" && ! -e "$PKG_HOME" ]] && mv "$PKG_HIDDEN" "$PKG_HOME"
  return 0
}
trap 'restore_pkg; rm -rf "$TMP"' EXIT

# —— 伪造 git：回答 lib.sh 需要的两条（toplevel / common-dir），回放 worktree 列表，写操作一律视为成功 ——
cat > "$TMP/bin/git" <<'SHIM'
#!/usr/bin/env bash
printf 'git %s\n' "$*" >> "$SHIM_LOG"
dir=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -C) dir="$2"; shift 2 ;;
    *)  break ;;
  esac
done
case "${1:-}" in
  rev-parse)
    case "${2:-}" in
      --show-toplevel)  printf '%s\n' "$FAKE_WT" ;;
      --git-common-dir) printf '%s\n' "$FAKE_MAIN/.git" ;;
      --abbrev-ref)     printf 'main\n' ;;
      *)                printf '%s\n' "${dir:-$FAKE_WT}" ;;
    esac ;;
  worktree)
    # worktree list --porcelain：主工作区第一条、当前 worktree 第二条（脚本所在仓）
    [[ "${2:-}" == "list" ]] && cat "$FAKE_WT_LIST"
    ;;
  *) : ;;
esac
exit 0
SHIM

# —— 伪造 gh（本壳只做 command -v 检查，不实际调用）——
cat > "$TMP/bin/gh" <<'SHIM'
#!/usr/bin/env bash
printf 'gh %s\n' "$*" >> "$SHIM_LOG"
exit 0
SHIM

# —— 伪造 node（共享包的替身：只记录 argv，按 FAKE_PKG_RC 回放）——
cat > "$TMP/bin/node" <<'SHIM'
#!/usr/bin/env bash
printf 'node %s\n' "$*" >> "$SHIM_LOG"
if [[ "${FAKE_PKG_RC:-0}" != "0" ]]; then
  echo "review: 自检桩拒绝（FAKE_PKG_RC=${FAKE_PKG_RC}）" >&2
  exit "$FAKE_PKG_RC"
fi
exit 0
SHIM

chmod +x "$TMP/bin/git" "$TMP/bin/gh" "$TMP/bin/node"

FAIL=0
RC=0
PKG_RC=0
HIDE_PKG=0

# run_sut [review 参数...]（cwd 固定在 $TMP：证明默认 root 与 cwd 无关）
run_sut() {
  : > "$SHIM_LOG"
  if [[ $HIDE_PKG -eq 1 ]]; then mv "$PKG_HOME" "$PKG_HIDDEN"; fi
  ( cd "$CWD" && env PATH="$TMP/bin:$PATH" \
      DSH_PIPELINE_HOME="$PKG_HOME" \
      FAKE_MAIN="$FAKE_MAIN" FAKE_WT="$FAKE_WT" FAKE_WT_LIST="$FAKE_WT_LIST" \
      FAKE_PKG_RC="$PKG_RC" SHIM_LOG="$SHIM_LOG" \
      bash "$SUT_COPY" "$@" ) >"$TMP/sut.out" 2>&1
  RC=$?
  if [[ $HIDE_PKG -eq 1 ]]; then mv "$PKG_HIDDEN" "$PKG_HOME"; fi
}

has_line() { grep -Fxq -- "$1" "$SHIM_LOG" || { echo "  ✗ 应出现: ${1}（${2}）"; FAIL=1; }; }
hasnt_sub(){ grep -Fq -- "$1" "$SHIM_LOG" && { echo "  ✗ 不应出现子串: ${1}（${2}）"; FAIL=1; }; return 0; }
out_has()  { grep -Fq -- "$1" "$TMP/sut.out" || { echo "  ✗ 输出应含: ${1}（${2}）"; FAIL=1; }; }
wrong()    { echo "  ✗ $1"; FAIL=1; }

# ═══ ① prepare 正常：root = 主工作区（worktree list 第一条），不是脚本所在 worktree ═══
echo "── ① prepare 形态: review.sh prepare 7（脚本所在仓=${FAKE_WT}，主工作区=${FAKE_MAIN}，cwd=${CWD}）"
PKG_RC=0
run_sut prepare 7
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "node ${PKG_CLI} review prepare --pr 7 --root ${FAKE_MAIN}"  "prepare 转发 + root 取主工作区（worktree list 第一条）"
hasnt_sub "--root ${FAKE_WT}"                                        "root 不得取成脚本所在 worktree（取成它时上面的 has_line 即失败）"
hasnt_sub "review prepare --pr 7 --root ${CWD}"                      "不得按 cwd 取根目录"

# ═══ ② prepare --model：两种写法等价 ═══
echo "── ② prepare --model: --model mimo 与 --model=mimo"
PKG_RC=0
run_sut prepare 7 --model mimo
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "node ${PKG_CLI} review prepare --pr 7 --root ${FAKE_MAIN} --model mimo" "--model 值形态追加给包"

PKG_RC=0
run_sut prepare 7 --model=mimo
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "node ${PKG_CLI} review prepare --pr 7 --root ${FAKE_MAIN} --model mimo" "--model=值 写法等价"

# ═══ ③ publish 全参数：--response 必带，其余按需追加 ═══
echo "── ③ publish 形态: review.sh publish 7 --response … --round 2 --model m --provider p --form f"
PKG_RC=0
run_sut publish 7 --response "$RESP" --round 2 --model m --provider p --form f
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "node ${PKG_CLI} review publish --pr 7 --root ${FAKE_MAIN} --response ${RESP} --round 2 --model m --provider p --form f" "publish 全参数顺序原样转发"

PKG_RC=0
run_sut publish 7 "--response=$RESP" --round=2
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "node ${PKG_CLI} review publish --pr 7 --root ${FAKE_MAIN} --response ${RESP} --round 2" "--flag=值 写法等价"

# ═══ ④ -C 形态：只决定 WORK_DIR（git -C 查询落点），--root 仍是主工作区 ═══
echo "── ④ -C 形态: review.sh prepare 7 -C ${FAKE_TARGET}"
PKG_RC=0
run_sut prepare 7 -C "$FAKE_TARGET"
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "git -C ${FAKE_TARGET} worktree list --porcelain"           "-C 决定 git 查询落在哪个工作区（WORK_DIR）"
has_line "node ${PKG_CLI} review prepare --pr 7 --root ${FAKE_MAIN}" "-C 不改变 --root：仍是主工作区（issue #108 的 -C 不参与 root）"
hasnt_sub "--root ${FAKE_TARGET}"                                    "root 不得取成 -C 指定的目录"
hasnt_sub "review prepare --pr 7 --root ${FAKE_WT}"                  "root 也不得取成脚本所在 worktree"

# ═══ ⑤ 缺参：usage 退出 2，且不调用包 ═══
echo "── ⑤ 缺参: 无动作 / prepare 缺 PR号 / publish 缺 --response"
PKG_RC=0
run_sut
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "无动作应退出 2（usage），实为 $RC"
out_has "用法:"                                          "应打印用法"
hasnt_sub "node "                                        "缺参时不应调用包"

PKG_RC=0
run_sut prepare
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "prepare 缺 PR号应退出 2（usage），实为 $RC"
hasnt_sub "node "                                        "缺参时不应调用包"

PKG_RC=0
run_sut publish 7
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "publish 缺 --response 应退出 2（usage），实为 $RC"
hasnt_sub "node "                                        "缺参时不应调用包"

PKG_RC=0
run_sut publish 7 --response "$RESP" --nope
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "未知参数应退出 2（usage），实为 $RC"
hasnt_sub "node "                                        "参数非法时不应调用包"

# ═══ ⑥ 包失败：退出码原样透传 ═══
echo "── ⑥ 包拒绝: 包退出码 3（避开壳自身的 2，证明确实是透传）"
PKG_RC=3
run_sut prepare 7
echo "  退出码: $RC"
[[ $RC -eq 3 ]] || wrong "包返回 3 时壳应同样返回 3，实为 $RC"

# ═══ ⑦ 包缺失：拒绝执行并列出试过的路径 ═══
echo "── ⑦ 包缺失: DSH_PIPELINE_HOME 指向不存在的包"
PKG_RC=0
HIDE_PKG=1
run_sut prepare 7
HIDE_PKG=0
echo "  退出码: $RC"
[[ $RC -ne 0 ]] || wrong "包缺失时应失败，实为 $RC"
out_has "找不到共享 pipeline 包"                    "应提示找不到共享 pipeline 包"
hasnt_sub "node "                                   "包缺失时不应调用 node"

# ═══ ⑧ 空取值：等号（及空格）形式给空串 → usage 退出 2，且不调用包 ═══
echo "── ⑧ 空取值: --response= / --model= / --round= / --provider= / --form= / --model '<空串>'"
PKG_RC=0
run_sut publish 7 "--response="
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "--response= 空值应退出 2（usage），实为 $RC"
hasnt_sub "node "                                        "空值时不应调用包"

PKG_RC=0
run_sut prepare 7 --model=
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "--model= 空值应退出 2（usage），实为 $RC"
out_has "取值不能为空"                                   "应提示取值不能为空"
hasnt_sub "node "                                        "空值时不应调用包"

PKG_RC=0
run_sut publish 7 --response "$RESP" --round=
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "--round= 空值应退出 2（usage），实为 $RC"
hasnt_sub "node "                                        "空值时不应调用包"

PKG_RC=0
run_sut publish 7 --response "$RESP" --provider=
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "--provider= 空值应退出 2（usage），实为 $RC"
hasnt_sub "node "                                        "空值时不应调用包"

PKG_RC=0
run_sut publish 7 --response "$RESP" --form=
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "--form= 空值应退出 2（usage），实为 $RC"
hasnt_sub "node "                                        "空值时不应调用包"

PKG_RC=0
run_sut prepare 7 --model ""
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "--model '<空串>'（空格写法）应退出 2（usage），实为 $RC"
hasnt_sub "node "                                        "空值时不应调用包"

if [[ $FAIL -ne 0 ]]; then
  echo
  echo "✗ 自检失败（被测脚本: ${SUT}）——实际执行的命令："
  sed 's/^/    /' "$SHIM_LOG"
  echo "  --- 被测脚本输出 ---"
  sed 's/^/    /' "$TMP/sut.out"
  exit 1
fi

echo
echo "✓ 自检通过：prepare/publish 转发 argv 正确、--root 恒取主工作区（-C/cwd/脚本所在 worktree 均不参与）、缺参与空值 usage 退出 2、退出码透传、包缺失即拒绝"
exit 0
