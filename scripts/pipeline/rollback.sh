#!/usr/bin/env bash
# rollback.sh — 回滚线上静态站到指定 release（releases/<id> + dist 软链布局）
# 用法:
#   scripts/pipeline/rollback.sh              # 回滚到当前版本的上一版（按时间排序）
#   scripts/pipeline/rollback.sh <release-id> # 回滚/切换到指定 release
#   scripts/pipeline/rollback.sh --dry-run
source "$(dirname "$0")/lib.sh"

DRY_RUN=0; TARGET=""
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    *) TARGET="$a" ;;
  esac
done
run() { if [[ $DRY_RUN -eq 1 ]]; then echo "[dry-run] $*"; else "$@"; fi; }

info "读取服务器 release 列表（按时间新→旧，只读）"
LIST=$(remote "cd ${SERVER_WEB_DIR}/releases && ls -1dt */ | sed 's#/##'")
echo "$LIST" | sed 's/^/  /'
[[ -n "$LIST" ]] || die "releases 目录为空"

CURRENT=$(remote "basename \"\$(readlink ${SERVER_WEB_DIR}/dist)\"")
info "当前线上 release: ${CURRENT}"

if [[ -z "$TARGET" ]]; then
  TARGET=$(printf '%s\n' "$LIST" | awk -v c="$CURRENT" 'f{print;exit} $0==c{f=1}')
  [[ -n "$TARGET" ]] || die "当前版本已是列表中最早的一版，没有更早的 release 可回滚"
  info "目标（上一版）: ${TARGET}"
else
  printf '%s\n' "$LIST" | grep -qx "$TARGET" || die "release 不存在: ${TARGET}"
  info "目标（指定）: ${TARGET}"
fi
[[ "$TARGET" != "$CURRENT" ]] || die "目标就是当前线上版本，无需切换"

info "切换 dist 软链 → releases/${TARGET} 并重启 serve-9928"
run remote "cd ${SERVER_WEB_DIR} && ln -sfn releases/${TARGET} dist && systemctl restart serve-9928"

sleep 2
info "线上验证"
run curl -s -m 8 -o /dev/null -w "9928: %{http_code}\n" http://${SERVER_HOST}:9928/
ok "已切换到 release: ${TARGET}（再次运行可切回）"
