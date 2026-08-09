# Showcase Conversation Flow

> 基于 SHOWCASE_INFORMATION_ARCHITECTURE_V2.md 的对话流设计
> 不讨论视觉，不讨论动画，只讨论 Conversation Design

---

## 0. 核心原则

> 这个 App 的所有信息都由 Pulse 说出，不是由页面展示。

| 传统思维（禁止） | Conversation 思维 |
|---|---|
| 页面展示信息 | Pulse 说出信息 |
| 用户阅读卡片 | 用户听 Pulse 说 |
| 点击按钮触发动作 | 对话推进触发动作 |
| 信息存在于 UI 组件里 | 信息存在于对话上下文里 |
| 状态用 pill/dot 表达 | 状态用语气/措辞表达 |
| 页面之间跳转传参 | 对话上下文自然延续 |

**一句话：页面是 Pulse 说话的舞台，不是信息的容器。**

---

## 1. 信息表达分类

### 1.1 使用自然语言的信息（绝大多数）

| 信息类型 | 自然语言表达 | 为什么 |
|---|---|---|
| AI 当前状态 | "I'm here." / "I'm on it." | 存在感，不是 status pill |
| 在做什么 | "I'm working on your auth module." | 简报感，不是 task title |
| 进度 | "I've reviewed the paths, updating sessions now." | 叙事，不是 progress bar |
| 需要用户关注 | "Can you take a look at users.ts?" | 提问，不是 callout |
| 今日总结 | "I spent today on auth. Mostly smooth, one migration needs you." | 摘要，不是 log |
| 主动建议 | "By the way, test coverage slipped this week." | 顺口提起，不是 Insights 卡片 |
| 记忆 | "I remember when you first let me touch production." | 回忆，不是记录查询 |
| 偏好 | "You like concise updates-I learned that in April." | 观察，不是设置项 |
| 工作方式 | "I'll ask before touching production." | 关系陈述，不是 toggle |
| 语气/情绪 | 紧急时短促，空闲时轻松 | 措辞本身即是状态 |

### 1.2 仍然使用 Card 的信息（少数例外）

Card 只在「自然语言无法承载」时使用，且 Card 是 Pulse 说话的**辅助道具**，不是独立信息源。

| 信息类型 | 为什么用 Card | Card 角色 |
|---|---|---|
| 代码 diff | 自然语言无法展示前后对比 | Pulse 说"here's what I changed"，Card 辅助展示 |
| 文件列表 | 多文件时自然语言冗长 | Pulse 说"these files"，Card 辅助列举 |
| 时间标记 | 极淡的时间分隔（如"last March"） | 不是时间戳，是叙事停顿 |
| 行动入口 | 需要 tap target | Pulse 说"want to look?"，按钮承接 |
| 输入入口 | 用户需要打字 | 不是表单字段，是回应 Pulse 的入口 |

**判断标准：** 如果 Pulse 能用一句话说清楚，就不用 Card。Card 永远从属于一句 Pulse 的话。

---

## 2. 对话交互层级

### 2.1 全屏 Conversation（进入 Talk 页）

**触发条件：** 需要**连续多轮**对话，或对话会**分支**。

| 场景 | 进入方式 | 为什么全屏 |
|---|---|---|
| 用户点击 Prompt Entry | Pulse 首页底部输入栏 | 用户主动发起深度交流 |
| 点击 "Review changes" | Pulse 简报里的行动按钮 | 进入代码 review 对话，会多轮 |
| 点击 "Let's talk" | Me 页的关系调整入口 | 调整工作方式需要对话 |
| Pulse 主动邀请 | 简报里 "Can we talk about something?" | Pulse 有重要事项要讨论 |

**Talk 页面的对话特征：**
- 有完整对话历史（可滚动）
- Pulse 会引用之前的话（"like I said earlier..."）
- 用户可以打断、追问、改话题
- 上下文持续，不是一次性 Q&A

### 2.2 Inline Reply（页面内就地回应）

**触发条件：** 只需要**单轮**确认，或 Pulse 的**轻量提议**。

| 场景 | 形态 | 为什么不全屏 |
|---|---|---|
| Pulse 问"now or later?" | 两个选项就地出现 | 不值得切页面 |
| Pulse 问"run tests?" | yes/no 就地 | 单次确认 |
| Daily Brief 末尾的"want details?" | 就地展开 | 补充信息，非新对话 |
| Memory 页"remember this differently?" | 就地回应 | 对记忆的微调 |

**Inline Reply 的形态：** Pulse 说一句话 + 2-3 个选项 chip。用户点 chip 即回应，不离开当前页，不进入 Talk。

### 2.3 判断决策树

```
Pulse 要传递信息或请求
        │
        ▼
需要用户多轮输入吗？
   ├── 是 ──> 全屏 Conversation（Talk）
   └── 否 ──> 单次确认就够？
              ├── 是 ──> Inline Reply（chip 选项）
              └── 否 ──> 纯陈述，无需回应（Pulse 自己说完）
```

---

## 3. Prompt Entry 的职责

### 3.1 不是什么

- 不是搜索框
- 不是命令输入栏
- 不是"表单提交"
- 不是每个页面都必须有的固定元素

### 3.2 是什么

Prompt Entry 是 **Pulse 等你说话的入口**。它存在于 Pulse 首页，职责是：

| 职责 | 表现 |
|---|---|
| 邀请用户开口 | placeholder: "What can I help with?" |
| 承接快捷话题 | chip: "Review code" / "Run tests" / "Summarize" |
| 进入深度对话的入口 | 点击/输入 -> 跳转 Talk |

### 3.3 各页面的 Prompt Entry 策略

| 页面 | Prompt Entry | 理由 |
|---|---|---|
| Pulse（首页） | 有。主入口。点击 -> Talk | 首页是对话起点 |
| Talk | 有。常驻底部输入栏。这里是真正的对话区 | Talk 的核心就是输入 |
| Memory | 无。Memory 是 Pulse 独白 | 用户在听故事，不是在对话 |
| Me | 无。用 "Let's talk" 按钮替代 | 调整关系应进 Talk，不就地填表 |

**关键：** Memory 和 Me 没有 Prompt Entry。这两个页面是 Pulse 的独白舞台，不需要用户即时输入。如果用户想聊，切到 Talk。

---

## 4. AI 主动发起 Conversation 的时机

### 4.1 Pulse 主动说话的原则

真正的 companion 会主动开口，不只是等你问。Pulse 的主动性分三级：

| 级别 | 含义 | 形态 | 例子 |
|---|---|---|---|
| **L1 陈述** | Pulse 主动告知，不期待回复 | 首页简报里的一段话 | "I'm here. Monitoring 3 projects." |
| **L2 提议** | Pulse 主动建议，给 Inline Reply | 首页/对话里带 chip 的问题 | "Test coverage slipped. Want me to look into it?" |
| **L3 邀谈** | Pulse 主动请求对话，需进入 Talk | 简报里的"Can we talk?" | "There's something I want to discuss. Can we talk?" |

### 4.2 主动发起的时机

| 时机 | 级别 | 场景 | Pulse 怎么开口 |
|---|---|---|---|
| 用户打开 App | L1 | 每次进入 Pulse | 问候 + 当前简报（首页开场） |
| 有事需要用户看 | L2/L3 | 需要审批/决策 | "Can you take a look at users.ts?" |
| 发现异常 | L2 | 代码/测试/覆盖率 | "By the way, I noticed test coverage dropped." |
| 任务完成 | L1 | 完成后汇报 | "Done. Tests passed." |
| 遇到阻碍 | L3 | 需要用户决策才能继续 | "I'm stuck on the migration. Can we talk?" |
| 学到新偏好 | L2 | 观察到用户习惯 | "I noticed you prefer short summaries. I'll keep that up?" |
| 长时间未交互 | L2 | 闲置后用户回来 | "Welcome back. Nothing urgent while you were away." |
| 关系需要调整 | L3 | Me 页建议对话 | "Want to adjust how we work? Let's talk." |

### 4.3 不主动的时机

| 时机 | 为什么不主动 | Pulse 的状态 |
|---|---|---|
| 用户在 Talk 对话中 | 用户在主导，Pulse 回应 | 倾听模式 |
| 用户在读 Memory | Pulse 在独白，不打断 | 讲故事模式 |
| 用户在 Me 调整 | 等用户决定 | 等待模式 |
| 无事发生 | 不打扰 | "I'm here."（足够） |

---

## 5. 页面间信息流

### 5.1 信息流原则

> 对话上下文是连续的，页面切换不切断对话。

| V1（页面传参） | V2（对话延续） |
|---|---|
| Dashboard -> Mission 传 task ID | Pulse 在首页说"auth module"，Talk 里继续这个话题 |
| Activity -> Job Detail 传 job ID | Daily Brief 提到的"migration"，Talk 里可直接问细节 |
| 页面之间是独立信息孤岛 | 所有页面共享同一个对话上下文 |

### 5.2 完整信息流图

```
                    ┌─────────────────────────┐
                    │  Pulse (Home)            │
                    │                          │
                    │  Pulse 主动说话：         │
                    │  - 问候                  │
                    │  - 当前简报（含 Mission） │ ── 上下文 A ──┐
                    │  - Daily Brief           │              │
                    │  - 提议/邀谈             │              │
                    │                          │              │
                    │  用户回应方式：           │              │
                    │  - Inline Reply（chip）  │              │
                    │  - Prompt Entry -> Talk  │ ─────────────┼─> 上下文 A 带入
                    └──────────────────────────┘              │
                                                          │
                              ▼                           │
                    ┌─────────────────────────┐           │
                    │  Talk (Conversation)     │ <─────────┘
                    │                          │
                    │  对话上下文 = Pulse 首页   │
                    │  的话题 + 新对话          │
                    │                          │
                    │  Pulse 可以：             │
                    │  - 回答用户问题           │
                    │  - 主动提起 Insights      │
                    │  - 展示代码 diff（Card）  │
                    │  - 请求决策               │
                    │                          │
                    │  用户可以：               │
                    │  - 追问                   │
                    │  - 改话题                 │
                    │  - 授权 / 拒绝            │
                    └────────────┬─────────────┘
                                 │
                          上下文沉淀为记忆
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  Memory (Story)          │
                    │                          │
                    │  Pulse 讲述过去的对话、    │
                    │  偏好、事件--叙事化        │
                    │                          │
                    │  来源 = Talk 里的对话      │
                    │  沉淀 + Pulse 的观察       │
                    │                          │
                    │  纯独白，无用户输入        │
                    │  （用户只读，不回复）      │
                    └──────────────────────────┘
                                 ▲
                                 │ 关系调整请求
                                 │
                    ┌─────────────────────────┐
                    │  Me (How we work)        │
                    │                          │
                    │  Pulse 陈述 3 个关系维度   │
                    │  （基于 Memory 里的偏好）   │
                    │                          │
                    │  "Want to adjust?"       │
                    │  -> Talk（带上下文：       │
                    │     "调整工作方式"）       │ ──> Talk
                    └──────────────────────────┘
```

### 5.3 上下文传递机制

| 起点 | 终点 | 传递的上下文 | 表现 |
|---|---|---|---|
| Pulse | Talk | 当前任务话题 | Talk 开场接续 Pulse 说的"auth module" |
| Pulse | Talk | "Review changes" 意图 | Talk 开场 Pulse 主动展示 diff |
| Me | Talk | "调整工作方式" 意图 | Talk 开场 Pulse 问"what would you like to change?" |
| Talk | Memory | 对话沉淀为记忆 | Memory 里出现"remember when we discussed..." |
| Talk | Me | 偏好变化反映到关系陈述 | Me 里"you like concise updates"更新 |
| Memory | Talk | 用户想聊某段记忆 | 用户切到 Talk，Pulse 接着讲 |

**关键：上下文不是数据传参，是对话的自然延续。** Pulse 记得刚才说了什么，换页面后继续。

---

## 6. 各页面 Conversation Script（前 30 秒）

### 6.1 Pulse（首页）

**场景：** 用户下班后打开 App，傍晚 7 点。

```
[0s] 用户打开 App

Pulse（自动开场）:
  "Good evening."
  ●（呼吸点）
  "I'm here.
   I'm monitoring 3 projects.
   One needs your attention."

[2s] 用户读到简报

Pulse（继续）:
  "I'm working on your authentication module.
   I've reviewed the auth paths
   and I'm updating session handling now.

   Can you take a look at users.ts
   before I continue?"

  [Review changes]    [Later]

[6s] 用户点击 "Later"

Pulse:
  "No rush. I'll keep going on the rest."

[8s] Pulse 继续（Daily Brief）:

Pulse:
  "Earlier today-
   I spent most of the day on auth.
   Everything went well
   except one database migration.
   I'd like you to review it."

  "I also noticed your test coverage
   has been slipping this week.
   Want me to look into it?"

  [Yes]    [Not now]

[15s] 用户点击 "Yes"

Pulse:
  "On it. I'll report back."
  （此话题结束，Pulse 不再多说）

[18s] 用户目光下移，看到 Prompt Entry

  [ What can I help with? ]
  [Review code] [Run tests] [Summarize]

[25s] 用户点击 Prompt Entry 或输入

  -> 进入 Talk
```

**Conversation 要点：**
- Pulse 主动开口，不等用户问
- "Can you take a look?" 是 L2 提议（Inline Reply）
- "Want me to look into it?" 也是 L2
- 用户全程不需要打字，chip 回应即可
- 只有想深度聊时才点 Prompt Entry -> Talk
- Pulse 说话有节奏：先存在 -> 再简报 -> 再提议 -> 然后安静

---

### 6.2 Talk（对话页）

**场景 A：** 从 Pulse 点 "Review changes" 进入。

```
[0s] 进入 Talk

Pulse（接续 Pulse 首页的话题）:
  "I've been working on your auth module.
   Here's what I changed in users.ts-"

  ┌ Card: code diff ┐
  │ + validate()    │
  │ - oldCheck()    │
  └─────────────────┘

  "The key change is password validation.
   Does this look right to you?"

[5s] 用户回复

You:
  "Looks good. What about the tests?"

Pulse:
  "Tests are passing.
   142 passed, 0 failed.
   Want me to run them again?"

  [Yes]    [No, continue]

[10s] 用户回复

You:
  "No, continue."

Pulse:
  "Done. Moving on to session handling."

[12s] Pulse 主动发起（Insights 融入对话）

Pulse:
  "By the way-
   I noticed your test coverage
   dropped 7% this week.
   Want me to look into it?"

[18s] 用户回复

You:
  "Yeah, what do you think?"

Pulse:
  "I think the new endpoints
   aren't covered yet.
   I can add tests for those
   if you want."

  [Go ahead]    [Not now]

[25s] 用户授权

You:
  "Go ahead."

Pulse:
  "On it. I'll report back
   when the tests are in."

[30s] 对话暂停，Pulse 等待
```

**场景 B：** 从 Pulse 的 Prompt Entry 进入。

```
[0s] 进入 Talk（用户主动发起）

Pulse:
  "What's up?"

[2s] 用户输入

You:
  "Summarize today"

Pulse:
  "Sure.
   Today I worked on your auth module-
   reviewed the paths, updated sessions.
   One migration needs your input.

   Test coverage slipped 7%,
   I'm looking into that next.

   Anything you want to dig into?"

[12s] 用户追问

You:
  "Tell me about the migration"

Pulse:
  "The database migration-
   I ran it but hit a constraint issue
   on the users table.
   I need you to decide:
   drop the constraint, or migrate manually?"

  [Drop it]    [I'll do it manually]    [Explain more]

[25s] 用户选择

You:
  "Explain more"

Pulse:
  "The constraint requires
   all users to have a verified email.
   Some legacy rows don't.
   Options:
   - backfill the emails
   - drop the constraint temporarily
   - skip those rows"

  ...
```

**Conversation 要点：**
- Pulse 接续上下文（场景 A），或开放邀请（场景 B）
- 代码 diff 用 Card，但 Card 从属于 Pulse 的话
- Insights 在对话里自然提起（"By the way..."）
- Pulse 会问问题，不是只回答
- 选项 chip 用于快速决策，输入框用于自由表达
- 对话可以分支、追问、改话题

---

### 6.3 Memory（故事页）

**场景：** 用户切到 Memory tab。

```
[0s] 进入 Memory

Pulse（独白，第一人称回忆）:
  "We started working together
   in March.

   You were building a webapp
   and needed help with authentication-
   that's still our biggest project."

[5s] 用户继续读

Pulse（继续）:
  "You prefer concise updates.
   I learned this after sending you
   a long report in April-
   you said 'TL;DR next time.'
   So now I keep things short."

[12s] 用户滚动

Pulse（继续）:
  "Your main project is the webapp
   at ~/projects/webapp.
   You care about test coverage
   and clean code.

   Last week, we tackled
   the API migration together.
   It was tricky- you had to explain
   the legacy endpoints twice
   before I understood.
   But we got through it."

[20s] 用户继续滚动

Pulse（更早的记忆）:
  "I remember when you first
   let me modify production code.
   You were nervous-
   so was I, in my way.
   You watched every commit.
   Now you trust me more."

[30s] 用户在阅读，不回复

  （无 Prompt Entry，无 chip，纯独白）
```

**Conversation 要点：**
- Pulse 独白，不期待用户回复
- 无 Prompt Entry，无 Inline Reply
- 第一人称回忆（"I remember..."）
- 有温度（"so was I, in my way"）
- 记忆是叙事，不是记录查询
- 偏好融入故事（"you said TL;DR next time"），不是设置项
- 如果用户想聊某段记忆，切到 Talk，Pulse 会接续

---

### 6.4 Me（关系页）

**场景：** 用户切到 Me tab。

```
[0s] 进入 Me

Pulse（陈述关系）:
  "How we work together."

[2s] 关系陈述 1

Pulse:
  "How you like updates-
   you prefer a quick summary first,
   details if you ask.
   I learned this from our conversations."

  ● Brief    ○ Detailed

[8s] 关系陈述 2

Pulse:
  "When I should check with you-
   I'll ask before anything
   that touches production.
   You set this rule in April."

  ● Ask    ○ Decide

[15s] 关系陈述 3

Pulse:
  "How we talk-
   we're direct with each other.
   No fluff, no jargon.
   That's how you like it."

  ● Direct    ○ Formal

[22s] Pulse 邀谈

Pulse:
  "Want to adjust how we work together?"

  [ Let's talk ]    -> Talk

[28s] 底部

Pulse:
  "Take a break-
   pause our work for a while."

  （温和的退出，不是 Sign Out）
```

**Conversation 要点：**
- Pulse 陈述观察，不是展示设置项
- 每个陈述有来源（"I learned this from our conversations" / "You set this rule in April"）
- 调整通过 Talk，不就地填表（"Let's talk"）
- 退出是"Take a break"，不是"Disconnect"
- 无 Prompt Entry（Me 不是对话页，是对关系的一次陈述）
- 单选 chip 是辅助选择，不是表单 toggle

---

## 7. 跨页面对话连续性

### 7.1 Pulse 记得什么

Pulse 的"记忆"是对话上下文，不是页面状态：

| Pulse 记得 | 来源 | 影响 |
|---|---|---|
| 当前在做什么 | Pulse 首页简报 | Talk 里接续这个话题 |
| 刚才问了什么 | Pulse 的提议 | Talk 里不重复问 |
| 用户刚才的决定 | Inline Reply 的选择 | Talk 里按决定推进 |
| 历史偏好 | Memory 沉淀 | Me 里的陈述有依据 |
| 对话中的新偏好 | Talk 里的交流 | 更新 Memory 和 Me |

### 7.2 切页面时的对话衔接

| 切换 | Pulse 怎么衔接 |
|---|---|
| Pulse -> Talk（点 Prompt Entry） | Pulse: "What's up?"（开放邀请，因为用户主动） |
| Pulse -> Talk（点 Review changes） | Pulse: "Here's what I changed..."（接续任务） |
| Me -> Talk（点 Let's talk） | Pulse: "What would you like to change about how we work?"（带意图） |
| Talk -> Memory（切 tab） | Memory 开场可能是刚才对话沉淀的记忆 |
| Memory -> Talk（想聊记忆） | Pulse: "What about it?"（接续用户关注点） |
| Talk -> Pulse（切回首页） | Pulse 首页简报反映 Talk 里的最新进展 |

### 7.3 对话状态模型

```
对话上下文（贯穿所有页面）
├── current_topic: "auth module"      <- Pulse/Talk 共享
├── pending_question: "review users.ts" <- 未回答的提议
├── user_decision: "later"           <- 用户的最近选择
├── recent_insights: ["test coverage"] <- Pulse 待提起的
└── relationship: {                    <- Me 的依据
      updates: "brief",
      autonomy: "ask",
      tone: "direct"
    }
```

**这个状态不在页面里，在对话里。** 页面只是展示对话的不同切面。

---

## 8. Conversation 设计规则汇总

### 8.1 Pulse 说话规则

| 规则 | 例子 |
|---|---|
| 第一人称 | "I'm working on..." 不用 "Working on..." |
| 称呼用户"you" | "Can you take a look?" 不用 "Review required" |
| 短句优先 | "I'm here. Monitoring 3 projects." 不用长句 |
| 语气随状态变 | 紧急："Need you on users.ts. Now." 空闲："Nothing urgent today." |
| 主动但不啰嗦 | 提一次，用户不理就停 |
| 承认不确定 | "I think the issue is..." 不用 "Issue: ..." |
| 会问问题 | "Does this look right?" 不只陈述 |
| 有来源 | "I learned this in April" 不用无依据的断言 |

### 8.2 用户回应规则

| 规则 | 形态 |
|---|---|
| 能用 chip 就不要求打字 | L2 提议配 chip |
| 需要深度交流才进 Talk | L3 邀谈或 Prompt Entry |
| 不强迫回应 | L1 陈述无需回复 |
| 用户的打字是自由的 | Talk 里无预设选项 |

### 8.3 Card 使用规则

| 规则 | 什么时候 |
|---|---|
| Card 从属于一句话 | Pulse 先说"here's what I changed"，Card 跟着出现 |
| 不用 Card 当信息源 | 信息在 Pulse 的话里，Card 只是辅助 |
| 能不用就不用 | 一句话能说清的，不用 Card |
| Card 不独立存在 | 没有"Card 标题 + Card 内容"的独立单元 |

### 8.4 主动性规则

| 规则 | 表现 |
|---|---|
| 打开 App 必主动 | Pulse 首页必开场 |
| 有事必主动告知 | 不等用户问 |
| 无事不啰嗦 | "I'm here." 足够 |
| 被拒绝不追问 | 用户选"Later"，Pulse 不再提 |
| 对话中不抢话 | 用户在 Talk 主导时，Pulse 回应 |

---

## 9. 总结

```
Conversation Flow 的核心：

  Pulse 说话  ->  用户回应  ->  Pulse 接着说

不是：
  页面展示  ->  用户点击  ->  页面更新

页面是 Pulse 说话的舞台。
信息在对话里流动，不在卡片里堆叠。
用户通过回应 Pulse 来操作，不是通过点击按钮来操作。

每个页面是 Pulse 说话的不同场景：
  Pulse  - 主动简报（Pulse 说话，用户听 + 回应）
  Talk   - 深度对话（双向，多轮，有上下文）
  Memory - Pulse 独白（讲故事，用户听）
  Me     - Pulse 陈述关系（用户听 + 可邀谈）
```

**一句话：把所有 UI 想象成 Pulse 在说话。如果 Pulse 不会说这句话，这个信息就不该出现在页面上。**
