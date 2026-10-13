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

行为指南以减少常见的 LLM 编码错误。

**权衡：** 这些指南偏向谨慎而非速度。对于简单任务，请自行判断。

1. **编码前先思考** - 不要假设。明确陈述假设。如果不确定，请询问。
2. **简洁优先** - 解决问题的最小代码量。不做推测性工作。如果写了200行可以是50行，请重写。
3. **手术式修改** - 只触碰必须的部分。匹配现有风格。移除由你的修改导致的未使用代码。
4. **目标驱动执行** - 定义成功标准。循环直到验证。

## 强制规定

以下硬性规则适用于所有任务，完整红线清单见 `CONVENTIONS.md`：

1. **写 agent-mobile-app 代码前先读 Expo 版本化文档**：`https://docs.expo.dev/versions/v57.0.0/`（SDK 57）。依赖版本必须匹配 SDK 57，用 `pnpm exec expo install` 装依赖（勿用 `npx`，见规则 14），勿手工改版本号。
2. **改完 TS 必须验证**：`cd agent-mobile-app && pnpm exec tsc --noEmit`；纯逻辑改动必须同步 `pnpm test`（vitest，`src/**/*.test.ts`）。
3. **勿改消息数组 chronological 语义**：listMessages 返回旧在前，插入/排序一律以 `time.created` 为准；任何"反向"假设都会重现消息错乱。
4. **勿移除打字机限速 / FlatList `extraData`**：`revealChars` 逐字揭示依赖 `extraData={revealChars}`，移除会导致整块弹出；轮询兜底与打字机冲突，勿同时启用。
5. **勿改组件硬编码颜色/字号/间距**：必须走 `src/theme/`，否则破坏主题一致性。勿改 `StatusType` 取值集合。
6. **敏感凭据不入库**：`EXPO_TOKEN`、`EXPO_PUBLIC_OPENCODE_*`（BFF 侧）等不写入代码/文档/提交。手机端不持有 opencode 凭证。
7. **9928 端口归属（2026-09-27 起）**：9928 由 systemd **`serve-9928.service`** 托管 **agent-mobile-app 静态版**（enabled 开机自启；showcase2-9928.service 已删除退役，其设计已移植进主应用）。部署流程 = `pnpm exec expo export --platform web --clear`（`--clear` 必须，否则 env 不注入）→ 产物放服务器 `agent-mobile-app/dist` → `systemctl restart serve-9928`（gzipCache 会缓存旧 bundle，不重启则改动"没生效"）。若切回 Expo Go Metro（`expo-metro-9928`，disabled 备用），改代码热重载无需重建。**BFF CORS 允许列表只放行 9928 的三个 origin**（见 `family-finance lib/cors.ts`），静态版换端口会全被 CORS 拦——换端口前必须先改 BFF CORS。
8. **临时测试脚本 / 截图 / 日志统一放仓库根 `test/` 目录**，勿散落 /tmp。`test/` 已加入 `.gitignore` 不入库，需要留存的结果写进知识库或脚本化进 `agent-mobile-app/scripts/`。
9. **仓库根的历史遗留目录 `src/`（设计期源码）、`showcase/`（静态原型）、`showcase2/`（Showcase 应用）已于 2026-09-27 删除**（showcase2 设计已移植进 `agent-mobile-app`，其余淘汰；需要时查 git 历史）。运行态代码只在 `agent-mobile-app/`。
10. **图片/PDF 一律走 vision-reader 子代理，主模型禁止直接 `read` 图片或 PDF 文件路径**：主模型 `deepseek-v4-flash`（volcengine-plan）不支持图片输入，直接 `read` 会把图片带进请求历史，服务端每次返回 `Model do not support image input`，导致对话卡死在重复报错。读图时只把文件路径交给 vision-reader（`task` + `subagent_type: "vision-reader"`），主模型请求里绝不携带图片附件。
11. **DSH 控制 opencode 做事；能用 opencode 就走 opencode（2026-10-10 用户拍板）**：**DSH = 控制面**（编排 / 决策 / 审阅 / 验收），**opencode = 执行面**（改代码 / 跑测试 / 探查 / 实现）。凡属可委派的执行类工作，**优先委派给 opencode 子代理（product 子代理角色库）**，而不是主模型亲自上手，也不走其他 product CLI（claude-code / codex / acp）。DSH 的四个子代理角色（`code-review` / `debug` / `explore` / `general`）**已全部 pin 到 opencode**（用户 2026-10-10 配置并实测可调用）——委派时**无需再逐次指定 provider**。
    - **作用域边界（防歧义）**：本规则适用于**实现 / 执行阶段**。**产品决策讨论、拍板记录、交底书（BRIEF）与知识库落档，仍由 DSH 主模型直接做**——这类工作依赖当前对话上下文，且 subagent 看不到主会话，外包会导致决策链断裂（本仓 `docs/pipeline/CHAT_COMPANION_BRIEF.md` 的逐单元落档即为典型）。
    - **只读小探针**（单条 `grep` / `cat` / `sqlite -readonly` 即可答）由主模型直接跑更快，不算违规。
    - **子代理模型（用户 2026-10-13 修正 2026-10-12 的"永久禁用 free 档"表述）**：**首选档 `opencode-go/longcat-2.5-preview-free`**（本机实测可用，走 Go 端点）→ **每次委派都要显式传 `model`**（角色库不 pin 模型）。
      **回退链（free 档，仍然可用）**：`space-bunny-free` → `mimo-v2.6-flash-free` → `step-5-preview-free` —— 首选档遇 **429 / 限流 / 偶发不通**时按序尝试；**单档不通换下一档，只有全链都不可用才警告并停下**（与规则 13 同源）。
      ⚠️ 澄清（用户 2026-10-13）：free 档**不是永久禁用** —— 多数时间可用，只是用的人多、偶发 429；此前 2026-10-12 写成「已被网关打挂 / 仅作历史 / 一律不降级（通知我）」**表述过严，以本条为准**。
      **非限流故障**（403 鉴权/地区、模型不存在、报错、无响应）→ 规则 13：停下报告，不改配置。
      **小模型**（`small_model` / `agents.title.model`，标题生成这类轻量旁路）→ 用户 2026-10-13 拍板：**可用 `opencode/mimo-v2.6-flash-free`**（旁路失败只影响标题；opencode 源码 `session/title.ts` 会自动回落到会话主模型）。
    - **并发纪律**：**大任务只起一个子代理去做**（不要拆成多个并行）；任务执行**不得由主模型自己做**——**验证可以自己做**。
    - ⚠️ **执行类工作一律委派（用户 2026-10-13 二次明确：不止 pipeline，也不止"改代码"）**：**改代码 / 跑门禁（tsc、vitest）/ 建 worktree / 提交 / push / 开 PR / `merge-pr.sh` / 生产脚本执行 / gh 与 git 远端操作**——不论仓库（agent-mobile、memx、homebase）与任务大小，全部委派给 opencode 子代理。**"小改动"不构成自做的理由**（改个默认值 + 同步文档 + 改测试断言这类多文件编辑同样属执行类）。
      - 主模型（控制面）只做：**产品决策与拍板**、**审阅 diff**、**"用户 review 完成"的确认（人在环）**、**验收**、**交底书 / 知识库 / 规则文件落档**、**单条只读探针**。
      - `merge-pr.sh` 的命令执行可委派，但**合并前必须由控制面拿到用户确认**再发（手册 §一 review 约定）。
12. **子代理模型 = 首选 `opencode-go/longcat-2.5-preview-free` + free 档回退链**（用户 2026-10-13 修正 2026-10-12 的"遇 429 也不降级"）。⚠️ **角色库不 pin 模型**（`product_roles` 已核实：四角色只有 `provider: "opencode"`，**无 model 字段**；`~/.dsh/product-subagents-registry.json` 也查不到模型）→ **每次委派都要显式传 `model: "opencode-go/longcat-2.5-preview-free"`**，不能指望"已 pin 自动生效"（传参形式与 `prompt_async` 的逐条 model 一致）。
   - **429 / 限流 / 偶发不通** → 按序回退 `space-bunny-free` → `mimo-v2.6-flash-free` → `step-5-preview-free`；**全链都不可用才警告并停下**，不挑链外模型、不改配置、不静默降质。
   - **非限流故障**（403 鉴权/地区、模型不存在、报错、无响应）→ 规则 13：**停下报告，不降级**。
   - 作用域 = **DSH 子代理委派**。
   - ⚠️ **App/companion 运行时模型保持 `opencode/mimo-v2.6-flash-free`**（2026-10-12 二次拍板；本条与回退链约定无关、继续有效）：App 的唯一真实目标是生产 opencode，而**生产的模型目录里没有 `opencode-go`**（见 OPERATIONS 上线窗口预检）——写死 Go 档会让手机端直接 `Model unavailable`。Go 档仍只用于 **DSH 子代理 + 本机 memx 提炼**（首选档；free 档偶发 429 按上面的回退链处理）。
13. **子代理模型因"非限流"原因不可用时：报告，不降级（用户硬约束）**：若模型（回退链任一档）**不可用**（不存在 / 鉴权失败 / 报错 / 无响应；**⚠️ 限流 / 429 / 偶发不通不在此列** —— 那属于规则 12 的回退链场景，按链逐档尝试），**立即停下并告知用户**，**严禁自行降级、替换模型、改配置、切 provider，或用其他方式绕道兜底**（含"先用别的模型顶一下"）。与第 10 条 vision-reader 的"不得自行降级重试"同源；**宁可失败并如实报告，不可静默降质**。
14. **包管理器只用 pnpm（2026-10-11 用户偏好，全局约定）**：**禁止 npm / yarn / bun**。装依赖用 `pnpm add` / `pnpm remove`；跑脚本用 `pnpm <script>` / `pnpm exec <bin>`；临时二进制用 `pnpm dlx`，**不用 `npx`**。与规则 1 呼应——装依赖统一走 `npx expo install` 的场景改为 `pnpm exec expo install`（等价且不引 npm）。不提交 `package-lock.json` / `yarn.lock`，只保留 `pnpm-lock.yaml`。全局版本见 `~/.config/opencode/AGENTS.md`（对所有项目生效）。

## BROWSER AUTOMATION (Playwright)

skill 位于 `~/.agents/skills/playwright-skill/`（`~/.agents/skills` 由 DSH 自动扫描，无需注册）。

- 执行：`cd ~/.agents/skills/playwright-skill && node run.js <script.js>`
- **永远 `headless: true`**；截图存 `/tmp/`（或仓库根 `test/`，见强制规定 8），用 Read tool 展示
- 浏览器可切换：`PW_BROWSER=chrome|chromium`（不设置则自动探测）；**macOS 本机与 Linux 服务器通用**
- **不要把 playwright 装进本仓库**：会动 `pnpm-lock.yaml`。仓库内已有 `playwright-core`（devDependency），脚本经 `createRequire` 复用 skill 目录的依赖
- 适用范围：页面截图、表单测试、页面验证、二维码扫码、渲染后内容抓取

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

# Web 静态版（生产应用，9928 端口；serve-9928.service 托管，见强制规定 7）
EXPO_PUBLIC_OPENCODE_URL=http://106.13.181.13:19234 pnpm exec expo export --platform web --clear
# 产物 dist/ 同步到服务器 /root/project/agent-mobile/agent-mobile-app/dist，然后：
systemctl restart serve-9928            # 部署：gzipCache 需重启才生效（见强制规定 7）
# 手机/电脑浏览器打开 http://106.13.181.13:9928（Pulse 首页在 /；/memory /me 重定向到 /）

# Expo Go 真机预览（备用，9928 端口）
systemctl start expo-metro-9928     # Metro dev server（9928，热重载）
# 手机 Expo Go 手动输入 exp://106.13.181.13:9928
```

**环境与端口**：手机/浏览器端走 BFF（`106.13.181.13:19234` 主，`bff-19234.service`；`19235` 阶段2 worktree，当前未运行）；opencode server `127.0.0.1:4096`（仅 BFF 本机可达，`opencode-4096.service`）；9928 静态服务（`serve-9928.service` 托管主应用，BFF CORS 只放行 9928 三个 origin）。服务器三个服务均已收编 systemd 且开机自启（2026-09-27）。BFF 代码在 `family-finance/` 仓库（独立 git，私有）。
