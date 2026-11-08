#!/usr/bin/env bash
# 只读漂移检测：比对 deploy/ 里的 Caddy 与 systemd 配置副本和线上真源是否一致。
# 只读远端文件，绝不改线上；不打印任何凭据。
# bash 3.2 兼容：无关联数组、无 mapfile、无 ${VAR:-默认值} 参数展开。
# 退出码：0 = 全一致，1 = 内容不一致（漂移），2 = 有文件无法检查（ssh 读取失败或本地基准缺失）。
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"

SSH_CMD="${SSH_CMD-}"
HOST="${HOST-}"
SSH_USER="${SSH_USER-}"
if [[ -z "$HOST" ]]; then HOST=106.13.181.13; fi
if [[ -z "$SSH_USER" ]]; then SSH_USER=root; fi

TMP_DIR=$(mktemp -d)
trap 'rm -rf "$TMP_DIR"' EXIT

DRIFT=0
ERRORS=0

# 远端执行一条命令；退出码透传（9 = 远端文件不存在）
# stdin 一律指向 /dev/null：否则 ssh 会吃掉读映射表的 here-doc，只剩第一组被检查
run_ssh() {
	if [[ -n "$SSH_CMD" ]]; then
		eval "$SSH_CMD \"\$1\"" < /dev/null
	else
		ssh "$SSH_USER@$HOST" "$1" < /dev/null
	fi
}

# 检查一组映射：$1 = 仓库路径（基准），$2 = 线上路径
check_one() {
	local local_path="$1"
	local remote_path="$2"
	local base
	base=$(printf '%s' "$local_path" | tr '/' '_')
	local remote_file="$TMP_DIR/$base.remote"
	local rc=0

	# 本地基准文件先自检：缺了 diff 会返回 2，会被误报成「线上漂移」
	if [[ ! -f "$local_path" ]]; then
		echo "MISSING-LOCAL $local_path（仓库基准文件不存在）"
		ERRORS=$((ERRORS + 1))
		return 0
	fi

	if run_ssh "if [ -e '$remote_path' ]; then cat '$remote_path'; else exit 9; fi" > "$remote_file"; then
		:
	else
		rc=$?
		if [[ "$rc" -eq 9 ]]; then
			echo "MISSING $local_path（线上 $remote_path 不存在）"
			DRIFT=$((DRIFT + 1))
			return 0
		fi
		echo "ERROR  $local_path（读取线上失败，ssh 退出码 $rc，可能是网络/权限问题）"
		ERRORS=$((ERRORS + 1))
		return 0
	fi

	local diff_rc=0
	diff -u -L "线上 $remote_path" -L "仓库 $local_path" "$remote_file" "$local_path" || diff_rc=$?
	if [[ "$diff_rc" -eq 0 ]]; then
		echo "OK  $local_path"
	elif [[ "$diff_rc" -eq 1 ]]; then
		echo "DRIFT $local_path"
		DRIFT=$((DRIFT + 1))
	else
		echo "ERROR  $local_path（diff 执行失败，退出码 $diff_rc）"
		ERRORS=$((ERRORS + 1))
	fi
}

# 三组「仓库路径 → 线上路径」映射（本地是基准：+ 仓库 / - 线上）
while IFS='|' read -r local_path remote_path; do
	if [[ -z "$local_path" ]]; then continue; fi
	check_one "$local_path" "$remote_path"
done <<'MAPPINGS'
deploy/caddy/Caddyfile|/etc/caddy/Caddyfile
deploy/systemd/serve-9928.service|/etc/systemd/system/serve-9928.service
deploy/systemd/serve-9928.service.d/port.conf|/etc/systemd/system/serve-9928.service.d/port.conf
MAPPINGS

# 退出码口径：2 = 有文件无法检查（先报），1 = 只有内容不一致，0 = 全一致
if [[ "$ERRORS" -gt 0 ]]; then
	echo "$ERRORS 个文件无法检查（ssh 读取失败或仓库基准文件缺失）"
	if [[ "$DRIFT" -gt 0 ]]; then
		echo "$DRIFT 个文件漂移"
	fi
	exit 2
fi

if [[ "$DRIFT" -gt 0 ]]; then
	echo "$DRIFT 个文件漂移"
	exit 1
fi

echo "0 个文件漂移"
exit 0
