# Agent Mobile System - 项目说明

**Updated:** 2026-08-14

项目知识库已拆分到 `docs/knowledge-base/`，本文件只承担**路由**与**强制规定**两个职责。涉及的功能细节、数据、API、部署等一律查阅知识库，不要在本文重复。

> 注意：仓库根目录还有设计期遗留源码 `src/`（React/TSX，无 package.json，非运行态），**勿与 `agent-mobile-app/src/` 混为一谈**。当前活跃应用在 `agent-mobile-app/`。

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
| 编码约定、历史包袱、修改红线 | `docs/knowledge-base/CONVENTIONS.md` |

**查询流程**（参照 `docs/promptA.md` 维护约定）：先基于知识库定位涉及模块与文件，给出方案；信息不足时再针对性读源码片段，不要全量读码。涉及架构/接口/数据模型变更时，事后同步更新知识库对应文档。

## CODING GUIDELINES

行为指南以减少常见的 LLM 编码错误。

**权衡：** 这些指南偏向谨慎而非速度。对于简单任务，请自行判断。

1. **编码前先思考** - 不要假设。明确陈述假设。如果不确定，请询问。
2. **简洁优先** - 解决问题的最小代码量。不做推测性工作。如果写了200行可以是50行，请重写。
3. **手术式修改** - 只触碰必须的部分。匹配现有风格。移除由你的修改导致的未使用代码。
4. **目标驱动执行** - 定义成功标准。循环直到验证。

## 强制规定

以下硬性规则适用于所有任务，完整红线清单见 `CONVENTIONS.md`：

1. **写 agent-mobile-app 代码前先读 Expo 版本化文档**：`https://docs.expo.dev/versions/v57.0.0/`（SDK 57）。依赖版本必须匹配 SDK 57，用 `npx expo install` 装依赖，勿手工改版本号。
2. **改完 TS 必须验证**：`cd agent-mobile-app && pnpm exec tsc --noEmit`；纯逻辑改动必须同步 `pnpm test`（vitest，`src/**/*.test.ts`）。
3. **勿改消息数组 chronological 语义**：listMessages 返回旧在前，插入/排序一律以 `time.created` 为准；任何"反向"假设都会重现消息错乱。
4. **勿移除打字机限速 / FlatList `extraData`**：`revealChars` 逐字揭示依赖 `extraData={revealChars}`，移除会导致整块弹出；轮询兜底与打字机冲突，勿同时启用。
5. **勿改组件硬编码颜色/字号/间距**：必须走 `src/theme/`，否则破坏主题一致性。勿改 `StatusType` 取值集合。
6. **敏感凭据不入库**：`EXPO_TOKEN`、`EXPO_PUBLIC_OPENCODE_*`（BFF 侧）等不写入代码/文档/提交。手机端不持有 opencode 凭证。
7. **9928 当前为 Expo Go Metro dev server**（测试用，systemd 单元 `expo-metro-9928`）：改代码 Metro 热重载，无需重建；若切回 web 静态版（`serve-9928`），部署步骤为 `pnpm exec expo export --platform web --clear`（`--clear` 必须，否则 env 不注入）→ `systemctl restart serve-9928`（gzipCache 会缓存旧 bundle，不重启则改动"没生效"）。
8. **临时测试脚本 / 截图 / 日志统一放仓库根 `test/` 目录**，勿散落 /tmp。
9. **勿把仓库根 `src/`（设计期）与 `agent-mobile-app/src/`（运行态）混为一谈**，改错位置 = 改到不运行的东西。

## BROWSER AUTOMATION (Playwright)

Playwright 依赖位于 `~/.claude/skills/playwright-skill/`（headless Linux 服务器，无桌面环境）。

- 永远 `headless: true`，复用系统 chromium：`executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'` + `args: ['--no-sandbox']`
- **勿 `playwright install`**（复用 playwright-skill 依赖，浏览器已装；本机 snap chromium 已删）
- headless 中 `locator.click`/`mouse` 对 RN Web Pressable 时序不稳定，可用 `dispatchEvent(new MouseEvent('click',{...}))` 复现真实点击
- E2E 断言尽量结合角色（USER/AI）与位置，避免 AI 回复引用测试文本导致误命中
- 截图保存到 `test/` 或 `/tmp/opencode/`，需要时用 vision-reader 子代理解读

## 常用命令（详情见 OPERATIONS.md）

```bash
cd agent-mobile-app
pnpm test                  # vitest 单测（src/**/*.test.ts）
pnpm lint                  # expo lint（eslint-config-expo）
pnpm exec tsc --noEmit     # 类型检查
pnpm e2e                   # Playwright E2E（含发消息，需确认）
pnpm e2e:nosend            # E2E 跳过发消息步骤

# Expo Go 真机预览（当前方案，9928 端口）
systemctl start expo-metro-9928     # Metro dev server（9928，热重载）
# 手机 Expo Go 手动输入 exp://106.13.181.13:9928

# 若切回 web 静态版（备用）
EXPO_PUBLIC_OPENCODE_URL=http://106.13.181.13:19234 pnpm exec expo export --platform web --clear
systemctl restart serve-9928      # 重启 9928 静态服务（gzipCache 需重启才生效）
```

**环境与端口**：手机端走 BFF（`106.13.181.13:19234` 主 / `19235` 阶段2 worktree）；opencode server `127.0.0.1:4096`（仅 BFF 本机可达）；9928 Expo Go Metro dev server（测试用，正式走 EAS APK）。BFF 代码在 `family-finance/` 仓库（独立 git）。
