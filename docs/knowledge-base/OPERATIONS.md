# OPERATIONS.md —— 构建与运维

> 最后更新：2026-08-14 · commit：`108bd36`（BottomSheet web 黑框修复 + 阶段2 登录加固）

## 环境变量清单

### 手机端（agent-mobile-app/.env.local，未提交）

| 变量 | 用途 | 是否必填 | 默认值 |
|---|---|---|---|
| `EXPO_PUBLIC_OPENCODE_URL` | BFF baseUrl（手机端所有请求走这里） | 否 | `http://110.40.136.33:19234` |

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

## Web 预览部署（手机浏览器，静态产物）

```bash
cd agent-mobile-app
pnpm exec expo export --platform web   # 产出 dist/（含 pulse.html 等）
npx serve dist -l 9928                # 或 node scripts/serve-static.mjs（gzip + /→/pulse 302）
```

- 服务地址：`http://<公网IP>:9928`（公网 IP 参考 `curl ifconfig.me`）
- serve-static.mjs 特性：gzip（bundle 3MB→0.5MB）、`Cache-Control: no-store`（防浏览器缓存）
- **重新部署 = 重跑 export + 重启服务**：`pnpm exec expo export --platform web --clear` 后**必须** `pkill -f serve-static.mjs && node scripts/serve-static.mjs` 重启。`gzipCache` 按路径缓存 gzipped 字节，dist 文件覆盖后仍返回旧 bundle——`Cache-Control: no-store` 只防浏览器缓存，防不了服务端 gzipCache（见 CONVENTIONS）
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
| 9928 | web 预览（静态产物） | `npx serve dist` 或 `node scripts/serve-static.mjs` |
| 19234 | BFF（family-finance 主 checkout next dev） | `next dev -p 19234` |
| 19235 | BFF（阶段 2 worktree next dev） | `next dev -p 19235` |
| 4096 | OpenCode Server（AI agent 后端，127.0.0.1） | `opencode serve` |
| 8081 | Metro dev server / tunnel | `expo start` |