#!/usr/bin/env bash
# test-open-pr.sh — open-pr.sh 的**转发契约**自检（issue #189）
#
# 用法: bash scripts/pipeline/test-open-pr.sh [被测脚本路径]
#       该参数可选，默认同目录的 open-pr.sh（用于拿旧版本做反证对照）
#
# 原理: 临时目录里伪造 git/gh/node 与一个假的 dsh-pipeline 包（argv 记入日志、按剧本回放），
#       把 open-pr.sh 的几种运行形态各跑一遍，再对日志做断言。**全程不碰真实 git 远端、GitHub 与真包**。
#   ① 不传 -C            → 包收到 `pr --root <脚本所在仓库>`（cwd 不参与）
#   ② 传 -C <dir>        → 包收到 `pr --root <该目录>`（issue #108 的既有行为映射成 --root）
#   ③ 传 --worktree=<dir> → 同上（两种写法等价）
#   ④ 包退出码非 0       → 原样透传（不吞错误）
#   ⑤ 包缺失             → 拒绝执行并给出试过的路径，连 node 都不调
#   ⑥ 未知参数           → 拒绝，不调用包
# 说明: push/建 PR 的**行为**由包自测覆盖（dsh-pipeline 的 node --test），本脚本只验转发壳。
# 约定: 断言失败打印失败项 + 实际命令日志，退出码非 0；全部通过退出 0。

set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SUT="${1:-$HERE/open-pr.sh}"
[[ -f "$SUT" ]] || { echo "✗ 找不到被测脚本: $SUT" >&2; exit 2; }
[[ -f "$HERE/lib.sh" ]] || { echo "✗ 缺少 $HERE/lib.sh（被测脚本需与 lib.sh 同目录）" >&2; exit 2; }

# pwd -P 归一化：macOS 的 /var → /private/var 会让路径字符串比对（日志断言）失配
TMP="$(mktemp -d "${TMPDIR:-/tmp}/open-pr-selftest.XXXXXX")"
TMP="$(cd "$TMP" && pwd -P)"
CWD="$TMP/cwd"
trap 'rm -rf "$TMP"' EXIT

FAKE_REPO="$TMP/main"                    # 伪造的「脚本所在仓库」
FAKE_TARGET="$TMP/worktree-189"          # -C 指向的目标工作区
SHIM_LOG="$TMP/cmd.log"
PKG_HOME="$TMP/pkg/dsh-pipeline"
PKG_CLI="$PKG_HOME/bin/cli.mjs"
mkdir -p "$TMP/bin" "$CWD" "$FAKE_REPO/scripts/pipeline" "$FAKE_TARGET" "$(dirname "$PKG_CLI")" "$FAKE_REPO/.git"
: > "$PKG_CLI"

# 脚本副本放进伪造仓库，模拟「脚本自身位置」解析（REPO_ROOT 取脚本所在仓）
cp "$HERE/lib.sh" "$SUT" "$FAKE_REPO/scripts/pipeline/"
SUT_COPY="$FAKE_REPO/scripts/pipeline/$(basename "$SUT")"

# —— 伪造 git：只回答 lib.sh 需要的两条（toplevel / common-dir），写操作一律视为成功 ——
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
      --show-toplevel)  printf '%s\n' "$FAKE_REPO" ;;
      --git-common-dir) printf '%s\n' "$FAKE_REPO/.git" ;;
      --abbrev-ref)     printf 'main\n' ;;
      *)                printf '%s\n' "${dir:-$FAKE_REPO}" ;;
    esac ;;
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
  echo "pr: 自检桩拒绝（FAKE_PKG_RC=${FAKE_PKG_RC}）" >&2
  exit "$FAKE_PKG_RC"
fi
exit 0
SHIM

chmod +x "$TMP/bin/git" "$TMP/bin/gh" "$TMP/bin/node"

FAIL=0
RC=0
PKG_RC=0
HIDE_PKG=0

# run_sut [open-pr 参数...]（cwd 固定在 $TMP：证明默认 root 与 cwd 无关）
run_sut() {
  : > "$SHIM_LOG"
  if [[ $HIDE_PKG -eq 1 ]]; then mv "$PKG_HOME" "$TMP/pkg-hidden"; fi
  ( cd "$CWD" && env PATH="$TMP/bin:$PATH" \
      DSH_PIPELINE_HOME="$PKG_HOME" \
      FAKE_REPO="$FAKE_REPO" FAKE_PKG_RC="$PKG_RC" SHIM_LOG="$SHIM_LOG" \
      bash "$SUT_COPY" "$@" ) >"$TMP/sut.out" 2>&1
  RC=$?
  if [[ $HIDE_PKG -eq 1 ]]; then mv "$TMP/pkg-hidden" "$PKG_HOME"; fi
}

has_line() { grep -Fxq -- "$1" "$SHIM_LOG" || { echo "  ✗ 应出现: ${1}（${2}）"; FAIL=1; }; }
hasnt_sub(){ grep -Fq -- "$1" "$SHIM_LOG" && { echo "  ✗ 不应出现子串: ${1}（${2}）"; FAIL=1; }; return 0; }
out_has()  { grep -Fq -- "$1" "$TMP/sut.out" || { echo "  ✗ 输出应含: ${1}（${2}）"; FAIL=1; }; }
wrong()    { echo "  ✗ $1"; FAIL=1; }

# ═══ ① 不传 -C：root = 脚本所在仓库（cwd 不参与）═══
echo "── ① 默认形态: open-pr.sh（cwd=${CWD}，均非脚本所在仓）"
PKG_RC=0
run_sut
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "node ${PKG_CLI} pr --root ${FAKE_REPO}"  "默认 root 取脚本所在仓库"
hasnt_sub "pr --root ${CWD}"                      "不得按 cwd 取根目录"

# ═══ ② -C <dir> → --root <dir> ═══
echo "── ② -C 形态: open-pr.sh -C ${FAKE_TARGET}"
PKG_RC=0
run_sut -C "$FAKE_TARGET"
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "node ${PKG_CLI} pr --root ${FAKE_TARGET}" "-C 映射成包的 --root（issue #108）"
hasnt_sub "pr --root ${FAKE_REPO}"                  "指定 -C 后不得回落到脚本所在仓库"

# ═══ ③ --worktree=<dir> 等价于 -C ═══
echo "── ③ --worktree= 形态: open-pr.sh --worktree=${FAKE_TARGET}"
PKG_RC=0
run_sut "--worktree=${FAKE_TARGET}"
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "node ${PKG_CLI} pr --root ${FAKE_TARGET}" "--worktree= 与 -C 等价"

# ═══ ④ 包失败：退出码原样透传 ═══
echo "── ④ 包拒绝: 包退出码 2"
PKG_RC=2
run_sut -C "$FAKE_TARGET"
echo "  退出码: $RC"
[[ $RC -eq 2 ]] || wrong "包返回 2 时壳应同样返回 2，实为 $RC"

# ═══ ⑤ 包缺失：拒绝执行并列出试过的路径 ═══
echo "── ⑤ 包缺失: DSH_PIPELINE_HOME 指向不存在的包"
PKG_RC=0
HIDE_PKG=1
run_sut
HIDE_PKG=0
echo "  退出码: $RC"
[[ $RC -ne 0 ]] || wrong "包缺失时应失败，实为 $RC"
out_has "找不到共享 pipeline 包"                    "应提示找不到共享 pipeline 包"
hasnt_sub "node "                                   "包缺失时不应调用 node"

# ═══ ⑥ 未知参数：拒绝，不调用包 ═══
echo "── ⑥ 未知参数: open-pr.sh --nope"
PKG_RC=0
run_sut --nope
echo "  退出码: $RC"
[[ $RC -ne 0 ]] || wrong "未知参数应拒绝，实为 $RC"
hasnt_sub "node "                                   "参数非法时不应调用包"

if [[ $FAIL -ne 0 ]]; then
  echo
  echo "✗ 自检失败（被测脚本: ${SUT}）——实际执行的命令："
  sed 's/^/    /' "$SHIM_LOG"
  echo "  --- 被测脚本输出 ---"
  sed 's/^/    /' "$TMP/sut.out"
  exit 1
fi

echo
echo "✓ 自检通过：默认 root 取脚本所在仓库、-C/--worktree 映射成 --root、退出码透传、包缺失与非法参数即拒绝"
exit 0
