# Chat 迁移交底书 —— 双 chat 页（chat + chatcode）→ agent-mobile-app

> 生成：2026-09-29 · 交接人：workbuddy（RN 浅色迁移 epic #7 执行 + 全面审查修复 + chat 批次规划）· 执行者：ZCode
> 本文档自包含，与 `AGENTS.md`、`docs/knowledge-base/INDEX.md`、`docs/pipeline/README.md`、`docs/pipeline/RN_MIGRATION_BRIEF.md`（上一棒交底书，历史参考）配合使用。
> 状态：**规划已完成（epic #35 + 子 issue #29-#34 已建），尚未开工**——第一步是按 #29 起跑 pipeline。

## 0. 开工前必读（按序）

1. `AGENTS.md` —— 强制规定 1-10（改完 TS 必须 tsc；token 化；主模型禁读图；9928 端口约定）
2. `docs/knowledge-base/INDEX.md` + `modules/chat.md` —— 聊天模块事实基准（组件实名、数据流、**红线清单**、ZCode 归一历史）
3. `docs/pipeline/README.md` —— pipeline 脚本与红线
4. **Epic #35**（GitHub）—— 双 chat 页的范围边界、已拍板决策表、6 子 checklist、通用 DoD
5. 你自己的项目记忆库（`~/.zcode/cli/memories/projects/agent-mobile-*`）：`chat-pages-routing` / `chatcode-html-prototype` / `pulse-duties-chat-query`——**本批的实现依据大量来自这些记忆中的用户拍板**，冲突时以 GitHub issue + 用户最新指示为准

## 1. 前情（一屏）

RN 浅色迁移 epic #7 已收官（2026-09-28，PR #16-#24）：light token 体系（`src/theme/light.ts`）、浅色原子（`components/pulse/LightAtoms.tsx`）、LightSheet、首页族/登录 gate/attention 详情全部浅色，9928 线上为浅色 Companion 形态。桌面端有 480px 手机壳容器；本地 e2e/playwright 工具链已建好（见 §4）。**talk 及 chat 组件族仍是暗色 companion token**——就是本批要做的。

随后全面审查修复（PR #25/#26/#28）：e2e 断言修复（hero testID 回归、noticed locator 排除 sheet/scrim、动态 L1 数据容错）、**e2e 本地化**（playwright-core 进 devDependencies + 本机 Chrome + `~/.pulse-e2e-creds` 凭据），本地 `E2E_NO_SEND=1` 基线 **9/9 全过**。

## 2. 任务与范围（epic #35，勿改范围——改需用户明示）

| # | 内容 | 对应 mock | 关键文件 |
|---|---|---|---|
| #29 A | talk 双页路由骨架（**单路由 /talk，directory 判据自动分流**）+ chat 页（伴侣）浅色化：气泡流 + ai-orb + user check-badge + inputbar + peach token 延伸段 | `chat.html` | `src/app/talk.tsx`、`src/components/chat/zcode/*`、`src/theme/light.ts` |
| #30 B | 通用气泡内白卡框架（inner-card，chat.html .inner-card 基准——**也是将来 Settings 气泡化的载体**）+ Duties 卡（assignments API）+ Projects 卡（project events API） | `chat-widgets.html` | `src/components/chat/zcode/*` 新增 |
| #31 C | chatcode 工作台壳 + 现有能力浅色化（permission 卡 / question 弹窗 / model 面板 / agent pill 机械换肤）；**绑项目最新 session（resume-most-recent），无选择器** | `chatcode.html` | 同 #29 |
| #32 D | chatcode 信息层：工具折叠组升级（StepRow → 组 + 工具输出 LightSheet）+ thinking 块 + **diff 代码卡**（新解析纯函数 + 单测） | `chatcode.html` | 同上 |
| #33 E | chatcode 交互层：pill↔展开 composer + 排队消息 chip（客户端队列纯函数）+ model/agent 长按面板 | `chatcode.html` | 同上 |
| #34 F | **⚠️ 需讨论后才能开工**：sessions/workspace 抽屉 + 边缘手势——与 2026-09-27"抽屉暂不做"拍板冲突、与"绑最新 session"机制冲突（并存还是切换？）、RN Web 手势双端成本高。我的建议已写在 issue：桌面先做点击唤起，移动手势第二批 | `chatcode.html` | 待定 |

### 已拍板决策（2026-09-28 补充，接 RN brief 的 D1-D10 之后）

- **C1 单路由 /talk 自动分流**：directory 是 session 属性（进页才知道），判据放运行时而非跳转前；route params（autoSendContext/attId/projectPath/subjectId）全兼容，e2e 零改动。不拆 /chat + /chatcode 双路由。
- **chat 侧视觉语言**：cream 底（与 pulseB 同 #F7F5DC）+ **peach 桃色主行动作**（#F3BA8F 系，替代 pulseB 的 violet）——light token 加 chat 专属段。
- **KB / Memory 先不做**：Memory 卡、知识来源卡、KB 阅读形态全部划出范围（/kb/doc 保持现状）。
- **Settings 保持旧齿轮 + 旧 SettingsSheet**（D5 挂起项继续挂）：用户拍板 Settings 将来以**聊天气泡互动**呈现（chat.html 的 inner-card 就是载体），依赖 agent 侧配置能力，另议——**本批勿动旧齿轮**。
- **assignments 两屏去向未拍板**：Duties 卡上线后建议删（URL 直达无入口），删除时机待用户确认。
- **chat→chatcode 升级移交**：第一批 out-of-scope（backlog）。

## 3. 红线（违反即返工）

- AGENTS.md 强制规定 + chat.md 红线清单全部有效：**chronological 语义 / 打字机 `extraData={revealChars}` / 轮询勿与打字机同开 / agent·model 按消息指定（改 session 不支持）/ error 对象勿直塞 Text（React #31 白屏）/ question 用 v1 兼容名双监听 / code_inline 显式覆盖 padding**
- **"换肤不换芯"**：#29/#31 只动 token 与呈现结构，SSE 订阅 / reducer / 打字机 / 滚动粘底 / 分页 / pending 队列逻辑零改动；数据层新逻辑（#32 diff 解析、#33 排队队列）必须独立纯函数 + 单测
- 勿动 `docs/newdesign/`（用户活跃编辑区）；勿做 BFF 仓库；**勿在服务器上跑测试 / scp 文件 / git 操作——服务器 checkout 是生产环境镜像**（历史踩坑，2026-09-28 曾 scp 覆盖后恢复）
- 消息数组 chronological / 打字机既有红线继续有效；单测是保护网

## 4. 工具链与验收（本日新建，直接复用）

- **本地 e2e**：`cd agent-mobile-app && E2E_URL=http://106.13.181.13:9928 E2E_NO_SEND=1 node scripts/e2e/pulse-e2e.mjs`——凭据走 `~/.pulse-e2e-creds`（JSON {user,pass}，home 下不入库；勿读其内容进会话）。基线 **9/9**（noticed 为动态 L1 数据，收盘后可能为空 → 断言自动 skip）
- **截图验收必须用 playwright CDP 视口**：本机 headless Chrome（新旧模式都）**渲染视口恒 500px**，`--window-size=411` 的截图是 500 渲染后裁切（右缘 76-125px 丢失）——**窄视口截图一律伪影**。正确姿势：`playwright-core`（已进 devDependencies）+ 本机 Chrome（`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`）+ `newContext({ viewport: { width: 411, height: 752 } })`（CDP 仿真不受窗口钳制，实测 innerWidth 精确）。参考脚本 `test/authed-shots.mjs`（登录态多视口截图）与 `test/diag-noticed.mjs`（DOM 匹配诊断）
- **LightSheet scrim 关闭态常驻 DOM**（opacity 0 + pointerEvents none，与旧 BottomSheet 同构非 bug）——e2e locator 需排除 `*-sheet(-scrim)`（见 pulse-e2e.mjs noticed locator 写法）
- 审图走子代理（主模型禁读图）；截图落 `test/`
- 服务器操作仅限 ssh+systemd（部署回滚），测试一律本地

## 5. 环境坑（本日实测，勿复蹈）

- `grep` 交替 `\|` 在本机 shell 失效——用 `-E`
- `tsc` 与 `test` 连跑会被 OOM 杀（8GB 内存）——分开跑
- `.mjs` 是 ESM：不能用 `require`，用 `createRequire(import.meta.url)` 解析 CJS 依赖
- git push 偶发 502：`-c http.version=HTTP/1.1` + ls-remote 验证的循环重试
- OOM 被杀的链式命令"死前"子命令可能已完成——重试前先查 git 状态
- `merge-pr.sh` 必须从检出 main 的主工作区运行
- **绿卡等 L1 数据是动态的**：收盘后可能清空（登录态截图/断言需容错；绿卡真实形态截图待交易时段补验）

## 6. 挂起项与知识库

- 挂起（本批不做）：#34 抽屉（待讨论）、绿卡/Featured/详情/FundSheet 登录态截图（交易时段补）、Settings 气泡化、登录页深化设计、Memory/KB 卡、assignments 两屏删除
- 知识库现状：`pulse-stream.md` / `theme.md` / `components.md` / `INDEX.md` 已同步至 main（4e44a6b）；**chat 批次每完成一个 issue 同步 `chat.md` 对应段**，全部完成后更新 `router.md`（双页分流）与 `INDEX.md`
- 测试脚本资产：`test/authed-shots.mjs` / `test/diag-noticed.mjs`（test/ 不入库，用前复制或脚本化进 `agent-mobile-app/scripts/`）

## 7. 沟通与协作

- 中文交流；方案分歧必须给理由和替代方案；每个 PR 开完即问 review，用户 ok 后才 merge（不可自作主张）
- 设计迭代回路：改代码 → playwright 截图（真视口）→ 子代理审图 → 修 → 再审
- 阻塞与踩坑如实报告；用户偏好简洁直接的进度汇报（已完成/待确认/下一步三段式）
