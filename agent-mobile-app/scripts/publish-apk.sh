#!/usr/bin/env bash
# 把 GitHub Actions 打出来的 APK 发布到生产机，供手机在 homebase 文件管理器里下载。
#
# 为什么不在 CI 里直接推（2026-11-17 实测）：
#   GitHub runner（美国）→ 百度云 ~30 KB/s，45 MB 要 25 分钟且中途会断；
#   而 GitHub → 本机 0.94 MB/s、本机 → 服务器 1.0 MB/s，合计约 1.5 分钟。
#   所以可靠路径放在本机。
#
# 用法：
#   pnpm apk:publish                 # 取最近一次成功的 build-apk 产物
#   pnpm apk:publish <run-id>        # 指定运行
#   pnpm apk:publish --file x.apk    # 发布本机已有的包（跳过下载）
#
# 产物落在服务器 /root/project/agent-mobile/downloads/：
#   pulse-v<version>-<sha7>.apk   每次一个
#   pulse-latest.apk              软链，永远指向最新
#   只保留最近 5 个 pulse-v*.apk
#
# 红线：本脚本不读取、不打印任何凭据；ssh 走 ~/.ssh/config 里的 Host。
set -euo pipefail

SSH_HOST="${APK_SSH_HOST:-106.13.181.13}"
SSH_USER="${APK_SSH_USER:-root}"
REMOTE_DIR="${APK_REMOTE_DIR:-/root/project/agent-mobile/downloads}"
KEEP="${APK_KEEP:-5}"

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$REPO_ROOT"

RUN_ID=""
LOCAL_FILE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --file) LOCAL_FILE="$2"; shift 2 ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) RUN_ID="$1"; shift ;;
  esac
done

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

if [ -n "$LOCAL_FILE" ]; then
  APK="$LOCAL_FILE"
  [ -f "$APK" ] || { echo "文件不存在: $APK" >&2; exit 1; }
else
  if [ -z "$RUN_ID" ]; then
    RUN_ID="$(gh run list --workflow build-apk.yml --status success --limit 1 --json databaseId --jq '.[0].databaseId')"
    if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
      echo "没有找到成功的 build-apk 运行，先去 Actions 触发一次" >&2
      exit 1
    fi
  fi
  echo "==> 下载 artifact（run $RUN_ID）"
  gh run download "$RUN_ID" -n pulse-apk -D "$TMP_DIR"
  APK="$(find "$TMP_DIR" -name '*.apk' | head -1)"
  [ -n "$APK" ] || { echo "artifact 里没有 apk" >&2; exit 1; }
fi

VERSION="$(node -p "require('./agent-mobile-app/app.json').expo.version")"
SHA7="$(git rev-parse --short=7 HEAD)"
NAME="pulse-v${VERSION}-${SHA7}.apk"

echo "==> 上传 $(du -h "$APK" | cut -f1) → ${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/${NAME}"
ssh "${SSH_USER}@${SSH_HOST}" "mkdir -p '${REMOTE_DIR}'"
scp -q "$APK" "${SSH_USER}@${SSH_HOST}:${REMOTE_DIR}/${NAME}"

echo "==> 切 latest 软链 + 清理旧版本（保留 ${KEEP} 个）"
ssh "${SSH_USER}@${SSH_HOST}" "cd '${REMOTE_DIR}' && ln -sfn '${NAME}' pulse-latest.apk && ls -t pulse-v*.apk 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f && ls -lh"

echo
echo "完成。手机打开："
echo "  https://${SSH_HOST}:9928/files  →  ${REMOTE_DIR}"
echo "  直接下载：https://${SSH_HOST}:9928/api/files/download?path=${REMOTE_DIR}/pulse-latest.apk"
