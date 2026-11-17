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

CALLER_CWD="$(pwd)"
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

RUN_ID=""
LOCAL_FILE=""
BUILD_SHA=""
while [ $# -gt 0 ]; do
  case "$1" in
    --file)
      LOCAL_FILE="$2"
      case "$LOCAL_FILE" in /*) ;; *) LOCAL_FILE="$CALLER_CWD/$LOCAL_FILE" ;; esac
      shift 2 ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) RUN_ID="$1"; shift ;;
  esac
done

if [ -n "$LOCAL_FILE" ] && [ -n "$RUN_ID" ]; then
  echo "--file 与 run-id 只能给一个" >&2
  exit 1
fi

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
  BUILD_SHA="$(gh run view "$RUN_ID" --json headSha --jq '.headSha' 2>/dev/null || true)"
  echo "==> 下载 artifact（run $RUN_ID，构建提交 ${BUILD_SHA:0:7}）"
  gh run download "$RUN_ID" -n pulse-apk -D "$TMP_DIR"
  APK="$(find "$TMP_DIR" -name '*.apk' | head -1)"
  [ -n "$APK" ] || { echo "artifact 里没有 apk" >&2; exit 1; }
fi

# 文件名必须指向「这份 APK 是从哪个提交构建的」，不是本机 HEAD——
# 否则用旧 run 的包发布会张冠李戴，且同名会互相覆盖。
if [ -n "$BUILD_SHA" ]; then
  SHA7="$(printf '%s' "$BUILD_SHA" | cut -c1-7)"
  VERSION="$(git show "$BUILD_SHA:agent-mobile-app/app.json" 2>/dev/null \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).expo.version)}catch{console.log("")}})')"
  if [ -z "$VERSION" ]; then
    VERSION="$(node -p "require('./agent-mobile-app/app.json').expo.version")"
    echo "提示：取不到 $SHA7 那次提交的 app.json，版本号退回本机值（$VERSION）" >&2
  fi
else
  SHA7="$(git rev-parse --short=7 HEAD)"
  VERSION="$(node -p "require('./agent-mobile-app/app.json').expo.version")"
  echo "警告：--file 模式无法得知 APK 来自哪次提交，文件名里的 $SHA7 是本机 HEAD，不代表产物来源" >&2
fi
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
