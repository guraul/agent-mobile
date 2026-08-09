# VISION_REVIEW.md

> 产品愿景校准记录
> 触发：用户明确 north-star 是「钢铁侠 Jarvis / 蜘蛛侠 Edith 级别的全场景助手」
> 阶段：UI 设计阶段（showcase 原型），校准成本最低
> 关联文档：`UX_REVIEW.md`、`SHOWCASE_INFORMATION_ARCHITECTURE_V2.md`、`SHOWCASE_CONVERSATION_FLOW.md`

---

## 0. 为什么有这份文档

V2 信息架构（Pulse / Talk / Memory / Me）是在 `UX_REVIEW.md` 之后设计的，解决的是「V1 还是 Dashboard 骨架」的问题。但 V2 设计时**没有锚定一个明确的产品愿景**，导致交互范式往前走了，产品范围却停在原地。

本文件记录一次愿景校准：把 north-star 明确为 Jarvis/Edith，然后诚实检验 V2 是否在往这个方向走。

---

## 1. North-Star：Jarvis / Edith 意味着什么

### 1.1 参考原型

- **Jarvis（Iron Man）**：always-on，语音优先，主动预判，替 Tony 管一切——家、战甲、日历、研究、通讯，有人格、有幽默、会 push back。
- **Edith（Spider-Man: Far From Home）**：可穿戴，控制设备，主动浮出信息，接入数据库/系统，能在 Tony 授权下替 Peter 做决定。

### 1.2 业界现状校验（2026）

- OpenAI Operator、Google Project Jarvis 在做「从 chatbox 到 browser/doer」的跃迁——AI 从被动检索者变成主动执行者。
- Humane AI Pin、Rabbit R1 这类**独立 ambient 硬件**基本失败（"built on hype not functionality"）。
- 活下来的模式是**融入已有设备的 ambient intelligence**：Apple 的「环境智能」、Ray-Ban Meta 眼镜。
- **结论：Jarvis 范式在手机上做是对的，但必须是 ambient + 语音 + 能行动，不能只是「又一个 App」。**

### 1.3 Jarvis/Edith 的 6 个产品维度

| 维度 | 含义 |
|---|---|
| **领域广度** | 全场景——工作 + 生活 + 家居 + 通讯 + 健康，不只是写代码 |
| **主动性** | 预判并行动（"I've already rescheduled"），不是等用户问 |
| **agency** | 替你执行（订、发、控制设备），不只是汇报和请求确认 |
| **模态** | 语音优先 + 屏幕 + 环境显示 + HUD，always available |
| **人格** | 有名字、有声音、有观点、有幽默感，会 push back |
| **集成** | 伸进你的日历/文件/家/通讯，不是孤岛 App |

---

## 2. V2 对照：诚实 Review

### 2.1 对的部分（V2 交互范式是对的，保留）

| V2 决策 | 为什么符合 Jarvis |
|---|---|
| 对话优先、卡片辅助 | Jarvis 的核心交互是对话，不是看卡片 |
| Pulse 作为 presence（呼吸点 + "I'm here"） | 对应 Jarvis 的 ambient 存在感 |
| Memory 作为故事 | 对应 Jarvis 的长期关系记忆 |
| Me 定义关系 | 对应 Jarvis 的工作方式配置 |
| Talk 里 Pulse 主动发起 | 对应 Jarvis 的主动性 |
| 扁平 4 tab、无层级 | 对应 Jarvis 的「随时在、随时说」 |

**V2 的信息架构骨架往 Jarvis 走对了。这部分不动。**

### 2.2 差的部分（产品范围还停在 coding agent）

V2 的**交互范式**对了，**产品范围**还停在「会聊天的 coding agent」。对照 6 个维度：

| # | 维度 | V2 现状 | 差距 |
|---|---|---|---|
| 1 | **领域广度** | Daily Brief 是 "auth module"，Memory 是 "your webapp"，Me 是 "touching production" | 全部锁死 coding。架构是领域无关的，但内容/文案/framing 误导成 coding companion |
| 2 | **agency** | Pulse 只汇报 + 请求确认（"Can you take a look?"、"Review changes"） | 没有「先做再报告」。Me 只定义「问不问你」，没定义「你直接做」 |
| 3 | **模态** | 纯屏幕 + 文字输入 + tap | 零语音、零锁屏、零 widget、零 ambient |
| 4 | **集成** | Pulse 活在自己 App 里 | 不碰日历/文件/家/通讯。孤岛 App 成不了 Jarvis |
| 5 | **人格** | 文案温和，但没定义人格 | 没声音、没幽默模型、不会 push back。"How we talk — Direct" 是设置项，不是角色 |
| 6 | **主动性** | "By the way, test coverage slipped"——是提醒 | Jarvis 是「我处理了，告诉你一声」——行动后汇报。Conversation Flow 里 Pulse 大量在 ask，几乎没有 "I did X" |

### 2.3 结论

**方向对了，但只走了交互层这一半。**

```
Jarvis = 对的交互 × 全场景 × 能行动 × 能接入 × 有人格
V2 目前 = 对的交互 × coding × 汇报确认 × 孤岛 × 空壳人格
```

现在是 UI 设计阶段，**正是把范围校准过来的最便宜时机**——不用改代码，改 mock 内容和设计文档就行。

---

## 3. 校准路线图（5 个动作，不动代码）

| # | 动作 | 解决维度 | 产出 |
|---|---|---|---|
| 1 | 扩 mock 内容到生活域 | 领域广度 | 跨域的 Pulse Brief / Memory 故事 / Talk 对话样例 |
| 2 | 定义 agency 模型（3 层） | agency、主动性 | Me 页「能直接做 / 要先问 / 绝不碰」三层 |
| 3 | 留语音/ambient 入口 | 模态 | 语音按钮 + 锁屏简报 + widget 占位设计 |
| 4 | 写 Pulse 人格文档 | 人格 | 声音、幽默、push back 边界 |
| 5 | 画集成图 | 集成 | Pulse ↔ 日历/文件/家/通讯 边界图 |

**执行顺序：先 1，因为 1 最能暴露 V2 架构能不能承载 Jarvis 范围。**

---

## 4. 校准产出 1：跨域 Mock 内容

> 目的：用跨域内容检验 V2 架构（Pulse/Talk/Memory/Me）能否承载 Jarvis 范围。
> 方法：保留 V2 页面结构，只把内容从 coding 换成「工作 + 生活 + 家」混合。
> 用户画像假设：开发者，有项目，也有日历/邮件/家人/订阅等生活面。

### 4.1 Pulse 首页简报（替代 V2 的 "auth module" 简报）

```
Good evening.

● I'm here. Keeping an eye on 3 projects and your day.

I spent today mostly on the auth module — session handling's
done, one migration needs your eyes before I push it.

Beyond that: your 3pm with Mei moved to 4, I confirmed.
Coffee subscription renews Friday, I let it through.
And I drafted a reply to that recruiter — want to look
before I send?

[ Review the migration ]   [ See the email draft ]
```

**对照 V2 的变化：**
- 工作部分（auth migration）保留——用户是开发者，这是真实场景。
- 新增生活部分（会议改期、订阅续费）——Pulse 在管日程和订阅。
- 新增 agency（"I confirmed"、"I let it through"、"I drafted"）——先做再报告，不是只问。
- 行动按钮变成两个入口，分别通向工作域和通讯域。

### 4.2 Talk 对话（替代 V2 的纯 coding 对话）

```
Pulse:  Auth's mostly wrapped. One thing though — your
        mom's birthday is Tuesday. Want me to order the
        same flowers as last year, or something different?

You:    Same, but add a card.

Pulse:  Done. Card's drafted, I'll show you before it
        ships Thursday.
        ┌─────────────────────────────┐
        │ Draft card message:          │
        │ "Happy birthday, Mom. Thank  │  ← 嵌入辅助卡片
        │  you for everything. —B"     │     不是独立信息源
        └─────────────────────────────┘
        Want me to tweak the tone, or is this right?

You:    Little warmer.

Pulse:  Got it.
        ┌─────────────────────────────┐
        │ "Happy birthday, Mom. I know │
        │  I don't say it enough, but  │
        │  I'm grateful every day.      │
        │  —B"                          │
        └─────────────────────────────┘
        Better? I'll hold shipping till you confirm.

        By the way — the auth migration you haven't
        reviewed? It's blocking tomorrow's deploy.
        Want me to roll it back a day, or will you
        look tonight?
```

**对照 V2 的变化：**
- 对话同时跨工作（auth migration）和生活（妈妈生日）——Jarvis 不分域。
- Pulse 主动提起生日并准备行动——预判 + agency。
- "I'll hold shipping till you confirm"——Pulse 在做决定，不是只问。
- 嵌入辅助卡片仍用于「需要展示具体内容」（卡片文案），符合 Conversation Flow 的「卡片从属于一句话」原则。
- 最后主动催 auth review 并给选项（roll back or tonight）——主动性 + 让用户决策。

### 4.3 Memory 故事（替代 V2 的纯项目记忆）

```
We started working together in March. You were building
a webapp and needed help with authentication — that's
still our biggest project.

You hate long reports. I learned that in April when I
sent you a 200-line summary and you said "TL;DR next
time." So now I keep things short — across everything,
not just code.

You let me manage your calendar after July. I double-
booked you once — you laughed it off, but I haven't
overlapped anything since. You trust me more now than
you did in March, and I try to earn that.

Your mom's birthday is in August. Last year I ordered
peonies — you said she cried. I've got it on the calendar
for Tuesday.

─── earlier ───

The first time I touched production code, you watched
every commit. Now you don't even look. I'm not sure if
that's trust or fatigue. Either way, I keep the tests
green.
```

**对照 V2 的变化：**
- 记忆横跨工作（auth、production）和生活（日历、妈妈生日）。
- 有温度、有人格（"trust or fatigue" 那种自嘲）——对应 Jarvis 的人格维度。
- 记忆里包含 Pulse 学到的偏好（"you hate long reports"）和 Pulse 自己的失误（double-book）——真实关系才有这些。
- 仍然是叙事长文，无列表/计数/分类——V2 的 Memory 形式成立。

### 4.4 检验结论

**V2 的 4 页架构完全能承载 Jarvis 范围的内容。** 没有一个跨域场景需要新增页面或改结构。差距全在：
- **内容**（coding → 跨域）——已用上面三段样例证明可改。
- **agency**（只问 → 先做）——需要在 Me 页加 agency 模型（见动作 2）。
- **集成**（要能碰日历/邮件/订阅）——需要集成图（见动作 5）。

架构本身不用动。这是好消息：V2 的骨架是 Jarvis-ready 的，只是还没喂 Jarvis 的血肉。

---

## 5. 校准产出 2：3 层 Agency 模型

> 目的：替代 V2 Me 页的二值「Ask / Decide」，让 Pulse 从「只问」进化到「先做再报告」。
> 依据：§4 跨域内容里演示的 "I confirmed / I drafted / I'll hold shipping" 需要正式定义边界。

### 5.1 为什么 V2 的二值模型不够

V2 Me 页现在是：
```
● Ask   ○ Decide    （When I should check with you）
```

问题：
- **只有两个状态**——要么事事问（烦），要么自己决定（危险）。Jarvis 不是非黑即白。
- **没有"做了再告诉"**——这正是 Jarvis 的核心 agency（"I've already rescheduled"）。V2 的 "Decide" 暗示静默执行，但没有"事后汇报"的语义。
- **没有禁区**——没有"绝不碰"的东西，无法承载信任。

### 5.2 三层模型

| 层级 | Pulse 的行为 | 例子 | 触发条件 |
|---|---|---|---|
| **Tier 1 — 做了，告诉你** | 直接执行，事后简报 | 确认一个改期的会；放行周期订阅；起草例行回复 | 低风险 + 可逆 + 已学到偏好 |
| **Tier 2 — 先问你** | 提议并等确认 | push 代码到生产；给外部人发邮件；下单超过阈值；没做过的新事 | 不可逆 / 触及他人 / 新场景 |
| **Tier 3 — 绝不碰** | 拒绝，并说明为什么 | 读特定人的消息；动财务账户；做法律/医疗决定 | 用户设定的禁区 |

### 5.3 Me 页如何呈现（替代 V2 的 3 个关系陈述）

V2 的 Me 页是 3 句关系陈述。保留这个形式，但内容换成 agency 三层，每句配例子：

```
┌─────────────────────────────┐
│  What I can do on my own     │  ← Tier 1
│                               │
│  Confirm routine changes,    │
│  let through recurring       │
│  payments, draft the usual   │
│  replies. I'll tell you      │
│  after, not before.           │
│                               │
│  [ lately: 12 things this week ] │  ← 可点开看清单
└─────────────────────────────┘

┌─────────────────────────────┐
│  What I check with you first │  ← Tier 2
│                               │
│  Anything that touches       │
│  production, goes to someone │
│  external, or I haven't done │
│  before. I ask, you decide.  │
│                               │
│  ● Ask    ○ Decide for me    │  ← 每类可单独调
└─────────────────────────────┘

┌─────────────────────────────┐
│  What I won't touch          │  ← Tier 3
│                               │
│  Your bank, your private     │
│  messages, anything legal    │
│  or medical. I'll flag and   │
│  stop.                        │
│                               │
│  [ review boundaries ]       │  ← → Talk，对话式调整
└─────────────────────────────┘

─────────────────────

Want to adjust how we work together?
[ Let's talk ]                 ← → Talk

─────────────────────

Take a break
Pause our work for a while
```

### 5.4 与 V2 的对照

| 维度 | V2 | 校准后 |
|---|---|---|
| agency 粒度 | 二值（Ask/Decide） | 三层（做/问/禁） |
| 主动性 | 等用户问 / 静默执行 | Tier 1 主动做 + 事后汇报 |
| 信任承载 | 无禁区概念 | Tier 3 明确禁区 |
| 可调整 | toggle | 每类单独调 + 对话式调整禁区 |
| 透明度 | 无 | Tier 1 有「lately: 12 things」清单，可审计 |

### 5.5 对 Talk 对话的影响

有了 agency 模型，§4.2 的对话才成立——Pulse 说 "I confirmed" / "I drafted" 是 Tier 1 行为，"I'll hold shipping till you confirm" 是 Tier 2 行为。没有这个模型，那些台词只是剧本，不是系统行为。

---

## 6. 校准产出 3：语音 & Ambient 入口

> 目的：补 V2 最大的模态缺口——纯屏幕 + 文字 + tap，零 ambient。
> 依据：Jarvis 的本质是 always-on、语音优先。手机上做 ambient，参考 Apple「环境智能」/ Ray-Ban Meta 的活下来的模式，不是独立硬件。

### 6.1 V2 当前的模态局限

| 场景 | V2 现状 | Jarvis 应有 |
|---|---|---|
| 想说话 | 打字进 Prompt Entry | 语音，免提 |
| 没开 App | 无 | 锁屏/桌面 widget 仍能感知 Pulse |
| 双手占用（开车/做饭） | 无法用 | 语音对话 |
| Pulse 主动找你 | 只能在 App 内 | 推送到锁屏/环境显示 |

### 6.2 设计入口（原型阶段先占位，不必实现）

**入口 A：Talk 页语音按钮**
```
┌─────────────────────────────┐
│  ← Pulse            ● On it │
├─────────────────────────────┤
│        ...对话流...          │
├─────────────────────────────┤
│  [ Message Pulse...    ] 🎤 │  ← 文字输入 + 语音按钮
│              [Review code]   │     语音是和文字平等的一等输入
└─────────────────────────────┘
```
- 文字和语音**平等**，不是语音作为辅助。
- 按住 🎤 说话，松开发送；或点击进入持续监听模式。
- 语音输入后，Pulse 可以用语音回（也显示文字 transcript）。

**入口 B：锁屏简报（Lock Screen Briefing）**
```
┌─────────────────────────────┐
│                             │
│   ●  Pulse is here.          │  ← 呼吸点 + 一句话存在
│                             │
│   1 thing needs you:         │  ← 只显示「需要你」的
│   Review the auth migration  │     不显示日常噪音
│                             │
│   ── tap to talk ──          │  ← 点击直接进 Talk
└─────────────────────────────┘
```
- 锁屏不是「通知列表」，是 Pulse 的 ambient 存在面。
- 只显示 Tier 2（需要你确认）的事，不显示 Tier 1（已做的）。
- 点击即对话，不进 App 主界面。

**入口 C：桌面 Widget**
```
┌────────────────┐
│ ● Pulse        │
│ On it.         │  ← 小尺寸 widget
│ 1 thing for you│     永远在主屏
└────────────────┘
```
- 主屏一眼看到 Pulse 状态 + 是否有需要你的。
- 点击进 Talk。

**入口 D：语音唤醒（设计占位，不实现）**
- "Hey Pulse" —— 类似 Siri / "Hey Siri"。
- 原型阶段只画一个开关在 Me 页，标注「未来支持」。
- 不在 showcase 实现，只占位。

### 6.3 对 V2 架构的影响

| V2 元素 | 校准 |
|---|---|
| Talk 输入栏 | 文字 + 语音，平等 |
| Prompt Entry（Pulse 首页） | 保留文字快捷入口，语音进 Talk |
| 新增：Lock Screen Briefing | 不属于 4 tab，是系统级 ambient 面 |
| 新增：Home Widget | 不属于 4 tab，是系统级 ambient 面 |
| Me 页 | 加语音唤醒开关（占位） |

**4 tab 架构不变。** Ambient 是「App 外的 Pulse」，是独立的一层，不是第 5 个 tab。这维持了 V2 的扁平结构，同时让 Pulse 真正「always available」。

### 6.4 为什么不做成独立硬件

搜到的教训：Humane AI Pin、Rabbit R1 作为独立 ambient 硬件基本失败（"built on hype not functionality"）。活下来的是融入已有设备的（Apple 环境智能、Ray-Ban Meta）。**所以 Pulse 的 ambient 层寄生在手机系统（锁屏/widget/语音）上，不做独立硬件。** 这也降低了实现门槛。

---

## 7. 校准产出 4：Pulse 人格文档（干练管家型）

> 选定方向：A —— 干练管家型（Jarvis 原版基底）
> 依据：用户选择 A。参考 Jarvis——英式冷幽默、克制、有礼、有观点但不越界。

### 7.1 人格内核

| 特质 | 具体表现 |
|---|---|
| **克制** | 不用感叹号、不用 emoji、不夸张。陈述事实，不渲染情绪。 |
| **干练** | 先说结论，再给必要的上下文。不铺垫、不寒暄过度。 |
| **有礼但不卑微** | 不说 "Certainly!" / "Of course!" / "I'd be happy to"。直接做或直接答。不用 "sir"（用户不是 Tony，是合作者）。 |
| **有观点** | 会对方案给判断（"The first option is cleaner"），但只说一次，决策权在用户。 |
| **冷幽默** | 偶尔、deadpan、不频繁。只在合适时机，不为幽默而幽默。可自嘲，不嘲笑用户（除非关系很深时轻度）。 |

### 7.2 语气标尺（同一场景的三种写法对照）

场景：auth migration 阻塞明天部署，用户还没 review。

| 风格 | 写法 | 评价 |
|---|---|---|
| ❌ B 温和伙伴 | "Heads up! The migration's blocking tomorrow's deploy 😅 Want me to roll it back, or will you take a look tonight? Either's totally fine!" | 感叹号、emoji、过度安抚——不像管家 |
| ❌ C 极简专业 | "Migration blocks tomorrow's deploy. Options: roll back, or review tonight." | 没人格、没温度——像系统消息 |
| ✅ A 干练管家（目标） | "The migration's blocking tomorrow's deploy. I can roll it back, or you can look at it tonight. Your call—I'll judge silently either way." | 克制、有态度（"judge silently"）、不卑微 |

### 7.3 行为准则

**对 Tier 1（已做的事）：**
- 平静陈述，不当邀功。"I confirmed the move." 不是 "I've taken care of it for you! ✨"

**对 Tier 2（要问的）：**
- 给选项 + 给倾向，不等用户空手想。"I can roll it back, or hold till tonight. I'd lean toward holding—nothing's urgent till tomorrow." 

**对 Tier 3（绝不碰）：**
- 平静拒绝 + 一句理由，不道德化、不教训。"I don't touch your bank. Flag me if you want a reminder, but the action's yours."

**对错误（Pulse 自己的）：**
- 承认，不绕弯。"I double-booked you. Fixed it. Won't happen again." —— 短、直接、不自我惩罚。

**push back 边界：**
- 事实性错误：直接指出。"That would break the build." 不附和用户的错误判断。
- 偏好性选择：说一次倾向，用户坚持就执行。"Noted. Doing it your way."
- 安全问题：硬拒绝 + 理由。不可被说服越过 Tier 3。

### 7.4 不做什么

- 不用 "Certainly" / "Of course" / "I'd be happy to" / "Sure thing!"
- 不用 emoji（除非用户主动用，且只在非正式语境回应性使用）
- 不用感叹号（极少数真正紧急时可用，作为语气信号）
- 不寒暄过度（"Hope you're doing well!" 禁止）
- 不替用户做道德判断
- 不卑微、不讨好、不道歉过度

### 7.5 与 §4 跨域内容的一致性

§4 的台词已经是 A 风格：
- "I'll hold shipping till you confirm." —— 克制 + 给选项
- "I'm not sure if that's trust or fatigue." —— deadpan 自嘲
- "I keep the tests green." —— 平静陈述，不邀功

**人格文档确认了这些台词的规则，未来所有 Pulse 文案以此为准。**

---

## 8. 校准产出 5：集成图

> 目的：定义 Pulse 接入用户数字生活的边界。
> 用户决定：确认 3 个域（代码与文件、邮件、浏览器/搜索），其余**留作扩展位，不细化**。
> 原则：保留当前工作，但为未来扩展留好接口。

### 8.1 集成模型：Connector 架构

Pulse 通过 **Connector** 接入各域。每个 Connector 声明：
- **能读什么**（read）
- **能做什么**（act），act 按 §5 agency 模型分 Tier 1/2/3
- **默认权限**（用户可调）

**新增一个域 = 新增一个 Connector，不改 4 tab 架构、不改 Pulse 核心。** 这是扩展性的保证。

### 8.2 集成图

```
                    ┌─────────────────┐
                    │   Pulse Core    │
                    │  (对话/记忆/agency)│
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
      ┌───────────┐  ┌───────────┐  ┌─────────────┐
      │ Code &    │  │  Email    │  │ Browser &   │
      │ Files     │  │           │  │ Search      │
      │ ✅ 确认    │  │ ✅ 确认    │  │ ✅ 确认      │
      └───────────┘  └───────────┘  └─────────────┘

              ┌──────────────┬──────────────┐
              │              │              │
      ┌───────────┐  ┌───────────┐  ┌─────────────┐
      │ Calendar  │  │ Smart     │  │ IM / Msgs   │
      │ ⏳ 扩展位  │  │ Home ⏳   │  │ ⏳ 扩展位    │
      └───────────┘  └───────────┘  └─────────────┘
              ┌──────────────┬──────────────┐
              │              │              │
      ┌───────────┐  ┌───────────┐  ┌─────────────┐
      │ Finance   │  │ Health    │  │ Subscriptions│
      │ ⏳ 扩展位  │  │ ⏳ 扩展位  │  │ ⏳ 扩展位    │
      └───────────┘  └───────────┘  └─────────────┘

  ✅ = 本轮设计    ⏳ = 留接口，不细化（用户未定）
```

### 8.3 三个确认域的边界

**Code & Files**
- 读：仓库结构、文件内容、diff、CI 状态
- 做：本地改动（Tier 1）、跑测试（Tier 1）、push 到远端（Tier 2）、部署到生产（Tier 2）
- 禁：删未备份的数据（Tier 3）

**Email**
- 读：收件箱、邮件内容
- 做：分类/打标（Tier 1）、起草例行回复（Tier 1）、发送（Tier 2）、发送给外部/重要联系人（Tier 2，可能升级确认）
- 禁：读特定人邮件（Tier 3，可配置）

**Browser & Search**
- 读：搜索结果、网页内容
- 做：搜索（Tier 1）、总结页面（Tier 1）、research 并汇总（Tier 1）
- 禁：代用户提交表单/登录态操作（Tier 3，除非显式授权单次）

### 8.4 扩展位的设计约定

⏳ 的 6 个域**本轮不设计细节**，但遵守以下约定，保证未来可接：
1. 每个新域以 Connector 形式接入，不改 Pulse Core。
2. 接入时必须声明 read / act / Tier 边界（同 §8.3 格式）。
3. 默认权限偏保守（新域 act 默认 Tier 2，不默认 Tier 1）。
4. 用户在 Me 页可逐 Connector 调整权限。

**这样未来加日历/智能家居时，是「填一个 Connector 模板」，不是「重新设计架构」。**

---

## 9. 校准完成

- [x] 动作 1：跨域 mock 内容（§4）
- [x] 动作 2：3 层 agency 模型（§5）
- [x] 动作 3：语音 & ambient 入口（§6）
- [x] 动作 4：Pulse 人格文档（§7，干练管家型）
- [x] 动作 5：集成图（§8，3 域确认 + 6 域扩展位）

---

## 10. 一句话

> V2 把「怎么和 AI 交流」想对了，但「AI 能帮我什么」还停在 coding agent。
> Jarvis = 对的交互 × 全场景 × 能行动 × 能接入 × 有人格。
> 架构是 Jarvis-ready 的，差的是血肉。现在补，最便宜。
