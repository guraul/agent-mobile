# Pulse Showcase - 产品体验 Review

> Review 视角：Senior Product Designer + AI Product Lead
> Review 目标：这个 App 是否真的像一个 AI Companion

---

## 1. 整体产品定位

**结论：方向对了，但还没走完。**

四个页面的第一人称语言体系已经建立——"I'm here"、"I'm improving your authentication flow"、"I know your workflow"、"Your AI companion"。这是一个好的开始。

但问题在于：**语言换了，信息架构没换。**

把 "Dashboard" 改成了 "Pulse"，把 "Jobs" 改成了 "Activity"，把 "Job Detail" 改成了 "Mission"。但底下的信息结构仍然是：

- Dashboard 上有 Mission Card
- Activity 是日志流
- Mission 是任务详情页
- Memory 是历史记录页
- Identity 是设置页

**这不是 AI Companion 的信息架构，这是 Agent Manager 换了一套文案。** 真正的 AI Companion 不会让你去看一个叫 "Mission" 的页面来了解它在做什么——它会在对话里直接告诉你。

### 仍然像后台的页面

| 页面 | 仍然像什么 | 为什么 |
|---|---|---|
| **Mission** | Jira ticket detail | Mission Identity Card + AI Brief (Completed/Current/Next) + Mission Notes 是典型的任务详情页结构 |
| **Activity** | DevOps activity log | 12 条带状态点的列表，每条有路径 + 时间戳，就是 console log 换了第一人称 |
| **Pulse Identity** | SaaS settings page | Working Style / Communication / Decision Preferences / Knowledge / Safety / Relationship —— 六张卡片排成一列，这是典型的设置页 |

### 真正有 AI 陪伴感的页面

| 页面 | 做得好的地方 |
|---|---|
| **Pulse (Home)** | Presence Card 的 "I'm here." 有陪伴感；Insights Card 的 "I noticed something" 有主动感 |
| **Memory** | Memory Overview 的 "I know your workflow" 有记忆感 |

但即使是这两个页面，陪伴感也只停留在文案层面。**交互模式仍然是"看卡片"而不是"和 Pulse 对话"。**

---

## 2. 第一次打开 App 的 30 秒

**用户打开 Pulse，看到的是：**

1. 顶部 "Good evening." 问候
2. Presence Card："I'm here." + "I'm monitoring 3 projects." + "Last active: just now" + "Something needs your eyes"
3. Mission Card：agent badge + "Refactoring authentication module" + "Authentication flow" + "On it" + "I've reviewed the auth module and updated 3 files so far." + Review Required callout + Review / Pause 按钮
4. Insights Card："I noticed something" + "test coverage slipping" + Investigate 按钮
5. Today's Work：3 个 row items + "3 things done today"
6. 底部 Prompt Entry + 3 个 chip

**问题：信息过载。**

30 秒内用户被塞了 5 张卡片，每张卡片里还有 3-5 个信息元素。用户不知道该先看哪里。

### 应该删掉的 Card

| Card | 理由 |
|---|---|
| **Today's Work** | 和 Mission Card 信息重复。Mission Card 已经说了 "I've reviewed the auth module and updated 3 files so far"。Today's Work 又列了一遍 Auth module refactor、API test suite、Database migration。**这是同一个信息的两种表达方式。** |
| **Insights Card（当前位置）** | 不是说 Insights 不好，而是它现在作为第三张卡片出现，打断了"用户关心 Mission → 去看 Mission"的流。Insights 应该融入对话，而不是作为独立卡片。 |

### Card 顺序应该怎样

如果保留 3 张卡片，顺序应该是：

1. **Presence**（我在、我在做什么）
2. **需要你关注的事**（Mission Card 里的 Review Required）
3. **Prompt Entry**（你来问我）

Insights 和 Today's Work 应该被融合或移到 Activity 页。

---

## 3. 仍然像 SaaS Dashboard 的地方

### Mission 页 = Jira Ticket

- "Mission Identity Card" = ticket header（标题 + 状态 + assignee）
- "AI Brief Card" with Completed / Current / Next = ticket progress
- "Mission Notes" = ticket comments / activity log
- "Approval Required" = PR review

**这不是 AI 在跟你说话，这是 AI 在给你看一个工单。**

### Activity 页 = DevOps Console

12 条带状态点的 row items，每条有 `~/projects/webapp · 2m ago`。虽然文案改成了第一人称（"I've been analyzing..."），但信息密度和呈现方式仍然是日志流。

**真正的 AI Companion 不会给你看 12 条 "I did this, I did that"。它会给你一句话总结："今天我帮你完成了 3 件事，其中 1 件需要你看一下。"**

### Pulse Identity = SaaS Settings

六张卡片纵向排列：Working Style、Communication、Decision Preferences、Knowledge、Safety Boundaries、Working Together。

**这是典型的 Settings 页结构。** 真正的 AI Companion 应该通过对话来了解你的偏好，而不是让你填一个表单。

---

## 4. 仍然像 Task / Execution / Running 的文案

| 位置 | 当前文案 | 问题 | 建议 |
|---|---|---|---|
| Mission - AI Brief | "Completed" / "Current" / "Next" | 典型的 task status labels | "I've done" / "I'm on" / "I'll do" |
| Mission - AI Brief | "Current Focus" | 像 focus mode / sprint goal | "Where I am" 或直接融入对话 |
| Mission - Mission Notes | "MISSION NOTES" (all caps) | 像 ticket activity log label | "What I've done so far" 或删除 |
| Mission - Mission Identity | "Authentication flow" (subtitle) | 像 ticket category tag | 融入对话，不需要独立标签 |
| Mission - Conversation | "LATEST EXCHANGE" | 像 chat log label | 删除或改为更自然的过渡 |
| Activity | "What I've been doing" | 还好，但仍然像 activity report | "Here's what happened" 或让 Pulse 主动简报 |
| Pulse - Today's Work | "TODAY" | 像 calendar / todo app label | 删除整个 card |
| Pulse - Mission Card | "Review Required" | 像 CI/CD gate | "Can you take a look?" |
| Pulse Identity | "Decision Preferences" | 像权限矩阵 | "When to check with you" |
| Pulse Identity | "Safety Boundaries" | 像合规策略 | "Things I'll always ask about" |
| Pulse Identity | "Working Style" | 像 preference setting | "How you like to work" |
| Pulse Identity | "Proceed Automatically" | 像系统权限 | "Go ahead on your own" |
| Mission | "Review Changes" / "Ask AI" | 像 PR review buttons | "Show me" / "Explain" |
| Memory | "Knowledge" (section title) | 像知识库标签 | "What I know about you" |
| Memory | "RECENT MEMORIES" | 像数据库记录标签 | 删除 label 或 "Things I learned" |

---

## 5. 增强 AI Presence 的地方

### 当前最大的 Presence 问题

**Pulse 没有声音。**

每个页面都有 Prompt Entry（输入框），但 Pulse 从不主动说话。所有信息都是通过卡片静态展示的。真正的 AI Presence 应该有：

| 现在 | 应该 |
|---|---|
| 卡片展示 "I'm here." | Pulse 主动说一句话（比如顶部是一段对话气泡，而不是卡片） |
| Insights Card 静态展示 | Pulse 主动发起对话："I noticed your test coverage has been slipping. Want me to look into it?" |
| Mission Card 展示状态 | Pulse 主动汇报："I've been working on the auth module. There's one thing I need you to check." |
| Activity 页是日志流 | Pulse 用一段话总结今天，而不是 12 条 row items |

### 具体建议

1. **Pulse 首页应该是对话，不是卡片。** 把 Presence Card 改成一个对话气泡——Pulse 说一段话，用户可以回复。Mission 信息融入这段话里，而不是独立卡片。

2. **每个页面的 Pulse 都应该"说话"。** 不是用卡片展示信息，而是 Pulse 用自然语言简报。卡片只用于辅助展示（比如需要展示代码 diff 时）。

3. **Pulse 应该有语气变化。** 紧急时语气急促，空闲时语气轻松。现在所有状态下的语气都一样平淡。

4. **Pulse 应该有主动性。** 现在 Pulse 只在 Mission Card 里说 "I need your approval"。真正的 companion 会在首页主动提出："There's something I want to talk to you about."

---

## 6. 信息重复

### 严重重复

| 信息 | 出现位置 | 次数 |
|---|---|---|
| "Refactoring authentication module" | Pulse Mission Card, Mission Identity Card, Activity item 8 | 3 次 |
| "需要你 review users.ts" | Pulse Mission Card callout, Mission Approval Required, Activity item 3, Mission Conversation | 4 次 |
| "Auth module 完成了" | Pulse Today's Work item 1, Mission AI Brief "Completed", Mission Notes item 1, Activity item 1 | 4 次 |
| "Test suite 全通过" | Pulse Today's Work item 2, Activity item 4 | 2 次 |
| "Database migration 需要输入" | Pulse Today's Work item 3, Activity item 5 | 2 次 |
| "I'm monitoring 3 projects" (Pulse) vs Knowledge "12 Projects" (Identity) | Pulse 和 Identity | 矛盾 |

**同一个信息在 4 个页面里重复出现了 4 次。** 用户从 Pulse 看到 "auth module refactor"，点进 Mission 还是 "auth module refactor"，去 Activity 还是 "auth module refactor"。

这不是 AI Companion，这是**同一个工单在不同视图里反复出现**。

### 重复的根本原因

**5 个页面在讲同一个故事的不同视角，而不是 5 个不同的故事。**

- Pulse 在讲 "auth module 在进行中"
- Mission 在讲 "auth module 的详情"
- Activity 在讲 "auth module 的历史"
- Memory 在讲 "我记得 auth module 的偏好"
- Identity 在讲 "我在 auth module 上的工作风格"

**一个 AI Companion 不需要 5 个页面来讲一个故事。它应该在一次对话里讲完。**

---

## 7. 页面数量

### 应该减少

| 当前页面 | 建议 |
|---|---|
| **Mission（独立页）** | 不应该作为独立页面。Mission 信息应该融入 Pulse 首页的对话里，或者作为 Pulse 首页的一个展开区域。用户不需要"进入一个页面"来了解 AI 在做什么。 |
| **Activity（独立页）** | 如果 Pulse 首页已经汇报了今天的情况，Activity 作为 12 条日志流是冗余的。应该改为"Pulse 的日记"——每天一段话总结，而不是实时日志。 |

### 应该增加

| 建议页面 | 理由 |
|---|---|
| **Conversation（对话页）** | 真正的 AI Companion 需要一个全屏对话界面。现在的 Prompt Entry 只是一个输入框 + alert。用户无法看到对话历史、无法连续对话。这是 AI Companion 的核心界面，目前缺失。 |
| **Onboarding（首次体验）** | 第一次打开 App 时，Pulse 应该自我介绍："Hi, I'm Pulse. I'll be working on your projects." 并通过对话了解用户。现在的首次体验是直接看到一堆卡片。 |

### 建议的页面结构

| 页面 | 定位 |
|---|---|
| **Pulse**（首页）| 对话式首页。Pulse 主动汇报 + 用户可以对话。不需要卡片。 |
| **Memory** | 保留。但改为"我和你的故事"——时间线式的回忆，不是数据库记录。 |
| **Identity** | 保留。但大幅精简，改为通过对话设置而非表单。 |
| **Conversation** | 新增。全屏对话界面，是和 Pulse 深度交流的地方。 |

**删除 Mission 和 Activity 作为独立页面。** 它们的信息应该融入 Pulse 首页和 Conversation。

---

## 8. Bottom Navigation

### 当前 Tab

```
Home | Activity | Pulse
```

### 问题

1. **"Home" 和 "Pulse" 语义重叠。** 首页就叫 Pulse，Tab 3 也叫 Pulse。用户会困惑：点 "Home" 去的是 Pulse，点 "Pulse" 去的是 Identity。**两个 Tab 都指向 Pulse，但一个是首页，一个是设置。**

2. **"Activity" 作为 Tab 不合理。** 如果 Activity 只是日志流，它不值得占一个 Tab 位。

3. **缺少对话入口。** AI Companion 的核心是对话，但底部没有对话 Tab。Prompt Entry 是内嵌在页面里的，不是独立入口。

### 建议

**方案 A（推荐）：3 Tab**

```
Talk | Memories | Setup
```

- **Talk**：和 Pulse 对话（首页就是对话）
- **Memories**：Pulse 记住的东西
- **Setup**：Pulse 的身份和工作方式

**方案 B：4 Tab**

```
Pulse | Talk | Memories | Setup
```

- **Pulse**：首页（汇报 + 状态）
- **Talk**：全屏对话
- **Memories**：记忆
- **Setup**：身份配置

**不推荐当前的 "Home | Activity | Pulse"**，因为语义混乱且缺少对话入口。

---

## 9. 未来三年 AI Native Mobile App 的最大设计问题

### 核心问题

**这个 App 的底层范式还是"用户管理工具"，只是把界面换了文案。**

真正的 AI Native Mobile App 应该是：

| 传统范式（当前） | AI Native 范式（应该） |
|---|---|
| 用户看卡片了解状态 | Pulse 主动说话汇报状态 |
| 用户点进页面查看详情 | 用户在对话里问，Pulse 回答 |
| 用户在设置页配置偏好 | Pulse 通过对话学习偏好 |
| 信息分散在 5 个页面 | 信息在一次连续对话里流动 |
| 每个 Card 是独立信息单元 | 每段对话自然包含多个信息 |
| 状态用 status pill / status dot 表示 | 状态用 Pulse 的语气和措辞表达 |

### 最大设计问题

**缺少"对话作为第一交互"的设计。**

现在所有页面的主交互都是"看卡片 + 点按钮"。Prompt Entry 在每个页面都有，但它只是一个输入框 + alert，不是真正的对话界面。

**如果这个 App 要成为未来三年的 AI Native Mobile App，它必须是对话优先的——不是"有对话功能的 Dashboard"，而是"以对话为核心、卡片为辅助"的 Companion。**

---

## 10. Top 20 改进建议

### Critical（不解决就不像 AI Companion）

| # | 建议 | 影响 |
|---|---|---|
| 1 | **把首页从"卡片堆叠"改为"对话优先"。** Pulse 主动说一段话（包含状态 + 需要关注的事 + 主动建议），用户可以直接回复。 | 改变整个 App 的范式 |
| 2 | **删除 Today's Work 卡片。** 它和 Mission Card 完全重复，且让首屏信息过载。 | 减少信息冗余 |
| 3 | **把 Mission 信息融入首页对话。** 不要让用户"进入一个页面"才能了解 AI 在做什么。Pulse 应该在首页直接告诉你。 | 减少 1 个页面 |
| 4 | **把 Activity 从"12 条日志流"改为"Pulse 的每日总结"。** 一段话总结今天做了什么，而不是逐条流水账。 | 彻底去掉 DevOps 味道 |
| 5 | **Bottom Tab 语义去重。** "Home"和"Pulse"不能同时存在。改为 Talk / Memories / Setup 或类似结构。 | 解决导航混乱 |
| 6 | **新增全屏对话界面。** AI Companion 的核心是深度对话，目前只有 Prompt Entry + alert，无法连续对话。 | 补齐核心交互 |

### Important（影响产品体验一致性）

| # | 建议 | 影响 |
|---|---|---|
| 7 | **Pulse Identity 从"6 张设置卡片"改为"对话式配置"。** Pulse 通过对话了解你的工作方式，而不是让你填表单。 | 去掉 SaaS 设置页味道 |
| 8 | **消除跨页面信息重复。** auth module 在 4 个页面各出现一次。同一信息只应在一个地方出现，其他地方通过对话引用。 | 减少冗余 |
| 9 | **Mission 页的 Completed/Current/Next 改为对话式汇报。** 不要用 task status labels，而是 Pulse 说："I've finished checking the auth paths, I'm working on session handling now, and next I'll run the tests." | 去掉 Jira ticket 感 |
| 10 | **所有 ALL CAPS 标签改为自然语言或删除。** "TODAY"、"MISSION NOTES"、"LATEST EXCHANGE"、"RECENT MEMORIES" 都是 SaaS dashboard 的标签风格。 | 统一为 AI 对话语气 |
| 11 | **Activity 页的 `~/projects/webapp · 2m ago` 改为自然语言时间。** "earlier today"、"a moment ago"。 | 去掉技术路径感 |
| 12 | **Pulse 应该有语气变化。** 紧急时短促直接，空闲时轻松友好。现在所有状态语气一样平淡。 | 增强 Presence |
| 13 | **Memory 页的 "3 memories" / "12 projects" / "8 preferences" 数字去掉或融入对话。** 不要像数据库计数器。 | 去掉系统指标感 |
| 14 | **"Review Required" → "Can you take a look?"。** 所有 callout 标题从系统化改为对话化。 | 统一语气 |
| 15 | **首屏只保留 2 个信息焦点。** 当前 5 张卡片 = 5 个焦点。应该只有"Pulse 在"和"有件事需要你看"两个焦点。 | 解决信息过载 |

### Nice to Have（提升打磨度）

| # | 建议 | 影响 |
|---|---|---|
| 16 | **增加首次打开的 Onboarding 对话。** Pulse 自我介绍 + 通过对话了解用户。 | 提升首次体验 |
| 17 | **Pulse Identity 的 "Disconnect Pulse" 改为更温和的表达。** "Take a break" 或 "Pause our work"。 | 提升陪伴感 |
| 18 | **Memory 页改为时间线故事而非分类列表。** "Last Monday, we tackled the auth module together..." | 增强叙事感 |
| 19 | **Mission Conversation Card 的 "AI" / "You" 标签去掉。** 用头像区分即可，不需要文字标签。 | 更像真实对话 |
| 20 | **Pulse 的 Insights 不应该单独成卡。** 应该作为 Pulse 主动发起的对话消息出现在首页流里。 | 融入对话流 |

---

**一句话总结：**

> 语言已经到位了，但骨架还是 Dashboard。真正的 AI Companion 不需要 5 个页面来展示 1 个故事——它需要 1 次对话。
