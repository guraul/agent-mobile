#!/usr/bin/env bash
# rollback.sh — 回滚到上一版（交换服务器上的 dist 与 deploy.sh 留下的 dist.prev 快照）
# 用法: scripts/pipeline/rollback.sh [--dry-run]
# 说明: Phase 1 布局只能回滚到"最近一次部署前"的版本；
#       Phase 2 切换 releases/<id> + current 软链后，本脚本升级为任意版本秒切。
source "$(dirname "$0")/lib.sh"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

run() { if [[ $DRY_RUN -eq 1 ]]; then echo "[dry-run] $*"; else "$@"; fi; }

info "确认服务器上存在 dist.prev 快照"
if [[ $DRY_RUN -eq 1 ]]; then
  echo "[dry-run] ssh ${SERVER_USER}@${SERVER_HOST} 'test -d ${SERVER_WEB_DIR}/dist.prev'"
else
  ssh "${SERVER_USER}@${SERVER_HOST}" "test -d ${SERVER_WEB_DIR}/dist.prev" \
    || die "服务器上没有 dist.prev（本版是首次部署或已处于回滚态，无法回滚）"
fi

info "交换 dist ↔ dist.prev 并重启 serve-9928"
run remote "cd ${SERVER_WEB_DIR} && rm -rf dist.new && mv dist dist.new && mv dist.prev dist && mv dist.new dist.prev && systemctl restart serve-9928"

sleep 2
info "线上验证"
run curl -s -m 8 -o /dev/null -w "9928: %{http_code}\n" http://${SERVER_HOST}:9928/
ok "回滚完成（再次运行本脚本可换回新版）"
