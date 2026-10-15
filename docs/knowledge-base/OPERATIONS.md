# OPERATIONS.md —— 构建与运维

> 最后更新：2026-10-12 · commit 6d432c5 · DSH 接入 OpenCode Go 订阅（`opencode-go` provider）配置 + 404/400 排查结论落档，见 §DSH 接入 OpenCode Go
> 最后更新：2026-10-11 · E1 生产 opencode 升级 v2.0.26（issue #53）
> ⚠️ **opencode v2 要点（2026-10-11 生产窗口实测）**：
> - **v2 没有任何 npm/GitHub 发布产物**（npm `opencode-ai@latest`=1.19.0 仍是 v1 线）——装机只能走官方 v2 脚本：`curl -fsSL https://opencode.ai/v2/install | bash -s -- --version 2.0.26`，落位 `~/.opencode/bin/opencode`（本机与生产同此）
> - **v2 serve 强制 Basic 密码鉴权**：`Environment=OPENCODE_PASSWORD=…`（systemd 单元内必须在 [Service] 段）+ BFF `.env.local` 同步同值；生产密码在服务器 `/root/backups/opencode-4096-password.txt`
> - 生产 `opencode-4096.service` ExecStart 已改为 `/root/.opencode/bin/opencode serve --port 4096 --hostname 127.0.0.1 --print-logs`（不再走 npm 全局路径）
> - 生产全局配置 `~/.config/opencode/opencode.json` 已是 v2 形状（agents 含 companion/companion=space-bunny-free+deny-all 白名单/其余 agent model=mimo；exa MCP connected）；v1 旧配置存 `/root/backups/opencode.v1.bak/`
> - **回滚物料**：`/root/backups/`（v1 二进制 tgz 116M + DB 三件套快照 1.8G + 旧配置 + 密码）；回滚 = 二进制+DB+BFF/App 版本三件一起
> - v2 升级前必须先摘 v1 插件（生产已摘 memx+superpowers；`opencode.jsonc` 已归档）；以后升级用 `opencode upgrade`
> - 历史：2026-09-27 服务器整备（9928/BFF/opencode 收编 systemd、node 24.21.0）

> 最后更新：2026-09-27 · commit：服务器整备——9928/BFF/opencode 全部收编 systemd（serve-9928 / bff-19234 / opencode-4096），showcase2-9928 退役，node 升至 24.21.0，磁盘 81%→77%

## 环境变量清单

### 手机端（agent-mobile-app/.env.local，未提交）

| 变量 | 用途 | 是否必填 | 默认值 |
|---|---|---|---|
| `EXPO_PUBLIC_OPENCODE_URL` | BFF baseUrl（手机端所有请求走这里） | 否 | `http://106.13.181.13:19234` |

> **阶段 2 起手机端不再持有 opencode 凭证**（`EXPO_PUBLIC_OPENCODE_USERNAME/PASSWORD` 已删除，凭证只在 BFF 侧）。

### BFF（homebase/packages/web/.env.local，未提交）

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

依赖版本约束：Node 24.21.0（仓库根 `.nvmrc` 已锁定，`nvm use` 即可；两个 package.json 的 `engines` 均要求 `>=24.21.0`）、Expo SDK 57（`pnpm exec expo install` 安装依赖保证版本匹配，**勿用 `npx`**）。

### BFF（homebase）

```bash
cd homebase
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

### BFF（homebase）

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

## Web 部署（手机浏览器，静态产物）

> **部署方式（2026-09-27 起，Pipeline Phase 2）**：**主路径 = GitHub Actions 自动部署**（`.github/workflows/deploy-web.yml`：main push 且 `agent-mobile-app/**` 变更 → tsc/test → expo export → rsync → 切软链 → restart → 线上验证）。
> **手动兜底** = `scripts/pipeline/deploy.sh`；**回滚** = `scripts/pipeline/rollback.sh`（releases 任意秒切）。手册见 `docs/pipeline/README.md`。
>
> **服务器布局**：`/root/project/agent-mobile/agent-mobile-app/` 下 `releases/<id>/` 为产物目录（保留最近 5 版），`dist` 是指向当前版本的软链；`serve-9928.service` 托管（enabled 开机自启），重启才刷新 gzipCache。
> **BFF CORS 允许列表只放行 9928 的三个 origin**（`106.13.181.13`/`127.0.0.1`/`localhost`，见 homebase `lib/cors.ts`），
> 静态版换端口浏览器端会全被 CORS 拦——所以换端口前必须先改 BFF CORS 允许列表。

```bash
# 自动部署：merge 到 main 即触发（actions 页面可见进度），无需手动操作
# 手动兜底 / 本地验证：
scripts/pipeline/deploy.sh --dry-run   # 预演命令序列
scripts/pipeline/deploy.sh             # tsc + test → export(--clear) → rsync releases/manual-<ts> → 切软链 → restart
scripts/pipeline/rollback.sh           # 回滚到上一版 / 指定 release
scripts/pipeline/status.sh             # 全链路状态
```

- 服务地址：`http://106.13.181.13:9928`（Pulse 首页在 /；/memory /me 重定向到 /）
- serve-static.mjs 特性：gzip（bundle 3MB→0.5MB）、`Cache-Control: no-store`（防浏览器缓存）；ROOT 硬编码指向 dist（软链可穿透）
- **gzipCache 陷阱**：任何方式替换产物后**必须** `systemctl restart serve-9928`（deploy.sh / workflow 已内置）——`gzipCache` 按路径缓存 gzipped 字节，不重启返回旧 bundle（见 CONVENTIONS）
- 进程管理（2026-09-27 全部收编 systemd，均 enabled 开机自启）：`serve-9928.service`（主应用静态版）/ `bff-19234.service`（homebase BFF）/ `opencode-4096.service`（opencode server）。服务器 node = v24.21.0（nodesource apt）。

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

## memx v2 记忆插件（opencode 侧）

> 仓库：`guraul/memx`（本机 `/Users/gubin/workspace/memx`，2026-10-12 由 `opencode-memx` 改名；**生产 `/root/project/memx`**，remote 用 SSH）。功能：AI 发言时自发
> 发出 `<!-- STYLE_SIGNAL -->` / `<!-- MEMORY_SIGNAL -->` 注释 → 插件捕获 → 子会话 LLM
> 提炼 → 写入 USER.md / MEMORY.md → 下一轮注入回模型。**截至 2026-10-12 尚未部署生产**
> （**2026-10-13 已部署**，见「上线窗口（E4）——已执行」节）。

### 记忆数据落在哪

| 层 | 位置 | 谁维护 |
|---|---|---|
| 信号协议 | `~/.opencode/memx-protocol.md` | `install.sh` / `scripts/sync-protocol.ts` 从 `src/core/protocol-template.ts` 生成（枚举从 Zod schema 渲染，不手改） |
| 长期偏好 Track 1 | `~/.opencode/USER.md` | memx 提炼写盘；**保留用户手写的非受管内容** |
| 项目记忆 Track 2 | `~/.opencode/MEMORY.md`（索引）+ `~/.opencode/projects/<slug>/.mem/*.md` | 同上 |

### ⚠️ opencode v2 的 prompt 注入通道（别再依赖 instructions）

**`opencode.json` 的 `instructions` 数组在 v2.0.26 是死字段**：schema 里还在
（`packages/schema/src/config.ts:90`），但全仓无消费方——唯一的指令装配插件
`config/plugin/instruction.ts` 只加载 `AGENTS.md`（全局 `~/.config/opencode/AGENTS.md`
+ 各级祖先目录）。运行时佐证：`instruction_state` 的 `core/instructions` blob 解码后只有
AGENTS.md，且补建缺失的 MEMORY.md 后 blob 哈希不变。

| 通道 | 插件能用？ | 成熟度 |
|---|---|---|
| `AGENTS.md` | 间接（读文件） | 稳定，唯一运行时验证过的 |
| agent 的 `system` 字段（`schema/agent.ts:28`） | 否 | 稳定 |
| **`ctx.session.hook("context")` 改 `event.system`** | **是** | 公开插件 API —— **memx 走这条** |
| `session.instructions.entry.put`（`api/<key>` 命名空间，256KB 上限） | 否（只有 HTTP API，插件 ctx 未暴露） | 实验性 |

`context` hook 触发时 `event.system` 已含 `agent.system` + AGENTS.md 合并正文
（`model-request.ts:110-116`），所以**追加**是安全的，替换会抹掉宿主内容。hook 每个 step
触发一次；文件读走 `stat(mtimeMs+size)` 缓存。

### 安装与验证

```bash
# 安装（写入插件入口 + 生成协议文件 + 幂等注册 instructions 转发项）
sh /Users/gubin/workspace/memx/install.sh

# 判断插件真实状态：查 kv 表，**不要信 memx_status**（格式化器只打固定字段）
sqlite3 ~/.local/share/opencode/opencode.db \
  "SELECT value FROM kv WHERE key LIKE 'plugin:%diag:Users-gubin-workspace-agent-mobile-test-companion-agent-config%'"

# 看 USER.md 是否真的落盘
cat ~/.opencode/USER.md
```

- **src 改动必须重启 opencode**（插件启动时加载一次）；`memx.config.json` 改 30s TTL 热加载。
- 诊断键按目录隔离（`diag:<slug>`）；同目录多实例仍会互相覆盖，`opencode run --server` 客户端也会实例化插件——排查以 USER.md 实际落盘为准。
- 提炼模型走子会话，**默认 `opencode/mimo-v2.6-flash-free`**，靠 `~/.opencode/memx.config.json` 的 `refinementModel`（`provider/model` 字符串格式）覆盖。
- ⚠️ **禁止在 `context` hook 里 `event.tools = {}`**：会让子会话请求被免费档网关 403（`FreeTierError`），表现为回复为空、`failures` 不涨、`lastError` 为空——极具误导性。
- ⚠️ **提炼在客户端断开时中断不落盘**：用 `reflect` 工具在会话内完成，或走 `session.deleted` 强制路径。

### 出口① 显式写入 `memory_write`（2026-10-12）

用户说"这个记一下"时的写路（**方案 A：runtime 是唯一写者**，用户 2026-10-12 拍板）：

| 环节 | 事实 |
|---|---|
| 工具 | memx 插件注册的 `memory_write`（core `src/core/memory-write.ts` → `writeProjectMemory`）；四类型 + `text` ≤500 字；**同名同类型 = 修订**；纯中文名走确定性哈希文件名 |
| 写盘 | 与后台提炼**同一条路**：`applyMemoryProposals`（单遍）+ `withFileLock`（锁内重读索引）——不存在两份格式实现 |
| 回执 chip | App `services/message-merging.ts` 把它渲染成 `kind:"receipt"` 步（**不进工具折叠组**，留痕可见）；`command-receipt.ts` 剥前导 `✅`；文字**不截断**（红线：路径/多行一字不改） |
| ⚠️ v2 part 形状（2026-10-12 真机实测） | 工具结果在 **`state.content[]`**（`[{type:"text",text}]`），**不是 `state.output`**；且默认 **codemode** 会把插件工具包成 `execute`（`part.tool="execute"`，参数在 `state.input.code`）→ memx 已给 `memory_write` 声明 `options:{codemode:false}`，part 名才是 `memory_write`。App 侧 `toolResultText()` 兼容 `state.output`/`state.content` 两种形状 |
| ⚠️ 既有遗留（未改，记 backlog） | 其余工具步仍只读 `state.output` → **v2 下工具输出/diff 面板普遍为空**（`state.content` 没被消费）；这属 E1 遗留，不在出口① 范围内 |
| 读取 | 不新增端点：BFF `GET /api/product/memory`（Phase 6 投影）直接读 canonical 记忆库；`POST /api/product/memory` 保持 **405**（PM §6/§29：记忆不由 API 创建） |
| 权限 | 生产的 companion 白名单已按 #74 撤除 → 工具随插件注册即可见；**本机仍留白名单**，只追加 `{"action":"memory_write","resource":"*","effect":"allow"}`（白名单是 deny-all，不加这条工具会被 `tool.ts:292 whollyDisabled` 从快照摘掉） |
| 软约束 prompt | `agents.companion.system` v0.2，真源 `docs/pipeline/COMPANION_PROMPT_V0.md`（v0.2 = 补"必须真调 memory_write / 不许空说已记下 / 除记忆外不写文件"）；**生产待上线窗口应用** |
| 运行时模型（2026-10-12 二次拍板） | **生产 / App 保持 `opencode/mimo-v2.6-flash-free`**（App 写死点：`services/conversation-kind.ts` 的 `CHAT_MODEL`（**单一事实源**，#76 起 ChatPanelZ 的本地副本已删）+ `model-registry.ts` 的 `DEFAULT_MODEL`）——App 唯一真实目标是生产 opencode，而**生产没有 `opencode-go` provider**。**Go 档 `opencode-go/longcat-2.5-preview-free` 只用于本机/DSH 侧**（DSH 子代理 + 本机 memx 提炼；本机免费档被网关 403/429 挡），本机 `agents.companion.model` 已设 Go 档（与生产**有意差异**） |

✅ **真机端到端已验（2026-10-12，Go 模型 + 本机 serve + 隔离测试项目）**：P0-1 游标 `fresh→resumed`（各 `newTurns:1`）、P0-2 三态（`captured:1 refinements:1 invalidStreak:0`）、出口① `memory_write` 落地（`.mem` 文件 + MEMORY.md 索引 + diag `toolWrites:1`）；测试后 `USER.md`/`MEMORY.md` 已还原。仍未验 = **App 里 chip 的视觉呈现**。

### 上线窗口（E4）—— ✅ 2026-10-13 已执行

> 执行记录见本节末；预检表保留作对照。生产备份：`/root/backups/e4-window-20261013-112731/`（opencode.json + USER.md + MEMORY.md）。

| 项 | 状态 | 窗口动作 |
|---|---|---|
| 生产 opencode 认识 `opencode-go/*`？ | ❌ **不认识**——`opencode models` 只有 agnes / deepseek / opencode / sensenova / siliconflow-cn / stepfun（76 个模型） | **当前决定不用**（用户 2026-10-12：生产保持 mimo）。若将来要在生产用 Go 档，先解决这一项（刷新 models.dev 或按 DSH 侧 `~/.dsh/profiles/web/cordis.patch.yml` 显式声明 provider） |
| 生产已装 memx？ | ❌ 无 `~/.config/opencode/plugins/` 目录；config 无 `plugins` 键 | 跑 memx `install.sh` + v2 `plugins` 注册 |
| 生产 companion model | `opencode/mimo-v2.6-flash-free` | **保持不动**（用户 2026-10-12 二次拍板） |
| 生产 companion prompt | v0.1（无 memory_write 条款） | 应用 v0.2（`COMPANION_PROMPT_V0.md`） |
| 生产 `instructions` | 已摘除（无记忆注入） | 窗口时决定是否恢复注入（memx `inject` 配置） |
| 生产 `opencode` 命令指向 | ⚠️ `/usr/bin/opencode` → `../lib/node_modules/opencode-ai/bin/opencode.exe` = **v1.19.0**；v2 在 `/root/.opencode/bin/opencode`（`opencode2` 是同目录包装），**不在 PATH** → 直接敲 `opencode` 会用 v1 去读 v2 配置，报 `V2 permissions are not supported by OpenCode V1 … or run opencode2`（**配置本身没错**） | 推荐 `ln -sf /root/.opencode/bin/opencode /usr/bin/opencode`（先把旧 symlink 备份成 `.bak-v1`）——一行同时修好交互 shell 与微信桥的 `which opencode`。**别 `npm rm -g opencode-ai`**：它是现成的 v1 CLI 备用，真回滚物料是 `/root/backups/opencode-ai-1.18.34-installed.tgz` |
| 生产 v1 为什么还在（2026-10-11 E1 时间线） | 升级本身**已完成**（唯一 systemd 单元 `opencode-4096` 与唯一 opencode 进程都是 v2）——`/usr/bin/opencode` 的 v1.19.0 是 E1 当天 **10:33 的"npm 线是否已发 v2"探针**（npm 全局装 latest 确认仍是 v1 线，`OPERATIONS` v2 装机节有记录），10:55 才走官方脚本装 v2；探针包没人清 + v2 目录没进 PATH = 今天这个坑 | 窗口里一并处理（见上一行） |
| ⚠️ 微信桥会踩 v1（连带故障） | `/root/project/wechat-opencode-bridge/dist/opencode.js` 用 `which opencode` **动态解析**二进制 → 拿到 `/usr/bin/opencode`(v1)；且它的存活判据是 `GET <url>/api/health`，**v2 该端点返回 401**（要 Basic 鉴权）→ 判为"异常状态码，尝试重启" → 一旦桥启动就会 spawn v1（v1 读 v2 配置直接起不来）。桥当前**没在跑**（无进程/无 systemd 单元） | ① 修 symlink（上一行）让 `which opencode` = v2；② **桥自身还有 bug**：应把 401 视为"已在运行"或带 Basic 头再探测——需改 wechat-opencode-bridge 代码（独立仓库/目录，不在本仓范围） |
| 生产 memx 提炼模型 | 未装 memx；仓库默认 = `opencode/mimo-v2.6-flash-free`（生产目标） | 装完 memx 后**无需**覆盖；若将来生产支持 Go 档再考虑 |

**执行结果（2026-10-13 11:2x-11:3x，用户授权窗口）**：

| 步骤 | 结果 |
|---|---|
| ① 推 main（11 提交）→ 9928 自动部署 | ✅ Actions `run-38341548892-287bbcc` success；`serve-9928` active；release 目录已建 |
| ② 收敛 `opencode` → v2 | ✅ `/usr/bin/opencode` → `/root/.opencode/bin/opencode`；`opencode --version` = `opencode v2.0.26`；旧 symlink 备份 `/root/backups/opencode-v1-symlink.bak`；微信桥 `which opencode` 也随之指向 v2（其 401 判据 bug 仍在 → wechat-opencode-bridge#1） |
| ③ 生产装 memx | ✅ 检出 **`/root/project/memx`**（新路径，不是 v1 时代的 `/root/project/opencode-memx`）；remote 切 **SSH**（HTTPS 反复 GnuTLS 抖动）；插件入口 `~/.config/opencode/plugins/memx.ts`；协议 `~/.opencode/memx-protocol.md` v1.1.0；`~/.config/opencode/package.json` 依赖名自愈为 v2 |
| ④ companion prompt | ✅ `agents.companion.system` = v0.2（真源 `docs/pipeline/COMPANION_PROMPT_V0.md`）；**model 保持 `opencode/mimo-v2.6-flash-free`**；无 permissions（`memory_write` 随插件可见） |
| ⑤ 重启加载 | ✅ `systemctl restart opencode-4096`；日志 `loading plugin memx.ts`；kv 出现 `diag:root-project` / `diag:root`，`version:"v2-p0-1"` |

**两个现场踩坑（已修进仓库）**：① `install.sh` 第 2 步原用 `npm install`（违反规则 14）→ 改 `pnpm install`（memx `27bcdef`）；② `pnpm-workspace.yaml` 的 `allowBuilds` 是占位文本 → pnpm 11 `strictDepBuilds` 默认开启，`pnpm install` **退出 1** 导致 install.sh 中断在第 2 步、后 4 步全不执行 → 明确表态 `msgpackr-extract: false`（memx `1bb53cc`）。


### 注入范围与泄漏风险（部署前必读）

注入默认对**所有 agent** 生效（含 agent-mobile 面向用户的 `companion`）。范围由消费方在
`~/.opencode/memx.config.json` 决定，插件不硬编码任何 agent 名：

```json
{ "inject": { "enabled": true, "includeAgents": "all", "excludeAgents": ["companion"] } }
```

**chat 侧必须先确认注释剥离**：目前只有 `MessageBubbleZ`（经 `/talk` → `ProjectChatZ` →
`ChatPanelZ`）做了 HTML 注释剥离；`MessageBubble.tsx:72` 是**无剥离的死路径**
（`ProjectChat.tsx` 无 importer），一旦重新接线就会泄漏；BFF 服务端是否剥离**未核实**
（family-finance 仓只在生产机）。

### 已知未决

- **所有权规则缺失**：协议只约束「不要重复上报」，没约束「不要改 AGENTS.md」。实测模型会把
  偏好直接写进全局 `~/.config/opencode/AGENTS.md`（2026-10-12 e2e 副作用，已回滚）。在补上
  该约束前，system 前缀存在被模型自行改掉的风险。
- 生产 memx 本体：✅ 已装并加载（2026-10-13 窗口，见上表）。仍未做的两件：① 生产是否恢复记忆注入（生产 config 目前无 `instructions` 键，当前即"无记忆注入"状态）；② `memory_write` 回执 chip 的**生产真机**验证（#86）。③ 多机云同步 A4（#87 第二半）已于 2026-10-14 上线，见下节。

### 多机云同步（A4 / #87 第二半）

**定位**：memx 的 `USER.md` / `MEMORY.md` / `projects/<slug>/.mem/*.md` 通过私有仓 `guraul/memx-sync` 在多机间镜像。
**默认关**（`sync.enabled=false`；`machineName` 为空同样不启动），开启要改 `~/.opencode/memx.config.json` **并重启宿主**。
**推触发点** = 提炼写盘成功后 + `memory_write` 工具成功后（`void sync.push()`，异步、不阻塞写盘）；**拉** = 启动时一次 + 每 `intervalMinutes`（默认 30）。

| 机器 | machineName | 状态 |
|---|---|---|
| mbp（`/Users/gubin/workspace/memx`） | `mbp` | 2026-10-13 开；首推 `6414494`；**自动推拉实测有效**（一天内十余个 `memx@mbp` 提交） |
| prod（`/root/project/memx`） | `prod` | 2026-10-14 开，同窗口把 `refinementModel` 从 `opencode/mimo-v2.5-free` 换成 **`opencode/mimo-v2.6-flash-free`**；首推 `memx@prod` 补上 9 个 `projects/root-project*/.mem/*.md` |

**关键机制**（全在 memx `src/core/sync.ts`，零宿主依赖）

- 工作目录 `~/.opencode/memx-sync-repo/`（缓存镜像，不存在则 clone）；`remoteUrl()` 支持 `owner/name`→GitHub SSH，也支持完整 URL / 绝对路径
- **PII 闸门先于任何 git 动作**：8 类规则扫全部待推文件，命中即拒推 + `SYNC_PII_BLOCKED` critical，只报 行号 + 规则名
- **push 非快进** → fetch + rebase + 重试一次；**pull 冲突** → `rebase --abort` + `SYNC_CONFLICT` critical，绝不强解
- **串行闸门** `~/.opencode/.memx-sync.lock`：插件是每进程一实例、同一实例两次快速写盘也会并发 `void sync.push()`，进程内与跨进程都靠这把文件锁
- **pull 是远端优先**：覆盖前若本地内容不同，先存 `<file>.bak.<ts>`（每文件留 5 份）；`SYNC_ERROR` 去重，避免离线机器把 200 条账本刷满
- **commit 身份**：workdir 没配 git 身份（prod 就是）时用 `-c user.name=memx-sync -c user.email=memx@localhost` 现造
- **不做**：删除传播、逐行合并（两机同改靠 git rebase，冲突即 abort 留人工）、pull 与写盘互斥（`.bak` 兜底）

**操作命令**

```bash
pnpm run doctor                                      # 只读面板（⚠️ 别用 pnpm doctor：pnpm 有同名内建命令，会跑成 pnpm 自检）
pnpm sync:dry-run -- --fetch                         # 首合并预演：对齐远端后逐文件报双向行数 + PII（永不 push）
pnpm sync:op -- status|pull|push [--machine=<name>]  # 手工同步，与插件同一条代码路径（status 纯只读）
```

`--machine=<name>` 显式覆盖 `{enabled:true, machineName:<name>}` 且**不改配置文件** —— "同步还没开、但要人工跑一次首推/首拉"走这条路（prod 首次合并即此路）。

**2026-10-14 prod 首次合并（人工评审后执行）**：远端 `USER.md` 与 prod 本地是两代画像（mbp 是 10 月新版，prod 停在 8 月版），`MEMORY.md` 两侧小节完全不相交。合并策略 = **并集 + 语义去重**：保留 prod 独有的、仍成立的条目，去掉语义重复与自我弃用行，已过期的一条（`Playwright 复用 snap chromium`，与 `root-project` 项目记忆冲突）标 `deprecated` 而非删除。提案 + 逐字 diff 在 `test/memx-sync-merge/`（已 gitignore）。
**执行顺序上踩过一个坑，值得记**：**必须先把文件集补齐，再装并集索引** —— 索引一旦指向别机还没同步过来的 `.mem` 文件就是死链，`runHealthMaintenance` 会按每轮 3 条把条目摘掉（实测：mbp 先推了并集索引，索引里 prod 的 9 条一度全是死链）。正确顺序 = prod 先 pull（拿到 mbp 文件）→ prod push（补上自己的 9 个文件）→ mbp pull。最终：远端 `projects/root-project*` = 9 个文件、mbp/prod 双侧死链 0、**三方 sha256 完全一致**（USER `7a8eac87…`、MEMORY `83723bc6…`）。

**运营坑（都实测过）**

- `pnpm doctor` 会被 pnpm 内建命令吃掉 → 一律 `pnpm run doctor`（memx 已加 `tests/scripts-smoke.test.ts` 防此类脚本加载回归）
- 插件**按 run 惰性加载**：重启宿主后 journal 里不一定立刻有 `loading plugin memx.ts`；判断是否生效要看行为（state 是否推进 / diag kv 是否更新），别只看日志
- alert store **只进不出**：一条历史 warn/critical 会让 `MEMORY.md` 顶部面包屑长期存在（prod 有一条 2026-10-13 的 `REFINEMENT_FAILURE_STREAK`，E4 窗口前的 json-parse EOF，非本轮引入）
- `SYNC_ERROR` 在 git stderr 为空时只报「未知」（mbp 2026-10-14T08:24Z 有一条），排障时信息不足
- **USER.md（Track 1）去重已修（memx `48f21f6`，2026-10-15）**：`append` 原本零重复检查 → 实测同批重复落 N 行、跨轮重复变两条、`deprecate(旧)+append(同文本)` 留下"划掉旧行 + 逐字相同新行"并存、历史重复永不清理（10-13 长出 4 条、10-14 又长 2 条；重复条目还会被注入回模型形成正反馈）。现在：`append` 前用 `normalizeAnchor` 查**全 doc** 有无同文 active（同批顺序应用 → 批内重复自动被挡）+ 落盘前 `dedupeUserMd` **两遍扫描**自愈（删同文 deprecated 行、合并归一后同文的 active，留位置最早那条、日期取组内最新）。Track 2（MEMORY.md 索引）早有同类守卫（`append 已存在，未重复登记`），Track 1 是漏了。自愈命中写 `diag.lastWarnings`（`memx_status` 可见）；注意**纯空批次不落盘**（三态设计），所以历史重复要等下一次真实写入才被清掉
- **alert 生命周期（memx `4796179`，2026-10-15）**：`AlertStore` 有了出口——① `resolve(code)` 销指定 code；② `maxAgeDays`（默认 7）在 load 时剪掉过期事件（`ts` 不可解析的保留）；③ **成功即销账**：`sync.push()`/`sync.pull()` 成功（含 no-change）即销 `SYNC_ERROR` / `SYNC_PUSH_FAILED`，而 `SYNC_PII_BLOCKED` / `SYNC_CONFLICT` **不自动销**（需人工处置）。手工出口 `pnpm alerts:clear [--code=X] [--dry-run]`（只清账本、不碰记忆文件）。含义：MEMORY.md 顶部那条 `<!-- memx:` 面包屑现在会**自己消失**（计数归零后的下一次索引写盘移除）；实测 mbp 的 `memx-alerts.json` 已被自动销成 `[]`
- **`SYNC_ERROR` 不再报「未知」（memx `4796179`）**：`GitRunner.exec` 回传 `reason`（spawnSync 的 error.message / signal / status），失败文案是 `stderr || reason || "无输出"`
- **生产 memx 代码基线**：2026-10-15 = `48f21f6`（含上面的去重修复）。`git pull --ff-only` + `systemctl restart opencode-4096` 后生效（PID 3554127→4041671；重启前后 USER/MEMORY sha256 未变、`.bak` 数未增）。生产版本不在本地仓库记录，跨会话以这条为基线

**⚠️ prod 上有两个 opencode 进程，验证时必须认准（2026-10-14 实测踩坑）**

| 进程 | 启动 | HOME | 端口 | 谁在用 |
|---|---|---|---|---|
| `/root/.opencode/bin/opencode serve --port 4096 …`（**systemd `opencode-4096.service`**） | 随服务重启 | **未设**（unit 里没有 `Environment=HOME=`） | 127.0.0.1:4096 | **BFF / App companion 走这个** |
| `opencode serve --service`（pid 1991381，2026-10-12 起就在跑） | 长期不重启 | `/root` | 127.0.0.1:49374 | 当前**无任何连接**；但 `opencode run` 默认连它 |

- **`opencode run` 默认连"后台 service"守护进程**，不是 4096。要验证 app 路径上的插件行为，必须显式指定：
  `OPENCODE_PASSWORD=<unit 里的值> opencode run --server http://127.0.0.1:4096 --model opencode/mimo-v2.6-flash-free "…"`
  （`opencode run --help` 里有 `--server` / `--standalone`；不加就是连后台 service。）
- 踩坑实测：在 prod 上直接 `opencode run` 验证，拿到的是那个**常驻旧实例**的 diag —— `sync:{enabled:false}`、`lastPullAt` 不推进，看起来像"插件没生效"；改走 `--server …:4096` 后同一次验证立刻显示 `sync:{enabled:true, machineName:"prod"}` 且 `lastPullAt` 推进（插件实例是按目录/进程懒加载的，旧进程里的实例读的是**旧配置**）。
- `HOME` 未设**没有**影响 memx（Bun/Node 的 `homedir()` 回落到 `getpwuid` → `/root`；证据：注入字节数 11280 = `/root/.opencode` 下 协议 4362 + USER 1865 + MEMORY 5053 之和），但属潜在隐患 —— 建议给 unit 补 `Environment=HOME=/root`（需窗口 + 重启）。
- 那个常驻 `--service` 进程当前是**惰性**的；但任何经它跑的会话，其记忆**不会同步**（它的插件实例是旧配置）。来源疑似微信桥的重复拉起（`guraul/wechat-opencode-bridge#1`：把 v2 的 `/api/health` 401 当成"没在跑"）。

## DSH 接入 OpenCode Go（订阅模型，`opencode-go` provider）

> 2026-10-12 实测：opencode v2.0.26 的 Go 端点 + DSH `web` profile。**凭据只放 `~/.dsh/.credentials.yaml`（`OPENCODE_GO_API_KEY`，明文，不入库）**。

**配置位置**：`~/.dsh/profiles/web/cordis.patch.yml` 中 `llm-pi-ai` 层的 `providers.opencode-go`：

```yaml
- id: llm-pi-ai
  name: "@deepseek-ai/dsh-llm-pi-ai"
  config:
    providers:
      opencode-go:
        baseURL: https://opencode.ai/zen/go/v1        # ① 只到 /v1，不含端点
        headers:
          x-opencode-session: dsh-opencode-go-local   # ② Go 强制要求，缺则 400
        models:
          - id: deepseek-v4.1-flash
            name: DeepSeek V4.1 Flash
            contextWindow: 1000000
            maxTokens: 384000
            input: [ text ]                           # ③ 视觉走 deepseek-v4-flash-vision-exp
        apiKeyEnv: OPENCODE_GO_API_KEY
```

**三个坑（按踩到的顺序）**：

| 现象 | 根因 | 修复 |
|---|---|---|
| 本轮运行失败 **404** + 一段 `Not Found \| opencode` 的 **HTML** | `baseURL` 误写成完整端点 `…/zen/go/v1/chat/completions`。该字段语义是**根路径**，插件按协议（默认 `openai-completions`）自己拼 `/chat/completions` → 实际打到 `…/chat/completions/chat/completions`，被 opencode.ai **官网前端**接住返回 404 HTML（不是 API 的 JSON 错误） | `baseURL` 截到 `https://opencode.ai/zen/go/v1` |
| 400 `{"type":"error","error":{"type":"MissingSessionID"…}}` | Go 端点强制要求 `x-opencode-session` 头（路由 / prompt 缓存）。**DSH 正是 opencode 官方 "Known problematic clients" 点名的客户端**——session 头在部分模型路径上缺失（见 opencode docs `console/go.mdx` §Where can I use it + DSH discussion #5495） | provider 层加 `headers.x-opencode-session`（`dsh-llm-pi-ai` 支持 `headers: z.dict(z.string())`）。当前用**静态值**，全对话共用一个 id；要「每会话一个」需 DSH 侧透传，暂无 |
| 400 `This Go model requires Global regions. Select Global in your workspace's Privacy settings` | 工作区隐私区域非 Global 时 **DeepSeek 系模型被拦**（`deepseek-v4.1-flash` / `deepseek-v4-flash` / `deepseek-flash`）。同期 `glm-5.3-flash` / `space-bunny` / `kimi-k3` 在同一设置下可正常 200 | 去 Console（https://opencode.ai/console）把该工作区 **Privacy 设为 Global** |

**改完必须重启才生效**：profile 在进程启动时一次性加载（`dsh-app-boot` 无 watch）。DSH web 由 LaunchAgent `com.deepseek.dsh-web.dshdiscussion` 托管（端口 3080）：

```bash
launchctl kickstart -k gui/$(id -u)/com.deepseek.dsh-web.dshdiscussion
```

⚠️ 重启会中断当前 GUI 会话（会话本身持久化在 `~/.dsh/sessions`，刷新 3080 可续）；**在会话内执行等于杀掉宿主进程，必须另开终端敲**。启动日志：`~/workspace/dshdiscussion/.dsh-web/web.err.log`。

**排查手法（可复用）**：

```bash
KEY=$(grep -E '^\s+OPENCODE_GO_API_KEY:' ~/.dsh/.credentials.yaml | awk '{print $2}')
# 验 key + 列出 Go 可用模型（38 个：deepseek-v4.1-flash / glm-5.3-flash / kimi-k3 / space-bunny / mimo…）
curl -s -H "Authorization: Bearer $KEY" https://opencode.ai/zen/go/v1/models | head -c 200
# 判据：返回 JSON = key 与 baseURL 正确；返回 HTML（<title>Not Found | opencode</title>）= 打到官网了，路径错
```

**端点参考**：Go 走 `https://opencode.ai/zen/go/v1/{chat/completions|responses|messages}`，配置内模型写作 `opencode-go/<model-id>`；直连（非 opencode 客户端）调用同样需带 `x-opencode-session`。本机 opencode v2.0.26 源码 checkout 在 `~/workspace/opencode-src`（版本与装机一致），Go 文档在其 `services/www/src/docs/content/console/go.mdx`。

## 端口占用速查

| 端口 | 用途 | 进程 |
|---|---|---|
| 9928 | Web 静态预览（当前，serve-9928） | `serve-9928.service`（node serve-static.mjs，gzip） |
| 19234 | BFF（homebase 主 checkout next dev） | `next dev -p 19234` |
| 19235 | BFF（阶段 2 worktree next dev） | `next dev -p 19235` |
| 4096 | OpenCode Server（AI agent 后端，127.0.0.1） | `opencode serve` |
| 8081 | Metro dev server 默认端口（当前未用，9928 已占用） | `expo start` |