#!/usr/bin/env bash
# test-merge-pr.sh — merge-pr.sh 的转发契约自检（issue #187）
#
# 用法: bash scripts/pipeline/test-merge-pr.sh [被测脚本路径]
#       该参数可选，默认同目录的 merge-pr.sh（用于拿旧版本做反证对照）
#
# 原理: 在临时目录里伪造 git/gh/node 与一个假的 dsh-pipeline 包（argv 记入日志、按剧本回放），
#       把 merge-pr.sh 的各种运行形态各跑一遍，再对日志做断言。**全程不碰真实 git 远端与 GitHub**。
#   ① 主工作区形态: 指定 PR 号 + --review-record → node 收到 --record（参数映射）
#   ② -C 形态: 只决定「在哪个工作区找分支」；--root 仍是主工作区
#   ③ --check-only / --no-review --reason → 原样传给包
#   ④ 包退出码非 0 → 原样透传（不吞错误）
#   ⑤ 互斥: --review-record 与 --no-review 同时给 → 拒绝，连包都不调用
#   ⑥ 包缺失 → 拒绝执行并给出试过的路径
# 说明: 合并/清理的**行为**由包自测覆盖（dsh-pipeline 的 node --test），本脚本只验转发壳。
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
BRANCH="task/187-refactor-pipeline-merge-pr-sh-dsh-pipeli"
FAKE_MAIN="$TMP/main"                              # 伪造的主工作区（检出 main）
FAKE_WT="$FAKE_MAIN/.worktrees/187-pipeline"       # 伪造的任务 worktree（检出 BRANCH）
FAKE_WT_LIST="$TMP/worktree-list.txt"
SHIM_LOG="$TMP/cmd.log"
RECORD="$TMP/record.json"
PKG_HOME="$FAKE_MAIN/tools/node_modules/dsh-pipeline"
PKG_CLI="$PKG_HOME/bin/cli.mjs"
mkdir -p "$TMP/bin" "$FAKE_WT" "$(dirname "$PKG_CLI")" "$FAKE_MAIN/.git"
: > "$PKG_CLI"

# 剧本：worktree 列表（主工作区排第一，与 git 的实际顺序一致）
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
# 目标目录（-C）不参与断言，只回放与子命令相关的输出
sub=()
for a in "$@"; do
  case "$a" in
    -C) continue ;;               # 目标目录不参与断言子命令
    rev-parse|branch|worktree|log) sub+=("$a") ;;
    --show-toplevel) printf '%s\n' "$FAKE_MAIN" ;;
    --git-common-dir) printf '%s\n' "$FAKE_MAIN/.git" ;;
    --show-current) printf '%s\n' "$FAKE_BRANCH" ;;
    list) cat "$FAKE_WT_LIST" ;;
  esac
done
exit 0
SHIM

# —— 伪造 gh（PR #102；分支名 → 102）——
cat > "$TMP/bin/gh" <<'SHIM'
#!/usr/bin/env bash
printf 'gh %s\n' "$*" >> "$SHIM_LOG"
if [[ "${1:-}" == "pr" && "${2:-}" == "view" ]]; then
  if [[ "${3:-}" == "102" || "${3:-}" == "$FAKE_BRANCH" ]]; then printf '102\n'; fi
  exit 0
fi
exit 0
SHIM

# —— 伪造 node（共享包的替身：只记录 argv，按 FAKE_PKG_RC 回放）——
cat > "$TMP/bin/node" <<'SHIM'
#!/usr/bin/env bash
printf 'node %s\n' "$*" >> "$SHIM_LOG"
if [[ "${FAKE_PKG_RC:-0}" != "0" ]]; then
  echo "merge: 自检桩拒绝（FAKE_PKG_RC=${FAKE_PKG_RC}）" >&2
  exit "$FAKE_PKG_RC"
fi
exit 0
SHIM

chmod +x "$TMP/bin/git" "$TMP/bin/gh" "$TMP/bin/node"

FAIL=0
RC=0
PKG_RC=0
HIDE_PKG=0

# run_sut <cwd> [merge-pr 参数...]
run_sut() {
  local cwd="$1"; shift
  : > "$SHIM_LOG"
  if [[ $HIDE_PKG -eq 1 ]]; then mv "$PKG_HOME" "$TMP/pkg-hidden"; fi
  ( cd "$cwd" && env PATH="$TMP/bin:$PATH" \
      FAKE_MAIN="$FAKE_MAIN" FAKE_BRANCH="$BRANCH" FAKE_WT_LIST="$FAKE_WT_LIST" \
      FAKE_PKG_RC="$PKG_RC" SHIM_LOG="$SHIM_LOG" \
      bash "$SUT" "$@" ) >"$TMP/sut.out" 2>&1
  RC=$?
  if [[ $HIDE_PKG -eq 1 ]]; then mv "$TMP/pkg-hidden" "$PKG_HOME"; fi
}

has_sub()  { grep -Fq -- "$1" "$SHIM_LOG" || { echo "  ✗ 应出现子串: $1（$2）"; FAIL=1; }; }
hasnt_sub(){ grep -Fq -- "$1" "$SHIM_LOG" && { echo "  ✗ 不应出现子串: $1（$2）"; FAIL=1; }; return 0; }
has_line() { grep -Fxq -- "$1" "$SHIM_LOG" || { echo "  ✗ 应出现: $1（$2）"; FAIL=1; }; }
wrong()    { echo "  ✗ $1"; FAIL=1; }

# ═══ ① 主工作区形态：PR 号 + --review-record=<f> → 包的 --record ═══
echo "── ① 主工作区形态: merge-pr.sh 102 --review-record=…"
PKG_RC=0
run_sut "$FAKE_MAIN" 102 "--review-record=$RECORD"
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_sub "merge --pr 102 --root ${FAKE_MAIN} --record ${RECORD}" "参数映射 --review-record → --record"
hasnt_sub "gh pr merge"                                        "壳自己不做合并（合并归包）"
hasnt_sub "push origin --delete"                               "壳自己不做清理（清理归包）"

# ═══ ② -C 形态：只影响找分支的工作区，--root 仍是主工作区 ═══
echo "── ② -C 形态: merge-pr.sh -C <worktree>（无 PR 号，按当前分支解析）"
PKG_RC=0
run_sut "$FAKE_MAIN" -C "$FAKE_WT"
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_line "git -C ${FAKE_WT} branch --show-current"          "分支取自 -C 指定的工作区"
has_sub "merge --pr 102 --root ${FAKE_MAIN}"                "root 仍是主工作区"
has_sub "gh pr view ${BRANCH} --repo ${REPO_SLUG}"          "分支名在这里解析成 PR 号"

# ═══ ③ --check-only / --no-review --reason 原样传 ═══
echo "── ③ 演练与跳过: --check-only / --no-review --reason=…"
PKG_RC=0
run_sut "$FAKE_MAIN" 102 --check-only
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_sub "merge --pr 102 --root ${FAKE_MAIN} --check-only"   "--check-only 传给包"

PKG_RC=0
run_sut "$FAKE_MAIN" 102 --no-review "--reason=用户当场同意（自检桩）"
echo "  退出码: $RC"
[[ $RC -eq 0 ]] || wrong "退出码应为 0，实为 $RC"
has_sub "--reason 用户当场同意（自检桩）"                    "--reason 传给包"
has_sub "--no-review"                                       "--no-review 传给包"

# ═══ ④ 包失败：退出码原样透传 ═══
echo "── ④ 包拒绝: 包退出码 1"
PKG_RC=1
run_sut "$FAKE_MAIN" 102 "--review-record=$RECORD"
echo "  退出码: $RC"
[[ $RC -eq 1 ]] || wrong "包返回 1 时壳应同样返回 1，实为 $RC"

# ═══ ⑤ 互斥参数：不调用包 ═══
echo "── ⑤ 互斥: --review-record 与 --no-review 同时给"
PKG_RC=0
run_sut "$FAKE_MAIN" 102 "--review-record=$RECORD" --no-review
echo "  退出码: $RC"
[[ $RC -ne 0 ]] || wrong "互斥参数应拒绝，实为 $RC"
hasnt_sub "merge --pr"                                     "参数冲突时不应调用包"

# ═══ ⑥ 包缺失：拒绝执行并列出试过的路径 ═══
echo "── ⑥ 包缺失: tools/node_modules/dsh-pipeline 不存在"
PKG_RC=0
HIDE_PKG=1
run_sut "$FAKE_MAIN" 102 --check-only
HIDE_PKG=0
echo "  退出码: $RC"
[[ $RC -ne 0 ]] || wrong "包缺失时应失败，实为 $RC"
grep -Fq "找不到共享 pipeline 包" "$TMP/sut.out" || wrong "应提示找不到共享 pipeline 包"

if [[ $FAIL -ne 0 ]]; then
  echo
  echo "✗ 自检失败（被测脚本: ${SUT}）——实际执行的命令："
  sed 's/^/    /' "$SHIM_LOG"
  echo "  --- 被测脚本输出 ---"
  sed 's/^/    /' "$TMP/sut.out"
  exit 1
fi

echo
echo "✓ 自检通过：参数映射（--review-record→--record、-C→找分支的工作区）、--check-only/--no-review 透传、退出码透传、包缺失即拒绝"
exit 0
