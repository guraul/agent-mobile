# Agent Mobile System - 项目说明

**Updated:** 2026-09-27

项目知识库已拆分到 `docs/knowledge-base/`，本文件只承担**路由**与**强制规定**两个职责。涉及的功能细节、数据、API、部署等一律查阅知识库，不要在本文重复。

> 当前活跃应用在 `agent-mobile-app/`；设计稿与设计文档在 `docs/newdesign/`（用户活跃编辑中，勿改动）。仓库根的历史遗留目录（`src/`、`showcase/`、`showcase2/`）已于 2026-09-27 删除，见强制规定 9。

## 知识库路由（优先查阅）

| 场景 | 加载文档 |
|------|----------|
| 全局认知、技术栈、仓库拓扑、模块地图 | `docs/knowledge-base/INDEX.md`（每次对话优先） |
| 理解架构与数据流（BFF 中间层 + opencode） | `docs/knowledge-base/ARCHITECTURE.md` |
| 改 Pulse 首页（项目导航/分组） | `docs/knowledge-base/modules/pulse-stream.md` |
| 改聊天界面（气泡/打字机/question-permission 弹窗/输入区） | `docs/knowledge-base/modules/chat.md` |
| 改 opencode 对接（REST/SSE/reducer/状态机/auth） | `docs/knowledge-base/modules/services.md` |
| 改组件库 | `docs/knowledge-base/modules/components.md` |
| 改颜色/字号/间距等 token | `docs/knowledge-base/modules/theme.md` |
| 改路由/新增页面 | `docs/knowledge-base/modules/router.md` |
| 查数据在哪 / 数据怎么流动 | `docs/knowledge-base/DATA.md` |
| 有没有对外接口（BFF / opencode v1） | `docs/knowledge-base/API.md` |
| 构建/部署/预览/测试/环境变量 | `docs/knowledge-base/OPERATIONS.md` |
| **改代码/发版流程、pipeline 脚本** | `docs/pipeline/README.md`（进度台账：`docs/pipeline/PROGRESS.md`；脚本：`scripts/pipeline/`） |
| 编码约定、历史包袱、修改红线 | `docs/knowledge-base/CONVENTIONS.md` |

**查询流程**（参照 `docs/promptA.md` 维护约定）：先基于知识库定位涉及模块与文件，给出方案；信息不足时再针对性读源码片段，不要全量读码。涉及架构/接口/数据模型变更时，事后同步更新知识库对应文档。

## CODING GUIDELINES

见 `~/.dsh/AGENTS.md` §6（编码前思考 / 简洁优先 / 手术式修改 / 目标驱动执行 + 验证纪律）。

## 强制规定

以下硬性规则适用于所有任务，完整红线清单见 `CONVENTIONS.md`：

1. **写 agent-mobile-app 代码前先读 Expo 版本化文档**：`https://docs.expo.dev/versions/v57.0.0/`（SDK 57）。依赖版本必须匹配 SDK 57，用 `pnpm exec expo install` 装依赖（勿用 `npx`，见规则 13），勿手工改版本号。
2. **改完 TS 必须验证**：`cd agent-mobile-app && pnpm exec tsc --noEmit`；纯逻辑改动必须同步 `pnpm test`（vitest，`src/**/*.test.ts`）。
3. **勿改消息数组 chronological 语义**：listMessages 返回旧在前，插入/排序一律以 `time.created` 为准；任何"反向"假设都会重现消息错乱。
4. **勿移除打字机限速 / FlatList `extraData`**：`revealChars` 逐字揭示依赖 `extraData={revealChars}`，移除会导致整块弹出；轮询兜底与打字机冲突，勿同时启用。
5. **勿改组件硬编码颜色/字号/间距**：必须走 `src/theme/`，否则破坏主题一致性。勿改 `StatusType` 取值集合。
6. **敏感凭据不入库**：`EXPO_TOKEN`、`EXPO_PUBLIC_OPENCODE_*`（BFF 侧）等不写入代码/文档/提交。手机端不持有 opencode 凭证。
7. **入口拓扑（2026-11-05 起变更，旧「9928 归属」已作废）**：
    - **产品 App（Pulse）= `https://106.13.181.13`（443）**：Caddy 在 443 分流——`/api/*`、`/_next/*`、`/files/*` → BFF `127.0.0.1:19234`，其余 → App 静态服务 `127.0.0.1:9929`（保留 SPA 回退与 `[id].html` 动态路由）。页面与 API **同源**，不再有 CORS 问题。
    - **财务后台 = `https://106.13.181.13:9928`**：Caddy 全量反代到 BFF。
    - **`serve-9928.service` 名字是历史遗留**，实际监听 `127.0.0.1:9929`（systemd drop-in `/etc/systemd/system/serve-9928.service.d/port.conf` 设 `PORT`/`BIND`）。
    - 部署主路径 = `.github/workflows/deploy-web.yml`（merge 自动；`workflow_dispatch` 可手动触发）。手工部署已由该 workflow 承接；原 `scripts/pipeline/deploy.sh`、`rollback.sh` 已于 2026-11-05 删除；应急直接用 `ssh` + `ln -sfn releases/<id> dist` + `systemctl restart serve-9928`（gzipCache 需重启才生效）。
    - Caddy 配置 `/etc/caddy/Caddyfile`；`admin off` 所以 **`caddy reload` 不可用，改完必须 `systemctl restart caddy`**。
    - 自签证书：新设备首次访问需手动接受一次（浏览器「继续访问」）。

8. **临时测试脚本 / 截图 / 日志统一放仓库根 `test/` 目录**，勿散落 /tmp。`test/` 已加入 `.gitignore` 不入库，需要留存的结果写进知识库或脚本化进 `agent-mobile-app/scripts/`。
9. **仓库根的历史遗留目录 `src/`（设计期源码）、`showcase/`（静态原型）、`showcase2/`（Showcase 应用）已于 2026-09-27 删除**（showcase2 设计已移植进 `agent-mobile-app`，其余淘汰；需要时查 git 历史）。运行态代码只在 `agent-mobile-app/`。
10. **委派与职责二分**：见 `~/.dsh/AGENTS.md` §8（DSH 控制面 / opencode 执行面、必须委派范围、主模型只做、作用域边界、并发纪律、任务书体量）。
    - **本仓特有**：`merge-pr.sh` 的命令执行可委派；合并前的审核闸门、绕过条件与留痕要求，一律按全局 `~/.dsh/AGENTS.md` §7 第 6/7 条，本文件不复述。
11. **子代理模型与委派质量**：见 `~/.dsh/AGENTS.md` §9（唯一档 / codebuddy 例外 / 不降级 / 任务体量与粒度 / 验收证据 / 失败判据 / `opencode run --model` / 不写死基线）。
    - **本仓特有 · App/companion 运行时模型（2026-11-04 用户拍板改 go 档）**：chat 伴侣页 `CHAT_MODEL` = **`opencode-go/deepseek-v4.1-flash`**（`src/services/conversation-kind.ts`，单一事实源），chatcode 工作台 `DEFAULT_MODEL` 仍 `opencode/mimo-v2.6-flash-free`。
    - 为什么改：免费档 `opencode/deepseek-v4.1-flash-free` 按 IP 限流且恢复时间不可预测，用户侧表现为「发消息有时没反应」；生产已订阅 OpenCode Go。
    - 历史（2026-10-24 #111）：免费档时期选 deepseek 而非 mimo，是因为 mimo **调不动** companion 插件的 `project_sessions` 工具。
    - ⚠️ **`providerID` 必须与生产 opencode 的模型目录一致**：2026-11-04 起生产已有 `opencode-go/*`，故用 go 档正确。
    - ⚠️ **撤销 go 订阅要改三处，漏一处就会 `Model unavailable`**：① App `CHAT_MODEL`；② 生产 `opencode.json` 的 `agents.companion.model`；③ 同文件 `small_model`。
12. **非限流故障不降级**：见 `~/.dsh/AGENTS.md` §9。
13. **包管理器只用 pnpm**：见 `~/.dsh/AGENTS.md` §3。本仓注意：规则 1 里的 `npx expo install` 一律写成 `pnpm exec expo install`。
14. **worktree 纪律**：通用纪律（关闭即清理、绝对路径 + 主仓根、外仓用仓库外容器）见 `~/.dsh/AGENTS.md` §7。
    - **本仓特有 ④**：`merge-pr.sh` 已修（#102 → PR #103 `1f38630`）——从**主工作区**运行会「清该任务 worktree + 删本地分支 + 快进 main」，推荐 `scripts/pipeline/merge-pr.sh <PR号>`（shell 不会站在被删目录里）；从 worktree 内运行同样会清理，但**被清的就是你所在的 worktree**。**脚本自检**：手写 `test-*.sh` 自检与 `lib.sh` 已随生成物移除（#220），现由共享包 `dsh-pipeline selftest --shims --config` 覆盖。
15. **读写长期记忆**：见 `~/.dsh/AGENTS.md` §10（只走宿主工具、禁直写 `~/.opencode/**`）。旧的 `pnpm mem …` CLI 已在 memx PR #25（issue #24）删除；语义见 memx `AGENTS.md` 规则 17 与 `docs/knowledge-base/OPERATIONS.md`。

## BROWSER AUTOMATION (Playwright)

通用规则见 `~/.dsh/AGENTS.md` §11。本仓特有：

- 截图存仓库根 `test/`（见强制规定 8，已 gitignore）
- **不要把 playwright 装进本仓库**：会动 `pnpm-lock.yaml`。仓库内已有 `playwright-core`（devDependency），脚本经 `createRequire` 复用 skill 目录的依赖

**⚠️ 仓库自带 e2e 脚本目前只适用于服务器（Linux）环境**：`agent-mobile-app/scripts/e2e/pulse-e2e.mjs`（`pnpm e2e` / `pnpm e2e:nosend`）、`phase9-e2e.mjs`、`phase13-e2e.mjs`、`v011-e2e.mjs` 里共 **17 处 `/root/...` 硬编码**——包括浏览器可执行路径（`/root/.cache/ms-playwright/chromium_headless_shell-1228/...`）、`.env.local` 读取路径、以及 `projectPath` 参数。**在 macOS 本机直接 `pnpm e2e` 会失败**（路径不存在）；本机要跑浏览器验证，用上面的 skill 方式另写脚本，或先修这些硬编码（改脚本属 E2 改名迁移范围，勿顺手改）。

- headless 中 `locator.click`/`mouse` 对 RN Web Pressable 时序不稳定，可用 `dispatchEvent(new MouseEvent('click',{...}))` 复现真实点击
- E2E 断言尽量结合角色（USER/AI）与位置，避免 AI 回复引用测试文本导致误命中

## 常用命令（详情见 OPERATIONS.md）

```bash
cd agent-mobile-app
pnpm test                  # vitest 单测（src/**/*.test.ts）
pnpm lint                  # expo lint（eslint-config-expo）
pnpm exec tsc --noEmit     # 类型检查
pnpm e2e                   # Playwright E2E（含发消息，需确认）
pnpm e2e:nosend            # E2E 跳过发消息步骤

# Web 静态版部署（serve-9928.service 托管，实际端口 9929，对外 https://106.13.181.13，见强制规定 7）
# 主路径 = .github/workflows/deploy-web.yml（merge 自动 / workflow_dispatch 手动）
# 手工部署已由该 workflow 承接；原 scripts/pipeline/deploy.sh、rollback.sh 已于 2026-11-05 删除
# 应急：ssh + ln -sfn releases/<id> dist + systemctl restart serve-9928（gzipCache 需重启才生效，见强制规定 7）
# 手机/电脑浏览器打开 https://106.13.181.13（首次需接受自签证书）

# Expo Go 真机预览（备用，9928 端口）
systemctl start expo-metro-9928     # Metro dev server（9928，热重载）
# 手机 Expo Go 手动输入 exp://106.13.181.13:9928
```

**环境与端口**：对外只有 **Caddy `:443`**（`/api` → BFF，页面 → 静态服务 `127.0.0.1:9929`）与 **`:9928`**（财务后台 → BFF）。BFF `bff-19234.service`（仅本机 `127.0.0.1:19234`），opencode `opencode-4096.service`（`127.0.0.1:4096`），静态服务 `serve-9928.service`（实际 9929）。均在 systemd 且开机自启。BFF 代码在 `family-finance/` 仓库（独立 git，私有）。
