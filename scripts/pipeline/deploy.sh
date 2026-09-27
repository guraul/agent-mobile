#!/usr/bin/env bash
# deploy.sh — 手动部署兜底（正常路径是 GitHub Actions 自动部署）
# 用法: scripts/pipeline/deploy.sh [--skip-tests] [--with-bff] [--dry-run]
# 流程: tsc + vitest → expo export(--clear) → 服务器留 dist.prev 快照 → rsync dist → restart serve-9928 → 验证
source "$(dirname "$0")/lib.sh"

SKIP_TESTS=0; WITH_BFF=0; DRY_RUN=0
for a in "$@"; do
  case "$a" in
    --skip-tests) SKIP_TESTS=1 ;;
    --with-bff)   WITH_BFF=1 ;;
    --dry-run)    DRY_RUN=1 ;;
    *) die "未知参数: $a（支持 --skip-tests --with-bff --dry-run）" ;;
  esac
done

APP_DIR="${REPO_ROOT}/agent-mobile-app"
run() {
  if [[ $DRY_RUN -eq 1 ]]; then echo "[dry-run] $*"; else "$@"; fi
}

info "质量门槛: tsc --noEmit"
run bash -c "cd '${APP_DIR}' && pnpm exec tsc --noEmit"
if [[ $SKIP_TESTS -eq 0 ]]; then
  info "质量门槛: vitest"
  run bash -c "cd '${APP_DIR}' && pnpm test"
else
  info "跳过测试（--skip-tests，仅限紧急）"
fi

info "expo export --platform web --clear"
run bash -c "cd '${APP_DIR}' && EXPO_PUBLIC_OPENCODE_URL='${EXPO_PUBLIC_OPENCODE_URL:-${DEFAULT_BFF_URL}}' pnpm exec expo export --platform web --clear"

info "服务器留存上一版快照 dist.prev（供 rollback.sh 用）"
run ssh "${SERVER_USER}@${SERVER_HOST}" "cd ${SERVER_WEB_DIR} && rm -rf dist.prev && cp -al dist dist.prev"

info "rsync dist → 服务器"
run rsync -az --delete "${APP_DIR}/dist/" "${SERVER_USER}@${SERVER_HOST}:${SERVER_WEB_DIR}/dist/"

info "重启 serve-9928（gzipCache 必须重启才生效）"
run remote "systemctl restart serve-9928"

if [[ $WITH_BFF -eq 1 ]]; then
  info "触发 BFF pipeline"
  if [[ $DRY_RUN -eq 0 ]]; then
    gh workflow run deploy.yml --repo "${BFF_REPO}" 2>/dev/null \
      && ok "BFF deploy.yml 已触发" \
      || die "BFF pipeline 触发失败（family-finance 的 deploy.yml 在 Phase 2 落地前不存在；可先用其仓库内脚本手动部署）"
  else
    echo "[dry-run] gh workflow run deploy.yml --repo ${BFF_REPO}"
  fi
fi

sleep 2
info "线上验证"
run curl -s -m 8 -o /dev/null -w "9928: %{http_code}\n" http://${SERVER_HOST}:9928/
ok "部署流程结束"
