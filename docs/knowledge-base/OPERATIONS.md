# OPERATIONS.md —— 构建与运维

> 最后更新：2026-08-30 · commit：`d255c48`（9928 恢复 web 静态版 serve-9928，Metro/APK 转备用）

## 环境变量清单

### 手机端（agent-mobile-app/.env.local，未提交）

| 变量 | 用途 | 是否必填 | 默认值 |
|---|---|---|---|
| `EXPO_PUBLIC_OPENCODE_URL` | BFF baseUrl（手机端所有请求走这里） | 否 | `http://106.13.181.13:19234` |

> **阶段 2 起手机端不再持有 opencode 凭证**（`EXPO_PUBLIC_OPENCODE_USERNAME/PASSWORD` 已删除，凭证只在 BFF 侧）。

### BFF（family-finance/packages/web/.env.local，未提交）

| 变量 | 用途 | 是否必填 | 默认值 |
|---|---|---|---|
| `JWT_SECRET` | JWT 签名密钥 | 是 | 无 |
| `ADMIN_USERNAME` | BFF 登录用户名 | 是 | 无 |
| `ADMIN_PASSWORD` | BFF 登录密码 | 是 | 无 |
| `OPENCODE_USERNAME` | opencode Basic auth 用户名 | 否 | `opencode` |
| `OPENCODE_PASSWORD` | opencode Basic auth 密码 | 是 | 无 |
| `OPENCODE_BASE_URL` | opencode 地址 | 否 | `http://127.0.0.1:4096` |

## 本地开发启动

### 手机端

```bash
cd agent-mobile-app
pnpm install               # 包管理器统一用 pnpm
pnpm start                 # expo start（交互式，可选 --tunnel 供手机 Expo Go 扫码）
```

依赖版本约束：Node 24、Expo SDK 57（`npx expo install` 安装依赖保证版本匹配）。

### BFF（family-finance）

```bash
cd family-finance
pnpm install
pnpm --filter web exec next dev -H 0.0.0.0 -p 19234   # 生产 BFF（主 checkout）
pnpm --filter web exec next dev -H 0.0.0.0 -p 19235   # 阶段 2 worktree BFF（开发验证）
```

## 测试

### 手机端

```bash
pnpm test                  # vitest 单测（src/**/*.test.ts，纯逻辑：reducer/merging/status/events）
pnpm lint                  # expo lint（eslint-config-expo）
pnpm e2e                   # Playwright E2E（含发消息，需确认）
pnpm e2e:nosend            # E2E 跳过发消息步骤（E2E_NO_SEND=1）
```

- E2E 前置：9928 静态部署已运行 + BFF 已运行 + opencode server 已运行 + Pulse 页有可见项目。
- E2E 浏览器：自动探测 headless shell → snap chromium；**勿 `playwright install`**（复用 playwright-skill 依赖）。
- 自定义地址：`E2E_URL=http://<host>:9928/pulse pnpm e2e`。

### BFF（family-finance）

```bash
pnpm test                  # vitest 单测（lib/*.test.ts：auth-shared/opencode/opencode-stream）
BFF_BASE=http://127.0.0.1:19235 node test/bff-integration.mjs admin admin123   # 集成测试（login/stream/proxy/model list）
```

### 阶段 2 E2E（打字机 + 登录 + 动态模型）

```bash
# 前置：BFF dev（19235）+ opencode（4096）+ 9928 静态服务（含新构建）
node test/bff-e2e.mjs      # 登录 → 横幅消失 → 打开项目 → 动态模型列表 → 发消息 → stream 200 → 打字机内容
```

- 构建注入 BFF 地址：`EXPO_PUBLIC_OPENCODE_URL=http://127.0.0.1:19235 pnpm exec expo export --platform web --clear`（**必须 `--clear`**，否则 env 不注入）。

## Web 预览部署（手机浏览器，静态产物）【当前方案，2026-08-30 起恢复】

> 2026-08-30 起 9928 恢复 web 静态版（`serve-9928`），替代 Expo Go Metro / APK 下载。**BFF CORS 允许列表只放行 9928 的三个 origin**（`106.13.181.13`/`127.0.0.1`/`localhost`，见 family-finance `lib/cors.ts`），静态版换端口浏览器端会全被 CORS 拦。

```bash
cd agent-mobile-app
pnpm exec expo export --platform web   # 产出 dist/（含 pulse.html 等）
npx serve dist -l 9928                # 或 node scripts/serve-static.mjs（gzip + /→/pulse 302）
```

- 服务地址：`http://<公网IP>:9928`（公网 IP 参考 `curl ifconfig.me`）
- serve-static.mjs 特性：gzip（bundle 3MB→0.5MB）、`Cache-Control: no-store`（防浏览器缓存）
- **重新部署 = 重跑 export + 重启服务**：`pnpm exec expo export --platform web --clear` 后**必须** `pkill -f serve-static.mjs && node scripts/serve-static.mjs` 重启。`gzipCache` 按路径缓存 gzipped 字节，dist 文件覆盖后仍返回旧 bundle——`Cache-Control: no-store` 只防浏览器缓存，防不了服务端 gzipCache（见 CONVENTIONS）
- 进程管理：systemd 单元 `serve-9928.service`（已 disable）；恢复 `systemctl start serve-9928`

## Expo Go 真机预览（备用方案，9928 端口）

**2026-08-15 起**：9928 由 Metro dev server 占用（替代静态 web），手机 Expo Go 直连，**不新开 8081**。**2026-08-16 起 9928 已切换为 APK 下载服务**（见下节）。**2026-08-30 起 9928 恢复 web 静态版（`serve-9928`，当前方案）**，Expo Go 方案保留备用。

```bash
# 启动（systemd 托管，开机自启）
systemctl start expo-metro-9928
systemctl status expo-metro-9928     # 日志：Waiting on http://localhost:9928

# 手动启动（调试用）
cd agent-mobile-app
REACT_NATIVE_PACKAGER_HOSTNAME=106.13.181.13 \
EXPO_PUBLIC_OPENCODE_URL=http://106.13.181.13:19234 \
npx expo start --port 9928 --host lan
```

- **手机端**：装最新版 Expo Go（须支持 SDK 57）→ 手动输入 `exp://106.13.181.13:9928`（公网场景扫 LAN 二维码无效，手输 URL）
- **关键 env**：`REACT_NATIVE_PACKAGER_HOSTNAME=106.13.181.13` 让 Metro 广播的 bundle URL 用公网 IP，否则手机加载 bundle 指向内网 IP 失败；`EXPO_PUBLIC_OPENCODE_URL` 注入 BFF 地址（Expo Go 加载开发 bundle，env 从启动命令注入）
- **systemd 单元**：`/etc/systemd/system/expo-metro-9928.service`（`Type=simple` + `Restart=always`，WorkingDirectory=agent-mobile-app，ExecStart 用 `node node_modules/expo/bin/cli start --port 9928 --host lan`）
- **安全**：Metro dev server 无鉴权，公网可拉 bundle——**仅测试用**，正式发布走 EAS APK；测试完 `systemctl stop expo-metro-9928`
- **切换回 web 版**：`systemctl stop expo-metro-9928 && systemctl start serve-9928`
- 热重载：改代码 Metro 实时刷新，比 web 版每次 export+重启快

## APK 下载服务（当前方案，9928 端口）

**2026-08-16 起**：9928 由 APK 下载服务占用（替代 Expo Go Metro），手机浏览器直接下载最新 APK 侧载安装。

```bash
# 服务（systemd 托管）
systemctl start apk-download-9928
systemctl status apk-download-9928

# 手动启动（调试用）
cd /root/project/agent-mobile/test/download
python3 -m http.server 9928 --bind 0.0.0.0
```

- **下载地址**：`http://106.13.181.13:9928/pulse.apk`（手机浏览器打开即下载，Content-Type: application/vnd.android.package-archive）
- **APK 文件**：`/root/project/agent-mobile/test/download/pulse.apk`（EAS 构建产物，`eas build:download --build-id <id>` 下载后覆盖）
- **systemd 单元**：`/etc/systemd/system/apk-download-9928.service`（`Type=simple` + `Restart=always`，ExecStart 用 python3 http.server）
- **安全**：无鉴权，公网可下载——**仅内部分发测试用**，正式发布走 EAS APK / 上架
- **切换回 Expo Go**：`systemctl stop apk-download-9928 && systemctl start expo-metro-9928`

## Android APK 构建（EAS 云）

```bash
export EXPO_TOKEN=<token>
eas whoami                                        # 验证登录（guraul）
eas build -p android --profile preview            # APK，仅 arm64-v8a，内部分发
eas build:list -p android --limit 1               # 查状态/拿下载 URL
eas build:download --build-id <id> --non-interactive   # 下载 APK 到本地
```

- preview profile：`buildType: apk` + `gradleCommand ":app:assembleRelease -PreactNativeArchitectures=arm64-v8a"`（eas.json），产物约 40-50MB
- 构建产物在 expo.dev 项目页下载（`https://expo.dev/accounts/guraul/projects/agent-mobile-pulse`）
- **构建命令勿前台阻塞运行**（易挂起会话）：用 `nohup ... &` 后台跑，约 10-20 分钟完成
- 首次需 `eas init --account guraul --non-interactive`（已执行，项目 ID 已写入 app.json）
- **APK 访问 BFF 需明文 HTTP**：BFF 是 `http://` 明文，Android 9+ 默认禁 cleartext，app.json 已配 `expo-build-properties` → `android.usesCleartextTraffic: true`（勿删，否则 APK 内所有请求报 `UnknownServiceException`）
- **EAS 云构建不含 `.env.local`**（gitignore）：构建时 `EXPO_PUBLIC_OPENCODE_URL` 取不到，走 `src/config/opencode.ts` 的代码 fallback（当前为 `http://106.13.181.13:19234`）。改 BFF 地址时**必须同步改 fallback**，否则 APK 连错地址

## 上架准备（未执行）

- `eas build -p android --profile production` → AAB（Google Play 分发，自动按架构拆包）
- 需配置 Google Play 签名凭据；`eas submit` 上传

## CI/CD

无（无 GitHub Actions 等流水线）。

## OpenCode Server 托管

```bash
# 启动（阶段 2 起收窄为 127.0.0.1，仅 BFF 本机可达）
OPENCODE_SERVER_PASSWORD=<密码> opencode serve \
  --port 4096 \
  --hostname 127.0.0.1 \
  --print-logs

# 检查状态
curl -u opencode:<密码> http://127.0.0.1:4096/global/health
```

- 端口 4096，`--hostname 127.0.0.1`（**公网不可达**，安全收窄；手机端经 BFF 访问）。
- **不再需要 `--cors`**：跨域由 BFF 处理（`lib/cors.ts`）。
- 密码通过环境变量传入，不在命令行暴露。
- 验证收窄：`curl http://<公网IP>:4096/global/health` 应超时/不可达。

## 端口占用速查

| 端口 | 用途 | 进程 |
|---|---|---|
| 9928 | Web 静态预览（当前，serve-9928） | `serve-9928.service`（node serve-static.mjs，gzip） |
| 19234 | BFF（family-finance 主 checkout next dev） | `next dev -p 19234` |
| 19235 | BFF（阶段 2 worktree next dev） | `next dev -p 19235` |
| 4096 | OpenCode Server（AI agent 后端，127.0.0.1） | `opencode serve` |
| 8081 | Metro dev server 默认端口（当前未用，9928 已占用） | `expo start` |