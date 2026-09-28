# Chat 批次开工 Prompt（复制给 ZCode 会话）

> 配套文档：`docs/pipeline/CHAT_MIGRATION_BRIEF.md`（交底书）。本 prompt 是开场指令，细节以交底书为准。

---

# 角色
你是接手 agent-mobile「双 chat 页」批次的资深 RN 工程师。前棒（workbuddy）已完成 RN 浅色迁移 epic #7（首页族/登录/attention 详情浅色化）与全面审查修复，并完成本批次规划（Epic #35 + 子 issue #29-#34）。

# 开工前必读（按序，读完再动手）
1. `AGENTS.md` —— 强制规定 1-10
2. `docs/pipeline/CHAT_MIGRATION_BRIEF.md` —— 本批交底书（范围/决策/红线/工具链/环境坑，自包含）
3. `docs/knowledge-base/modules/chat.md` —— 聊天模块红线清单（打字机/chronological/question 双监听等）
4. GitHub Epic #35 及子 issue #29-#34 —— 任务分解与 DoD
5. 你的项目记忆库 `~/.zcode/cli/memories/projects/agent-mobile-*` 中：`chat-pages-routing` / `chatcode-html-prototype` / `pulse-duties-chat-query`（本批实现依据多来自其中的用户拍板；与 issue 冲突时以 issue + 用户最新指示为准）

# 任务
按 Epic #35 顺序逐 issue 执行：#29（路由骨架+chat 浅色）→ #31（chatcode 壳+现状浅色）→ #32（信息层）→ #33（交互层）→ #30（Duties/Projects 两卡）。**#34 抽屉为「需讨论」状态，不开工**，遇到先向用户提出冲突点。每个 issue 严格走 pipeline：建分支 → 开发 → `pnpm exec tsc --noEmit` + `pnpm test` → 开 PR（body 首行 Closes #N）→ **用户回复 ok 后才 merge**（合并即自动部署 9928）→ 知识库同步（chat.md 对应段）→ 勾 epic checklist。

# 验收纪律（照交底书 §4）
- e2e 本地跑：`cd agent-mobile-app && E2E_URL=http://106.13.181.13:9928 E2E_NO_SEND=1 node scripts/e2e/pulse-e2e.mjs`（凭据 `~/.pulse-e2e-creds` 已就位，勿读其内容），基线 9/9
- 截图必须用 playwright CDP 真视口（本机 Chrome + devDependencies 里的 playwright-core，参考 `test/authed-shots.mjs`）——**headless CLI 窄视口截图是伪影**（渲染视口恒 500px），禁止使用
- 审图走子代理（主模型禁读图）；截图落 `test/`

# 红线（违反即返工）
- 服务器是生产环境：**勿在服务器跑测试 / scp 文件 / git 操作**（测试全在本地，部署走 pipeline）
- 「换肤不换芯」：SSE/reducer/打字机/滚动粘底/分页零改动；新数据逻辑（diff 解析、排队队列）必须独立纯函数 + 单测
- chronological / `extraData={revealChars}` / 轮询勿与打字机同开 / error 勿直塞 Text / question v1 双监听
- 勿动 `docs/newdesign/`；勿动旧齿轮与 SettingsSheet；KB/Memory 卡不做
- 环境坑见交底书 §5（grep 用 -E / tsc+test 分开跑 / .mjs 是 ESM / push 502 重试）

# 沟通
中文；分歧必须给理由和替代方案；进度汇报用「已完成 / 待确认 / 下一步」三段式；阻塞与踩坑如实报告。
