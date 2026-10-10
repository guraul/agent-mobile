# Chat 伴侣化（companion）交底书 —— 讨论接力

> 生成：2026-10-08 · 交接人：ZCode · 接手：opencode（继续与用户逐单元讨论）
> 最后更新：2026-10-10（**E0 探针完成** → **两项决策已拍板**：生产"查网" = 先升 v2 + 再配 exa MCP；生产 model 同窗口改 `opencode/mimo-v2.6-flash-free`。**E1 从 backlog 拉回队列首位**（§6）；执行队列重排为 **E1 → E2 → E3 → E4**）
> 状态：**讨论与探针均已完成，决策已定；用户明确"先不要开工"**——开工时点待用户单独明示。
> 本文件自包含：愿景、已拍板决策明细、立项切片、执行队列、事实备忘。辅以 `AGENTS.md`（仓库强制规定，仅作背景）。

## 0. 接力须知（给 opencode）

1. **这是讨论，不是开工**：与用户逐单元讨论，一次只抛一个议题；用户拍板后才进下一个。
2. **用户要真实意见**：不要附和；不同意要给理由和替代方案（用户明确要求过）。
3. **冻结纪律**：讨论全部收尾前不改任何代码/配置/服务器；只读查询允许。**本讨论已收尾**，故冻结已达解除条件——但**可写类工作（含 issue 创建）仍等用户明示**；已拍板后置的 **E1**（§7）在用户重启前一行都不要动。
4. **讨论七项 + E0 探针均已完成；两项决策已拍板**（生产：先升 v2 → 配 exa MCP → model 改 `opencode/mimo-v2.6-flash-free`）。**执行队列 = E1 → E2 → E3 → E4**（§6）。**用户明确"先不要开工"**——开工时点待其单独明示。
5. 每关一个单元当场落档（§3 的格式即样例）；**本文件已更新为定稿**（§2-§7 全部收敛）；开工前与用户确认第一步（现为 E0）。
6. 中文交流；给用户的汇报用「已完成 / 待确认 / 下一步」简洁三段式。

## 1. 愿景与背景

用户原话（讨论起点）：

> 现在的 chat，仍然会有工具调用之类的，我理想中的 chat 应该是和比如 deepseek 的网页版，纯聊天的，当然在聊天过程中有火花冒出，那可以随时切换 chatcode，或者记录下来，或者开个新的定时任务，也就是说，chat 和 code 的不同在于，chat 会有更多我的 knowledge 和 memory，所以可以各种讨论。而 chatcode 主要就是对于单一项目的开发工作，当然从 ui 元素来讲 chatcode 更多，而 chat 则是比较少，但这也代表了 chat 背后需要的能力更强，比如我要设置一个定时任务，我只需要告诉她规则，他会自动在后台帮我完成。

**现状与 gap（已与用户对齐）**：

- chat / chatcode 现在跑**同一批 agent**（build/plan/design，全工具），`resolveConversationKind` 分流只分了工作目录、**没分能力**——gap 在 **agent 配置层**，不在 UI 层。
- chat 会话当前 cwd 挂在 family-finance 仓库（market 目录）——安全隐患，单元 2 的禁 bash 白名单顺带消除。

**前情**：epic #35「双 chat 页」已收官（2026-10-02，六项全 merge，KB `modules/chat.md` / `router.md` 已同步）。本讨论是产品愿景讨论，产出 = 拍板集 + 执行队列 + 立项切片。

## 2. 讨论进度总表

| 单元 / 清单项 | 状态 |
|---|---|
| 单元 1 纯聊天定义 | ✅ 已拍板（§3.1） |
| 单元 2 companion agent 配置 | ✅ 已拍板（§3.2） |
| 单元 3 knowledge/memory 归所（含 v2 升级任务卡、homebase） | ✅ 已拍板（§3.3） |
| 清单① 出口一：记录 | ✅ 已拍板（§3.4） |
| 清单② 出口二：定时任务 | ✅ 已拍板（§3.5） |
| 清单③ 出口三：切 chatcode | ✅ 已拍板（§3.6） |
| 清单④-1 chat UI 收敛·工具组 | ✅ 已拍板（§3.7） |
| 清单④-2 chat UI 收敛·斜杠命令族 | ✅ 已拍板（§3.8） |
| 清单⑤ companion prompt v0 要点 | ✅ 已拍板（§3.9） |
| 清单⑥ chatcode 抽屉入口 | ✅ 已拍板（§3.10） |
| 清单⑦ 立项切片 | ✅ 已拍板（§3.11） |
| E0 开工前探针（只读） | ✅ **已完成**（2026-10-10，结论见 §8）；两项决策已拍板（§6） |
| E1 · 生产升级 v2 + exa + model 修正 | 🔜 **在队列首位**（2026-10-10 从 backlog 拉回） |
| E2 · homebase 改名迁移 | ✅ **在队列内**（名字已定；服务器路径已确认） |

（讨论进度：**七项全部收尾，本文件已定稿**。）

## 3. 已拍板决策明细

### 3.1 单元 1：「纯聊天」的定义 ✅

- **两层定义**：
  - **UI 层（看得见的纯）**：工具调用过程一概不上界面——没有工具卡片、没有授权弹窗打断、没有 bash 输出滚动；对话流里只有文字和必要的富卡片。
  - **副作用层（做得到的纯）**：**零工程副作用**——chat 永不改代码、不跑构建、不碰仓库文件。但不是零动作，三类产品级动作放行：**查**（websearch、读记忆、读项目状态）、**记**（写 memory）、**托付**（建定时任务/提案）。
- **结果留痕原则**：过程零展示，**结果要留痕**——凡是**约束用户的结果**（建了任务、存了记忆），给一行轻量回执 chip（如 "✓ 已设置：每天 9:00 检查构建"）；纯检索类的过程（搜了网页、翻了记忆）则彻底无痕。
- **LangSmith 式可见性 → backlog**：那是给"我们自己"看的运行轨迹，与"用户看不到"不矛盾；opencode 已把每次会话的工具调用全量存进 session 数据，最低成本形态 = 将来做个 dev 模式 trace 视图读现成数据（不真接 LangSmith）。

### 3.2 单元 2：companion agent 配置 ✅

- **工具白名单**：放行**只读查询**（read/grep/glob，看项目状态用）+ **websearch** + **产品动作类工具**（建任务/提案/记忆）；**禁 bash/edit/write 全家**。禁 bash 是关键——一刀切断构建/git/任何仓库变更，也顺手消掉 chat 会话 cwd 挂仓库的安全隐患。
- **强制（非默认）**：chat 页发出的每条消息固定 agent=companion（`prompt_async` 支持逐条消息指定 agent，session 不动）；双保险 = agent 配置断工具（真护栏）+ 客户端写死（行为一致）。**反对默认可切**——默认迟早被误切，切一次就可能在错误目录里跑出 edit，"零工程副作用"破防。chatcode 侧维持现状不动。
- **模型**：暂用与 chatcode 同款；**模型可配置 → backlog**；**系统 prompt 可配置 → backlog**（未来对接 opencode-memx 与 llm-wiki）。
- **设计约束（为换底座留路）**：**插件写薄**——只做工具注册 + system prompt 注入，逻辑全在 BFF/personal-context；未来底座（用户候选：pi / dsh）只重写薄壳，BFF 契约不动。
- 待核实：opencode 有没有 websearch 工具（本机 v2 已走某 MCP，名字待查——E1 第一项；v1 若无则先缺着）。

### 3.3 单元 3：knowledge/memory 归所 ✅（含 v2 升级任务卡、homebase）

**实况（已调查，勿重复摸）**：

- **memx** = `/Users/gubin/workspace/opencode-memx`：opencode 记忆插件（`@opencode-ai/plugin ^1.18.11`，v1 兼容）。双轨：Track 1 全局用户风格 `~/.opencode/USER.md`（四分类、200 行压缩、废弃删除线、STYLE_SIGNAL 标记 + 子 AI 批量提炼）；Track 2 项目记忆 `~/.opencode/projects/<slug>/.mem/*.md` + 索引 `MEMORY.md`（四类型 project/reference/feedback/user，frontmatter 强制 Why / How to apply）。**存储纯 markdown**。被动管道：`session.idle` / `reflect` 触发；注入靠 `~/.config/opencode/opencode.json` 的 `instructions` 字段。
- **llm-wiki** = `/Users/gubin/workspace/llm-wiki`：SKILL.md 形态（已兼容 opencode / CodeBuddy / WorkBuddy），知识存 Obsidian vault（vault 根 `AGENTS.md` 配 `LLM_WIKI_VAULT`）；查询有现成 MCP 服务 `llm-wiki-mcp`（本地 stdio）。
- **关键洞察**：两家**存储层都是纯 markdown**——适配难题不在存储，只在接线方式（memx 现在是 opencode 专用 plugin hook + instructions，这就是"不适配其他 agent"的根源）。

**拍板**：

- **agent 口不用 MCP，走插件模式**（用户拍板）。先做 opencode v2 插件，其他（pi/dsh 适配）到时再说。
- **存储不做合并**（物理两库维持）；**服务层合并**：统一 CRUD API + 共享基建（markdown 解析 / frontmatter / 备份 / 检索）+ App 统一视图（/memory 页、chat 的 Memory/Knowledge 卡读同一族 API）。原则一句话：**BFF 存哑的（存储/检索/CRUD），agent 干聪明的（提炼/编译）**。
- "记忆树挂进 vault（`vault/memory/`）" → **backlog**，具体实现到时候单独讨论。
- **仓库拓扑：homebase 真 monorepo**。family-finance 改名 **homebase**（整个 app 目的已完全不同；它保持真 monorepo 架构，未来新后端仓库以 package 进场）。包布局（已认）：`packages/{shared, web, personal-context, opencode-plugin}`。
- **归所**：memx 的服务端部分（存储/检索）→ `personal-context`，**提炼管道留在 memx 仓**（它必须是 opencode 插件，跟底座走）；llm-wiki 的检索服务 → `personal-context`（`llm-wiki-mcp` 退役），**SKILL.md + 编译管道留在 llm-wiki 仓**（skill 不是后端代码）；跨仓契约 = BFF REST API。
- **改名前打针**：服务器路径 `/root/project/family-finance` 被多处硬引用——`conversation-kind.ts` 的 `MARKET_TALK_DIRECTORY`、systemd 单元 WorkingDirectory（bff-19234 等）、opencode 配置、部署脚本、e2e 断言。**顺序：改名 + 目录迁移 + 引用清单更新 = 独立任务先行**（先定名安家，再往里搬东西，路径只动一轮）。**→ 已落实为 E2，名字定为 `homebase`（§3.11 ⑤ 含清单；唯一未定项 = 服务器目录是否随改）。**
- **v1 先无记忆上线**（用户提出，ZCode 同意）：若生产 opencode 已装 memx，companion v0 靠 `instructions` 白得被动注入（USER.md + MEMORY.md 索引）；主动写入（出口①）随 E4 插件批次。**→ E0 已答：生产已装 memx 且 USER.md/MEMORY.md 在注入（§8 E0 第 1 条），本条成立。**
  - ⚠️ **2026-10-10 更新**：用户已拍板**生产升级 v2**（§6 E1）→ **"v1 先无记忆上线"降级为过渡方案语义**：若 E1 先于 E3 完成，则生产直接以 v2（+ memx 适配后的插件）形态上线，本条的"v1 兜底"只在 E1 未完成的窗口期适用。**E3 实现时以"生产最终形态"为准，勿把 v1 当长期形态写死。**

**v2 升级任务卡（用户指定最高优先）**：

- 实况：本机 macOS opencode **已升 v2**（websearch 走了某个 MCP，名字用户忘了——调查第一项）；生产还是 v1。
- 流程：**先删 v1 插件，再升级**（本机与生产同此）。本机摘 v1 插件 → 兼容测试全绿 → 生产摘插件 + 升级 + 回滚预案。
- 兼容测试清单：session 列表/创建、`prompt_async`（含 agent 参数——companion 强制靠它）、SSE 事件流形状（打字机靠它）、question/permission 流、BFF 代理层、**v2 插件 API 能力验证**（工具注册 / `session.idle` hook / `instructions` 注入——memx 需要，插件模式既定）、websearch MCP 名字确认。
- **硬约束（用户原话级）**：**测试只在本机做，绝对不要去生产测试；测试不能进行，需要告知**（不绕道、不降级凑合）。

### 3.4 清单① 出口一：记录 ✅

companion 的"这个记一下" = v2 插件注册的 **memory_write 工具**（写进 personal-context 记忆库，按 memx 四类型 schema：project/reference/feedback/user），chat 里给一行回执 chip（单元 1 的留痕原则）。v1 无记忆上线，本出口随 E4 插件批次。

### 3.5 清单② 出口二：定时任务 ✅

- **链路**：用户 NL 说规则 → companion 编译成结构化规则（cron + 动作 + 通知方式）→ **chat 内轻确认卡**（展示她理解的规则原文，确认 / 改）→ 写入现有 assignment 引擎（Duties/补偿/投影那套，BFF 侧）→ 执行永远由引擎做，结果回流 attention/L1 → Pulse 卡 → 用户可问"今天早上的检查做了吗" → 她**只读**查执行记录回答。
- **拍板**：① 确认环**保留（轻量版）**——理由：不对称失败模式（建错任务会被她每天早上重复执行/打扰，直到用户去 Duties 里翻出来撤销）；确认卡 = 校准她理解的最快方式，本质不是审批。② 确认卡在 **chat 内**（小卡片，不打断对话流、不跳页）；Pulse proposal 系统保持现状（它服务"后台主动建议"，chat 内卡服务"用户开口要的"，两个入口同一 assignment 存储）。③ 她只做**编译 + 创建 + 查询**，不亲自执行任务。
- **前置门（用户提出）**：动工前核实 assignment 引擎是否 ready 吃"程序化建任务 + 结构化规则"——不 ready 先补口子（会成为 epic 里的一个 issue）。

### 3.6 清单③ 出口三：切 chatcode ✅

**场景**：聊着聊着出火花，"这个思路好，去帮我实现了吧" → 从伴侣聊天切到工程工作台。

**链路（定稿）**：

```
chat 里 NL 说"去把 X 做了"（或她识别出工程意图主动提议）
  → 她正常回复一段摘要（目标 / 边界 / 落点三段式）→ 移交卡原文展示 + 可改
  → 用户确认：
     - BFF 存 handoff 文本 → 拿 handoffId
     - 【新项目】表单收：服务器绝对路径（必填）+ 可选名字（仅做 session 标题显示）
     - 【既有项目】卡上带项目候选选择（列表来自 opencode /project）
     - 建项目 →（E4 起）写 memory → 建项目 session → 投喂摘要作首条用户消息
     - 跳 chatcode 页，工程 agent 接手
  → chat 会话原地保留；回来问"改得怎么样了"她用只读工具答
```

**三个拍板点**：

1. **移交语义 = 新建项目 session + 上下文种子，不做同会话换 agent** ✅。理由：directory 建时定死、chatcode 会话列表按目录过滤、memx slug 会记错。**走 `autoContextText` 通道**（建 session + 发一条首条用户消息，无 engage 语义；同款用法见 `index.tsx:281`），**不用 `autoSendContext` / attention 通道**（那带 engage/subject 语义，工程任务不该带）。管道现成，零新增接口。
2. **触发方式 = v1 只做 NL + 移交卡，不做常驻"切 chatcode"按钮** ✅。手动按钮答不了"切到哪个项目"（配选择器 UI 变重、违背单元 1 极简；默认最近项目猜错率不低）。**修正**：项目选择能力**放进移交卡**（既有项目分支列候选），而不是假设她已知——NL 路线同样答不了"是哪个项目"。按钮 → backlog。
3. **回程 = 完整版 (a)** ✅：BFF 加只读 session 端点（status + 最近 N 条消息标题/摘要）+ companion 一个只读工具。**理由（否掉了 ZCode 的"不用加东西"）**：opencode session 数据在 server 侧 storage，不在项目文件树里 → read/grep/glob 够不着；bash 被禁 → 不能 curl `127.0.0.1:4096`；websearch 不是内网 API。**这是出口③的硬依赖，不是 backlog**——砍掉则出口③只剩"跳走"，"她托付出去、继续陪着看进展"的核心价值就没了。与 handoff 存储一并实现，边际成本。

**移交摘要 = 她那条回复本身**（点 4/5 的联动设计）：

- **不新增 handoff 工具、不做后台静默总结**。她那段回复天然含目标 / 边界 / 落点。
- 移交卡**原文展示 + 可改**——校准是刚需（工程 agent 照错的干，返工成本高于建错定时任务），不能省。
- 确认后**同一份文本两处落**：新 session 的首条用户消息 + 一条 memory。优势：零额外模型调用、不新增第三个端点、两处不会不一致、失败用户可见。
- 卡必须允许**"先不转，继续聊"**（她可能误判工程意图）；dismiss 后摘要仍留在对话流里。**"随时移交"而非"必须移交"。**

**上下文通道**：`autoContextText` 是 URL query 参数，长文本会爆 → 定 **(b)**：**BFF 存 handoff 文本，URL 只带 `handoffId`**，ChatPanelZ 拉取后发首条消息。

**E3 / E4 分层（同一张卡、同一份文本，不架构分叉）**：

- **E3（无记忆上线）**：移交卡（新/既有分叉）+ 建项目 + 建 session + 投喂摘要。
- **E4**：同一次移交流程**再多写一条 memory**（新项目 `project` 型 / 既有项目 `feedback` 型）+ 结果留痕 chip（单元 1 原则）。

**写 memory 的顺序（写死，防实现搞反）**：**建项目拿到 slug → 写 memory → 建 session → 投喂**。新项目在建 session 前没有 slug，写 memory 必须排在建项目之后（既有项目无此问题）。memory 落点是 **slug**（`~/.opencode/projects/<slug>/.mem/*.md`），不是 path。

**分工**：BFF 存 handoff 文本属"哑存储"（单元 3 原则：BFF 存 dumb、agent 干聪明）；摘要/记忆的提炼与编译由 companion 干。

**本关新增事实（已核实）**：

- **「项目」无登记实体**：`opencode-client.ts:116` 只有 `getProject()`（读 opencode `/project` → `{id, worktree}`），**没有创建/登记接口**；`createSession` 吃裸 path。新项目分支因此**只填路径、不 mkdir**（companion bash 被禁建不了目录；BFF mkdir = 服务器副作用，重量级且踩单元 1 边界）。
- **待确认**：opencode `createSession({directory})` 对未登记目录是否隐式产生 project。

**本关 backlog / 遗留**：

- "后台静默总结"（隔天回来移交三天前的对话）→ v1 不做，卡上给"重新总结"按钮即可。
- 摘要格式约束（目标 / 边界 / 落点）→ 写进 ⑤ companion prompt v0，届时讨论。**→ 已于 §3.9 第 6 条拍板关闭**（格式约束，不写死三段标题）。
- chat 与 chatcode 会话列表互不干扰：chat 只列自己、chatcode 只列项目（`resolveConversationKind` 现按目录分流，改动不大）——实现时验一遍工程 session 不漏进 chat 列表。

### 3.7 清单④-1 chat UI 收敛·工具组隐藏程度 ✅

**现状（已调查，勿重复摸）**：

- 工具组渲染链：`mergeMessages` → `groupToolSteps`（`message-merging.ts:142` 连续 tool step 合组）→ `MessageBubbleZ.tsx:126` **`tool` 与 `toolGroup` 走同一张卡** → `ToolGroupCard.tsx:80`（常显头部：chevron + 工具名·摘要 + 「N 项」徽章 + 运行中 Loader/绿勾；展开才逐行；patch 类工具组下再挂常显 diff 卡）。
- **零工具 → 零卡片**（分支由 step 驱动，无 step 即无空壳）；渲染位置在 `MessageBubbleZ` 气泡层，**不碰打字机 / `extraData` 机制**（红线安全）。
- **唯一在流"她在动"信号 = 列表尾 `运行中…`**（`ChatPanelZ.tsx:865`），绑 `sending`——**该信号已被本仓判定为坏**（chat.md：#44 根因，`prompt_async` 1.4s 返回即消失）；**今天真正兜底的"她还在动"其实是工具卡上的 Loader**，隐藏工具即失去它。

**拍板**：

- **chat 页不新增任何工具类 UI**：不加"工具组隐藏层"、不加 kind 分支、不双形态维护信息层。**工具过程的可见性由单元 2 的 agent 工具白名单表达**（允许的工具 = 用户想看的"她做了什么"；不让的 = 工程噪音），信息层天然自洽，**零 UI 改动**。
- **长等待指示采用 B**：在**现有状态行位置上加动效**（三点脉动类），**不新增布局元素、不新增卡片**；**不显示工具名、不显示摘要、不可展开**。
- **前置依赖（必须与 B 同批做，否则 B 失效）**：**busy 源从 `sending` 换成真实信号**——SSE 仍有 delta 流入，或轮询 `session/status`（chat.md 已注明该字段实测准确、且明确"勿再用 sending"）。**禁止把动效挂在 `sending` 上**——否则 1.4s 后动效消失、她还在跑，观感比现状更差。该数据层修复顺带成为 **#44 排队重启的前置口子**（#44 若重启反正要换这个信号，不额外算成本）。
- **结果留痕仍走单元 1 原则**（§3.1）：约束用户的结果（建任务 / 存记忆）给一行轻量回执 chip；纯检索过程（websearch / 读记忆 / read·grep·glob）彻底无痕。二者叠加即"chat 里没有承载工程过程的 UI"。
- **chatcode 侧不动**（信息层 / diff 卡 / 工具展开全保留，chatcode 是工程工作台，判断依据仍是 `resolveConversationKind`）。

**被否 / 归档的备选**：

- **A（静态状态行文案）**：可用但观感最弱，用户拍板取 B 的动效形态；**A/B 的实际差别仅"静态 vs 动效"**（同位置、同触发、同依赖），非两套架构。
- **C（真·零痕迹）**：websearch 等长等待期间界面除打字机外无任何信号 → 观感最差，否。
- **"折进她自己的文字"**：**不可行**——websearch 期间尚无任何 text / reasoning part（`ThinkCard` 仅在有 reasoning part 时渲染，`message-merging.ts:129`），无字可折（提案阶段的表述失真，已纠正）。

**实现注意（E3 落地时）**：

- **agent 名单的硬编码坑（已核实）**：`ChatPanelZ.tsx:77` `FALLBACK_AGENTS = build/plan/design`，且 `:448` / `:453` 用它对 `listAgents()` 结果做**过滤**——**服务端新建 `companion` 后不改客户端名单，选择器不会出现它**。故"强制 companion"与"chat 侧去掉 agent 选择器"是**同一个落点**，一并做（另见单元 2 的强制接线）。
- B 的动效落在 `styles.statusRow`（`ChatPanelZ.tsx:865-869`）——该行同时承载「已停止」态，改动时勿覆盖中止语义。

### 3.8 清单④-2 chat UI 收敛·斜杠命令族去留 ✅

**现状（已调查，勿重复摸）**：两族，均无补全菜单 / 无可见命令表，只在 `send()` 里生效，用户不主动输入就完全不存在。

- **客户端拦截族**（`ChatPanelZ.tsx:662-673`）：`/assignments` → `pushDutiesCard`、`/projects` → `pushProjectsCard`，**不进 agent、不进队列、不产生 opencode 消息**，产出为 `LocalCardStep`（`localSteps` state，session 切换随 key remount 重置）。
- **任务命令族**（`parseAssignmentCommand`，`services/assignment/client.ts:251`）：`/assign`（remind / fund）、`/confirm`、`/reject`、`/revoke`、`/repair`、`/run-now`、`/skip`，直调 BFF 瞬时 API，**完全不进 agent**；反馈统一走 `showAlert("Assignment", feedback)`（`ChatPanelZ.tsx:684`）；busy 时也立即执行（独立瞬时调用，不排队）。

**拍板**：

1. **`/assignments` 退役**——理由：与单元 1 留痕 chip（§3.1）及出口②确认卡（§3.5）职责重合；伴侣页不该摆项目管理面板（违背 ⑤"不输出工程腔"）。**查看任务的正确路径 = 自然语言问她，她用只读工具答**（§3.5 已定）。
2. **`/projects` 退役**——理由：它的出口是"跳 chatcode"，而 ③ 已把这件事交给**移交卡**（§3.6，带项目候选选择、有移交语义）；`/projects` 卡是纯列表、无移交语义，属功能重叠。
3. **任务命令族保留语法，但降级为"不可发现的确定性后门"**——保留理由：它目前是**唯一确定性建任务通道**（不走模型、不看人品），而出口②是"NL → 她编译 → 确认卡"的多一层模型不确定性；在出口②实测稳定前不留后手风险偏高。降级含义：**无菜单、无提示、无补全、不写进帮助**，只有已知道语法的用户能触达。
4. **明确不做**：不为斜杠命令加自动补全 / 命令面板 / 帮助文案——若加了，等于把工程腔请回伴侣页，与第 3 条的"不可发现"直接矛盾。
5. **反馈形态改留痕 chip**：命令族的 `showAlert("Assignment", feedback)` 按单元 1 原则改为**一行轻量回执 chip**（这是"约束用户的结果"——建了任务/提案）；**不保留 Alert 弹窗**。此条是 §3.1 留痕原则在命令族的落点，**不是新增设计**。
6. **保留 `parseAssignmentCommand` 纯函数与单测**（`services/assignment/client.ts`）：**不从"程序化建任务"能力里摘除**——出口②（§3.5）与未来可能的程序化建任务都复用同一套指令/提案引擎。退役的只是 **chat 页的 UI 入口**，不是引擎能力。

**实现范围（E3，范围已只读核实）**：

- 删：`ChatPanelZ.send()` 里 `/assignments`、`/projects` 两个拦截分支；`pushDutiesCard` / `pushProjectsCard` / `refreshDutiesCard` / `handleDutyAction` / `cardBusyId` 及 `FALLBACK` 之外的相关回调随之成为死代码；`LocalCardStep`（`message-merging.ts:21`）的 `dutiesCard` / `projectsCard` 两个 kind；`MessageBubbleZ.tsx:132-147` 的卡片渲染分支；`DutiesCard.tsx` / `ProjectsCard.tsx` / `InnerCard.tsx` / `chat-cards.ts`（含 `buildDutyRows` / `buildProjectRows` 及 `chat-cards.test.ts`）；`onCardAction` / `onOpenProject` props。
- **引用核实（已做，勿重复摸）**：`openProject`（`ChatPanelZ.tsx:654`）**仅**被 Projects 卡链路使用（`MessageBubbleZ.tsx:142`），删卡即无引用；`InnerCard` **仅**被 DutiesCard / ProjectsCard 使用；`chat-cards` 的引用方全在上述待删清单内（含 `message-merging.ts:3` 的**类型 import**）。→ **三处均可整体删净，无外部牵连**。
- **保留**：`fetchAssignments` / `fetchAttentions`（`app/assignments.tsx` 与 assignment client 内部仍在用，**BFF 能力不动**）；`parseAssignmentCommand` + `executeAssignmentCommand`（出口②与未来程序化建任务复用）。
- **⚠️ 勿误删（易踩）**：`localSteps` 虽随卡片消失而成为空数组，但它参与 `listData = useMemo(() => [...display, ...localSteps], …)`（`ChatPanelZ.tsx:855`）并喂给 FlatList——**不要连 `listData` 一起删**，要么保留该 memo（空数组无害），要么把消费点改回 `display`，二者择一并验证渲染不回归（`extraData` 红线不受影响，但 FlatList `data` 身份变化需实测）。
- **不做迁移期兜底**：出口②确认卡未落地期间，用户失去"卡看任务"路径是有意的（改问即可），**不加过渡 UI**。
- **验证要点**：`pnpm test` 同步删 `chat-cards.test.ts`（勿留孤儿测试）；`parseAssignmentCommand` 单测（`services/assignment/client.test.ts`）**保留**。

### 3.9 清单⑤ companion prompt v0 要点 ✅

**范围声明**：本关只拍**要点**（方向与底线），**逐字措辞不在讨论范围**——动手时（E3）写，写完以本要点逐条验收。

**拍板（6 条要点）**：

1. **人格定位 = 认识你的同伴，不是助手**：说"我"、直呼你；**禁**"作为 AI 助手…""我可以帮您…"这类免责开场与能力推销；不解释自己的能力边界。
2. **中文为默认语言**；**不输出工程腔**——不主动报工具名（"我用 grep 查了…"）、不报文件路径除非必要、不用 markdown 待办清单来汇报进度。
3. **主动用记忆，但不炫耀记忆**：可自然引用（"你上次说…"）；**禁**每次开头复述记忆（那会让记忆系统本身变成噪音）。
4. **不知道就说不知道（用户拍板，本关底色）**——并把"不知道"与"敷衍"和"幻觉"三者切开：
   - **可达信息必须先查**：她手上有只读查询 + websearch。**不许**用"我不知道"跳过本可查证的事——能查就查，查完再答。
   - **诚实只用于真盲区**：查了没有 / 工具覆盖不到（如实时行情、用户私有日历、她上下文里没有的记忆）→ 明说不知道。
   - **禁止用不知道挡回能答的部分**：宁可"X 我不知道，但 Y 能确定"，不做一刀切式甩手。
   - **幻觉零容忍**：宁说不知道，**绝不编**。
   - **禁空转**：不说"已记下"而没真调 `memory_write`，不说"让我查"而没真查。
   - **边界**：单次工具失败 = 报失败 + 不编造结果，**不自动反复重试**（防死循环与噪音）。
5. **反 over-helpful**：能一句答完不写三段；不主动扩散话题（伴侣感 ≠ 话多）。
6. **移交摘要 = 格式约束而非模板**（并入 §3.6 的出口③待办）：**不写死"目标 / 边界 / 落点"三段标题**（会让她说话像填表），只要求**移交时必须说清这三件事**，措辞自由。→ §3.6 遗留项「摘要格式约束」**到此关闭**。

**⚠️ 离线态例外（勿与第 4 条冲突）**：运行时不可用时**按现有 companion 声音说话**（`services/runtime-presence.ts`：诚实说"我离线了"，含"记忆仍在"的安抚），**不让 502/ECONNREFUSED 等传输层报错替她说话**。这是既有实现，**保留不动**，并在 prompt 里避免与其措辞冲突。

**实现注意（E3）**：

- **prompt 分层须先只读核实**（动手时第一件事）：opencode **base system prompt** + 本 companion 人格层 + memx `instructions`（`~/.config/opencode/opencode.json` 注入 `USER.md` / `MEMORY.md` 索引）三层如何拼接、谁覆盖谁。**人格层需明确压掉 base 的工程语气**（base 默认倾向 markdown 清单、文件路径、待办汇报——正是第 2 条要禁的）。
- **与单元 2 一致**：只做 system prompt 注入，**逻辑留在 BFF / personal-context**（插件写薄，§3.2 设计约束）。
- **记忆可引用边界**：注入的是 `USER.md` + `MEMORY.md` 索引，故"主动用记忆"只能对**已在上下文里**的记忆生效——这正是第 4 条"真盲区"的典型场景，**不要**让 prompt 承诺"我记得所有事"。
- **验收方式**：按 6 条要点逐条构造对话样本验收（"不知道"样本必须包含"该查却没查"和"编造"两类反例）；措辞细节不在此关评审。

### 3.10 清单⑥ chatcode 抽屉入口 ✅

**现状（已调查，勿重复摸）**：`SessionsDrawer` 在 `ProjectChatZ` 里**早已全量接线**，chatcode 侧只差两个**条件**，无结构性缺口：

- `ProjectChatZ.tsx:139`：`{kind !== "chatcode" ? <Layers …/> : null}` —— **Layers 入口按钮**（真正的开关）。
- `ProjectChatZ.tsx:208`：`edgeGesture={kind !== "chatcode"}` —— 边缘右滑手势（注释原话："chatcode 侧仅挂抽屉不动边缘手势、无入口——待用户确认后再开"）。
- 配套已就绪（均**无需新增**）：`drawerOpen` state + `openPicker()`（`refreshSessions` → 开抽屉）；`sessions` 来源 = `listSessions(projectPath)`，**天然按当前项目过滤**（无跨项目串味）；`SessionsDrawer` 内部只做长度判断与遍历（`:170` / `:173`），无额外过滤。

**拍板（2026-10-08）**：

1. **chatcode 侧开 Layers 入口**（去掉 `:139` 的 kind 条件）。`resume-most-recent` **仍是默认行为**——不点 Layers 与今天完全一致，只多一个可选出口。
2. **边缘手势暂不开**（`edgeGesture` 保持 `kind !== "chatcode"`）——理由：chatcode 是长代码 / 工具输出滚动场景，左缘 24px 热区与滚动手势冲突体感代价更高；且抽屉**无热区也可用**（按钮可达）。将来若要，去掉该条件即可，**不构成决策负担**。
3. **§3.7 的"chatcode 侧不动"指信息层**（工具组 / diff 卡 / 伴侣化收敛不跨界），**不涵盖本项**——二者不冲突。

**推翻的旧判断（记录在案，勿再绕回）**：旧结论"chatcode 侧维持无入口、是否加待用户确认"。其"等真实使用证明需要"的论证**已被 ③（§3.6）改变**：一次移交 = 一个新 session，项目会话会**累积**，绑最新 session 会导致同项目旧会话不可达，而现状唯一出路是**离开 chatcode 去别处找会话**——比多点一下 Layers 更重。**故此项由"等需求"改为"直接开"。**

**反方意见（一并存档）**：维持 `resume-most-recent` 的**入口摩擦更低**（打开 chatcode 是要继续干活，选择器会打断）。成立前提是**默认行为不变**——本项已满足（不点 Layers 不受影响）。若实测体感是"每次被迫选会话"，**回退路径 = 恢复 `:139` 的 kind 条件**（单点回退，无副作用）。

**待用户真机验证（非本机可代劳，原因见 §8「验证能力边界」）**：chatcode 侧 Layers 按钮点击 → 抽屉列表内容正确（仅本项目会话）→ 切会话 / 新建生效；以及手势若将来开启时的左缘冲突。

### 3.11 清单⑦ 立项切片 ✅

**用户拍板记录**：① **E0 前置**（2026-10-08）；② **E1-a（本机 v1 插件摘除）与 v2 兼容记录放 backlog、先不做**（2026-10-08）；③ **E2 一度后置、当日改口恢复在队列内，名已定 = `homebase`**（2026-10-08，见下"E2 定稿"）。

**① umbrella epic × 1**：`chat 伴侣化（companion）`——正文 = §1 愿景 + §3 拍板集 + §6 队列；子项 = E0 / E2 / E3 / E4（E1 转为 §7 backlog 条目）。沿用现有 issue 流，**不新建项目板**。

**② 开工顺序（拍板后重排）**：

```
E0（只读探针，必须第一）
  → E2 homebase 改名迁移（名字已定；E4 等它的 personal-context 骨架）
  → E3-a agent 接线（依赖 E0 的 websearch 名 + E2 的路径/personal-context）
  → E3-b busy 信号 + 状态行动效      ┐ 可与 a/c 并行
  → E3-c ④-2 退役 + ⑥ 入口          ┘（E3-c 不依赖 E0/E2，可最先做）
  → E3-d 出口②③（② 有 assignment readiness 门；③ 含 BFF 两端点）
  → E4 v2 插件 + 出口①
```

- **关键路径 = E1 → E2 → E3 → E4**（2026-10-10 更新：E1 因"生产无 websearch"从 backlog 拉回队列首位；E0 已完成）。
- **E0 独立前置的理由（非杂务）**：其中「v1 有无 websearch」若为「无」，则单元 1 三类放行动作里的**"查"在 E3 会缺一条**（§3.2 已留此风险）→ 会**回头影响已拍结论**；故 E0 是**假设校验门**。
- **E4 前置 = E3-d 出口③ + E2**（`personal-context` 骨架落在 E2，E4 消费它）；**不再依赖 E1**（E1 后置）。
- **E3-c 可独立先行**：④-2 退役与 ⑥ 入口**不依赖 E0 / E2**（纯客户端收敛），是最安全的起手项。

**③ issue 级切片**：

| # | issue | 内容 | 门 / 依赖 |
|---|---|---|---|
| 1 | E0 开工前探针（只读） | §8 五个未确认事实：生产 opencode 是否装 memx / v1 有无 websearch / 本机 v2 的 websearch MCP 名 / assignment 引擎程序化建任务 API / `createSession({directory})` 未登记目录是否隐式产生 project | 无。**只读，禁写生产** |
| 2 | E2 homebase 改名迁移 | ① agent-mobile 侧引用清单更新（**11 处内**：`conversation-kind.ts:9` + 单测断言 2 处 + 4 个 e2e 脚本 8 处 + KB 文档）；② server 侧引用（systemd `WorkingDirectory` / opencode 配置 / 部署脚本）；③ GitHub 仓改名 `guraul/family-finance` → `homebase`；④ 服务器目录迁移；⑤ `personal-context` 包骨架落地 | 名字已定 = `homebase`。**④ 的"新目录路径"待用户确认**（默认 `homebase`） |
| 3 | E3-a companion agent 接线 | opencode agent 配置（白名单 + 禁 bash/edit/write）+ 客户端**强制 agent=companion**（`prompt_async` 逐条指定）；顺带 `ChatPanelZ.tsx:77` 名单与 chat 侧去选择器 | E0（websearch 名）+ **E2**（路径与 `personal-context` 就位） |
| 4 | E3-b busy 真实信号 + 状态行动效（④-1） | `sending` → SSE delta 或 `session/status`；状态行加动效；**零新增工具类 UI** | 无 |
| 5 | E3-c ④-2 退役 + ⑥ 入口 | 删 Duties/Projects 卡 + `chat-cards` + 单测 + `localSteps` 消费点；命令族反馈改留痕 chip；去掉 `ProjectChatZ.tsx:139` 的 kind 条件 | 无（**可最先做**） |
| 6 | E3-d 出口② | NL → 编译 → chat 内确认卡 → 写 assignment 引擎 | E0（assignment readiness 门，不 ready 先补口子） |
| 7 | E3-d 出口③ | 移交卡（新/既有分叉）+ 建项目 + 建 session + 投喂摘要 + **BFF 两端点**（handoff 存/取 + session status/最近消息只读）+ companion 只读回程工具 | E0、E3-a |
| 8 | E4 v2 插件 + 出口① | `personal-context` 存储/检索 + 插件薄壳（instructions 注入 + memory_read/search/write）+ 出口③ 的 memory 半边（顺序写死：建项目拿 slug → 写 memory → 建 session → 投喂） | E3-d 出口③ + **E2**（`personal-context` 骨架）。⚠️ 插件落地需 opencode v2 环境（本机已 v2），**生产仍是 v1**（E1 后置），故 E4 属"本机可开发、生产不可上线" |
| 9 | 归档（开工后第一批动作） | 关 `#31`/`#32`/`#33`/`#34`（工作已 merged：PR #36-#40 / #47，销账） | 无 |

**④ 归档与 backlog 归属**（详见 §7）：`#44` 排队 → backlog，**标注前置 = E3-b 的 busy 信号修复**（§3.7 已定该修复属 E3，等于先铺地基）；`#46` 抽屉 = E3-c 已含 chatcode 入口（`#34` 的 workspace 抽屉仍 backlog）；`#48`/`#50` 维持开放、不进本 epic。

**⑤ E2 定稿（名字已定 = `homebase`，本项已从 backlog 回到队列）**：

- **改口记录（防绕回）**：E2 于 2026-10-08 一度被用户后置，**同日改口恢复**——"e2还是做吧，名字就叫homebase"。理由与最初一致：避免"先开发后改名"造成的返工，且 `personal-context` 骨架是 E4 的前置。
- **改名清单（已只读核实，共 11 处内）**：
  - `conversation-kind.ts:9` `MARKET_TALK_DIRECTORY` + 其单测断言（**2 处**）；
  - 4 个 e2e 脚本 **8 处**：`scripts/e2e/phase13-e2e.mjs` / `phase9-e2e.mjs` / `pulse-e2e.mjs` / `v011-e2e.mjs`（读 `/root/project/family-finance/.env.local` 类路径，`pulse-e2e.mjs:312` 还有一处 `projectPath` 编码串）；
  - KB 文档多处（`router.md` / `OPERATIONS.md` / `ARCHITECTURE.md` / `API.md` / `DATA.md` / `INDEX.md` / `modules/services.md`）；
  - server 侧（**属 family-finance 仓，勿在 agent-mobile 里搜**）：systemd 单元 `WorkingDirectory`、opencode 配置、部署脚本。
- **GitHub**：`git@github.com:guraul/family-finance.git` → 改名为 `homebase`（**本机已有该 checkout**：`../family-finance`）。
  - **已核实（2026-10-10）**：`gh` 已登录 `guraul`，token scopes 含 **`repo`**（够改仓名）；仓 **private**、默认分支 `main`。**用户判定：服务器目录可以改，但"GitHub 也需要修改"——仓名与目录名一并改，不留双名。**
  - **⚠️ 改名涟漪（E2 实施时必须处理，勿漏）**：① 本机 `../family-finance` 的 `origin` 需改指新 URL；② 服务器 `/etc/systemd/system/bff-19234.service` 的 `Description` 与 `WorkingDirectory=/root/project/family-finance/packages/web`（**已实测命中 systemd 两行**）；③ 其他 clone 的 remote；④ 部署脚本中的仓名/路径。
  - **顺序建议**：先改 server 侧 systemd + 目录 → 再改 GitHub 仓名（GitHub 对旧 URL 有自动重定向窗口，故本地 remote 可稍后改，但**不要依赖重定向**）。
- **⚠️ 服务器目录迁移 = 已获用户同意**（2026-10-10）"服务器目录可以修改"；**默认落到 `/root/project/homebase`**。此前"是否随改"的待确认项**关闭**。
- **E2 回到关键路径首位（E0 之后）** → §3.3「改名前打针」的"路径只动一轮"目标**重新成立**；前一版"E2 后置 → 路径将改两轮"的记录**已作废**。

**⑥ 仍保留的后果（E1 后置的必然结果）**：

- **E4 交付物在生产上不可用**：E4（记忆插件）依赖 opencode **v2 插件 API**，而**生产仍是 v1**（E1-b 后置）。故 E4 完成后**只能在本机验证**，生产上线必须等 E1-b。**这不是缺陷，是顺序选择的必然结果**，实现时勿在 v1 生产上尝试装载 v2 插件。

## 4. 清单③ 出口三 切 chatcode ✅

已拍板，明细见 **§3.6**。原 ZCode 提案与 opencode 的三处修正（一律认同方向、只修成本与落地方式）均已并入 §3.6。

## 5. 待讨论清单（**七项全部拍板完毕——本清单已关闭**）

- **④-1 工具组隐藏程度**：✅ 已拍板（§3.7）——零新增工具类 UI + 长等待动效（方案 B）+ busy 真实信号前置修复。
- **④-2 斜杠命令族去留**：✅ 已拍板（§3.8）——`/assignments` + `/projects` 退役；任务命令族保留为"不可发现的确定性后门"+ 反馈改留痕 chip；不加补全/命令面板。
- **⑤ companion prompt v0 要点**：✅ 已拍板（§3.9）——6 条要点（同伴人格 / 中文无工程腔 / 主动用记忆不炫耀 / 不知道就说不知道 / 反 over-helpful / 移交摘要为格式约束）；**逐字措辞留待 E3 写，写完按要点验收**。§3.6 遗留的「摘要格式约束」随之关闭。
- **⑥ chatcode 抽屉入口**：✅ 已拍板（§3.10）——**开 Layers 入口**（去掉 `ProjectChatZ.tsx:139` 的 kind 条件）；**边缘手势暂不开**；旧判断"等真实使用"被 ③ 的会话累积效应推翻，已记录在案。
- **⑦ 立项切片**：✅ 已拍板（§3.11）——**E0 前置**；**E1 于 2026-10-10 从 backlog 拉回队列首位**（原"E1-a 后置"作废）；**E2 在队列（名 = `homebase`）**；**执行队列 = E1 → E2 → E3 → E4**。

## 6. 执行队列（讨论已收尾；**开工待用户明示**）

**下一步动作 = E1（生产升级链）→ E2 → E3 → E4**。**E0 已跑完（2026-10-10）；E0 触发的两项决策已于当日由用户拍板**（见下方「E0 决策① 结论」）。⚠️ **用户明确"先不要开工"**——决策已定，开工时点待用户单独明示。

**E0 决策① 结论（2026-10-10 用户拍板）：生产"查网" = 先升 v2 + 再配 exa MCP（两步都做，不是二选一）**
- **①-a 生产升级 v2**：白得 v2 原生 `websearch`；同时解掉"生产 model 已下线"的雷。
- **①-b 配 exa MCP**：`web_search_exa`（语义搜索）+ `web_fetch_exa`（正文抓取）。与内置 websearch **不是重复**：底座（v2 能力）+ 外挂（更强的语义检索/正文提取），互补。
- **①-c 生产 model 同窗口一并设为 `opencode/mimo-v2.6-flash-free`**（与客户端 `DEFAULT_MODEL` 一致，消除 #41 同源隐患）。
- **⚠️ 本关自我更正**：我原先给的 A/B/C/E 四个选项把"升级"与"配 exa"当成**互斥方案**，**框错了**——用户的处置是**叠加**（升级是地基、exa 是增强）。此更正留档，防止后续按旧选项讨论。

> **执行方式（2026-10-10 用户拍板，常驻规则）**：**E2 起的实现/执行类工作委派给 opencode 子代理**（DSH 四角色已 pin `opencode`），**模型 `opencode/space-bunny-free`（每次委派显式传参——`product_roles` 已核实角色库不 pin 模型）**；**DSH 只做编排 / 决策 / 验收**。产品讨论与 BRIEF / 知识库落档仍由 DSH 主模型直接做。规则全文见仓库 `AGENTS.md` 强制规定 11-13（family-finance 侧 6-8）。**模型不可用即停下报告，不降级。**

- **E0 · 开工前探针（只读，必须第一）**：**✅ 已完成 2026-10-10**，结论见 §8「E0 探针结论」。**只读执行，零写入**。两项决策已拍板（见上）。
- **E1 · 生产升级链 + exa（用户 2026-10-10 从 backlog 拉回，升至队列首位）**：
  - **E1-a · 生产升级 opencode v1 → v2**（v1.18.34 → v2.x）：**先摘插件**（生产有**两个**：`opencode-memx.ts` + `superpowers`）→ 升级 → 兼容验证（§3.3 清单）→ **回滚预案**。
  - **E1-b · 生产 model 修正**：`opencode.json` 内 agent 模型改为 `opencode/mimo-v2.6-flash-free`（消除已下线 `deepseek/deepseek-v4-flash` 隐患，与 #41 同源）。
  - **E1-c · 生产配 exa MCP**（`mcp.servers.exa` = remote `https://mcp.exa.ai/mcp`），验证 `web_search_exa` / `web_fetch_exa` 可用。
  - ⚠️ **前置未知**：**本机无 v1 环境可仿**（本机已 v2）→ v1→v2 的**真实升级路径与插件兼容性只能在生产窗口验证**；**升级前必须先在服务器做一次只读勘察**（当前 v1 的插件加载形态、DB 兼容性、回滚可行性）。**硬约束不变：测试只在本机做不了的部分，需用户批准后才在生产执行；受阻即停并告知，不降级不绕道。**
  - **v2 插件/内置能力事实**：v2 有 `plugin` 子命令（add/remove/list/check/update）+ 原生 `websearch`/`webfetch`；memx 需按 v2 插件 API 适配（属 E4）。
- **E2 · homebase 改名迁移**（**名字已定 = `homebase`**）：引用清单（§3.11 ⑤：agent-mobile 11 处内 + KB 文档 + server 侧 **systemd 两行已实测**）→ GitHub 仓改名 `guraul/family-finance` → `homebase`（**已获同意；gh scopes 含 repo**）→ 服务器目录迁移至 `/root/project/homebase`（**已获同意，路径确认**）→ `personal-context` 包骨架落地。
- **E3 · companion 主体**（**无记忆上线**）：
  - `E3-a` agent 配置（白名单 + 强制接线 + chat 侧去 agent 选择器）——依赖 E0（✅ 已答：本机 v2 原生 `websearch`；**生产 v1 无**，见 §8 E0 第 2 条）+ **E2**。⚠️ **必须显式配 `model`**：生产 `opencode.json` 的 agent 仍写已下线的 `deepseek/deepseek-v4-flash`（issue #41 同源），不显式配则新 agent 会 `ProviderModelNotFoundError` 且**无 error 气泡**（最隐蔽失败形态）。
  - `E3-b` busy 真实信号替换 `sending` + 状态行动效 B（§3.7）；**零新增工具类 UI**；顺带成为 #44 的前置地基。
  - `E3-c` 退役 `/assignments`+`/projects` 及其卡片/纯函数/单测（§3.8）+ ⑥ chatcode Layers 入口（§3.10）；**不依赖 E0/E2，可最先做**。
  - `E3-d` 出口②（**前置门：assignment 引擎 readiness**，不 ready 先补口子）+ 出口③（移交卡 + 建项目/会话 + 投喂摘要 + **BFF 两端点**：handoff 存/取 + session status/最近消息只读）。
  - `E3` 收尾另含：④-2 命令族 `showAlert` → 留痕 chip（与单元 1 原则同批）；真机验收由用户执行（原因见 §8「验证能力边界」）。
- **E4 · v2 插件 + 出口①**：`personal-context` 存储/检索 + 插件薄壳（instructions 注入 + memory_read/search/write）+ 出口③ 的 memory 半边（顺序写死：建项目拿 slug → 写 memory → 建 session → 投喂）。**依赖 E3-d 出口③ + E2**（`personal-context` 骨架）。⚠️ **属"本机可开发、生产不可上线"**：生产仍是 opencode v1，E4 依赖 v2 插件 API——**勿在 v1 生产上装 v2 插件**（后果见 §3.11 ⑥）。
- **归档批次（开工后第一批动作）**：关 `#31`/`#32`/`#33`/`#34`（工作已 merged，销账）。

## 7. Backlog 与旧遗留

**本次讨论后置项（含解锁条件——勿当"已否决"）**：

- **E1 · opencode 升级链** → ✅ **2026-10-10 已从 backlog 拉回队列首位**（用户拍板 E0 决策① 后）：
  - **原后置理由已作废**：当初后置是因"E1-a（本机摘 v1 插件）"要人确认且非急需；**E0 实测发现本机早已是 v2 且零插件（本机无对象）**，而**生产 v1 无 websearch 成为实际缺口** → 用户决定**直接升生产**。
  - **新范围见 §6 E1**（E1-a 升级 / E1-b model 修正 / E1-c 配 exa）。
  - **保留的硬约束**：**测试只在本机能做的部分在本机做；生产变更需用户批准后执行；受阻即停下告知，不绕道不降级**。⚠️ **本机无 v1 环境**（已 v2）→ v1→v2 升级路径**无法在本机预演**，这是本次升级链的最大未知，须先在服务器只读勘察。
- **E2 · homebase 改名迁移** → ✅ **在队列**（§6）。名字已定 = `homebase`；服务器路径 = `/root/project/homebase`（已确认）；清单见 §3.11 ⑤。

**Backlog（立项时落 issue，不逐条讨论）**：LangSmith 式可见性（dev trace 读 opencode session 数据）· 模型可配置 · 系统 prompt 可配置（对接 personal-context）· 记忆树挂 vault（实现另议）· #44 chat 排队（**前置 = E3-b busy 信号修复，该地基已由本次拍板铺定**）· **常驻"切 chatcode"按钮**（等真实使用证明需要，§3.6 点 2）· **移交的后台静默总结**（隔天回来移交旧对话；先给卡上"重新总结"按钮兜住，§3.6）· **`#34` workspace 抽屉**（#46 已交付 sessions 抽屉，workspace 另排）· **chatcode 边缘手势**（§3.10：抽屉入口已开，手势留待实测需要）。

**旧遗留归档（不讨论）**：K70 真机手势验证（用户任务）· #32 diff 卡 / #30 Failed-Missed 动作真机数据验证。**另：`#31`/`#32`/`#33`/`#34` 四个 issue 已 OPEN 但工作已 merged（PR #36-#40 / #47）——开工后第一批动作销账（§6）。**

## 8. 事实备忘（已摸清，勿重复调查）

**仓库 / 环境**：

- family-finance：已是 pnpm workspace（`packages/shared` + `packages/web` = BFF），根 package.json 名 `family-finance-monorepo`；BFF 由 `bff-19234.service` 托管；CORS 只放行 9928 三个 origin。
- agent-mobile：主应用在 `agent-mobile-app/`（Expo SDK 57 RN Web）；KB 路由见 `AGENTS.md`；聊天红线见 `docs/knowledge-base/modules/chat.md`。
- **服务器 = 生产**：勿在服务器跑测试 / scp / git（历史踩坑）。opencode 生产 **v1.18.34** @ `127.0.0.1:4096`（`opencode-4096.service`，WorkingDirectory=`/root/project`）；本机 macOS opencode **v2.0.26**（E0 实测）。

**代码事实（讨论依赖）**：

- `prompt_async` 支持逐条消息指定 agent（session 建后不可变）——companion 强制机制靠它。
- `autoSendContext` 现成：建 session + 自动发上下文首消息（Attention/Suggested 流程在用）。**出口③走的是更轻的 `autoContextText` 通道**（纯一条首条用户消息，无 engage 语义），**不用** attention 通道。
- assignment 引擎（Duties/补偿/投影）在 BFF——**✅ E0 已核实：程序化建任务 READY**（前门 = `POST /api/product/assignment-proposals`；直建口刻意禁用 405。详见下方 E0 结论第 5 条）。
- `MARKET_TALK_DIRECTORY = "/root/project/family-finance"`（`agent-mobile-app/src/services/conversation-kind.ts:9`）——改名牵连点（E2，§3.11 ⑤ 有清单）。**注**：若 E2 只改仓名而不改服务器目录，则此常量不动、agent-mobile 侧只需改 KB 文档——**这正是"服务器目录是否随改"必须确认的原因**。
- **项目 = opencode 的 worktree，无登记实体**：`opencode-client.ts:116` 只有 `getProject()`（`/project` → `{id, worktree}`），**无创建/登记接口**；`createSession` 吃裸 path 字符串。
- **memory 落点是 slug 不是 path**：`~/.opencode/projects/<slug>/.mem/*.md`——新项目建 session 前无 slug（出口③写 memory 顺序的根据）。

**未确认事实**：~~生产 opencode 是否已装 memx~~ **✅ 已装**；~~v1 有无 websearch~~ **✅ 无**；~~本机 v2 的 websearch 来源~~ **✅ 原生工具**；~~assignment 引擎程序化建任务 API~~ **✅ READY**；opencode `createSession({directory})` 未登记目录是否隐式产生 project **⚠️ 部分答复（第 6 条）**；**E2：服务器目录是否随仓名迁移为 `/root/project/homebase`**（§3.11 ⑤）**仍待用户定**。

**E0 探针结论（2026-10-10 执行；全程只读：本机文件/日志/sqlite `-readonly`、SSH 下 `cat`/`curl GET`；零写入）**：

1. **生产 opencode 已装 memx ✅**（"v1 先无记忆上线"的依据成立）
   - 生产版本 **1.18.34**（v1）；`~/.config/opencode/plugins/opencode-memx.ts` = `export { MemxPlugin } from "/root/project/opencode-memx/src/index"`。
   - 生产 `/config` 的 `plugin` 数组 = `["superpowers@git+https://github.com/obra/superpowers.git", "file:///root/.config/opencode/plugins/opencode-memx.ts"]`。
   - 记忆文件在注入：`~/.opencode/USER.md`（1256B）+ `~/.opencode/MEMORY.md`（2101B + 多个 `.bak`）+ `~/.opencode/projects/*/.mem/*.md`（已见 `root-project-agent-mobile` 等 slug）。
   - ⚠️ **E1 注意**：生产要摘的**不止 memx，还有 superpowers**（`plugin` 数组两个）；E1 重启时须一并决定 superpowers 去留。
2. **生产 v1 无 websearch ❌（本关最重要发现）**
   - 生产 `opencode.json` 中 `mcp` 与 `websearch` **零命中**；`/config` 输出**无 `mcp` 字段**。
   - → **单元 1 三类放行动作里的「查」，在生产（v1）无 websearch 可用**；本机 websearch 是 v2 能力，**v1 不具备**。
3. **本机 v2 的 websearch = 原生工具（不是 MCP）✅**
   - 本机 opencode **v2.0.26**（`~/.opencode/bin/opencode`）。
   - 日志实证 `message=evaluated permission=websearch pattern="..."` 多次（真实调用）→ **v2 原生 `websearch`**。
   - 另有 remote MCP `exa`（`https://mcp.exa.ai/mcp`；日志 `mcp connected server=exa tools=2`）。⚠️ **本机配置疑似结构错误**：写成 `"mcp": { "wiki-query": {...}, "servers": { "exa": {...} } }`——exa 被塞进 `servers` 键（`mcp.servers.exa`），而 `wiki-query` 是平级 `mcp.<id>`；exa 虽连上，**该结构是否被正式支持存疑**，E3 接线时按正统写法改（**属 E3，不在冻结期改**）。
   - `wiki-query` = llm-wiki 本地 MCP（`llm-wiki-mcp`，`tools=1`）。
4. **本机无 memx、无任何插件 ✅（E1-a 的一部分已自然完成）**
   - 本机 `"plugin": []`；`~/.config/opencode/plugins/` **不存在**；`opencode plugin list` = **No plugins found**；`~/.opencode/` 无 `USER.md`/`MEMORY.md`/`projects/`；`package.json` 仅留 `@opencode-ai/plugin: 1.4.6`（v1 残迹，无害）。
   - **对 E1 的含义**：原计划"先摘 v1 插件再升级"，而本机**已是 v2 且零插件**——本机"摘插件"**已无对象**；E1 重启后实际只剩**兼容测试 + 生产侧（摘 memx+superpowers / 升级 / 回滚）**。
5. **assignment 引擎程序化建任务 = READY ✅（E3-d 出口② 的前置门关闭）**
   - 前门：`POST /api/product/assignment-proposals`（`packages/web/app/api/product/assignment-proposals/route.ts:40`），body = `{mode, responsibility, domain, trigger, actionScope?, sessionId?, instructionRef?, createdBy?}` → 201 `{proposal, confirmation, assignment, duplicateOf}`。
   - **"activation 必须经 proposal/confirmation"是刻意设计**：`POST /api/product/assignments` 显式 **405**（`assignments/route.ts:36`，文案"propose via /api/product/assignment-proposals"）→ **无绕过授权的直建口，也不需要加**。
   - 引擎齐备：`assignmentService.propose/confirm/reject`（`assignment-service.ts:202`）；confirmation matrix **all-low → 直接激活**，否则停 proposed 等 `POST /:id/confirm`；`validateTriggerDefinition` + `isValidCron`；`findDuplicateActiveAssignment`；`registerAssignmentTrigger`。
   - → §3.5 出口② 前置门**可关闭**：链路已存在（客户端 `/assign` 命令族今天就走它）；E3-d 只需 companion 产出结构化规则 + 聊天内确认卡，**无需新增建任务接口**。
6. **`createSession({directory})` 未登记目录是否隐式产生 project：⚠️ 未定论（未做写测试）**
   - 证据：本机 `project` 表 21 行中 **20 行 `time_initialized` 为空**，含 `/Users/gubin/workspace/agent-mobile`、`/Users/gubin` 等未经"打开项目"流程的目录。
   - 但时序不一致：`agent-mobile` 的 project 建于 `1788569243` 而首个 session 为 `1791457315`（project 早约 33 天）；`/Users/gubin` 更反常 → **不能断定"建 session 即建 project"**。
   - **采用的替代（不依赖该假设）**：新项目分支取 slug **以 worktree/path 为准**（memory 落点本就是 slug）。E3-d 实现时用未登记目录跑一次端到端即可终验，**不必现在写测试**。
   - 另：本机 `project.id` = path 的哈希（21 行各异）——**勿把 worktree path 当 project id 用**。

**E1 生产勘察结论（2026-10-10，只读；⚠️ 发现 3 个阻断级风险，已同步 issue #53）**：

> **一句话：v1→v2 不是"换个二进制"，而是"BFF/App 契约重写 + 1.8G 库不可逆迁移 + 插件/配置重写"。**

- **R1（阻断）4 个 v1 专有路由在 v2 不存在**：BFF 用 `/global/event`（`packages/web/lib/opencode.ts:4` + `app/api/opencode/stream/route.ts:50` + `lib/product/opencode-tap.ts` 3 处）；App 用裸 `/session`、`/session/{id}/prompt_async`、`/config`、`/global/event`。v2 二进制实测：**`prompt_async` 0 命中**、无裸 `/session`、无裸 `/config`、无 `/global/*`，事件流改名 **`/api/event`**。→ **升级当天手机端聊天/发消息/项目列表 404、SSE 断流。**
- **R2（阻断）1.8 GB 库就地迁移且不可逆**：`opencode.db` = 1.8G（1877843968 B），session 100 / message 3938 / part 15871。v1 的 `migration` 表已 38 条（含 `20260622170816_reset_v2_session_state`），v2 需跑到 **49 条**并新建 **7 张表**（`session_v2`/`session_pending`/`worktree`/`instruction_entry`/`instruction_blob`/`kv`/`session_inbox`）；迁移含 **清空型**操作（`clear_v1_session_permission`）→ **回滚必须"二进制 + 数据库"一起，只回二进制不够。**
- **R3（高）配置键改名**：`plugin`→**`plugins`**、`agent`→**`agents`**、`provider`→**`providers`**（`instructions` 保留；`mcp` 为 `{servers:{…}}`）。生产用单数 `"plugin"` → v2 无此字段。
- **R4（高）memx 锁死 v1**：`@opencode-ai/plugin` **^1.18.12**，v1 插件 API（`event` hook `session.idle`/`session.deleted` + `tool.schema` + `client.session.messages`）；v2 插件 API **effect-schema 化**（`Config.Plugin.Entry` 变 `{package, options}`）→ 大概率不兼容，且**加载失败可能拖垮整条插件链**。
- **R5（中）** 生产 agent model 仍为已下线的 `deepseek/deepseek-v4-flash`（v2 schema 更严 → 可能启动即失败）。**R6（中）** systemd `ExecStart` 指向 `/usr/lib/node_modules/opencode-ai/bin/opencode.exe` → 换安装方式（curl/bun）会让 systemd 起不来。**R7（中）无回滚物料**：`~/.npm/_cacache` 不存在、无旧二进制备份 → 回滚只能联网；`npm pack opencode-ai@1.18.34` 可作回滚物料。**R8（低）** npm 慢（25MB 8s 未传完），v2 二进制 ~190MB。
- **✅ 好消息**：**exa MCP 端点可达**（`https://mcp.exa.ai/mcp` → 405，GET 不允许 = MCP 只收 POST，符合预期）；npm registry 可达；**磁盘可用 22G**（40G 用 17G）足够快照；v2 保留 `message.part.delta` / `session.*` 事件名，与 BFF `createDeltaBuffer` 假设一致；v2 有 `/api/experimental/migration/v1`。
- **建议路径（未获批不执行）**：① 同服务器**不同端口 + DB 副本**起 v2 实例做**契约验证**（`/api/session/{id}/prompt` 是否等价 `prompt_async` 的 204 异步、`/api/event` 帧格式）→ ② DB **三件套快照 + 还原演练** → ③ 配置键迁移 + memx 适配或短期停用 → ④ 保持 npm 安装方式（不动 systemd 路径）→ ⑤ `npm pack` 存回滚物料。
- **只读无法确认（须实测）**：`/api/session/{id}/prompt` 的异步语义；v2 是否留旧路由别名；`/api/event` 帧封装格式；memx 在 v2 的加载行为；1.8G 库迁移耗时与成败。
- **⚠️ 对排期的影响**：R1 使 **E1 从"运维动作"升级为"BFF + App 契约改造"** → E1 体量显著变大，且**生产升级前必须先有契约验证环境**。E3-a（#57）与 E3-d2（#61）依赖 E1，随之顺延。

**E1 契约验证结论（2026-10-10，源码级；已拿到 v2.0.26 源码 `~/workspace/opencode-src`）**：

> **权威依据 = v2.0.26 tag 源码**（`packages/protocol/src/groups/{session,event}.ts`、`packages/schema/src/{prompt-input,location}.ts`），非二进制猜测。v1 形状由 App 代码实证（`opencode-client.ts:224` + `opencode-events.ts:118`）。

| 能力 | v1（现状，App/BFF 在用） | v2.0.26（目标） | 改造量 |
|---|---|---|---|
| **建 session** | `POST /session`，吃裸 `{directory}` | `POST /api/session`，`location: {directory}`（`Location.PublicRef`，**directory 必填**）；另有 `agent` / `model` / `permissions` / `parentID` | 路径 + 参数名改；**新增能力：建 session 时即可带 agent/model** |
| **发消息** | `POST /session/{id}/prompt_async`，body `{parts:[{type:"text",…}], agent, model}`，**204 立即返回**（异步语义） | `POST /api/session/{id}/prompt`，body `{text: string, agents?: [{name}], files?, skills?, id?, delivery?, resume?}`，**200 + `{data: SessionInbox.User}`**（durable admit） | **重大**：`parts`→`text`；`agent` 字符串→`agents` 数组 |
| **逐条指定 agent/model** | `prompt_async` body 里逐条传 `agent` + `model` | ⚠️ **prompt 载荷里没有 model**；模型改由 **`POST /api/session/{id}/model {model}`**（"Switch session model"，影响后续 turn）或建 session 时的 `model`；`agents[]` 是**提及式附件**（`{name, mention?}`），非会话选择器 | **改变了 §3.2 的强制机制**（见下） |
| **事件流** | `GET /global/event`（App `opencode-events.ts:118`；BFF `stream/route.ts:50` + `opencode-tap.ts` 3 处） | `GET /api/event`（"native events + plugin RPC across all server locations"），SSE `StreamSse(data: V2Event)` | 路径改；**慢消费者会溢出断流、断连期间事件丢失**（v2 明示 volatile 契约） |
| **事件帧** | `{properties: {...}}` 包装 + 裸 `type` | `{id, created, metadata?, type, location, data}`；`message.part.delta` **仅存在于 `schema/src/v1/` 兼容层** | **帧格式与字段全部不同** → BFF `createDeltaBuffer` / App 打字机解析要改 |
| **配置** | `GET /config` | `GET /api/config` | 路径改 |
| **路由前缀** | 无前缀 | **全部 `/api/*`** | 全量 |

**⚠️ 对已拍板决策的影响（E3-a 强制机制要改）**：
- 单元 2 拍的是"**逐条消息指定 agent=companion**"（`prompt_async` 支持逐条 agent）。**v2 的 prompt 端点不再接受 model、`agents[]` 语义也不是选择器** → 强制方式改为 **建 session 时定 agent/model（`POST /api/session` 带 `agent`+`model`）**；模型切换另有 `POST /api/session/{id}/model`。
- **这不是推翻意图，是换实现**：chat 页会话本就由 `resolveConversationKind` 分流 → **建 session 时就能确定 kind，天然适合"建时定 agent"**，比"逐条传"更稳。
- **同族影响**：UI 的 agent 循环切换 + `agent-sheet` 在 v2 下应改为调 `POST /api/session/{id}/model`（chatcode 侧）；chat 侧则完全去掉选择器（与 §3.2 一致）。

**✅ 好消息（可行性）**：`/api/event` 的 SSE 仍是标准 `text/event-stream`；`session.create` 原生支持 `agent`/`model`（E3-a 反而更简单）；exa MCP 端点运维侧可达（405 探测）；v2 有 `/api/experimental/migration/v1`。

**仍须实测**：① `/api/session/{id}/prompt` 的 200 返回是否**立即**（durable admit 语义暗示不阻塞 agent loop，与 `prompt_async` 的"不等跑完"一致，但未实测）；② `message.part.delta` 在 v2 运行时是否真的发出（源码只在 v1 兼容层见到）；③ v1→v2 迁移 1.8G 库的耗时与成败。

**DSH 指令机制实况（2026-10-10 实测，回答"DSH 的 AGENTS.md 在哪里 / 有没有全局的"）**：

- **运行环境证据**：`DSH_HOME=/Users/gubin/.dsh`、`DSH_PROFILE=web`、`DSH_PROFILE_DIR=/Users/gubin/.dsh/profiles/web`、`DSH_SESSION_ID=session-2a9a04b3-…`、`DSH_WEB_URL=http://127.0.0.1:3080`。
- **结论一：没有全局 AGENTS.md**。`~/.dsh/` 下**没有任何 `.md` 文件**（`find ~/.dsh -maxdepth 3 -name "*.md"` 为空）；`~/AGENTS.md`、`~/.config/AGENTS.md` 均不存在；`@deepseek-ai/dsh` 包与 `profiles/web` 里**搜不到 `AGENTS.md` / `CLAUDE.md` / `instructions` 字符串**（0 命中）。→ **DSH 没有"全局指令文件"这一层**，只有**工作区级**的 AGENTS.md。
- **结论二：工作区级是"按文件发现"，非"仅 git 根"**。本会话加载了三份：工作区根 `agent-mobile/AGENTS.md`、**嵌套的 `agent-mobile-app/AGENTS.md`**（该目录另有 `CLAUDE.md`，内容为 `@AGENTS.md` → DSH 把 CLAUDE.md 显示为"引用 AGENTS.md"）。而 `~/workspace/AGENTS.md`、`~/AGENTS.md` **不存在** → **上级目录不会兜底**。
- **结论三：注入是"提醒式"而非"一次性"**。文件被改动后，DSH 会在下一轮**重新注入全文**并声明"Use the following content instead of the previously loaded instructions"（本会话实测：`agent-mobile/AGENTS.md` 被我改后立即重注入）。
- **未定论（⚠️ 别当结论用）**：**我无法定位注入逻辑的代码**——`dsh` 包为薄加载器（lib 仅 `bin.js`/`profile-boot`/`dump-config` 等），且上述字符串 0 命中，**可能来自 host/client 侧或运行时动态构造**。故"发现规则"（是否只认 git 根、是否读 `CLAUDE.md`/其他文件名、优先级与深度上限）**未经代码验证**，仅由上述三条观测推断。
- **实用推论**：跨全部工作区生效的常驻规则，目前**没有安全落点**（既不可放 `~/AGENTS.md`——不存在且行为未验证；也没有 DSH 全局文件）。可行选项：① 每个仓库各写一份（现状）；② 让用户确认后新建并验证 `~/workspace/AGENTS.md` 或 `~/AGENTS.md` 是否被加载；③ 放 DSH profile 配置。**在验证前不要宣称某种全局写法有效。**
- **对子代理的影响（重要）**：角色 JSON 的 `instructions` 是**唯一**发往远端 product 的指令来源，**它不读工作区 AGENTS.md**（已核实）→ 委派时必须把约束写进 task 文本。

**MCP 配置形态（2026-10-10 核实，含一处对前轮结论的更正）**：

- **本机 `~/.config/opencode/opencode.json` 实况**：`exa`（remote `https://mcp.exa.ai/mcp`）+ `wiki-query`（local，llm-wiki MCP）。
- **`mcp.servers.<name>` 是 v2 规范形态**（v2 schema 里 `mcp` 的合法子键只有 `servers` 与 `timeout`）；**直接 `mcp.<name>` 是 v1 遗留写法**，v2 仍兼容迁移。故本机配置是**新旧混用**：`exa` 新写法（`mcp.servers.exa`）、`wiki-query` 遗留平铺（`mcp.wiki-query`）——**两者都可用**，建议将来统一为 `mcp.servers.*`（纯形态统一，非必需）。
  - ⚠️ **更正**：前轮我写"本机配置疑似结构错误、E3 要按正统写法改"——**该结论错误**。`mcp.servers.exa` 恰恰是规范写法；**无结构错误，该项从 E3 待办中撤销**。
- **只读验证命令（留档，勿重复摸索）**：`opencode mcp list`（`✓ exa connected` / `✓ wiki-query connected`，**两者都以顶层名显示** → 反证 `servers` 是容器而非服务器名）；`opencode api GET /api/mcp`（返回 name/status/integrationID）；`opencode debug config`（**只列配置来源，不展示解析后的 mcp 块**）；`opencode debug` 仅 `agents`/`config`/`paths` 三个子命令。
- **exa 的两个工具 = `web_search_exa`（语义搜索）/ `web_fetch_exa`（读 URL 正文，Markdown）**。命名形态：Code Mode 默认开启 → `tools.exa.web_search_exa`；扁平形态为 `<server>_<tool>`（用 `wiki-query` 反证：part 表实际调用名 `wiki-query_search_wiki` ↔ MCP 原名 `search_wiki`）。工具目录可从 `opencode.db` 的 `instruction_blob` 表只读查出（exa 未在该快照的前 12 条 namespace 内，但 `exa count=2` 与日志 `tools=2` 吻合）。
- **对 E0 决策① 的意义**：exa 是**标准 remote MCP**（非 v2 专属），**v1 理论上同样可配** → 「给生产 v1 配 exa（B 方案）」的可行性**比我原先判断的更确定**（生产 v1 已有 `plugins/` 目录，说明该版支持扩展）。**但"v1 确实能加载 remote MCP"未在本机实测过**（本机只有 v2），若要选 B，应在生产变更窗口内以一次只读验证先行确认。



**验证能力边界（2026-10-08 opencode 实测，勿再问"为什么真机验证要用户做"）**：

- **本机 = macOS x86_64**（`Darwin gubindeMacBook-Pro.local 21.6.0 x86_64`），**不是** `agent-mobile-app/AGENTS.md`「BROWSER AUTOMATION」段原所写的 Linux 服务器。⚠️ **该段已更正（2026-10-10）**：原 chromium 路径 `chromium_headless_shell-1228`、依赖目录 `~/.claude/skills/playwright-skill/` 在本机**均不存在**；现文档已对齐 `~/.agents/skills/playwright-skill`（DSH 扫描区，实测存在、含 `run.js`）。
- **无任何可用的真实触摸环境**：`xcrun simctl` 不可用（无 Xcode Command Line Tools → **iOS Simulator 起不来**）；`adb` 可用但**设备列表为空**（无实机、无已起 Android 模拟器）。
- **Playwright 链路不完整**：`~/.cache/ms-playwright` 不存在（无自带 chromium）；`agent-mobile-app/node_modules/.bin` 内**只有 `playwright-core`**（无 `playwright` CLI，不能 `playwright install`）。
- **故以下做不了**（**换任何机器也都做不了真机项——物理设备是硬缺口，非环境问题**）：K70 真机手势验证、真机左右缘手势冲突、iOS Simulator 触屏；也无法运行 chat.md 记载的 CDP touch 方案（`hasTouch:true` + CDP 触摸模拟，"最接近真机"的替代**恰恰依赖那个不存在的 ms-playwright chromium**）。
- **能做**：`pnpm exec tsc --noEmit`、`pnpm test`（vitest 纯逻辑）、只读代码/文档核对。**可能有条件能做（需用户另行批准，本讨论冻结期不做）**：`playwright-core` 指向本机 `/Applications/Google Chrome.app` 跑 `hasTouch` + CDP touch 的触摸模拟 E2E——**但需自装驱动依赖，且结论可信度低于真机**（CDP 触摸 ≠ 真实触摸上报；#34F 已实测该环境下合成事件对 RN Web 手势不可靠）。
- **真机验证唯一路径 = 用户持实体设备（K70）执行**；**禁止**把服务器（= 生产）当测试机（§8 服务器即生产 / §6 E1 硬约束）。

**委派执行方式（2026-10-10 用户拍板落档）**：

- 见 §6 顶部「执行方式」指针——四角色已 pin `opencode`（生效配置在 `~/.dsh/profiles/web/roles/*.json`；插件仓库里的 `roles/*.json` 是默认值 claude-code，**不是生效那份**），**模型每次显式传 `opencode/space-bunny-free`**。
- ⚠️ **子代理看不到本 BRIEF、也看不到仓库 `AGENTS.md`**：角色 JSON 的 `instructions` 字段（发往远端 product 的指令）**不读工作区文件**（已核实）。故**每次委派必须在 task 文本里显式带上相关约束**（模型规则、不降级、不改依赖、读写权限、验收方式），否则子代理无从知晓。
- **首次实测（2026-10-10）**：`explore` 角色 + 显式 model 委派成功——registry 回读 `model: opencode/space-bunny-free` 已 pin；remote session 消息记录 `"agent":"build"`、`"model":{"id":"space-bunny-free","providerID":"opencode"}`；产出结论质量可接受（自带证据链）。**注意 `product_wait` 默认 180s 会超时但任务仍在跑**（DB 持续写入 reasoning），**不能据超时判定失败**。

## 9. 沟通与协作

- 中文；一次只讨论一个议题；拍板式推进（用户逐单元给"认 / 不认 + 修正"）。
- **用户要真实意见**：不要附和，不同意要给理由和替代方案。
- **冻结解除条件已满足**（阶段一七项讨论全部收尾；**E0 探针亦已完成**）；**可写类工作仍等用户明示**——当前卡在 **E0 触发的两项决策**（① 生产"查网"路线 A/B/C/E；② 生产 model 下线是否同窗口修）。
- 勿动 `docs/newdesign/`（用户活跃编辑区）。
