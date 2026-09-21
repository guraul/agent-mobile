# Showcase2 参考图布局适配分析报告

**日期：** 2026-09-20
**参考图：** `showcase2/reference/1.jpeg`（三屏：首页 / 对话 / 语音）
**分析对象：** Showcase2 布局重构（Pulse 首页 + Talk 页）
**性质：** 只读分析，不涉及代码修改
**关联文档：** `docs/redesign/PRODUCT_MODEL.md`、`showcase2/SHOWCASE2_VISUAL_SPEC.md`、`showcase2/SHOWCASE2_IMPLEMENTATION.md`

---

## 0. 结论摘要

1. 参考图值得移植的是**布局语法**，不是它的业务内容。它的三张"功能卡"（Generate Document / Organizing Meeting / Generating Visual）、四枚工具 chips（Generate AI Image 等）、Recent Chat 列表、语音页，都与 Pulse 的产品语义不符，**不应搬运**。
2. Pulse 的功能现实是：**AI 主动汇报（Pulse = "I noticed"）→ 用户显式进入 Talk（"Let's think"）**，三段语义 Needs You → Suggested → Noticed，无 tab、无会话历史、无语音。
3. 适配的正确姿势是 **"语法照搬、内容替换、语义保留"**：header 解剖、hero 两行、非对称 bento、双端区块头、2×2 chips、胶囊 + 独立圆钮 composer、描边气泡 —— 这些结构可以照搬；每一个槽位填 Pulse 的真实条目与既有交互。
4. 有 **6 个决策点**必须先确认（见 §6），其中最关键的是 **Pulse 底部 composer 的语义**：它是"进入 Talk 的入口"，还是"可在 Pulse 直接输入"？参考图首页底部的答案是前者（Start New Chat 胶囊 + 麦克风钮，不是输入框），`PRODUCT_MODEL.md` §23 也支持前者。当前 Showcase2 实现是后者。
5. 参考图的第二色相（紫粉渐变光痕、品红高光）与"单一紫色 accent"红线冲突，需修正为纯紫罗兰表达；语音页整体不进入本轮范围（`SHOWCASE2_IMPLEMENTATION.md` §16 Stop Condition）。

---

## 1. 分析范围与方法

**输入材料**

| 材料 | 用途 |
|---|---|
| `reference/1.jpeg` | 布局语法来源（三屏） |
| `PRODUCT_MODEL.md` | 产品语义裁决（Pulse / Talk / Attention / L1-L2-L3 / Chat Input 原则） |
| `SHOWCASE2_VISUAL_SPEC.md` | 现有视觉规范（token、质感、Talk 规格） |
| `SHOWCASE2_IMPLEMENTATION.md` | 范围与 Stop Condition |
| `mock/actions.ts` | 真实条目数据（1 Needs You + 1 Suggested + 3 Noticed） |

**方法**

1. 逐屏拆解参考图的区块顺序、容器解剖、尺寸与颜色；
2. 将每个元素标注为 **A = 通用布局语法**、**B = 业务特化内容**、**C = 装饰**；
3. 对照 Pulse 的真实功能与产品模型，输出 **照搬 / 改造 / 拒绝** 三类结论；
4. 汇总开放决策点与实施风险。

---

## 2. 参考图布局语法拆解

### 2.1 左屏（首页）

从上到下：

```text
状态栏
Header        圆形头像 40 + 两行文字栈（小字在上 / 大字在下）+ 右侧 44 圆形菜单钮
Hero          「Smart Help,」/「Instantly for You」两行大标题（32–34 / 700）
Bento         1 大卡（约 165×250，跨两行）+ 右列 2 小卡（约 155×118）；gap 12；圆角 24
              · 每卡：圆/方图标 tile（40–44）+ 两行标题 + 右下角 → 箭头
区块头        「Recent Chat」左 + 「See All」右（双端结构）
Chips 网格    2×2（约 180×46，近胶囊圆角 16–18，左图标 + 文字）
底部          「Start New Chat」胶囊（约 248×54）+ 右侧麦克风圆钮（54，渐变 + 外发光）
```

**关键观察：**

- 首页底部是 **"开始新对话" CTA**，不是通用输入框 —— 这一点与 `PRODUCT_MODEL.md` §23（"Pulse is not a generic chat screen"）完全一致。
- Bento 是 **非对称的 1 大 + 2 小**，大卡是唯一带图像背景的"视觉焦点"。
- 小卡的信息量很低：图标 + 两行短标题 + 箭头 —— 是"入口"，不是"内容详情"。
- 区块头与 chips 之间用 14pt 间距，节奏紧凑；大区块之间 24pt。

### 2.2 中屏（对话）

```text
居中标题 Header   左圆形返回 44 + 中央「Chat Bot」17–18/600 + 右圆形菜单 44
消息流            用户气泡（右，紫调描边气泡）
                  AI 气泡（左，28 发光 orb 头像 + 同款描边气泡）
                  气泡下挂操作 chips（Copy / Share，约 62×26 小胶囊）
                  带图 AI 复合气泡（图片内容 + 文字）—— 参考图特有
底部 Composer     输入胶囊 + 发送钮（发送球），另有 +/mic 类图标
```

**关键观察：**

- AI 消息是 **"描边气泡 + orb 头像"**，不是无边框文本 —— 这与当前 Showcase2 Talk 的实现（无边框 plain text）相反，是本轮需要改的。
- 用户气泡与 AI 气泡**同款描边**，只靠对齐与头像区分主客。
- 消息级操作 chips 挂在对应气泡下方左侧。

### 2.3 右屏（语音）

```text
居中标题 Header   ← + 「Voice Analysis」 + ☰
状态文字          「Listening...」副标题
巨型 Orb          直径约 240–260（占屏宽 ~65%），强紫光晕
说明文案          4 行居中，渐隐
底部控制条         3 个圆形按钮（旋转/刷新等）
```

**关键观察：** 该屏是"语音会话态"，`SHOWCASE2_IMPLEMENTATION.md` §16 明确禁止实现 voice mode；本轮**不采纳**，仅保留其"AI 状态居中 + 大 orb"作为未来参考。

### 2.4 三分类总表

| 参考图元素 | 分类 | 说明 |
|---|---|---|
| 头像 + 两行文字栈 + 圆形菜单钮 Header | A | 通用身份栏语法 |
| 两行大标题 hero | A | 通用 hero 语法 |
| 非对称 bento（1 大 + 右列 2 小） | A | 通用信息架构语法 |
| 卡片解剖：图标 tile + 标题 + 描述 + 右下箭头 | A | 通用卡片语法 |
| 双端区块头（标签左 + See All 右） | A | 通用区块语法 |
| 2×2 图标 chips 网格 | A | 通用快捷入口语法 |
| 胶囊 + 独立圆形主钮（底部） | A | 通用 composer / CTA 语法 |
| 居中标题 Header（返回 + 标题 + 菜单） | A | 通用二级页标题语法 |
| AI 气泡 + orb 头像 + 消息级 chips | A | 通用对话语法 |
| Generate Document / Organizing Meeting / Generating Visual | B | 参考 App 的功能卡，Pulse 无此业务 |
| Generate AI Image / Summarize This / Build Quick Report | B | 参考 App 的工具入口 |
| Recent Chat + See All | B | 会话历史列表，Pulse 第一版无此概念 |
| Start New Chat | B | "新会话"语义，Pulse 的 Talk 是上下文会话 |
| 带图 AI 复合气泡（图片网格） | B | mock 无媒体消息 |
| Voice Analysis / Listening / 3 圆钮 | B | 语音模式，本期范围外 |
| 大卡上的紫粉流动光痕 | C（强烈） | 引入第二色相（品红），违反单一紫 accent |
| 巨型 orb 强发光 | C（强烈） | 语音页专用；Talk/Pulse 用克制版 |
| 顶部径向紫光 | C（中等） | 可用较克制版本（现有实现已有） |
| 卡片紫色描边 / 圆形按钮淡紫填充 | C（克制） | 可采纳，与现有 token 一致 |

---

## 3. Pulse 功能现实（约束条件）

**页面与导航**

- Pulse 是唯一 root；Talk 经上下文 push 进入；无 tab bar / drawer（`SHOWCASE2_IMPLEMENTATION.md` §4）。
- Talk 是 **上下文会话**：携带 context chip（如 `↳ Preview deployment #412`），不是会话列表中的一个条目。

**三段语义（必须保留）**

| 段落 | 数据（mock 现状） | 语义 | 交付层级（对应 PRODUCT_MODEL） |
|---|---|---|---|
| Needs You | 1 条：Preview deployment #412 is blocked | AI 需要用户决策 | L2/L3（proposal / invitation） |
| Suggested | 1 条：keep an eye on Huabao Medical ETF | AI 提议，需确认 | L2 proposal |
| Noticed | 3 条：fund estimate / pricing-v3 / nightly backup | AI 观察，仅告知 | L1 statement |

**既有交互（不得发明新业务）**

- Needs You：Review / Discuss / Defer
- Suggested：Confirm（→ assignment active）/ Discuss / Dismiss
- Noticed：查看（当前开 Talk；本轮任务改为详情 sheet）
- Composer：输入 → 进入 Talk 并发送

**产品模型的关键约束**

- §23：**Pulse 不是通用聊天屏**，用户不持续在 Pulse 输入，双向对话需显式进入 Talk。
- §20：Pulse 呈现两类内容 —— informational statements（L1）与 Attention renderings（L2/L3），不暴露原始事件流。
- §16.4 / §17：**查看不等于处理**（viewing ≠ handling），打开条目/详情不改变状态 —— 这为"点击条目开详情 sheet"提供了语义安全；同理，**Discuss 不确认**（已有约束）。
- §8.2：Contextual Talk 的 Resume/Create 语义 → Showcase2 里对应"携带 context chip 的 Talk"。

---

## 4. 逐区块适配方案

### 4.1 Header（Pulse）

| 项 | 参考图 | Pulse 适配 |
|---|---|---|
| 左 | 真人头像 40 | **AI orb 40**（发光球体 = AI 身份，替换人像） |
| 中 | "Hi there" / "Jack Johnson" | **"● ATTENTIVE" / "Pulse"**（第一行是 AI 状态，不是问候） |
| 右 | 44 圆形菜单钮（☰） | 同语法照搬，样式用现有 `surfaceElevated + violet border` |

**适配理由：** 参考图的"小字=问候，大字=人名"是社交语义；Pulse 里"小字=状态，大字=AI 名"是存在语义。结构不变，槽位内容替换。

### 4.2 Hero

| 参考图 | Pulse 适配 |
|---|---|
| "Smart Help," / "Instantly for You" | 现有 greeting 拆两行："Good morning," / "Wei." |
| 无副标题 | 现有 AI 语音行（"I kept an eye on things overnight."）作为副行 |

**理由：** 两行 hero 语法照搬；内容使用现有数据，零新增文案。若 greeting 无法自然拆两行，则维持单行（回退规则）。

### 4.3 Bento（核心）

| 参考图 | Pulse 适配 |
|---|---|
| 左大卡 = 图像焦点卡（Generating Visual） | **大卡 = 第一优先级条目**（第一条 open Needs You；为空则第一条 Suggested） |
| 右小卡 = 功能入口（Generate Document / Organizing Meeting） | **小卡 = 后续条目**（Needs You 剩余 + Suggested），点击开详情 sheet |
| 卡内：tile + 标题 + 箭头 | 大卡：tile 44 + 标题 + 描述 + 元信息 + 动作行；小卡：tile 36 + 单行标题 + ↗ |

**数量回退（必须实现，基于真实数据）**

```text
0 条 → 隐藏整个 bento
1 条 → 大卡占满整行（右列隐藏）
2 条 → 大卡 + 右列 1 小卡撑满（当前 mock 的状态）
3+ 条 → 大卡 + 右列 2 小卡
```

**明确拒绝：** 不把 mock 条目包装成"功能卡"（如把 deploy 阻塞做成"Generate Document"式的工具入口），卡内所有信息必须来自 `pulse.needsYou` / `pulse.suggestions`。

**语义映射收益：** 大卡天然承载 L2/L3（需要决策），小卡承载次级提议，与 `PRODUCT_MODEL.md` §21 的"briefing 而非列表"一致。

### 4.4 区块头 + See All（Noticed）

| 参考图 | Pulse 适配 |
|---|---|
| "Recent Chat" + See All | **"NOTICED" + See All** |

**为什么不照搬 Recent Chat：** Pulse 第一版没有会话历史列表（Talk 是单次上下文会话）；Noticed 是唯一"以列表形态存在、且需要浏览全文"的信息（行内截断）。See All 打开一个 Noticed 全量 sheet。

**注意：** See All 的行为是**新增 UI 动作**（查看全部），不是新增业务对象；不改变 mock 状态，符合"只改布局结构"的边界。若认为连这个也超界，可降级为纯视觉元素，但会留下死按钮 —— 建议实现为 sheet。

### 4.5 Quick Actions（2×2 chips）

| 参考图 | Pulse 适配 |
|---|---|
| 工具入口：Generate AI Image / Summarize This / Build Quick Report / Ask Anything | **对话入口**：Summarize overnight / Plan my day / Ask about deploy / Ask anything |

**适配理由：** Pulse 没有工具箱，但"快速开始一次对话"是它真实需要的（弥补 composer 只有一个泛化入口）。每条 chip 的行为统一为 **打开 Talk 并预填 prompt**（不发送、不产生 Assignment）。这些文案是"进入对话的示例问题"，不是业务承诺，实施时可在常量表中配置。

### 4.6 底部区域（composer）

**这是全图最大的语义冲突点。**

| 参考图首页底部 | 当前 Showcase2 | `PRODUCT_MODEL.md` §23 |
|---|---|---|
| "Start New Chat" CTA 胶囊 + 麦克风圆钮（**无输入框**） | docked 可输入 composer，输入后跳 Talk 发送 | "Pulse is not a generic chat screen… 双向对话需显式进入 Talk" |

**两个可选方案：**

- **方案 A（推荐，与参考图和产品模型都一致）：** Pulse 底部做成"入口形态"——胶囊内显示 "Talk to Pulse…" 之类的提示 + 独立的圆形发送钮；点击/聚焦**进入 Talk** 后再输入。Pulse 本身不承载连续输入。
- **方案 B（现状延续）：** 保留 Pulse 可直接输入，提交后进入 Talk 并发送第一条消息。视觉上仍可采用"胶囊 + 独立圆钮"的参考图语法。

**共同视觉规格（两方案一致）：** 胶囊高 52–54 / radius 999 / `#1C1830` + violet border；左 "+"、右 mic；独立圆形发送钮 48（渐变 + 光晕），在胶囊**外侧** 10px。这是参考图语法中最值得照搬的部分。

**Talk 页 composer 无争议：** 它就是真正的输入，直接采用参考图语法（胶囊 + 独立发送钮），发送钮带渐变与光晕（该页唯一与 orb 并列的发光源）。

### 4.7 Talk 页

| 参考图 | Pulse 适配 |
|---|---|
| 左返回 + 居中「Chat Bot」+ 右菜单 | ← + 居中"Pulse" + "● LISTENING" + 菜单 |
| AI 气泡：28 orb + 描边气泡 | 24 orb + 描边气泡（`accentSoft` 填充 + violet 描边） |
| 用户气泡：右对齐描边气泡 | 同语法，`rgba(139,92,246,0.15)` + 边框，右对齐 |
| 气泡下 Copy / Share chips | **Copy / Discuss**（保留现有 Discuss 语义；Share 无业务，不搬） |
| 带图复合气泡 | 不适用（mock 无媒体），保留 Memory/KB chips 作为附件形态 |
| context chip | 保留（`↳ 条目`），这是 Pulse 与参考图最重要的差异点，必须保留 |

**"每组第一条消息带 orb 头像"的细化建议：** 连续 AI 消息只在组首显示 orb；其余消息左缩进对齐。这既符合参考图语法，也避免多个发光 orb 破坏"每屏 ≤2 发光源"的纪律。Copy/Discuss 只挂在该组最新一条消息下（与参考图一致）。

---

## 5. 与现有规范的关系

| 文档 | 关系 |
|---|---|
| `SHOWCASE2_VISUAL_SPEC.md` §9（Pulse 层级与 wireframe） | 布局部分被本轮的 bento 结构**替代**；颜色 token、质感章节继续有效 |
| `SHOWCASE2_VISUAL_SPEC.md` §10（Talk 规格） | "AI 用无边框文本、拒绝气泡"的条款被本轮改为**描边气泡**（遵循参考图）；需同步修订 spec 文字，否则文档自相矛盾 |
| `SHOWCASE2_VISUAL_SPEC.md` §6（动作语言） | 继续有效：Review/Discuss/Confirm 的层级与"每屏最多一个 filled primary"不变 |
| `SHOWCASE2_VISUAL_SPEC.md` §7/§8（orb/动效） | 继续有效；orb 40 为大尺寸新档位，呼吸 3.6s 不变 |
| `PRODUCT_MODEL.md` §20–23 | bento = "briefing 而非列表"的实现；Noticed = L1；确认 composer 语义（§4.6） |
| `SHOWCASE2_IMPLEMENTATION.md` §14/§16 | 不新增页面/导航/语音，符合 |

---

## 6. 开放决策点（实施前需确认）

| # | 决策 | 选项 | 建议 |
|---|---|---|---|
| D1 | Pulse 底部 composer 语义 | A 入口形态（点击进 Talk）/ B 可输入（提交后进 Talk） | **A**：同时符合参考图与 `PRODUCT_MODEL` §23；若选 B 需接受与产品模型的张力 |
| D2 | See All 行为 | 打开 Noticed 全量 sheet / 纯视觉无动作 | 打开 sheet（避免死按钮；不改变 mock 状态） |
| D3 | 小卡点击 | 详情 sheet / 进入 Talk | sheet（`PRODUCT_MODEL` §16.4：viewing ≠ handling；Talk 留给明确的 Discuss/Review） |
| D4 | 图标体系 | 手绘 View 线性图标 / 文字符号 | 手绘（无新依赖；`@expo/vector-icons` 未安装且禁止新增） |
| D5 | tile 形状 | 参考图是圆形 tile；本任务文本要求"圆角方形 tile radius 14" | 以任务文本为准（方形），全 app 容器语法统一为"方形 tile + 44 圆形按钮"两种 |
| D6 | 发光数量 | Talk 多条 AI 气泡均带 orb，会超过"每屏 ≤2" | orb 本体恒有微光，但仅组首 orb 带 glow 层；Copy/Discuss 只挂最新组 |

---

## 7. 明确不采纳清单

| 不采纳项 | 理由 |
|---|---|
| Generate Document / Organizing Meeting / Generating Visual | 参考 App 的假功能，Pulse 无此业务 |
| Generate AI Image / Build Quick Report | 工具入口，Pulse 不是工具目录 |
| Recent Chat / 会话历史列表 | Pulse 第一版无会话历史概念；Talk 是上下文会话 |
| "Start New Chat" 的"新会话"文案 | Talk 不强调"新 vs 旧"，强调上下文 |
| 带图消息网格 / Share / Download | mock 无媒体消息 |
| 右屏 Voice Analysis 整屏 | `SHOWCASE2_IMPLEMENTATION.md` §16 Stop Condition |
| 紫粉渐变光痕、品红高光 | 违反"单一紫色 accent、无第二色相"红线 |
| 底部 Home 指示条 | 系统 UI，非应用元素 |
| 横向溢出的滚动 chips | Pulse 用固定 2×2 网格（4 条固定入口） |
| 大卡图像背景（照片/插画素材） | 需引入图片素材与第二种视觉语言；Pulse 大卡用紫调表面 + 语义图标 |

---

## 8. 实施风险

1. **bento 回退逻辑**：mock 当前只有 2 条（1 Needs You + 1 Suggested），验收时只会看到"大 + 1 小"；需手工验证 0/1/3 条分支（可用 store 直接构造，不做持久化改动）。
2. **图标自绘质量**：无 vector-icons，线性图标需用 View 组合绘制，小尺寸（16–20）下易糊；建议先实现 8–10 个必需图标并逐个截图核对。
3. **PulseScreen / TalkScreen 属大改**：交互（Review/Confirm/Defer/Dismiss/发送/返回/滚动恢复/context chip）必须逐条回归；建议改动后跑现有 7 个 mock 单测 + Playwright 交互截图。
4. **sheet 新增**：详情 sheet / Noticed sheet 是新的 UI 层次，需复用现有 sheet 模式（scrim + handle + backgroundElevated），避免引入新视觉语言。
5. **发光纪律**：一旦 AI 气泡全面改描边 + orb，Talk 页发光点会变多；必须按 D6 收敛，否则违背"depth, not decoration"。

---

## 9. 建议实施顺序（供后续执行）

1. 确认 §6 决策（尤其 D1、D4、D5）；
2. 主题层补充：新增必要 token（如 tile 尺寸、sheet 样式复用），不动现有色板；
3. `Icon` 组件（手绘线性图标）；
4. PulseScreen 重构：Header → Hero → Bento（含回退）→ Quick Actions → Noticed（双端头）→ Composer；
5. TalkScreen 重构：居中 Header → 气泡消息流 → 消息级 chips → Composer（胶囊 + 独立发送钮）；
6. 回归：`tsc --noEmit`、7 个单测、lint、web export + Playwright 截图逐项核对验收标准。

---

## 附：参考图 vs Pulse 一页对照

| 参考图 | Pulse 对应物 | 关系 |
|---|---|---|
| 真人头像 40 | AI orb 40 | 替换 |
| "Hi there / Jack Johnson" | "● ATTENTIVE / Pulse" | 改写（状态 + 名字） |
| "Smart Help, Instantly for You" | "Good morning, / Wei." + AI 语音行 | 替换内容，语法照搬 |
| Generating Visual（大卡） | Needs You 大卡（真实条目 + 动作 chips） | 槽位复用，内容替换 |
| Generate Document / Organizing Meeting | Suggested / 剩余 Needs You 小卡 | 槽位复用，内容替换 |
| Recent Chat + See All | NOTICED + See All | 语义替换 |
| Generate AI Image 等 chips | Summarize overnight 等对话入口 | 语义替换 |
| Start New Chat + mic 圆钮 | Talk 入口 / composer（见 D1） | 待决策 |
| Chat Bot 居中标题 | Pulse + ● LISTENING | 替换 |
| Copy / Share chips | Copy / Discuss chips | 部分替换（Share 无业务） |
| 带图气泡 | Memory / KB chips（现有） | 保留现有表达 |
| Voice Analysis 页 | —— | 拒绝（范围外） |
