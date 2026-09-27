#!/usr/bin/env bash
# status.sh — 全链路状态一览（只读）
# 用法: scripts/pipeline/status.sh
source "$(dirname "$0")/lib.sh"

echo "════ 线上服务（外部探测）════"
curl -s -m 6 -o /dev/null -w "  9928  静态站: %{http_code}\n" http://${SERVER_HOST}:9928/ || echo "  9928  静态站: 不可达"
curl -s -m 6 -o /dev/null -w "  19234 BFF:    %{http_code}\n" http://${SERVER_HOST}:19234/ || echo "  19234 BFF:    不可达"

echo "════ 服务器（${SERVER_HOST}）════"
remote '
  echo "  systemd: $(systemctl is-active serve-9928 bff-19234 opencode-4096 | tr "\n" " ")"
  echo "  node:    $(node -v)"
  echo "  dist:    $(stat -c %y /root/project/agent-mobile/agent-mobile-app/dist/index.html 2>/dev/null | cut -d. -f1) 部署"
  echo "  仓库:    $(git -C /root/project/agent-mobile log -1 --oneline 2>/dev/null)"
  echo "  磁盘:    $(df -h / | awk "NR==2{print \$3\"/\"\$2\" 用了\"\$5}")"
' 2>/dev/null || echo "  ✗ ssh 不可达"

echo "════ GitHub（guraul/agent-mobile）════"
if command -v gh >/dev/null; then
  echo "  开放 PR:"
  gh pr list --repo guraul/agent-mobile --limit 5 | sed 's/^/    /' || true
  echo "  开放 issue:"
  gh issue list --repo guraul/agent-mobile --limit 5 | sed 's/^/    /' || true
fi
