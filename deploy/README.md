# 线上入口配置（Caddy / systemd）

`deploy/` 是线上入口配置的**仓库副本**：内容从服务器原样抄来，用来做代码审查与漂移检测。
线上真源仍在 `/etc/caddy/` 与 `/etc/systemd/system/`，本目录**不会被任何自动化自动应用到线上**。

## 这些文件是什么

| 仓库路径 | 线上路径 | 作用 |
| --- | --- | --- |
| `deploy/caddy/Caddyfile` | `/etc/caddy/Caddyfile` | 对外唯一入口的分流规则 |
| `deploy/systemd/serve-9928.service` | `/etc/systemd/system/serve-9928.service` | 静态服务 unit |
| `deploy/systemd/serve-9928.service.d/port.conf` | `/etc/systemd/system/serve-9928.service.d/port.conf` | 上面 unit 的 drop-in：实际监听端口 |
| `deploy/check.sh` | —（只读比对） | 漂移检测脚本 |

**443 / 9928 拓扑**（`auto_https off` + `admin off`，证书用 `/etc/caddy/selfsigned.crt|key` 自签）：

- `:443`（产品 App Pulse）：`/api/*`、`/_next/*`、`/files/*` → BFF `127.0.0.1:19234`；其余全部 → 静态服务 `127.0.0.1:9929`（SPA 回退与 `[id].html` 动态路由都在这一侧）。页面与 API 同源，没有 CORS 问题。
- `:9928`（财务后台）：全量反代 → BFF `127.0.0.1:19234`。
- 两处反代都带 `header_up X-Forwarded-Proto https`，让 BFF 知道外层是 HTTPS；`encode gzip` 开启压缩。

**静态服务端口**：`serve-9928.service` 是历史命名，unit 里没写端口，由 drop-in `port.conf` 提供
`PORT=9929` / `BIND=127.0.0.1`，工作目录 `/root/project/agent-mobile/agent-mobile-app`，执行
`node scripts/serve-static.mjs`。所以「unit 叫 9928、实际听 9929」不是笔误。

## `check.sh` 怎么跑

```bash
bash deploy/check.sh
```

- 逐组把线上文件 `cat` 下来与仓库文件 `diff -u` 比对，一致打 `OK  <路径>`，不一致打印 diff 与 `DRIFT <路径>`，
  远端不存在打 `MISSING <路径>`；最后汇总「N 个文件漂移」并以 1 退出，全部一致以 0 退出。
- diff 里 **`+` 是仓库内容、`-` 是线上内容**（仓库为基准，`--- 线上 …` / `+++ 仓库 …`）。
- 只读：只 `cat` 上表那三个远端文件，不写线上、不执行任何变更命令、不打印凭据。
- 连接方式可覆盖（默认 `ssh root@106.13.181.13`）：

  | 环境变量 | 含义 |
  | --- | --- |
  | `HOST` | 远端主机，默认 `106.13.181.13` |
  | `SSH_USER` | 远端用户，默认 `root` |
  | `SSH_CMD` | **整条 ssh 命令**覆盖（设了就用它，缺省才回退 `ssh "$SSH_USER@$HOST"`） |

  CI 里就是这样调的（密钥只在 CI 的 `~/.ssh/deploy_key`，不写进脚本）：

  ```bash
  SSH_CMD="ssh -i ~/.ssh/deploy_key -o StrictHostKeyChecking=accept-new root@106.13.181.13" bash deploy/check.sh
  ```

- 自动化入口：`.github/workflows/deploy-web.yml` 的 `post-deploy` job 里有 `Infra drift check` 步骤，
  每次部署后跑一次，`continue-on-error` —— 只在 Actions 里告警，**不阻断部署、不改线上**。

## 为什么检测自动化、应用显式化

1. **Caddy 是唯一入口**：443 和 9928 只有它一个在听，`Caddyfile` 写错一行就是全站不可用（页面和 API 一起挂），
   不是「某个功能降级」。
2. **`admin off` 让热重载不可用**：Caddy 的管理接口被关掉，`caddy reload` 用不了，改配置必须
   `systemctl restart caddy` —— 重启期间入口短暂中断。自动应用等于把一次误提交直接变成一次线上中断。
3. 所以分工是：**检测自动化**（每次部署后自动比对、只告警，漂移当天就能看见）、
   **应用显式化**（要不要动入口、什么时候动，由人按下面的步骤手动执行，并且先校验、先备份）。

## 应用步骤（人工执行）

先跑 `bash deploy/check.sh` 确认要同步的是哪一份，然后**一份一份**来。

**Caddy**

```bash
# 1. 推到临时位置（不动线上）
scp deploy/caddy/Caddyfile root@106.13.181.13:/tmp/Caddyfile.new

# 2. 校验：不通过就停下，线上一个字都没改（caddy 不在 PATH 时可跳过，靠下面的回滚兜底）
ssh root@106.13.181.13 "caddy validate --config /tmp/Caddyfile.new"

# 3. 备份现场 + 覆盖 + 重启（admin off，必须 restart，不能 reload）
ssh root@106.13.181.13 "cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak-\$(date +%Y%m%d-%H%M%S) && install -m 644 /tmp/Caddyfile.new /etc/caddy/Caddyfile && systemctl restart caddy"

# 4. 验活：443 首页与 9928 各要 200
ssh root@106.13.181.13 "curl -sk -o /dev/null -w '%{http_code}' https://127.0.0.1/"
ssh root@106.13.181.13 "curl -sk -o /dev/null -w '%{http_code}' https://127.0.0.1:9928/"

# 5. 复检
bash deploy/check.sh
```

**systemd**

```bash
scp deploy/systemd/serve-9928.service root@106.13.181.13:/tmp/serve-9928.service
scp deploy/systemd/serve-9928.service.d/port.conf root@106.13.181.13:/tmp/port.conf

ssh root@106.13.181.13 "install -m 644 /tmp/serve-9928.service /etc/systemd/system/serve-9928.service && install -m 644 /tmp/port.conf /etc/systemd/system/serve-9928.service.d/port.conf && systemctl daemon-reload && systemctl restart serve-9928"

ssh root@106.13.181.13 "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9929/"   # 要 200
bash deploy/check.sh
```

## 回滚步骤

**Caddy**（历史回滚点固定存在 `/etc/caddy/Caddyfile.bak-20261105-165512`，是 2026-11-05 入口拓扑切换当天的现场备份）：

```bash
# 看有哪些回滚点
ssh root@106.13.181.13 "ls -1 /etc/caddy/Caddyfile.bak-*"

# 回到历史回滚点（每次应用前新做的 .bak-<时间戳> 同样用法）
ssh root@106.13.181.13 "install -m 644 /etc/caddy/Caddyfile.bak-20261105-165512 /etc/caddy/Caddyfile && systemctl restart caddy"

ssh root@106.13.181.13 "curl -sk -o /dev/null -w '%{http_code}' https://127.0.0.1/"   # 要 200
```

**systemd**：unit 不留 `.bak`（`/tmp` 会被清理），回滚点就是 git 历史 —— 取旧版本文件覆盖回去即可：

```bash
git show <旧 commit>:deploy/systemd/serve-9928.service > /tmp/serve-9928.service
git show <旧 commit>:deploy/systemd/serve-9928.service.d/port.conf > /tmp/port.conf
# 之后与「应用步骤 · systemd」后半段相同：install + daemon-reload + restart + 验活
```

回滚完成后照例 `bash deploy/check.sh`：如果线上回到了旧版本而仓库还是新版本，**不要**为了让检测变绿而回滚线上
—— 先确认哪一侧才是要保留的，再改仓库或改线上。
