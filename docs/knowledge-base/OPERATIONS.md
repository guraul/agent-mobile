# OPERATIONS.md —— 构建与运维

> 最后更新：2026-08-10 · commit：`c836209`（新增 dev server 托管）

## 环境变量清单

| 变量 | 用途 | 是否必填 | 默认值 |
|---|---|---|---|
| `EXPO_TOKEN` | EAS 云构建鉴权（Expo 账号 access token，expo.dev/settings/access-tokens 生成） | 构建 APK 时必填 | 无 |

> 其余环境变量：无（项目不读取任何 env）。

## 本地开发启动

```bash
cd agent-mobile-app
npm install
npm start                  # expo start（交互式，可选 --tunnel 供手机 Expo Go 扫码）
```

依赖版本约束：Node 24、npm；Expo SDK 57（`npx expo install` 安装依赖保证版本匹配）。

## Dev server 托管（浏览器调试，推荐）

本机用 systemd 托管 Expo dev server 于 9928 端口（源码热更新，改代码保存即生效，**无需 export**）：

```bash
# 启动（从 agent-mobile-app 目录，必须用本地 expo 二进制避免 npx 重新下载）
systemctl stop pulse-expo 2>/dev/null
systemd-run --unit=pulse-expo --working-directory=/root/project/agent-mobile/agent-mobile-app \
  --setenv=CI=0 --setenv=EXPO_NO_TELEMETRY=1 \
  /root/project/agent-mobile/agent-mobile-app/node_modules/.bin/expo start --web --port 9928
journalctl -u pulse-expo -f     # 看编译日志
systemctl stop pulse-expo       # 停止
```

- 访问：`http://<公网IP>:9928/pulse`
- 改 `app.json` 后需 `systemctl restart pulse-expo`（配置变更不会热生效）
- dev server 占内存/CPU 高，调试完毕可换回静态部署

## Web 预览部署（手机浏览器，静态产物）

```bash
cd agent-mobile-app
npx expo export --platform web     # 产出 dist/（含 pulse.html 等）
node scripts/serve-static.mjs      # :9928，gzip + /→/pulse 302 + 无扩展名回退
```

- 服务地址：`http://<公网IP>:9928`（公网 IP 参考 `curl ifconfig.me`）
- 特性：gzip（bundle 3MB→0.5MB）、`Cache-Control: no-store`（防旧缓存）
- 重新部署 = 重跑 export + 重启服务（dist 覆盖即生效，服务无需重启也可——静态读文件）
- 进程管理：nohup 后台运行，日志 `/tmp/serve-9928.log`；停止 `pkill -f serve-static`

## Expo Go 真机预览

```bash
npx expo start --tunnel    # 依赖全局 @expo/ngrok；手机 Expo Go 扫码/输 exp:// URL
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

## 端口占用速查

| 端口 | 用途 | 进程 |
|---|---|---|
| 9928 | web 预览（dev server 或静态） | `expo start --web`（systemd `pulse-expo`）或 `node scripts/serve-static.mjs` |
| 8081 | Metro dev server / tunnel | `expo start` |
