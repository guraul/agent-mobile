# RN 迁移交底书 —— pulseB mock → agent-mobile-app 组件库

> 生成：2026-09-27 · 交接人：ZCode（设计与规划会话）· 执行者：workbuddy
> 本文档自包含，与 `AGENTS.md`、`docs/knowledge-base/INDEX.md`、`docs/pipeline/README.md` 配合使用。
> 状态：**方案已获用户批准，尚未开工**——第一步是开 epic + 8 个子 issue。

## 0. 开工前必读（按序）

1. `AGENTS.md` —— 强制规定 1-10，特别：改完 TS 必须 tsc；颜色/字号/间距必须走 `src/theme/`；主模型禁止直接读图片（审图交子代理）；9928 端口与部署约定
2. `docs/knowledge-base/INDEX.md` + `modules/pulse-stream.md` + `modules/theme.md` —— 当前实现的事实基准（组件实名、结构树、红线）
3. `docs/pipeline/README.md` —— issue→worktree→PR→review→merge→自动部署 的全套脚本与红线
4. 本文档

## 1. 背景（一屏）

`agent-mobile-app/` 是 Expo SDK 57 单表面应用：Pulse（AI 伴侣 briefing 首页）+ talk/assignments/attention/kb 等 contextual 页；后端 = family-finance BFF（JWT，106.13.181.13:19234）+ opencode（127.0.0.1:4096，仅 BFF 可达）。

2026-09-27 浅色 "Companion" 皮肤设计定稿，mock 全家福在 `docs/newdesign/html/`（浏览器可直接打开，均通过 headless Chrome 截图 + 子代理视觉验收）：

| mock | 内容 | 迁移基准地位 |
|---|---|---|
| `pulseB.html` | Pulse 首页定稿 | **唯一基准**（pinned 问候 / Featured 整卡 / In motion 绿卡 / Noticed ghost 卡 / dock） |
| `pulseB-review.html` | attention 详情 | 基准（注意：无主卡、底部紫渐变 dock 式动作、Dismiss 弱化态——由另一会话重做定稿） |
| `pulseB-login.html` | 独立登录页 | 骨架基准（用户标记"设计很重要"，后续还有深化轮） |
| `pulseB-sheet-{fund,noticed,noticed-list,more}.html` | 弹出层家族 | 基准（scrim + 白卡圆角 28 顶 + handle；点遮罩关闭） |
| `pulseB-{empty,offline,error}.html` | 状态变体 | 基准 |
| `chat.html` / `chatcode.html` | 两个 chat 页 | **设计未定稿**，本次不迁移内部 |
| `chat-widgets.html` / `chat-settings.html` | chat 气泡小组件 / chat 内弹出设置面板 | 方向已拍板，实现归 chat 批次 |

## 2. 任务与范围

**做**：theme 基础 + Pulse 根页面族（首页 / In motion / Noticed / 三张 sheet / 空态 / 离线 / 错误行）+ attention 详情 + 登录页。
**不做**（保持旧深色皮肤，等各自批次）：talk/ChatPanel 系、assignments 两屏、kb/doc、chatcode 内部改造、chat 两页完整设计。

### 已拍板决策（D1-D10，勿再讨论，直接执行；推翻需用户明示）

- **D1 主题新旧共存渐进切**：新增浅色 token 命名空间（建议 `src/theme/light.ts`），**不动 `theme/companion` 旧值**；页面逐个切换；最后一个 issue 删旧值。7-token 字阶 = display 26/400 · page-title 24/700 · title 17/700 · body 15/400 · body-strong 15/600 · caption 12/400 · label 12/600；RN 必须显式写 lineHeight（约 `round(fontSize×1.45)`）。**In motion 绿卡字值有意偏离 token**（11.5px 组标签 / 14px 条目标题，pulse.html schedule 样式），照抄 mock。
- **D2 字体**：系统栈（iOS=SF Pro / Android=Roboto，与 mock 系统字体栈同源）；Inter 打包为后续可选优化，本批不做。
- **D3 部署**：每个 PR 合并即自动部署 9928，照常（CI 已上线，issue #2 已关）；出问题 `scripts/pipeline/rollback.sh` 秒回。8 个 PR 的中间态均为自洽可用状态（由 D1 保证）。
- **D4 未登录只能到登录页**：启动 gate 进独立登录页（新增 `app/login.tsx` push screen），删除首页登录 banner 与登录 BottomSheet——**行为变更**，e2e 与单测同步改。
- **D5 Settings 过渡**：首页终态无齿轮，但**过渡期保留旧齿轮 + 旧 SettingsSheet**（唯一有意偏离 mock 之处），等 chat 侧设置面板落地后删除（chat 侧不在本批）。
- **D6 首页删三样**：Watching N 行（→/assignments）、More projects 入口、Duties 展示——职责/项目改为 chat 内查询（`chat-widgets.html` 已定形态），本批只删不建。
- **D7 文案语义分层（红线）**：aiVoice 仅离线/全空渲染（离线 "I'm having trouble reaching my runtime."；空态 "All's been calm while you were away."——后句为拟定稿，用户可换）；"needs you" 仅 Featured 独占；Supporting 组标签 To review / Suggested / Running / Market；绿卡标题 `[ In motion ]`。
- **D8 chat 路由判据**：对话 subject 是否代码仓库——coding 域 attention / Running 行 → 开发工作台（绑该项目 opencode **最新 session**，抽屉暂不做）；market / Suggested 讨论 / Noticed → 伴侣 chat。本批 RN 落地 = 保持现有 `/talk` 路由参数不变（projectPath 有无即判据），UI 双页分流等 chat 页改造时再做。
- **D9 动作分级**：破坏性动作（Revoke/Forget/Dismiss）二次确认 + 弱化样式；主行动作实心；**查看 ≠ 授权/处理**（查看不改状态）。
- **D10 Featured 卡**：整卡可点 → `/attention/[id]`；无 lead 文字（恒 ≤1 无需数数）、无行内动作 chips；铃铛线性图标（16px，amber #D97706）。

### Issue 划分（epic + 8 子，依赖自下而上）

```
#A Theme 2.0 ──→ #B 原子组件 ──→ #C Sheet 原语 ──→ #E In motion + Featured ──→ #F Noticed + 三 sheet
      │                │                                    │
      └────────────────┴──→ #D 首页骨架 ──→ #G 状态变体 + 登录 gate
                                                  #H attention 详情 + 收尾
```

| # | 内容 | 对应 mock | 关键文件 |
|---|---|---|---|
| A | 浅色 token 体系（色板/7-token 字阶+lineHeight/spacing/radius）+ Text primitive 加 variant + 单测；不动旧值 | 各 mock `:root` | `src/theme/light.ts`（新）、`src/components/primitives/Text.tsx` |
| B | 原子组件：InlineChip（neutral/review/discuss）、主按钮（violet 渐变，Pulse 侧）/peach（chat 侧，本批不涉及）、TextAction、状态 pill、dot | 各卡原子 | `src/components/pulse/ActionChips.tsx` 等 |
| C | Sheet 原语：BottomSheet 浅色皮肤 + DetailSheet 重做（scrim/白卡/圆角 28 顶/handle），一原语三处复用 | 4 个 sheet mock | `src/components/navigation/BottomSheet.tsx`、`src/components/pulse/DetailSheet.tsx` |
| D | 首页骨架：Header（呼吸点+Attentive+居中标题，D5 保留齿轮）、Hero（单行问候、aiVoice 规则、删 watching 行）、Dock（Start New Chat 照抄→/talk） | pulseB 上半部 | `src/app/index.tsx`、`src/components/pulse/*` |
| E | In motion 绿卡（四组/13px 线性图标/组标签占时间位/行内动作/路由）+ Featured 整卡 | pulseB 主体 | `src/components/pulse/SupportingList.tsx`、`FeaturedItem.tsx` |
| F | Noticed 区（行→DetailSheet、See All→ListSheet）+ FundSheet + More 溢出 | 4 个 sheet mock | 同上 + `FundSheet.tsx`、`ListSheet.tsx` |
| G | 空态/离线态/错误行 + 登录 gate（D4，行为变更） | 3 状态 + login mock | `src/app/index.tsx`、`src/app/login.tsx`（新）、e2e |
| H | attention 详情对照重做（无主卡、dock 式动作、Dismiss 弱化）+ 删旧 token + 知识库总同步 | pulseB-review | `src/app/attention/[id].tsx` |

**epic body** = 范围边界 + D1-D10 + 8 子 checklist + mock 快照规则：**issue 创建时把关键样式值/结构贴进 issue，mock 后续漂移不影响已开 issue**。

### 每个 issue 的 DoD

1. `cd agent-mobile-app && pnpm exec tsc --noEmit` 通过
2. `pnpm test`（vitest）通过
3. `pnpm e2e:nosend` 通过（#G 起使用更新后的登录流）
4. 视觉验收：`pnpm exec expo export --platform web --clear` → 起本地静态服务 → headless Chrome 截图 → 与对应 mock 并排对照 → 交子代理读图审查（主模型禁止读图）。**截图 `--window-size` 宽度必须 ≥500**：本机 Chrome headless 最小窗宽约 500px，`424` 会被钳制导致页面右缘 23px 被裁（历史踩坑，勿复蹈）
5. 知识库同步（`pulse-stream.md` / `theme.md` 对应段落）

### 执行流程（严格走 pipeline，逐 issue）

1. `gh issue create`（先 epic 后 8 子；有 Projects board 则挂卡）
2. `scripts/pipeline/new-task.sh <issue号>` → 在输出的 worktree 内开发，提交信息带 `#<issue号>`
3. `scripts/pipeline/open-pr.sh`（body 首行 `Closes #N`）
4. **向用户确认"review 是否完成"；用户回复 ok 后**才 `scripts/pipeline/merge-pr.sh`（合并即自动部署 9928）——不可自作主张合并
5. merge 后：同步知识库 + 勾掉 epic checklist
注意：`merge-pr.sh` 会删 worktree，**必须从主工作区运行**（历史踩坑，曾卡死会话 shell）。

## 3. 红线（违反即返工）

- AGENTS.md 强制规定全部有效；新代码的颜色/字号/间距必须走新 token 命名空间，禁止硬编码
- **勿动** `docs/newdesign/`（用户活跃编辑区，且是设计基准；当前有用户未提交改动，保持原样）
- **勿做**：chat 两页内部设计、assignments/kb 迁移、BFF 仓库、服务器操作（只许 ssh+systemd）
- 消息数组 chronological 语义、打字机 `extraData={revealChars}` 等既有红线继续有效
- 单测/e2e 是保护网：行为变更（仅 #G）需同步改测试并在 PR 里说明

## 4. 沟通与协作

- 中文交流；方案分歧**必须给理由和替代方案**（用户明确要求不要附和）
- 每个 PR 开完即问 review；阻塞与踩坑如实报告（包括工具问题）
- 设计迭代回路 = 改代码 → 截图（≥500 宽）→ 子代理审图 → 修 → 再审
- 若可访问项目记忆库（`~/.zcode/cli/memories/projects/agent-mobile-*`），开工前先读：`chat-pages-routing` / `pulse-html-design-comparison` / `pulse-duties-chat-query` / `headless-chrome-min-width-500` / `deploy-pipeline-plan`（本文档与其一致；冲突时以本文档 + 用户最新指示为准）
