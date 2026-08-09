# Showcase Information Architecture V2

> 从 Agent Dashboard 到 AI Companion 的信息架构重设计
> 依据：UX_REVIEW.md + 用户指令（删除 Mission/Activity，新增 Conversation，Memory→Story，Identity→关系）

---

## 0. 设计哲学

> 一个 AI Companion 不需要 5 个页面来讲 1 个故事——它需要 1 次对话。

V1 的问题不是文案，是骨架。把 "Dashboard" 改成 "Pulse"、把 "Jobs" 改成 "Activity"，但底下仍是「卡片堆叠 + 日志流 + 设置表单」。V2 的核心转变：

| V1 范式 | V2 范式 |
|---|---|
| 用户看卡片了解状态 | Pulse 主动说话汇报状态 |
| 用户点进页面查看详情 | 用户在对话里问，Pulse 回答 |
| 信息分散在 5 个页面 | 信息在 1 段话 + 1 次对话里流动 |
| 每个 Card 是独立信息单元 | 每段对话自然包含多个信息 |
| 状态用 status pill / dot 表示 | 状态用 Pulse 的语气和措辞表达 |

**一句话原则：对话优先，卡片辅助。首页即简报，对话即核心。**

---

## 1. Sitemap

### V1（旧）→ V2（新）

```
V1（5 页）                          V2（4 页）
─────────────────                  ─────────────────
Dashboard (Pulse)         ──┐      Pulse (Home)
Activity (Jobs)            ──┼── 删除，融入 Pulse 的 Daily Brief
Mission (Job Detail)       ──┼── 删除，融入 Pulse 的当前简报
Memory (History)           ──┤      Memory (Story)
Identity (Settings)        ──┘      Me (Identity)
                                      +
                                   Talk (Conversation) ── 新增
```

### V2 完整 Sitemap

```
Pulse Showcase
│
├── Pulse          ← 首页：AI 的存在 + 当前简报 + 今日总结
│   └── Prompt Entry → Talk
│
├── Talk           ← 全屏对话：和 Pulse 深度交流
│   └── 返回 Pulse（tab 切换）
│
├── Memory         ← 故事：Pulse 讲述你们的共同记忆
│   └── 纯叙事，无数据库感
│
└── Me             ← 关系：「我们如何一起工作」
    └── 「想调整？我们聊聊」→ Talk
```

**页面数量：5 → 4（净减 1，但实质重构 4 个中的 3 个）**

---

## 2. Bottom Tabs

```
┌────────┬────────┬────────┬────────┐
│ Pulse  │  Talk  │ Memory │   Me   │
│  ●     │  💬    │  📖    │  🤝    │
└────────┴────────┴────────┴────────┘
```

### 命名理由

| Tab | 含义 | 为什么这个名字 |
|---|---|---|
| **Pulse** | AI 的生命脉搏 | 打开 App 就是感受 AI 在。不是 "Home"（太泛），不是 "Dashboard"（太工具）。Pulse = 有心跳的存在。 |
| **Talk** | 和 Pulse 对话 | 动词，暗示动作。不是 "Chat"（太 IM），不是 "Conversation"（太长）。Talk = 你和伙伴说话。 |
| **Memory** | Pulse 记住的事 | 名词但有人味。不是 "History"（太日志），不是 "Story"（太模糊）。Memory = AI 有记忆，不是数据库。 |
| **Me** | 你和 Pulse 的关系 | 最短、最个人。不是 "Settings"（太 SaaS），不是 "Identity"（太抽象），不是 "Profile"（太社交）。Me = 这是关于你的。 |

### 与 V1 的对比

| V1 Tabs | 问题 | V2 Tabs |
|---|---|---|
| Home | 和 "Pulse" 语义重叠 | Pulse（唯一的存在感入口） |
| Activity | 日志流不值得占 tab | Talk（对话是核心，值得 tab） |
| Pulse (Identity) | 名字和首页冲突 | Me（清晰、不冲突） |

**4 个 tab 各代表一种关系维度：在（Pulse）、说（Talk）、记（Memory）、我们（Me）。**

---

## 3. Page Responsibility

### Page 1: Pulse（首页 / AI 存在）

**一句话职责：** 打开 App 1 秒内知道 AI 在、在做什么、是否需要你。

**不做什么：**
- 不做 Agent 列表
- 不做任务列表
- 不做 log feed
- 不做 5 张卡片的信息堆叠
- 不需要进入第二层页面才能了解 AI 状态

**做什么：**
- 时间感知问候
- Pulse 的一段话（当前简报 = 融合 Mission）
- 今日总结（Daily Brief = 替代 Activity）
- 需要你关注的事（融入简报，不独立成卡）
- Prompt Entry（→ 进入 Talk）

**信息密度目标：** 首屏 2 个焦点——「Pulse 在」+「有件事需要你看」。

---

### Page 2: Talk（对话 / 产品核心）

**一句话职责：** 和 Pulse 深度交流的唯一地方。

**不做什么：**
- 不是 alert 模拟
- 不是 BottomSheet
- 不是单条 Prompt Entry
- 不是 Mission 页里的 "Latest Exchange" 卡片

**做什么：**
- 全屏消息流（Pulse 左 / You 右）
- 连续对话（有上下文）
- Pulse 主动发起（不只是回答）
- 嵌入式辅助卡片（如需要展示代码 diff，在对话流内）
- 底部常驻输入栏

**核心地位：** 这是整个产品的心脏。Home 的 Prompt Entry 是入口，Talk 是目的地。

---

### Page 3: Memory（故事 / 共同记忆）

**一句话职责：** Pulse 讲述你们的共同记忆。

**不做什么：**
- 不做 "Recent Memories" 列表
- 不做 "3 memories" / "12 projects" 计数
- 不做 Knowledge / Preferences / Projects 分类
- 不做数据库记录式的时间戳

**做什么：**
- 自然语言叙事（第一人称）
- 像 Pulse 在写日记 / 回忆录
- 时间流动感（「我们第一次合作是三月……」）
- 可以滚动的长叙事，不是卡片网格

---

### Page 4: Me（关系 / 工作方式）

**一句话职责：** 定义「我们如何一起工作」。

**不做什么：**
- 不做 6 张设置卡片
- 不做 preference form
- 不做 toggle 矩阵
- 不做 "Sign Out" / "Disconnect"

**做什么：**
- 3 句关系陈述（可调整）
- 「想调整？我们聊聊」→ Talk
- 温和的「暂停我们的工作」（替代 Sign Out）

---

## 4. Page Detail

### Pulse（首页）详细结构

```
┌─────────────────────────────┐
│  ScreenHeader              │
│  "Pulse"        🔔          │  ← 标题 + 通知
├─────────────────────────────┤
│                             │
│  Good evening.              │  ← 时间问候（type-headline）
│                             │
│  ┌─────────────────────┐  │
│  │  ● I'm here.         │  │  ← Presence（呼吸点 + 一句话）
│  │    monitoring 3       │  │     不是卡片标题，是对话开头
│  │    projects.          │  │
│  └─────────────────────┘  │
│                             │
│  ┌─────────────────────┐  │
│  │  I'm working on your │  │  ← 当前简报（= 融合 Mission）
│  │  authentication      │  │     一段自然语言，包含：
│  │  module.              │  │     - 在做什么
│  │                       │  │     - 做到哪了
│  │  I've reviewed the    │  │     - 需要你做什么
│  │  auth paths and I'm   │  │
│  │  updating session     │  │
│  │  handling now.        │  │
│  │                       │  │
│  │  Can you take a look  │  │  ← 需要关注的事（融入对话）
│  │  at users.ts before   │  │     不是 callout 卡片
│  │  I continue?          │  │     是 Pulse 在问你
│  │                       │  │
│  │  [ Review changes ]   │  │  ← 行动按钮（→ Talk）
│  └─────────────────────┘  │
│                             │
│  ─────────────────────     │  ← 分隔（极淡）
│                             │
│  Earlier today              │  ← Daily Brief（= 替代 Activity）
│                             │
│  I spent most of today      │     一段话总结
│  improving authentication.  │     不是 12 条日志
│  Everything went well       │     不是 list
│  except one migration.      │     不是 timeline
│  I'd like you to review it. │
│                             │
│  I also noticed your test   │  ← 主动建议（融入 brief）
│  coverage has been slipping │     不是独立 Insights 卡片
│  this week.                 │
│                             │
├─────────────────────────────┤
│  [ What can I help with? ] │  ← Prompt Entry
│  [Review code] [Run tests]  │     点击 → Talk
├─────────────────────────────┤
│  Pulse │ Talk │ Memory │ Me │  ← Bottom Tabs
└─────────────────────────────┘
```

**关键设计决策：**

| 决策 | 理由 |
|---|---|
| Mission 内容融入一段话 | 不需要独立页面。AI 在简报，不是在给你看工单。 |
| Daily Brief 是一段自然语言 | 替代 12 条日志。AI 在总结，不是在 dump 记录。 |
| Insights 融入 Daily Brief | 不独立成卡。Pulse 主动提起，像在聊天。 |
| 「Review changes」按钮 → Talk | 点击后进入对话，在对话里讨论，不是看 callout。 |
| 首屏焦点 = 「Pulse 在」+「需要你看 users.ts」 | 2 个焦点，不是 5 个。 |

---

### Talk（对话）详细结构

```
┌─────────────────────────────┐
│  ← Pulse            ● On it │  ← Header（返回 + 状态）
├─────────────────────────────┤
│                             │
│        ┌─────────────────┐  │
│        │ I've been        │  │  ← Pulse（左）
│        │ working on your  │  │
│        │ auth module.     │  │
│        │ Can you review   │  │
│        │ users.ts?        │  │
│        └─────────────────┘  │
│                             │
│  ┌─────────────────┐        │
│  │ Sure, what did   │       │  ← You（右）
│  │ you change?       │       │
│  └─────────────────┘        │
│                             │
│        ┌─────────────────┐  │
│        │ Updated password │  │  ← Pulse（左）
│        │ validation. Key  │  │
│        │ change:          │  │
│        │ ┌─────────────┐ │  │  ← 嵌入式辅助（代码片段）
│        │ │ + validate() │ │  │     不是独立卡片，在对话流内
│        │ │ - oldCheck() │ │  │
│        │ └─────────────┘ │  │
│        └─────────────────┘  │
│                             │
│  ┌─────────────────┐        │
│  │ Looks good. Go   │       │  ← You（右）
│  │ ahead.            │       │
│  └─────────────────┘        │
│                             │
│        ┌─────────────────┐  │
│        │ Done. Running    │  │  ← Pulse（左）
│        │ tests now.       │  │
│        │                   │  │
│        │ By the way, I     │  │  ← Pulse 主动发起
│        │ noticed test      │  │     Insights 在对话里自然出现
│        │ coverage dropped  │  │     不是独立卡片
│        │ 7% this week.     │  │
│        │ Want me to look   │  │
│        │ into it?          │  │
│        └─────────────────┘  │
│                             │
├─────────────────────────────┤
│  [ Message Pulse...    ] ▶  │  ← 常驻输入栏
└─────────────────────────────┘
```

**关键设计决策：**

| 决策 | 理由 |
|---|---|
| 全屏对话 | AI Companion 的核心交互。不是 alert，不是 sheet。 |
| Pulse 主动发起 | "By the way, I noticed..." — Insights 在对话里自然出现，不是独立卡片。 |
| 嵌入式代码片段 | 需要展示 diff 时，在对话流内辅助，不跳出对话。 |
| 无 "AI" / "You" 文字标签 | 用位置（左/右）和样式区分，像真实聊天。 |
| Pulse 头像替代文字标签 | 更自然，更像 companion。 |
| 常驻输入栏 | 对话的核心就是随时能说。 |

---

### Memory（故事）详细结构

```
┌─────────────────────────────┐
│  ScreenHeader              │
│  "Memory"                   │
├─────────────────────────────┤
│                             │
│  We started working          │  ← 开篇（像回忆录第一段）
│  together in March.          │
│  You were building a         │
│  webapp and needed help      │
│  with authentication —       │
│  that's still our biggest    │
│  project.                    │
│                             │
│  You prefer concise          │  ← 偏好记忆（叙事化）
│  updates. I learned this     │     不是 "Preference: concise"
│  after sending you a long    │     而是「我学到你偏好简洁」
│  report in April — you       │     有故事，有上下文
│  said "TL;DR next time."     │
│  So now I keep things short. │
│                             │
│  Your main project is the    │  ← 项目记忆（叙事化）
│  webapp at ~/projects/webapp.│     不是 "12 Projects" 计数
│  You care about test         │     而是具体的、有温度的描述
│  coverage and clean code.    │
│                             │
│  Last week, we tackled       │  ← 事件记忆（叙事化）
│  the API migration together. │     不是 "Event log" 列表
│  It was tricky — you had     │     而是讲故事
│  to explain the legacy       │
│  endpoints twice before      │
│  I understood. But we got    │
│  through it.                 │
│                             │
│  ─── last month ───          │  ← 时间分隔（极淡）
│                             │
│  I remember when you first    │  ← 更早的记忆
│  let me modify production    │
│  code. You were nervous —    │
│  so was I, in my way.        │
│  You watched every commit.   │
│  Now you trust me more.      │
│                             │
├─────────────────────────────┤
│  Pulse │ Talk │ Memory │ Me │  ← Bottom Tabs
└─────────────────────────────┘
```

**关键设计决策：**

| 决策 | 理由 |
|---|---|
| 纯叙事，无列表 | 像回忆录，不是数据库查询结果。 |
| 无计数 | 没有 "3 memories" / "12 projects"。AI 讲故事不会数数。 |
| 无分类标签 | 没有 "Knowledge" / "Preferences" / "Projects"。故事自然包含一切。 |
| 时间分隔极淡 | 用 "last month" 自然语言，不用时间戳。 |
| 第一人称 | "I learned..." / "I remember..." — 是 Pulse 的记忆，不是系统记录。 |
| 有温度 | "so was I, in my way" — AI 也有感受，不是冰冷数据。 |

---

### Me（关系）详细结构

```
┌─────────────────────────────┐
│  ScreenHeader              │
│  "How we work together"     │  ← 不是 "Settings"
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐  │
│  │  How you like        │  │  ← 关系陈述 1
│  │  updates             │  │
│  │                       │  │
│  │  You prefer a quick   │  │  ← Pulse 的观察
│  │  summary first,      │  │     不是表单字段
│  │  details if you ask.  │  │
│  │                       │  │
│  │  ● Brief  ○ Detailed │  │  ← 可调整（但不叫 toggle）
│  └─────────────────────┘  │
│                             │
│  ┌─────────────────────┐  │
│  │  When I should       │  │  ← 关系陈述 2
│  │  check with you      │  │
│  │                       │  │
│  │  I'll ask before     │  │
│  │  anything that       │  │
│  │  touches production. │  │
│  │                       │  │
│  │  ● Ask  ○ Decide     │  │
│  └─────────────────────┘  │
│                             │
│  ┌─────────────────────┐  │
│  │  How we talk         │  │  ← 关系陈述 3
│  │                       │  │
│  │  We're direct with   │  │
│  │  each other. No      │  │
│  │  fluff, no jargon.   │  │
│  │                       │  │
│  │  ● Direct  ○ Formal │  │
│  └─────────────────────┘  │
│                             │
│  ─────────────────────     │
│                             │
│  Want to adjust how we      │  ← 对话式调整入口
│  work together?             │
│                             │
│  [ Let's talk ]             │  ← → Talk
│                             │
│  ─────────────────────     │
│                             │
│  Take a break               │  ← 替代 "Sign Out"
│  Pause our work for a while │     温和，不是断连
│                             │
├─────────────────────────────┤
│  Pulse │ Talk │ Memory │ Me │  ← Bottom Tabs
└─────────────────────────────┘
```

**关键设计决策：**

| 决策 | 理由 |
|---|---|
| 3 个陈述（不是 6 张卡） | 从 6 卡精简到 3 个核心关系维度。 |
| 陈述式（不是表单字段） | "You prefer a quick summary" — 是 Pulse 的观察，不是设置项。 |
| 调整通过对话 | 「想调整？我们聊聊」→ Talk。符合 AI Native：通过对话学习，不填表单。 |
| "Take a break" 替代 "Sign Out" | 温和。是暂停关系，不是断开连接。 |
| 标题 "How we work together" | 不是 "Settings" / "Preferences"。是关系，不是配置。 |

---

## 5. Navigation Flow

### 完整导航图

```
                    ┌──────────────────────┐
                    │      App Open         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │     Pulse (Home)     │  ← 默认首页
                    │                      │
                    │  AI 简报 + Daily Brief│
                    │  + Prompt Entry      │
                    └──┬────────┬──────────┘
                       │        │
          tap Prompt   │        │ tap "Review changes"
          Entry        │        │
                       ▼        ▼
                    ┌──────────────────────┐
                    │    Talk (Conversation)│  ← 产品核心
                    │                      │
                    │  全屏对话             │
                    │  Pulse 主动发起       │
                    │  嵌入辅助卡片         │
                    └──────────┬───────────┘
                               │
                               │ tab: Pulse / Memory / Me
                               ▼
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   Pulse     │  │   Memory    │  │     Me      │
    │   (tab)     │  │   (tab)     │  │   (tab)     │
    │             │  │             │  │             │
    │  返回首页   │  │  Pulse 讲故事│  │ 工作方式    │
    └─────────────┘  └─────────────┘  └──────┬──────┘
                                           │
                                           │ "Let's talk"
                                           ▼
                                    ┌─────────────┐
                                    │    Talk     │
                                    └─────────────┘
```

### 导航规则

| 起点 | 动作 | 终点 | 类型 |
|---|---|---|---|
| App 启动 | — | Pulse | 默认 |
| Pulse | 点击 Prompt Entry | Talk | Tab 切换 |
| Pulse | 点击 "Review changes" | Talk | Tab 切换（带上下文） |
| Pulse | 点击底部 Talk tab | Talk | Tab 切换 |
| Pulse | 点击底部 Memory tab | Memory | Tab 切换 |
| Pulse | 点击底部 Me tab | Me | Tab 切换 |
| Talk | 点击底部 Pulse tab | Pulse | Tab 切换 |
| Memory | 点击底部 Talk tab | Talk | Tab 切换 |
| Me | 点击 "Let's talk" | Talk | Tab 切换（带对话上下文） |
| Me | 点击 "Take a break" | alert（模拟） | 对话式确认 |

**关键：没有"返回"按钮，因为所有页面都是 tab。** 用户通过 tab 切换，不需要 push/pop 导航栈。这更符合 AI Companion 的扁平结构——不存在"层级"，只有不同的对话场景。

---

## 6. User Journey

### 场景 A：下班后打开 App（日常使用）

```
时间     用户动作              看到                       感受
──────────────────────────────────────────────────────────────
0s      打开 App              "Good evening."             "嗨"
1s      看到 Pulse            ● "I'm here."               "AI 在"
                             "monitoring 3 projects"
2s      读简报                "I'm working on your        "哦，在做 auth"
                             auth module..."
3s      读到需要关注           "Can you take a look at     "需要我看"
                             users.ts?"
5s      点击 "Review changes"  → Talk                      进入对话
6s      看到对话上下文         Pulse: "I've been working    "接着说"
                             on your auth module..."
8s      回复                  "Sure, what did you         开始对话
                             change?"
10s     Pulse 回复            "Updated password             "好，看懂了"
                             validation..."
12s     看到 Pulse 主动说      "By the way, I noticed       "还能这样？"
                             test coverage dropped..."
15s     回复                  "Yeah, look into it"         授权
20s     切到 Memory tab        读到 "We started working      "它真的记得"
                             together in March..."
30s     满意，关闭 App                                     "这就是伙伴"
```

**体验节奏：感知（0-2s）→ 了解（2-5s）→ 对话（5-15s）→ 回顾（20-30s）**

### 场景 B：早上打开 App，想了解昨天

```
时间     用户动作              看到                       感受
──────────────────────────────────────────────────────────────
0s      打开 App              "Good morning."             "早"
2s      看到 Daily Brief      "I spent most of yesterday  "昨天做了什么"
                             improving authentication."
5s      读到细节              "Everything went well       "顺利就好"
                             except one migration."
8s      看到 Pulse 的建议      "I'd like you to review it"  "好，我去看看"
10s     点击 Prompt Entry     → Talk                      进入对话
12s     输入                  "Show me the migration"      开始工作
```

### 场景 C：调整工作方式

```
时间     用户动作              看到                       感受
──────────────────────────────────────────────────────────────
0s      切到 Me tab           "How we work together"      "这是设置？"
2s      读到关系陈述           "You prefer a quick summary" "嗯，它了解我"
                             "I'll ask before production"
5s      想改 "When to check"   点击 "Let's talk"            "通过聊天改"
8s      → Talk                "I want to adjust when       对话式配置
                             you check with me..."
```

---

## 7. 为什么这样更符合 AI Native

### 7.1 范式对比

| 维度 | V1（Dashboard 范式） | V2（AI Native 范式） |
|---|---|---|
| **首页主内容** | 5 张卡片堆叠 | Pulse 的一段话 |
| **了解 AI 状态** | 点 Mission 页查看 | 首页直接读 Pulse 的话 |
| **了解今天做了什么** | Activity 页 12 条日志 | Daily Brief 一段话 |
| **和 AI 交流** | Prompt Entry + alert | 全屏 Talk 对话 |
| **AI 主动性** | Insights 静态卡片 | Pulse 在对话里主动提起 |
| **记忆呈现** | 数据库记录 + 计数 | 叙事故事 |
| **配置偏好** | 6 张设置卡片 | 3 句关系陈述 + 对话 |
| **导航结构** | 层级（Dashboard → Mission） | 扁平（4 个 tab，无层级） |
| **信息重复** | 同一信息在 4 页出现 4 次 | 每条信息只在一个地方 |
| **人称** | 混合（第一人称文案 + 第三人称结构） | 统一第一人称对话 |

### 7.2 删除 Mission 的理由

| 问题 | V1（Mission 独立页） | V2（融入 Pulse） |
|---|---|---|
| 信息入口 | 用户需点进第二层页面 | 首页直接看到 |
| 信息形态 | Jira ticket（Identity + Brief + Notes） | 一段对话 |
| 重复 | 和 Pulse 的 Mission Card 重复 | 只有一个版本 |
| AI 感 | AI 给你看工单 | AI 在跟你说话 |

**本质：** Mission 页的存在意味着「了解 AI 在做什么」是一个需要主动进入的动作。AI Native 要求 AI 主动告诉你，不需要你去找。

### 7.3 删除 Activity 的理由

| 问题 | V1（Activity 日志流） | V2（Daily Brief） |
|---|---|---|
| 信息形态 | 12 条带时间戳的 row items | 一段自然语言总结 |
| 感受 | DevOps console | AI 在做每日汇报 |
| 价值密度 | 低（大量冗余时间戳） | 高（只有关键信息） |
| AI 主动性 | 被动展示记录 | 主动总结 |

**本质：** 真正的 AI Companion 不会给你看 12 条 "I did this, I did that"。它会给你一句话总结："今天我帮你完成了 3 件事，其中 1 件需要你看一下。"

### 7.4 新增 Talk 的理由

| 问题 | V1（无对话页） | V2（Talk） |
|---|---|---|
| 交互深度 | alert（单条，无上下文） | 全屏对话（连续，有上下文） |
| AI 主动性 | 等用户输入 | Pulse 主动发起 |
| 信息承载 | 单条消息 | 对话流 + 嵌入辅助 |
| 核心地位 | 缺失 | 产品心脏 |

**本质：** AI Companion 的核心是对话。没有全屏对话界面，就只是「有输入框的 Dashboard」，不是 companion。Talk 让产品从「看卡片 + 点按钮」变成「和 Pulse 说话」。

### 7.5 Memory → Story 的理由

| 问题 | V1（数据库式 Memory） | V2（故事式 Memory） |
|---|---|---|
| 感受 | 查询结果 | 回忆录 |
| 计数 | "3 memories" / "12 projects" | 无计数，只有叙事 |
| 分类 | Knowledge / Preferences / Projects | 无分类，故事自然包含 |
| 时间 | 时间戳 | "last March" / "last week" |
| AI 人格 | 数据存储 | 有记忆的伙伴 |

**本质：** 有记忆的 AI 和有数据库的 AI 是不同的。前者会讲故事，后者会查询记录。Story 让 Memory 从「系统功能」变成「AI 的人格特征」。

### 7.6 Identity → Me 的理由

| 问题 | V1（Settings 式 Identity） | V2（关系式 Me） |
|---|---|---|
| 配置项 | 6 张卡片（Working Style / Communication / Decision / Knowledge / Safety / Relationship） | 3 句关系陈述 |
| 交互 | 表单 / toggle | 对话式调整 |
| 感受 | SaaS 设置页 | 和 AI 定义关系 |
| Sign Out | "Disconnect Pulse" | "Take a break" |
| 标题 | "Identity" / "Settings" | "How we work together" |

**本质：** AI Companion 通过对话了解你，不是让你填表单。Me 从「配置 AI」变成「定义我们的关系」。

---

## 8. 信息去重对照

V1 的核心问题是同一信息在 4 个页面重复。V2 的信息归属：

| 信息 | V1 出现位置（重复） | V2 唯一归属 |
|---|---|---|
| "Refactoring auth module" | Pulse / Mission / Activity / Memory | Pulse 的简报（1 处） |
| "Review users.ts" | Pulse callout / Mission / Activity / Conversation | Talk 对话（1 处） |
| "Auth module 完成了" | Pulse Today / Mission Brief / Mission Notes / Activity | Pulse 的 Daily Brief（1 处） |
| "Test coverage dropped" | Pulse Insights / Activity / Memory | Talk 对话里 Pulse 主动提起（1 处） |
| "I'm monitoring 3 projects" | Pulse / Identity Knowledge | Pulse 的简报（1 处） |

**原则：每条信息只在一个地方出现，其他地方通过对话引用。**

---

## 9. 实现清单（供后续 HTML 实现参考）

> 本文档不修改任何 HTML/CSS。以下为实现时的页面映射。

| V2 页面 | 文件 | V1 来源 | 改动 |
|---|---|---|---|
| Pulse | `pages/dashboard.html` | dashboard.html（重写） | 删除 Today's Work / Insights 卡片，Mission 内容融入对话，新增 Daily Brief 段 |
| Talk | `pages/conversation.html`（新文件） | 无（全新） | 全屏对话流 + 常驻输入栏 |
| Memory | `pages/history.html` | history.html（重写） | 删除列表/计数/分类，改为叙事长文 |
| Me | `pages/settings.html` | settings.html（重写） | 6 卡 → 3 陈述，"Let's talk" → Talk |
| 删除 | `pages/job-detail.html` | job-detail.html | 不再使用（Mission 已融入 Pulse） |
| 删除 | `pages/jobs.html` | jobs.html | 不再使用（Activity 已变 Daily Brief） |

| Sidebar / Bottom Tab | 变化 |
|---|---|
| Sidebar nav | 5 项 → 4 项（Pulse / Talk / Memory / Me） |
| Bottom tab bar | 3 项 → 4 项（Pulse / Talk / Memory / Me） |
| Pulse 的 Prompt Entry | 点击 → `navigateTo('pages/conversation.html')` |

---

## 10. 总结

```
V1: 5 个页面讲 1 个故事（Dashboard 范式）
    Dashboard → Mission → Activity → Memory → Identity
    每个页面是同一信息的不同视图

V2: 1 段话 + 1 次对话（AI Native 范式）
    Pulse 简报 → Talk 对话 → Memory 故事 → Me 关系
    每个页面是不同维度，不是不同视图

本质转变：
    从「用户管理 AI」到「AI 主动陪伴」
    从「看卡片」到「和 Pulse 说话」
    从「5 个页面 1 个故事」到「4 个维度 4 种关系」
```

**一句话：语言已经到位了，V2 让骨架也到位。**
