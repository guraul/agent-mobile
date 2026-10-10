# 交给 GLM ZCode 的开工 prompt

> 用法：在 `agent-mobile` 仓库根目录启动 ZCode，把下面「---」之间的内容**整段粘贴**发送。
> 生成：2026-10-10 · 上一棒：DSH 主控会话 · 配套交接书：`docs/pipeline/CHAT_COMPANION_HANDOFF_ZCODE.md`
> ⚠️ 本文件**取代** `CHAT_COMPANION_KICKOFF_PROMPT.md`（那份是 2026-10-08 的讨论期 prompt，接手点已过时，仅历史留档）。

---

你接手 **agent-mobile「chat 伴侣化」epic（#52）的后续执行工作**。上一棒是 DSH 主控会话，它已经把当前状态写成交接书。**这是执行任务，不是产品讨论任务。**

> ## 🎯 起点已定：先做 **#57（E3-a 客户端半边）**
> **不用问"先做哪个"**——读完材料、给出简短落点清单后就**直接开工**。
> 全程只有**两个闸门**：**① 不碰生产**（任何生产写操作都要先拿"变更窗口"授权）；**② PR 等用户 review 通过再合**（合并即部署）。
> 除此之外不要再来回确认。但**范围要守死**：只做 #57 里列的，**不顺手改别的**。

## 第一步：按顺序读三份材料

1. **`docs/pipeline/CHAT_COMPANION_HANDOFF_ZCODE.md`** —— **交接书（先读这个）**。含：当前状态、环境与仓库事实、部署链、待办全景、**已知陷阱**、验证手册、未决问题、交接边界。
2. **`docs/pipeline/CHAT_COMPANION_BRIEF.md`** —— **唯一进度权威**（自包含，约 92 KB）。重点：
   - §2 进度总表 · §3 已拍板决策明细（**这是所有实现的合同**）
   - §6 执行队列（E1→E4 的依赖与门）· §7 Backlog 与旧遗留
   - §8 **事实备忘**（大量已探明的事实，**读了能省几小时，勿重复调查**）· §9 沟通与协作
3. 仓库根 **`AGENTS.md`**（强制规定 + 知识库路由），以及 `docs/knowledge-base/INDEX.md`。

> ⚠️ **不要读** `docs/pipeline/CHAT_COMPANION_KICKOFF_PROMPT.md`——**已失效**（内含过时的接手点，照它执行会重开一个已关闭的议题）。仅历史留档。
> **冲突时以 BRIEF 为准**；BRIEF 与代码实际不符时以实测为准，并更新文档。

## 运行环境：**本机 macOS**（用户已确认，以下资产直接可用）

| 资产 | 路径 |
|---|---|
| 主仓（App 在 `agent-mobile-app/`） | `/Users/gubin/workspace/agent-mobile` |
| BFF 仓（独立 git，私有） | `/Users/gubin/workspace/family-finance` |
| opencode 源码（**tag v2.0.26**，契约依据） | `~/workspace/opencode-src` |
| 本机 opencode 二进制（v2.0.26） | `~/.opencode/bin/opencode` |
| memx 插件本机 checkout | `~/workspace/opencode-memx` |
| 登录凭据（`{"user","pass"}`，**不要打印内容**） | `~/.pulse-e2e-creds` |
| 浏览器自动化 skill | `~/.agents/skills/playwright-skill`（`cd` 进去 `node run.js <脚本>`） |
| 本轮探针 / issue 草稿（gitignored，不入库） | 仓库根 `test/` |
| 工具链 | node v24.21.0 · pnpm 12.6.0 · gh 已登录 `guraul`（scopes 含 `repo`/`workflow`/`project`） |

> 生产服务器 `106.13.181.13` 上另有 `opencode-4096` / `bff-19234` / `serve-9928` 三个 systemd 服务——**那是生产，只读**。

## 第二步：读完先给「落点清单」，然后**直接开工**

给用户一段**简短**汇报（三段式）：

- 你对 #57 范围的理解（2–3 句，证明你读懂了）；
- **落点清单**：要改哪些文件、分几步、每步怎么验证；
- 需要用户拍板的点（**若确实有**；没有就写"无"）。

**给完落点清单就开工，不用等回复**——用户可以随时打断你。落点清单的作用是让他有机会在错误的路上及时叫停，**不是审批环节**。

> ⚠️ 上一棒的教训：它把"工作移交给我"误读成"立即开工 E2"，自作主张建 worktree、改了 14 个文件，随后被用户叫停、**产物全部作废**。
> 所以：**起点已定 → 就做这一件；但只做这一件。** 发现范围外的 bug 或问题 → **记下来汇报**，不要自己动手改。

### #57 的范围（摘要，**以 issue 正文 + 交接书 §4.4 + BRIEF §3.2/§3.7 为准**）

1. **本机验证 `companion` agent 配置写法**（本机 opencode 已是 v2）：工具白名单 `read`/`grep`/`glob` + `websearch` + 产品动作工具；**显式配 `model`**；`permission` 层**拒绝 bash/edit/write 全家**。
2. **客户端强制**：chat 页（`resolveConversationKind === "chat"`）发送时固定 `agent: "companion"`，不随 session / 用户选择变化。chatcode 侧不动。
3. **chat 侧去掉 agent 选择器**（agent pill 循环 + `agent-sheet`），并**修掉 `FALLBACK_AGENTS` 过滤坑**（`ChatPanelZ.tsx:77` 的 `[build, plan, design]` 会过滤掉服务端新建的 `companion`）。
4. **【用户 2026-10-10 拍板】思考卡收敛**：chat 页**不得再按 reasoning step 刷卡片**（现在一次多步推理会密集刷出多张 `{> 思考}` 卡）。收敛方式二选一——**折叠成单条状态行**（如 `思考中…` / `已思考 N 步`）**或直接不渲染**；判准 = **不新增过程类 UI**；chatcode 侧不动。

### ⛔ 本次**不做**的（避免越界）

- **服务端 `companion` agent 真正上线** → **依赖 E1（#53）**，生产还是 opencode v1.18.34，本机只做"配置写法验证"。
- E2 / E1 / E3-d / E4 / 其它 backlog issue。
- 任何生产机器上的写操作。

## 硬性纪律

1. **中文交流**；给用户的汇报一律用「**已完成 / 待确认 / 下一步**」三段式。
2. **一次只做一个任务**：不要一口气铺开多项、不要把范围外的改动捆进来。**但已定的任务不必逐步等确认**——给完落点清单就往下做。
3. **用户要真实意见**：不要附和；不同意要给理由和替代方案。（用户明确要求过）
4. **生产只读**：`106.13.181.13` 是**正在服务用户的真机，不是测试机**。任何写操作（systemd / 目录迁移 / 服务重启 / opencode 升级 / 数据库迁移）**必须先给方案，拿到用户的"变更窗口"授权才能执行**——定义见交接书 §7.4。**失败要能回滚，且回滚方案要写在方案里。**
5. **合并即部署**：两个仓 push 到 `main` 都会自动触发部署。**PR 必须等用户 review 通过再合**（`agent-mobile` 与 `family-finance` 都是）。
6. **不要碰** `docs/newdesign/`（用户活跃编辑区）；**不要动依赖版本与 lockfile**（除非任务明确要求新增 package，且必须用 `pnpm install` 重算而非手改）。
7. **改完 TS 必须验证**：`cd agent-mobile-app && pnpm exec tsc --noEmit`；纯逻辑改动**必须同步跑 `pnpm test`**。
   **当前基线 = 27 个测试文件 / 235 个测试全过。低于这个数就是回归。**
8. **临时脚本 / 截图 / 日志**统一放仓库根 `test/`（已 gitignore，不入库）。
9. **不要重复已完成的调查**：交接书 §2 / §4 与 BRIEF §8 里已经写好的事实**直接采信**；有疑问先做只读核实，不要重新摸一遍。
10. **不要重开已关闭的议题**：七项讨论 + E0 探针全部收尾，BRIEF 是权威。有异议先提出来问用户，别直接改。

## 最容易踩的三个坑（完整清单见交接书 §6）

1. **push 失败**：`agent-mobile` 的 `origin` 是 HTTPS，而 HTTPS push 会报 `Empty reply from server`。
   → 显式用 SSH：`git push git@github.com:guraul/agent-mobile.git <branch>`。
2. **`gh` 多行正文**：`gh issue comment/edit --body "多行"` 会报 `accepts 1 arg(s), received 3`。
   → **一律用 `--body-file`**。
3. **worktree 里别软链 `node_modules`**：为省空间把 `agent-mobile-app/node_modules` 做成指向主仓的软链，pnpm 会直接拒绝工作（`workspace hoist directory is not a real directory`），`tsc`/`test` 全跑不起来——**你会误以为"测试跑过了"其实根本没跑**。正解是老实 `pnpm install`。

## 关于 `AGENTS.md` 规则的适用范围

`AGENTS.md` 规则 **11 / 12 / 13**（"DSH 控制 opencode 做事"、免费档模型回退链、子代理并发纪律）是写给 **DSH 这个 harness** 的委派拓扑，**对你不适用**；规则 **10**（图片必须走 vision-reader 子代理）是因为 DSH 主模型不支持图片输入，你若支持图片可自行判断。

**其余规则全部适用**（Expo SDK 57 版本化文档、tsc+test、消息数组时序、打字机与 `extraData` 红线、主题 token、凭据不入库、9928 端口归属、`test/` 目录、勿改 `docs/newdesign/` 等）。

## 现在请做

1. 读上面三份材料（**#57 的范围**同时看 issue 正文、交接书 §4.4、BRIEF §3.2 / §3.7）。
2. 给出**简短落点清单**（三段式：改哪些文件 / 分几步 / 怎么验证 / 待拍板点）。
3. **然后直接开工**，走仓库 pipeline：
   ```bash
   scripts/pipeline/new-task.sh 57          # 建 worktree + 分支
   # …开发，自验：cd agent-mobile-app && pnpm exec tsc --noEmit && pnpm test
   # 在 worktree 内：../../scripts/pipeline/open-pr.sh
   ```
4. **开完 PR 停下等用户 review**——**不要自己合**（合并即触发部署）。
5. 完成后按「已完成 / 待确认 / 下一步」汇报，并附：PR 链接、改了哪些文件、验证结果（tsc / 测试数）、**范围外发现的问题清单**。

> ⚠️ **worktree 里不要软链 `node_modules`**（见上方「最容易踩的三个坑」第 3 条）。
> ⚠️ **不要在本机跑 `pnpm e2e`**——`agent-mobile-app/scripts/e2e/*.mjs` 有 17 处 `/root/...` 硬编码，在 macOS 上必然失败；要浏览器验证就用 `~/.agents/skills/playwright-skill`（**Redmi K70 视口 = 393×852，DPR 2.75**）。

---

## 附：用户可能的简短回复 → 你该怎么做

- 「**开始**」/「**继续**」/ 沉默 → 按上述流程直接做 #57，不必再确认。
- 「**#57**」/「**E3-a**」→ 同上，这就是起点。
- 用户改口说「**先做 E2**」→ 读 #54 + 交接书 §4.2，**先给执行顺序 + 生产窗口方案（含回滚）**；代码改动走 PR、等 review；**生产写操作必须等窗口**（交接书 §7.4）。
- 用户改口说「**先做 E1**」→ 读 #53 + BRIEF §3.3 / §6 / §8，**先给完整方案（含数据库快照与回滚）**——这是最大的一次变更，**不要抢跑**。
- 「**先别做，我们先讨论**」→ 进入讨论模式：一次只抛一个议题，等拍板，当场落档回 BRIEF。
- 任何让你"顺手也把别的改了"的暗示 → **先确认范围**，别扩大。
- 遇到**卡住/不确定**（模型不可用、契约对不上、方案有分歧）→ **停下如实报告，不要自己降级、替换或绕道兜底**。
