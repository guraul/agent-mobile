# OPERATIONS.md —— 构建与运维

> 最后更新：2026-08-11 · commit：`072537f`（opencode 集成 + 消息顺序修复）

## 环境变量清单

| 变量 | 用途 | 是否必填 | 默认值 |
|---|---|---|---|
| `EXPO_TOKEN` | EAS 云构建鉴权（Expo 账号 access token，expo.dev/settings/access-tokens 生成） | 构建 APK 时必填 | 无 |
| `EXPO_PUBLIC_OPENCODE_URL` | OpenCode Server 地址 | 否 | `http://127.0.0.1:4096` |
| `EXPO_PUBLIC_OPENCODE_USERNAME` | Basic auth 用户名 | 否 | `opencode` |
| `EXPO_PUBLIC_OPENCODE_PASSWORD` | Basic auth 密码（`OPENCODE_SERVER_PASSWORD`） | 是 | 无 |

> 环境变量文件：`agent-mobile-app/.env.local`（未提交）。

## 本地开发启动

```bash
cd agent-mobile-app
pnpm install               # 包管理器统一用 pnpm
pnpm start                 # expo start（交互式，可选 --tunnel 供手机 Expo Go 扫码）
```

依赖版本约束：Node 24、Expo SDK 57（`npx expo install` 安装依赖保证版本匹配）。

## 测试

```bash
pnpm test                  # vitest 单测（src/**/*.test.ts，纯逻辑：reducer/merging/status/events）
pnpm lint                  # expo lint（eslint-config-expo）
pnpm e2e                   # Playwright E2E（含发消息，需确认）
pnpm e2e:nosend            # E2E 跳过发消息步骤（E2E_NO_SEND=1）
```

- E2E 前置：9928 静态部署已运行 + opencode server 已运行 + Pulse 页有可见项目。
- E2E 浏览器：自动探测 headless shell → snap chromium；**勿 `playwright install`**（复用 playwright-skill 依赖）。
- 自定义地址：`E2E_URL=http://<host>:9928/pulse pnpm e2e`。

## Web 预览部署（手机浏览器，静态产物）

```bash
cd agent-mobile-app
pnpm exec expo export --platform web   # 产出 dist/（含 pulse.html 等）
npx serve dist -l 9928                # 或 node scripts/serve-static.mjs（gzip + /→/pulse 302）
```

- 服务地址：`http://<公网IP>:9928`（公网 IP 参考 `curl ifconfig.me`）
- serve-static.mjs 特性：gzip（bundle 3MB→0.5MB）、`Cache-Control: no-store`（防旧缓存）
- 重新部署 = 重跑 export + 重启服务（dist 覆盖即生效）
- 进程管理：nohup 后台运行，日志 `/tmp/serve-9928.log`；停止 `pkill -f "serve dist"` 或 `pkill -f serve-static`

## Expo Go 真机预览

```bash
pnpm start --tunnel    # 依赖全局 @expo/ngrok；手机 Expo Go 扫码/输 exp:// URL
```

## Android APK 构建（EAS 云）

```bash
export EXPO_TOKEN=<token>
eas whoami                                        # 验证登录（guraul）
eas build -p android --profile preview            # APK，仅 arm64-v8a，内部分发
eas build:list -p android --limit 1               # 查状态/拿下载 URL
```

- preview profile：`buildType: apk` + `gradleCommand ":app:assembleRelease -PreactNativeArchitectures=arm64-v8a"`（eas.json），产物约 40-50MB
- 构建产物在 expo.dev 项目页下载（`https://expo.dev/accounts/guraul/projects/agent-mobile-pulse`）
- **构建命令勿前台阻塞运行**（易挂起会话）：用 `nohup ... &` 后台跑，约 10-20 分钟完成
- 首次需 `eas init --account guraul --non-interactive`（已执行，项目 ID 已写入 app.json）

## 上架准备（未执行）

- `eas build -p android --profile production` → AAB（Google Play 分发，自动按架构拆包）
- 需配置 Google Play 签名凭据；`eas submit` 上传

## CI/CD

无（无 GitHub Actions 等流水线）。

## OpenCode Server 托管

```bash
# 启动（systemd transient，密码从环境变量读取）
OPENCODE_SERVER_PASSWORD=<密码> opencode serve \
  --port 4096 \
  --hostname 0.0.0.0 \
  --cors http://localhost:9928 \
  --cors http://127.0.0.1:9928 \
  --cors http://106.13.181.13:9928

# 检查状态
systemctl status opencode-server
curl -u opencode:<密码> http://127.0.0.1:4096/global/health
```

- 端口 4096，`--hostname 0.0.0.0`（**公网可达**，供手机直接访问 API/SSE）。
- CORS 允许本地（9928）+ 公网 origin 跨域。
- 密码通过环境变量传入，不在命令行暴露。

## 端口占用速查

| 端口 | 用途 | 进程 |
|---|---|---|
| 9928 | web 预览（静态产物） | `npx serve dist` 或 `node scripts/serve-static.mjs` |
| 4096 | OpenCode Server（AI agent 后端） | `opencode serve`（systemd `opencode-server`） |
| 8081 | Metro dev server / tunnel | `expo start` |
