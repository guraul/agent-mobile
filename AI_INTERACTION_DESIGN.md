# Home 页面重设计：从 Agent Manager 到 AI Companion

---

## 1. 页面名称建议

| 候选 | 含义 | 调性 |
|---|---|---|
| **Pulse** | AI 的生命脉搏，随时感知状态 | 活的、呼吸的、随时在 |
| **Aria** | 独唱/咏叹调，AI 的声音 | 个人化、有温度、有声音感 |
| **Today** | 每日陪伴，时间感知 | 日常的、亲切的、有上下文 |

推荐 **Pulse**——它暗示 AI 不是工具列表，而是一个有心跳的存在。用户打开 App 就是感受 AI 的脉搏。

---

## 2. 页面信息架构

```
┌─────────────────────────────┐
│  ScreenHeader              │
│  "Pulse"  /  时间感知问候     │  ← 顶部区域
├─────────────────────────────┤
│                             │
│  ┌─────────────────────┐   │
│  │  Presence Card       │   │  ← AI 状态区域（核心）
│  │  AI 第一人称表达      │   │     "I'm here..."
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Mission Card       │   │  ← Assistant 卡片区域
│  │  当前最重要任务       │   │     AI 正在做的事
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Insights Card      │   │  ← AI 主动建议
│  │  AI 发现的问题/建议   │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │  Today's Work       │   │  ← 最近活动区域
│  │  今日完成摘要         │   │     不是 log，是 AI 的笔记
│  └─────────────────────┘   │
│                             │
├─────────────────────────────┤
│  ┌─────────────────────┐   │
│  │  Prompt Entry       │   │  ← 用户操作入口
│  │  "What can I do?"   │   │
│  └─────────────────────┘   │
├─────────────────────────────┤
│  BottomTabBar              │
└─────────────────────────────┘
```

### 各区域职责

| 区域 | 职责 | 设计原则 |
|---|---|---|
| 顶部区域 | 问候 + AI 在线指示 | 1 秒内知道 AI 在 |
| AI 状态区域 | AI 第一人称表达当前状态 | 不是数据监控，是对话感 |
| Assistant 卡片区域 | 当前最重要的一件正在做的事 | 只展示 1 个，不是列表 |
| 最近活动区域 | AI 的“笔记”——今天做了什么 | 摘要，不是 log feed |
| 用户操作入口 | 发送指令 | 永远可达，随时对话 |

---

## 3. 核心 UI Card 设计

---

### Card 1: Presence Card（存在卡）

**用户看到的内容：**
- AI 的大号状态指示灯（amber pulsing dot）
- AI 的第一人称问候语："Good evening. I'm monitoring 3 projects."
- 当前总体状态 Pill：Running / Idle / Needs Attention

**AI 视角表达：**
> "I'm here."
> "2 projects quiet, 1 needs your attention."

不是 "3 agents online"，而是 "I'm here"——AI 是一个存在，不是一组进程。

**使用组件：**
```
Card (comfortable)
├── StatusDot (lg, running)
├── Text (headline): "Good evening"
├── Text (body): "I'm monitoring 3 projects."
└── StatusPill (warning): "1 needs attention"
```

---

### Card 2: Mission Card（任务简报卡）

**用户看到的内容：**
- 当前最重要正在执行的任务
- Agent badge（哪个 AI 在执行）
- 进度描述（自然语言，非百分比）
- 如果需要审批：StatusCallout 突出显示
- 操作按钮：Review / Pause

**AI 视角表达：**
> "I'm refactoring your auth module."
> "14 files analyzed, 3 modified so far."
> "I need you to review changes to users.ts before I continue."

不是 "Task: auth-refactor | Status: Running | Progress: 40%"，而是 AI 在向你简报。

**使用组件：**
```
Card
├── AgentBadge (opencode)
├── Text (body-strong): "Refactoring auth module"
├── Text (mono-caption): "~/projects/webapp"
├── StatusPill (running): "Working"
├── StatusCallout (warning): "Approval needed - users.ts"
│   ├── Text (title): "Review Required"
│   └── Text (body): "I've modified src/api/users.ts..."
├── Button (primary): "Review"
└── Button (ghost): "Pause"
```

---

### Card 3: Insights Card（洞察卡）

**用户看到的内容：**
- AI 主动发现的问题或建议
- 不是报错，是观察——"我注意到..."
- 可操作的 ghost button 让用户决定是否跟进

**AI 视角表达：**
> "I noticed your test coverage dropped 7% this week."
> "Want me to look into it?"

AI 有上下文记忆，会主动观察并建议。不是等用户问，而是主动提供价值。

**使用组件：**
```
Card
├── StatusCallout (idle) - 用 idle 色调表示"观察"，不紧急
│   ├── Icon (md): eye/observation icon
│   ├── Text (title): "I noticed something"
│   └── Text (body): "Test coverage dropped to 78% this week."
└── Button (ghost): "Investigate"
```

---

### Card 4: Today's Work（今日完成卡）

**用户看到的内容：**
- 今天 AI 完成了什么——2-3 条摘要
- 不是 log feed，是 AI 的"日记"
- 每条用 StatusDot 标记结果

**AI 视角表达：**
> "Today I completed 3 tasks:"
> - Auth refactor - done
> - API tests - 142 passed
> - Migration - failed, needs your input

AI 在做总结，不是在 dump 日志。

**使用组件：**
```
Card
├── Text (caption-strong): "TODAY"
├── ListRow
│   ├── StatusDot (success)
│   ├── Text (body-strong): "Auth module refactor"
│   └── Text (caption): "42 files changed"
├── ListRow
│   ├── StatusDot (success)
│   ├── Text (body-strong): "API test suite"
│   └── Text (caption): "142 passed"
├── ListRow
│   ├── StatusDot (error)
│   ├── Text (body-strong): "Database migration"
│   └── Text (caption): "Failed - needs input"
└── Text (caption, muted): "3 tasks · 2h total"
```

---

### Card 5: Prompt Entry（指令输入卡）

**用户看到的内容：**
- 永远可见的输入框
- 占位符："What can I help with?"
- 发送按钮
- 上方有 2-3 个快捷指令 chip（用 Button ghost 实现）

**AI 视角表达：**
> 不说话，而是"等待"——输入框是 AI 在等你的指令

这是对话的入口，不是搜索框。搜索是找已有的东西，这是创造新的指令。

**使用组件：**
```
Card
├── Input: "What can I help with?"
├── Button (primary, icon): send arrow
└── 快捷指令（横向排列）:
    ├── Button (ghost): "Review code"
    ├── Button (ghost): "Run tests"
    └── Button (ghost): "Summarize"
```

---

## 4. 用户进入 App 后 10 秒体验流程

```
时间    用户看到                      用户感受
─────────────────────────────────────────────────────
0s     页面加载                       "打开了"
       顶部："Good evening"
       大号 amber dot 在呼吸

1s     Presence Card 出现              "AI 在"
       "I'm monitoring 3 projects."    不是列表，是一个存在
       StatusPill: "1 needs attention"

2s     Mission Card 出现               "哦，在做什么"
       "Refactoring auth module"       AI 在简报，不是在报状态码
       StatusCallout: "Review needed"

4s     目光移到 Insights Card           "AI 发现了什么"
       "Test coverage dropped 7%"     不是我查的，AI 主动告诉我的
       Ghost button: "Investigate"

6s     看到 Today's Work               "今天做了不少"
       3 条摘要，2 成功 1 失败           不是 log，是总结

8s     目光到达 Prompt Entry            "我可以让它做点什么"
       "What can I help with?"        输入框在等我
       快捷按钮：Review / Tests / Summarize

10s    用户决定：                      开始交互
       - 点 "Review" 去审批             或
       - 输入新指令                     或
       - 点 "Investigate" 看洞察
```

**体验设计意图：**

| 秒数 | 意图 |
|---|---|
| 0-2s | **感知 AI 存在** - 不是打开工具，是见到伙伴 |
| 2-4s | **知道 AI 在做什么** - 简报感，不是监控感 |
| 4-6s | **获得 AI 的主动建议** - AI 有上下文，不只是执行 |
| 6-8s | **回顾今日成果** - 摘要感，不是日志流 |
| 8-10s | **准备发出指令** - 对话入口永远可达 |

核心节奏：**感知 -> 知道 -> 被建议 -> 回顾 -> 行动**

---

## 5. 传统 Agent App vs JARVIS 风格 App UI 差异

| 维度 | 传统 Agent App | JARVIS 风格 App |
|---|---|---|
| **首页主内容** | Agent 列表（5 张卡片） | AI 状态卡（1 张，第一人称） |
| **信息组织** | 所有 Agent 平铺 | 只突出最重要的 1 件事 |
| **状态表达** | "OpenCode: Running" | "I'm working on..." |
| **人称** | 第三人称（它/系统） | 第一人称（I）+ 对用户（you） |
| **活动展示** | 实时 log feed | 每日摘要（3 条） |
| **主动性** | 等用户操作 | AI 主动提供建议（Insights Card） |
| **用户角色** | 管理者，监督多个 worker | 伙伴，与 AI 对话 |
| **视觉重心** | 数据密集，卡片网格 | 单焦点 + 留白，呼吸感 |
| **操作入口** | 点击卡片 -> 详情页 | 输入框 + 快捷指令 |
| **情感调性** | 机械、监控、管理 | 个人、陪伴、对话 |
| **信息密度** | 高（一眼看到 5+ 任务） | 中低（一眼看到 AI 在做什么） |
| **时间感知** | 无（静态列表） | 有（Good evening / Today） |

### 核心转变

```
传统:  用户 -> 查看 Agent 列表 -> 选择一个 -> 查看详情 -> 操作

JARVIS: 用户 -> 感知 AI 存在 -> 知道 AI 在做什么 ->
        获得建议 -> 直接对话/操作
```

**本质区别：** 传统 App 把 AI 当进程管理；JARVIS App 把 AI 当伙伴对话。前者是工具，后者是关系。
