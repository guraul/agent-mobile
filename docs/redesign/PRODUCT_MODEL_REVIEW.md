# PRODUCT_MODEL_REVIEW.md —— Product Model 与当前实现的代码对照审查

> 审查日期：2026-09-05
> 审查对象：`docs/redesign/PRODUCT_MODEL.md`（2000 行版本）
> 代码基线：agent-mobile @ `0af5829` · family-finance（BFF）@ `2c38301`（含 `/api/events/stream` + ack 最新提交）
> 运行时侧关联工程（本轮一并核实）：`opencode-memx`（Memory 插件）· `llm-wiki`（KB skill）· `llm-wiki-mcp`（wiki 查询 MCP）
> 审查方法：以实际代码为唯一依据判断"当前实现是什么"；文档描述不作为实现存在的证据。所有结论均给出 `文件:行号` 证据。

---

## A. Executive Summary

**结论：Product Model 基本成立，且与当前 Chat-first MVP 的边界自洽；当前代码实现了模型的"交互式 Vibe Coding + 项目导航 + 市场事件提醒"骨架，但模型的核心增量概念（Agent Session 实体、Event/Attention 对象层、Assignment、Talk 入口、Open Thread / Raw Idea）几乎全部未实现。可以进入 implementation phase，但必须先补两个 P0。**

当前实现中值得肯定的对齐（均经代码核实）：

- **Resume 优先的会话进入**：项目聊天自动恢复最近会话（`ProjectChatZ.tsx:48-64`），Create 只存在于显式"New session"按钮（`ProjectChatZ.tsx:66-76`）；全仓库无一处多余 `createSession` 调用，也没有"为加载 Wiki/Memory 而建新 Session"的逻辑。
- **Market 不依赖 Agent 运行**：调度器 + 确定性规则（估净 > 目标净值）独立执行（BFF `scheduler/handlers/fund-estimation.ts:44-52`），完全符合模型 §32"不要强迫 Market scheduler 变成 Agent"。
- **Event 与 Attention 的事实分层**：`fund.estimate`（每 5s，信息性行情，只进跑马灯）与 `fund.trade-alert`（规则命中，升级 Needs you）在代码里就是两类事件两种待遇，与模型 §15/§16 的区分一致。
- **Pulse 无常驻输入**：Pulse 首页没有 generic chat input，对话输入只存在于项目聊天 sheet 内，符合模型 §23。

最大的问题（按严重度）：

1. **`idle` 被实现为 Attention（P0，唯一硬性违背）**：`project-status.ts:73-77` 把"任何已知 idle 的会话"直接判为 `needs-you`（"Agent is waiting for your input"）。交互式 Vibe Coding 每轮对话结束后 agent 必然 idle，于是当天聊过一次的项目会整天挂在"Needs you"分区。这正是审查要点九要验证的"idle ≠ Attention"违背，且它淹没了唯一真实的 coding 域 Attention（pending permission）。
2. **缺少 Event/Attention 对象层（P0）**：Attention 只以两种派生态存在——项目状态判定（计算结果，非存储对象）和基金提醒（BFF 内存中每类型仅保留最近一条 + 前端 state）。没有可挂 seen / handled / dismissed / expiration / [Let's talk] 的实体，模型 §36 MVP 闭环的后半段（Attention → Pulse → engagement → Talk）无法在派生态上构建。
3. **Talk 面板缺失（P1）**：Talk tab 是占位页（`talk.tsx:3-5`，"Coming soon"）。Direct Talk 完全未实现；Market Attention 也没有任何进入对话的路径（基金 sheet 只有"确认处理"ack 按钮）。当前唯一对话入口是"项目 → 自动恢复最近会话"。
4. **Assignment 层缺失（P1）**：无 Assignment 对象/存储/生命周期，无 one-shot 与 ongoing 之分；运行时的 opencode permission 机制（once/always/reject）是逐操作审批，与模型 §12"自主性来自 Assignment 授权"不是同一层——实践中自主性当前来自 runtime 权限授予，而非 Assignment。
5. **文档与证据不符的一处**：PRODUCT_MODEL.md:330 与 :1984 声称"当前实现使用 Memory 插件"。经核实：`opencode-memx` 插件**代码真实存在**（双轨记忆、session.idle 触发、静默写入、`instructions` 自动注入），但**当前与 agent-mobile / BFF 运行链路无任何集成**（无代码依赖，应用侧 Memory tab 为占位页）。它是独立的运行时侧工程，"MVP 可以使用"成立，"当前实现使用"言过其实。

**是否可进入实现阶段**：可以。模型无需重写；建议按 G 节顺序先落地 P0-1/P0-2（一个工作项，见 H 节），再谈 Talk 与 Assignment。

---

## B. Product Model → Current Implementation Mapping

状态标记：✅ 已实现 · 🟡 部分实现 · ❌ 未实现（Not Implemented）

| Concept | Product Model | Current Implementation | Status | Gap |
| ------- | ------------- | ---------------------- | ------ | --- |
| **Agent Session** | 产品层"有界的对话工作区"（§4），承载当前意图/topic/上下文关联 | **无此对象**。UI 与状态直接以 OpenCode Session 为工作区（按 `session.id` 打开聊天、按 `directory` 分组项目）。没有 topic、元数据、关联挂载点 | ❌（隐式存在：OpenCode Session 事实上扮演了 Agent Session） | 无产品层实体 → Assignment / Open Thread / Attention 无处引用 session 之外的对象 |
| **OpenCode Session** | runtime 会话表示，1:1 支撑 Agent Session（§4.1） | `opencode-client.ts:120-158` 完整对接 `/session` CRUD + `prompt_async`；会话持久化在 opencode server | ✅ | 无 |
| **Create** | 新 Agent Session + 新 runtime session（§4.2） | 仅一个显式入口：ProjectChatZ "New session" 按钮 → `createSession({directory})`（`ProjectChatZ.tsx:66-76`） | 🟡 | Create 时无 context 注入机制（无 system prompt / 首条消息注入 KB·Memory·领域上下文的代码）；无 Direct Talk 场景的自动 Create |
| **Resume** | 恢复既有 Session 及其 runtime context（§4.2） | 项目聊天 `resolve()` 自动打开最近会话（`ProjectChatZ.tsx:48-64`）+ 会话 picker 手动切换（`:134-171`）+ ChatPanel `listMessages` 恢复上下文 | ✅ | 无跨项目的全局会话列表（只能按项目进入）；"最近"按 `time.updated` 排序，未来 Attention 指向特定（非最近）session 时会错位 |
| **Reconstruct** | 旧上下文提取 + KB + Memory + 摘要 → 新 Session（§4.2） | 无任何实现（无摘要提取、无 KB/Memory 注入新会话的代码路径） | ❌ | 纯设计概念。实现前提是一个 context 注入机制（当前 opencode API 使用面内不存在） |
| **Direct Talk** | 用户主动进入 → 新 Agent Session（§8.1） | Talk tab 为占位页：`talk.tsx:3-5` `<PlaceholderScreen title="Talk" />`（"Coming soon"） | ❌ | 产品四大 surface 之一整体缺失；当前唯一聊天入口是项目 → 自动 Resume |
| **Contextual Talk（来自 OpenCode）** | Pulse Attention → Resume 既有 Session（§8.2） | Pulse 项目条目 → BottomSheet → ProjectChatZ 自动恢复最近会话 | 🟡 | 机制正确（Resume），但入口语义是"项目导航"而非"回应 Attention"：无 [Let's talk] 按钮、无 Attention 关联，且 Pulse 上没有独立的 Talk 语义 |
| **Contextual Talk（来自 Market）** | 无 Agent Session → Create + Market context + KB + Memory（§8.2/§32） | `fund.trade-alert` → 基金数据 sheet（估值/目标/超出%），唯一动作是"确认处理"（ack）。**无任何进入对话的路径** | ❌ | 缺 [Let's talk] → `createSession` + 上下文注入的整条链路 |
| **Assignment** | Agent 明确接受并承担的责任，one-shot / ongoing 两种 mode（§10/§11） | 无对象、无存储、无创建流程、无 /loop /goal。BFF scheduler job 是 seed 配置进 SQLite（`scheduler/store.ts:147`，`50 14 * * 1-5`），由运维配置而非对话产生 | ❌ | 模型核心增量概念，整体缺失 |
| **Event** | 关于"发生了什么"的事实（§15） | 有事件**通道**（opencode SSE `opencode-events.ts`；BFF 事件流 `events/publisher.ts`），无事件**实体**：publisher 每类型仅保留最近一条（`lastEvents` Map），无历史、不可查询 | 🟡 | 事件不可追溯；无"Event → 是否成为 Attention"的规则层（基金规则在 handler 内硬编码） |
| **Attention** | "正在等待用户处理"的对象（§16/§17），有 OPEN/IN PROGRESS/RESOLVED/DISMISSED 生命周期 | 两个来源：① 项目 `needs-you`（由 pending permission **或 idle** 派生，纯计算态，非存储对象）；② `fund.trade-alert`（BFF 内存 last-event + 前端 `alert` state + ack 清除） | 🟡 | ① idle 误判为 Attention（**P0，见 F/E 节**）；② 无生命周期状态、无 expiry、seen/handled 未区分、单槽位（新提醒覆盖旧提醒）、BFF 重启即丢 |
| **Pulse** | Agent 说话的主动面，"什么值得你现在注意"，非 neutral dashboard（§20） | 现状是中性状态面板：分组列表（EventItem/StatusPill）+ 基金跑马灯 + 静态 presence 一句 "I'm here. Watching your projects."（`index.tsx:157-170`）。无 agent 第一人称表达、无 briefing、无 L1/L2/L3 交互分级 | 🟡 | 与模型 §20 的方向相反——现状恰是模型明确反对的 dashboard 形态（虽是派生态而非原始事件流，算是半个缓解）。第一人称事件文案只存在于无引用的设计期 mock（`src/screens/events.ts`，已验证无 import） |
| **Open Thread** | 值得以后继续的未完成对话，指向既有 Session，默认 Resume（§24/§25） | 无任何实现 | ❌ | 纯设计概念 |
| **Raw Idea** | 值得保存、不需行动的想法 → KB（§27） | 无产品概念/流程。llm-wiki 技术上可承载，但应用侧无任何保存/检索入口 | ❌ | 纯设计概念 |
| **Memory** | 用户偏好/工作方式/关系级理解的持久层（§6），以 OpenCode 插件静默记录 | `opencode-memx` 插件独立存在且设计与模型描述吻合（双轨：USER.md 用户风格 / 项目 .mem；`session.idle`/`reflect` 触发；静默自动写入+备份；`instructions` 开场注入 system prompt）。**但与 agent-mobile / BFF 无集成**：应用无 Memory 读写，Memory tab 为占位页（`memory.tsx:3-5`） | 🟡（运行时侧有码，产品面 ❌） | 应用侧零集成；模型"当前实现使用"的表述强于事实 |
| **Knowledge Base** | 持久世界/项目知识，Agent 以 capability 方式按需检索（§5） | `llm-wiki` skill（知识编译式维护）+ `llm-wiki-mcp`（`search_wiki` 工具，minisearch+nodejieba 全文检索 vault）均已存在并注册于 opencode 配置。**但仅运行时侧可用**：只有跑在装了 skill/MCP 的机器上的 opencode 会话能访问；agent-mobile 应用无 KB 界面/检索/写入 | 🟡（运行时侧有码，产品面 ❌） | 与 Memory 同理；模型 §5"以 capability 访问"的机制成立，但覆盖面限于 runtime |
| **Market** | scheduler + 确定性规则直接执行，不需要 Agent Session（§32/§17 边界） | BFF 调度引擎（@breejs/later，cron 存储 SQLite）+ 规则 `估净 > 目标净值`（`fund-estimation.ts:44-52`）+ 通知（email/企微/微信）+ `publish(FUND_TRADE_ALERT)` + SSE 推送 + ack 端点。全链路无 opencode 参与 | ✅ | 提醒产生被 gate 在"通知通道成功"上（`fund-estimation.ts:76-88`：全部通道失败则 throw，事件不发）；无 expiry；无 →Talk 路径 |
| **Project Chat（Vibe Coding）** | 高频短反馈的交互式对话（审查要点四的边界） | ChatPanelZ/ProjectChatZ 完整实现：打字机、agent/model 切换、question 工具弹窗（`ChatPanelZ.tsx:738-787`）、permission 审批弹窗（`:789-815`）、abort | ✅ | 实现良好；问题不在 chat 本身，而在 Pulse 把它的 idle 终态当成了 Attention（见 P0-1） |

---

## C. Session Lifecycle Analysis

**1. Create 是否清晰？**

清晰但单薄。代码中 Create 只有一个入口——用户在项目聊天空态/picker 里显式点"New session"（`ProjectChatZ.tsx:66-76`），无任何自动/隐式建会话路径。这与模型 §4.2 的 Create 定义一致。缺口有二：(a) Create 时没有上下文注入机制——模型 §7"新 Session + Market context + KB + Memory"的 Create 变体目前无法表达；(b) Create 的产品语义（什么算"新对话"）挂在 Talk 缺席的状态下，暂由项目维度代管。

**2. Resume 是否清晰？**

清晰，且是事实上的默认行为。`ProjectChatZ.resolve()` 自动恢复该项目最近活跃的会话（按 `time.updated` 降序取第一个），会话 picker 可切换到任意历史会话，消息上下文经 `listMessages` 完整恢复——这正是模型"Resume 保留原 conversation/runtime context"的实现。**没有把 Reconstruct 错当 Resume 的地方**。潜在风险：排序依据是"最近更新"而非"Attention 指向"，将来 Attention 关联到特定旧会话时，auto-resume 会开错会话——这要在 Attention 对象落地时一并解决（Attention 携带 sessionId）。

**3. Reconstruct 是否清晰？**

模型定义清晰（§4.2：旧上下文提取 + KB + Memory + 摘要 → 新 Session），代码完全没有实现，也没有任何似是而非的替代品。属于纯设计概念，MVP 不需要。真正的实现前提是一个**上下文注入机制**：当前代码对 opencode 的使用只有 `prompt_async` 发用户文本（`ChatPanelZ.tsx:507-511`），没有 system prompt 注入、没有首条消息带上下文的封装。将来做 Reconstruct 或"Market Create 带上下文"都要先补这个机制。

**4. 当前代码是否存在 Create / Resume / Reconstruct 三者混淆？**

**没有。**具体回答审查要点二的四个子问题：

- 是否区分了三者？代码只实现了 Create（显式）与 Resume（默认），Reconstruct 不存在——不混淆，只是覆盖不全。
- 是否有把 Reconstruct 错当 Resume 的地方？无。
- 是否存在不必要地重建 OpenCode Session 的情况？无。全仓库仅两处 `createSession` 调用（ProjectChatZ 与旧版 ProjectChat 的按钮 handler；SessionPanel 虽也有但整组件无引用，属死代码），全部由用户显式触发。
- 是否存在为加载 Wiki/Memory 而错误创建新 Session 的情况？无。应用内根本不存在任何 Wiki/Memory 读写代码。

**真正的混淆不在 Session 生命周期，而在状态语义层**：`idle`（runtime 技术状态）被 `project-status.ts:73-77` 判成 `needs-you`（Attention）。这是当前实现里唯一一处"把 runtime 状态当产品语义"的错误，详见 E/F 节。

**5. Agent Session 与 OpenCode Session 的 1:1 映射是否合理？**

合理，且是当前代码的事实结构——只是这个映射目前是**隐式的**：没有 Agent Session 层，OpenCode Session 直接就是工作区（`directory` + `session.id`），聊天面板以 `key={session.id}` 挂载（`ProjectChatZ.tsx:115`）。在 MVP 阶段这是正确的简化，模型 §4.1 也明确"One Agent Session is backed by one OpenCode Session"是当前形态。需要注意的边界：一旦要做 Reconstruct（1 旧 → 1 新）或 runtime 抽象（1 Agent Session → 不同 runtime），就必须先有显式的 Agent Session 实体作为稳定标识。**在那之前，不建议为了"对齐模型"提前引入这层抽象**——现有 session.id 足够用。

---

## D. Talk Flow Analysis

| 流程 | 模型规定 | 当前实现 | 应该是 | 差距 |
| ---- | -------- | -------- | ------ | ---- |
| **Direct Talk**（用户主动进入 Talk） | 每次新对话 → 新 Agent Session → 新 OpenCode Session；不需要 domain menu、不需要 generic "What would you like to do?"（§8.1） | Talk tab 占位页，无实现。当前没有 domain menu、没有 generic 菜单——但原因是整个 surface 不存在 | **Create** | ❌ 全缺。实现时的第一个设计决策（模型未定义，见下）："Talk tab"作为常驻 tab，如何回到进行中的对话？若每次进 tab 都 Create，未完结的日常对话（够不上 Open Thread 的）将失联。需要"最近会话列表 + 新对话"双入口，或把"Direct Talk = 显式点新建"写进模型 |
| **Contextual Talk ← OpenCode**（Pulse 项目条目 → 聊天） | 有既有 Agent Session → Resume，保留原上下文，用户不必重新解释（§8.2/§31） | 点击项目 → BottomSheet → 自动恢复最近会话。机制正确 | **Resume** | 🟡 机制对、语义浅：入口是"项目导航"而非"Attention 回应"，没有 [Let's talk]，也没有"这个 Attention 属于哪个 session"的关联。permission 待审批时用户还是要自己点进项目才发现 |
| **Contextual Talk ← Market**（基金提醒 → 聊天） | 无 Agent Session → **Create** 新 Session + Market context + KB + Memory；不是 Resume（§8.2/§32） | 提醒点击 → 基金数据 sheet，唯一动作"确认处理"（ack）。无对话路径 | **Create（带上下文）** | ❌ 全缺。且注意模型的正确规则在此处必须成立：Market Attention **没有** Agent Session，绝不能实现成 Resume 某个不存在的 session，也不能让 scheduler 变成 Agent |
| **Open Thread → Talk** | 指回既有 Agent Session → Resume 原 Session，不建第二个对话（§24/§25） | 无实现 | **Resume** | ❌ 全缺（连同 Open Thread 本身） |

补充两个跨越四种流程的观察：

1. **"存在 Agent Session → Resume；不存在 → Create"的规则，当前代码只在一半成立**。OpenCode 侧的 Resume 是真实的；Market 侧既无 Create 也无 Resume——不是做错了，是没做。审查要点三/十六担心的"把所有 Contextual Talk 都 Resume"的错误方向，当前代码反而没有犯（它根本没实现 Market→Talk）。
2. **上下文注入是 Market→Talk 与 Reconstruct 的共同前置**。模型 §32 要求新 Market Session 带"Market context + KB + Memory"——当前没有任何机制能把这三者送进一个新建的 opencode 会话（只能靠把上下文拼进首条用户消息，或给 opencode agent 配置 Market 数据访问）。这是实现前必须补的一块基建，建议在模型或知识库里显式记为独立工作项。

---

## E. Async Agent / Assignment Analysis

**Interactive Vibe Coding vs Async Agent 的边界，模型划得对，代码只守住了前一半。**

- 交互式 Vibe Coding（用户问 → agent 做 → idle → 用户再问）：`ChatPanelZ` 完整实现且质量好。runtime 的 `idle` 在这里就是"一轮结束、等下一轮输入"，是纯技术状态。
- 异步委托（"今晚继续 Project 2，做完告诉我"）：**无法表达**。`prompt_async` 允许从聊天发出后离开，agent 继续跑，这是唯一的"异步"成分；但没有 Assignment 对象记录这次委托，没有 completion event，没有推送通道（package.json 无任何通知/后台任务依赖——用户不开着 App 就什么也收不到），完成后与交互式 idle 在数据上**不可区分**。

**Assignment：完全未实现，且当前不存在任何近似物。**

- 无对象、无存储、无创建流程（对话里说"每天 14:50 监控基金 X"不会产生任何持久责任记录）。
- One-shot 与 ongoing 的区分不存在（连可区分的载体都没有）。
- BFF 的 14:50 基金任务是**运维 seed 配置**（SQLite store，`store.ts:147`），不是对话产物。它证明"ongoing 责任可以由确定性系统承载"，但与 Assignment 概念（用户 ↔ agent 的约定）尚无连接。
- 审查要点六的判据（"Check Project 2"是 instruction，"Keep checking… and tell me when done"才是 Assignment）在模型里表达正确；代码层面两者同样不可表达，无混淆风险，也无实现。

**Autonomy boundary：模型方向正确，当前实践是"运行时审批"，与 Assignment 授权是两个层次。**

- 真实存在且工作良好的机制：opencode permission 系统（`ChatPanelZ.tsx:789-815` 的 允许一次/始终允许/拒绝 弹窗 + `opencode-client.ts:162-177`）和 question 工具（agent 主动澄清，`:738-787`）。这是逐操作、逐 session 的审批。
- 与模型 §12 的错位：**"始终允许"（always）是 runtime 级的持久授权，不 scoped 到任何 Assignment**。今天的自主性实际来自这些 runtime 授权，而不是"用户明确授予的 Assignment"——与模型"自主性来自 Assignment"的表述方向相反。MVP 可接受，但模型应补一句说明这个过渡态，否则实现者会误以为已有机制就是 Assignment 授权。
- 模型 §12 的 Market（buy/sell 需审批）与 Email（send/delete 需审批）例子：**代码中这两类动作根本不存在**（基金 app 只有用户自己操作的交易 CRUD；无 email 发送能力）。作为设计保留没有问题，但它们是纯设计，不是"当前已约束的行为"。

**idle ≠ Attention（审查要点九，专项结论：当前实现违背）**

```text
代码证据链：
useProjectEvents.ts:70-75   不在 /session/status 活跃表里的会话一律补 "idle"
project-status.ts:73-77     else if (knownIdle) → status = "needs-you"
                            statusLabel = "Needs you"
                            summary  = "Agent is waiting for your input."
index.tsx:102-104           needs-you 状态的项目 → Pulse "NEEDS YOU" 分区
```

推演：交互式对话每轮结束 agent 必然 idle → 当天有会话活动的项目几乎全程落在"Needs you"，summary 声称"Agent is waiting for your input"——而用户可能刚刚读完这轮回复。"Needs you"分区因此失去信息量，真正需要处理的 pending permission 被淹没在同一片噪音里。同时"Agent 应该在没什么需要注意时保持安静"（模型原则 28）被系统性违反。

需要公平指出的另一面：在"远程遥控 agent"的场景里，**异步派发的工作完成了**确实值得用户知道。但当前代码没有任何事件记录"这个会话最后一轮指令是交互对话还是异步委托"，所以它无法做这个区分——它选择了最粗的一刀（idle 全算）。正确的修法不是把 idle 全删掉，而是给 idle 一个正确的归宿（中性状态/最近活动），让真正的完成事件走 Event → Attention 通道——这正是 P0-2 的内容。

顺带一个正面样本：`opencode-memx` 插件同样挂 `session.idle` 钩子，但它用 idle 做**静默的记忆信号采集**（后台精炼、用户无感），不产生任何用户可见的 Attention。这正是"idle 是 runtime 技术状态，可以被系统消费，但不等于用户注意义务"的正确用法，Pulse 应当效仿。

---

## F. Event vs Attention Analysis

**"Event → maybe Attention → Pulse"的管道方向正确，且已有两段真实实现；但两端都缺"对象"。**

```text
已实现的管道（Market 侧，最完整）：
scheduler (14:50 cron) → 规则命中(估净>目标) → publish(fund.trade-alert)
  → SSE 推送 + 重连补推 → Pulse NEEDS YOU 升级 → 用户"确认处理" → ack 清除
信息性事件的分流（正确示范）：
每 5s fund.estimate → 跑马灯展示，永不进 NEEDS YOU
```

```text
已实现的管道（OpenCode 侧，半成品）：
permission.updated → pending 集合 → 项目 "Needs authorization"（真 Attention ✅）
session.status=busy/retry → "Running"（技术状态，展示合理 ✅）
session idle（= /session/status 中的缺席）→ "Needs you"（❌ 违背 idle ≠ Attention）
session 完成/结束 → 无事件、无 Attention（模型 §31 的"Project 2 is done."无处产生）
```

逐项核对模型定义：

- **Event = 事实**：部分成立。事件以 SSE 消息形态流过，但没有任何 Event 实体/存储/历史（BFF publisher 每类型只留最近一条，`publisher.ts` `lastEvents` Map）。"OpenCode session completed"这个模型反复引用的事件**不存在**——idle 只是 `/session/status` 活跃表里的缺席，不是一个被捕获的事实。
- **Attention = 正在等待用户**：两个来源中只有 permission pending 完全合格；fund.trade-alert 合格但有缺陷；idle 派生的 needs-you 不合格。
- **生命周期 OPEN/IN PROGRESS/RESOLVED/DISMISSED（§17）**：未实现。基金提醒只有"存在/ack 掉"两态，"确认处理"一个按钮同时承担了 seen、handled、dismiss 三种语义——模型强调的 **Seen ≠ Handled** 在当前 UI 里没有区分的可能（看一眼脉冲页不会消除提醒，这一点歪打正着地符合"seen 不自动 resolve"，但没有 handled/dismiss 的区分也就没有真正的生命周期）。
- **Expiration（§18）**：未实现。trade-alert 无过期时间，会一直重放直到 ack 或 BFF 重启（内存态）。模型说"Attention 可以消失而底层对象仍在"——基金监控责任（每日任务）确实在提醒 ack 后仍存在，这一点方向一致；但"有效期窗口"没有任何机制承载。
- **确定性路径与智能观察路径（§19）**：确定性路径在基金侧落地（规则→publish）；智能观察路径（多事件聚合）无实现，也无架构预留（无事件历史可供聚合）。
- **单槽位问题**：`lastEvents` 每类型只存一条——今天 14:50 的提醒若未 ack，明天命中会被覆盖；反之一次 ack 清掉整类事件。与"多个 Attention Item 可同时存在"（§21）矛盾，是 Attention 对象化时要一起解决的。

---

## G. Architecture Gaps

### P0

**P0-1：`idle` 被判为 `needs-you`（Attention）——`project-status.ts:73-77`**

阻碍 Product Model 正确落地：它让"Needs you"（模型里语义最重的分区）在大多数时间表达的是"这个项目今天被聊过"，违反模型原则 12/28 与审查要点九，同时稀释了真实的 permission Attention。修复方向：`needs-you` 只来自 pending permission（以及将来真实的 Attention 事件源）；idle 项目归入中性分组（Today/Recent）。注意该文件是纯函数且有 9 例单测，改动必须同步 `project-status.test.ts`。

**P0-2：缺少最小的 Event/Attention 对象层**

阻碍模型整个后半环落地：没有 Attention 实体，就没有地方挂生命周期（open/handled/dismissed/expired）、expiration、[Let's talk]、以及"Attention 关联哪个 Agent Session"。Pulse 现在渲染的是派生态，基金提醒是内存单槽位——模型 §36 要求 MVP 证明的闭环（…→ Attention → Pulse → user engagement → Talk）在这两个载体上都建不起来。这不是要建"通用通知中心"（模型 §36 明确不需要），而是最小的事件→注意对象化。

### P1

**P1-1：Market Attention 无 → Talk 路径，且事件发射与通知通道耦合**

基金提醒是当前唯一"真"Attention，却没有 [Let's talk] → Create（带 Market context）的路径（模型 §32 的后半段）。另外 `fund-estimation.ts:76-88` 只有在 email/企微/微信至少一个通道发送成功后才 publish 事件——App 内提醒的可见性依赖无关的通知通道配置，通道全关则 App 永远收不到提醒。事件发射应与通知发送解耦。expiry 同样缺失。

**P1-2：Talk surface 缺失（Direct Talk 未实现）**

模型允许 Chat-first MVP，项目聊天已覆盖 coding 域，所以不阻碍当前 MVP；但 Direct Talk 是模型 §8.1 的明确定义且 Talk tab 已在导航里占位。实现前需先解决 C/D 节指出的模型未定义点（Talk 面板如何回到进行中会话），否则会做出"每次进 tab 都新建会话"的错误实现。

**P1-3：Assignment 层缺失，异步完成与交互空闲不可区分**

没有 Assignment 对象，"今晚继续 Project 2"就无法成为被跟踪的责任，完成事件也无从产生；这也是 idle 噪音问题的深层原因（系统不知道哪些 idle 是"受托工作完成"）。建议与 P0-2 的 Attention 对象同期设计数据结构（Attention 携带 optional assignmentId / sessionId），实现可以晚于结构。

### P2

- **Memory / KB 的产品面**：应用侧零集成（Memory tab 占位、无 KB 检索入口）。运行时侧工程（opencode-memx / llm-wiki / llm-wiki-mcp）已就绪，未来接入是增量工作，不阻碍当前 MVP。
- **Event 基建质量**：publisher 进程内存态（重启即丢）、每类型单槽位、SSE 每连接独立每 5s 计算估值（多连接线性放大）、无事件历史/审计。
- **无推送通道**：全部依赖前台 SSE + 30s 轮询，App 不在前台则 Event→Attention→Pulse 链路整体停摆。
- **Reconstruct / Open Thread / Raw Idea**：纯设计，等前置（context 注入、Attention 对象）落地后再排期。
- **上下文注入机制**："Create 带上下文"（Market→Talk、Reconstruct）的共同前置，目前不存在。
- **死代码**：`src/screens/events.ts`（设计期 mock，无引用）、`src/components/session/SessionPanel.tsx`（无引用）——按 AGENTS.md 手术式修改原则，可在下次触碰相关文件时顺带清理。
- **已知缺口照录**：`/session/status` 的幽灵 busy 条目未交叉校验（services.md 已记录），可能误判 running。
- **文档同步**：PRODUCT_MODEL.md 落地后应回写知识库（AI_INTERACTION_DESIGN.md 的 V3 事件流设想与当前实现的差距、INDEX.md 路由）。

### G.4 PRODUCT_MODEL.md 自身需要澄清的点（非实现差距，建议修订文档而非迎合）

1. **Talk 面板的会话回入口未定义（§8.1 vs §9）**：`Every new Direct Talk starts a new Agent Session` 若按字面实现为"每次进入 Talk tab 都新建"，进行中的日常对话（够不上 Open Thread 的）将无路可回——模型只给了 Pulse/Attention/Open Thread 三条回去的路。§9 又说"Talk 自身不决定 Session 新旧"。两节之间缺一个明确决定：Talk tab 需要"最近会话列表 + 新建"双入口，或明确定义 Direct Talk 仅指"显式新建动作"。这是会在实现期产生返工的空白。
2. **Memory 插件的表述强于事实（§6:330、§36:1984）**："The current implementation uses an OpenCode plugin"——插件代码存在（opencode-memx，设计与描述吻合），但当前 agent-mobile 运行链路未集成、产品面不存在。建议改为"Memory plugin 已有独立实现（opencode-memx），运行时可选装配；产品面未接入"。
3. **授权机制的过渡态未说明（§12 vs runtime）**：当前实际的自主性来源是 opencode runtime 权限授予（含跨会话持久的 always），并非 Assignment 授权。模型应补一句"过渡期由 runtime permission 系统承担逐操作审批；Assignment 授权是其上的产品层封装"，否则两个层次会被混为一谈。
4. **Expiration 无主（§18）**：Attention 的有效期由谁/什么机制清除，模型未指定。当前既无 GC 调度也无字段。建议明确"expiresAt 由事件源给出，由 Attention 存储层清除"。

---

## H. Recommended Next Step

**唯一推荐：建立最小 Attention Item 对象层，并把 Pulse 重接到它上面（含修复 idle 误判）。**

工作项定义（一个，内聚）：

1. 定义最小 Attention Item 结构：`{ id, source, sessionId?, title, summary, createdAt, state: open|handled|dismissed, expiresAt? }`。落点建议 BFF 侧（`/api/events` 已有 publisher + ack 雏形，从"每类型单槽位"升级为"item 列表"是最小改动路径）。
2. 事件源先接两个真实存在的：opencode **pending permission**（经 BFF 转发已可见）与 **fund.trade-alert**（已有 publish/ack）。**明确不接 idle**。
3. `project-status.ts` 的 `knownIdle → needs-you` 分支移除，idle 项目归入中性分组（同步改 9 例单测）。
4. Pulse 的 NEEDS YOU 分区改从 Attention 列表渲染；"确认处理"迁移为 `state=handled/dismissed`；expiresAt 先由 trade-alert 事件带上（如当日有效）。

为什么是它：

- 它同时消掉两个 P0：P0-1（idle 误判）只是这个工作项的第 3 步；P0-2（缺对象层）是它的主体。单独修 idle 只会让"Needs you"几乎永远为空、基金提醒继续漂在内存单槽位里——不解决根因。
- 它是模型的重心：§15–§20 整段讲 Event/Attention，§36 的 MVP 闭环后半段（Attention → Pulse → engagement）全部挂在它上面。没有它，Talk 的 Contextual 入口、Assignment 完成事件、Open Thread 的浮出都没有挂载点。
- 它足够小：两个事件源、一个存储结构、一次 Pulse 重渲染，不引入"通用通知中心"（模型 §36 明确不要），不需要先做 Agent Session 实体或 Assignment——但数据结构里给它们留了 optional 引用位。
- 它不越界：不把 Vibe Coding 的 idle Jarvis 化（idle 只是被移出 Attention，不是被加工成 summary/Attention），不强迫 Market 变 Agent，不假设所有 Attention 都有 session（source + optional sessionId 的结构天然容纳两者）。

为什么不是别的：修 idle 单独做太小且不解决根因；先做 Talk tab 会撞上模型未定义的会话回入口问题（G.4-1），且不修 Pulse 的噪音；先做 Assignment 则没有 Attention 层可依附。Attention 层是当前代码与 Product Model 之间的那道门。
