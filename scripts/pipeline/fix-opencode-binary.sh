#!/usr/bin/env bash
# fix-opencode-binary.sh — 把生产 `opencode` 命令收敛到 v2（issue #84）
#
# 背景（2026-10-11 E1 升级遗留）：
#   v2 官方脚本把二进制装在 /root/.opencode/bin/opencode（**不在 PATH**），而 E1 当天为确认
#   "npm 线是否已发 v2" 全局装过 opencode-ai@1.19.0（v1），npm 自动把它 symlink 到
#   /usr/bin/opencode。于是裸敲 `opencode` 命中 v1 → v1 去读 v2 配置 → 报
#   "V2 permissions are not supported by OpenCode V1 … or run opencode2"（配置本身没错）。
#   微信桥 `dist/opencode.js` 用 `which opencode` 动态解析二进制 → 同样会拿到 v1。
#
# 本脚本做三件事（幂等、可 dry-run、只动一个 symlink）：
#   1. 备份现有 /usr/bin/opencode → /root/backups/opencode-v1-symlink.bak（已存在则不覆盖）
#   2. ln -sfn /root/.opencode/bin/opencode /usr/bin/opencode
#   3. 校验 `opencode --version` 是 v2 线
#
# 不做的事：不删 npm 全局包（v1 仍可显式调用；真回滚物料是
#   /root/backups/opencode-ai-1.18.34-installed.tgz）、不改 /root/.bashrc（symlink 修好后
#   PATH 无关紧要；要加 PATH 是另一件事）。
#
# 用法: scripts/pipeline/fix-opencode-binary.sh [--dry-run]
# 回滚: cp -a /root/backups/opencode-v1-symlink.bak /usr/bin/opencode
source "$(dirname "$0")/lib.sh"

DRY_RUN=0
for a in "$@"; do
  case "$a" in
    --dry-run) DRY_RUN=1 ;;
    *) die "未知参数: $a（支持 --dry-run）" ;;
  esac
done

# ⚠️ 用 `read -r -d ''` 而不是 `X=$(cat <<'EOS' …)`：macOS 自带 bash 3.2 解析后者会
# 把 heredoc 正文当代码（syntax error near `;;`）；本脚本要在本机跑，必须兼容 3.2。
read -r -d '' REMOTE_SCRIPT <<'EOS' || true
set -e
V2_BIN="/root/.opencode/bin/opencode"
CMD_LINK="/usr/bin/opencode"
BACKUP="/root/backups/opencode-v1-symlink.bak"

[ -x "$V2_BIN" ] || { echo "✗ 服务器上没有可执行的 $V2_BIN（先确认 v2 装机）"; exit 1; }

mkdir -p /root/backups
CURRENT=$(readlink -f "$CMD_LINK" 2>/dev/null || true)
if [ "$CURRENT" = "$V2_BIN" ]; then
  echo "✓ 已指向 v2，无需改动（$CURRENT）"
  exit 0
fi
echo "→ 当前指向: ${CURRENT:-（不存在）}"

if [ ! -e "$BACKUP" ] && [ ! -L "$BACKUP" ]; then
  if [ -e "$CMD_LINK" ] || [ -L "$CMD_LINK" ]; then
    cp -a "$CMD_LINK" "$BACKUP"
    echo "→ 已备份旧 symlink: $BACKUP"
  fi
else
  echo "→ 备份已存在，未覆盖: $BACKUP"
fi

ln -sfn "$V2_BIN" "$CMD_LINK"
echo "✓ 新指向: $(readlink -f "$CMD_LINK")"

VERSION=$("$CMD_LINK" --version 2>&1 | head -1)
echo "✓ opencode --version → $VERSION"
case "$VERSION" in
  *v2.*|2.*) ;;
  *) echo "✗ 版本不是 v2 线，修复未生效：$VERSION"; exit 1 ;;
esac

echo "ℹ️ 微信桥另有独立 bug（GET /api/health 在 v2 返回 401 被判为未运行）→ guraul/wechat-opencode-bridge#1"
EOS

if [[ $DRY_RUN -eq 1 ]]; then
  echo "[dry-run] 将在 ${SERVER_USER}@${SERVER_HOST} 执行以下脚本："
  printf '%s\n' "$REMOTE_SCRIPT"
  exit 0
fi

info "在 ${SERVER_USER}@${SERVER_HOST} 收敛 opencode → v2"
printf '%s\n' "$REMOTE_SCRIPT" | remote "bash -s"
ok "完成（回滚：cp -a /root/backups/opencode-v1-symlink.bak /usr/bin/opencode）"
