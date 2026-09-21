# Showcase2 只读 IA / 视觉验证报告

**日期：** 2026-09-20
**性质：** 只读验证（未修改任何代码）
**验证对象：** 当前 Showcase2 实际实现（`dist` bundle `index-75a698…`，对应 9-16 visual polish 后的代码）
**截图证据：** `/tmp/opencode/ia-pulse-top.png`、`ia-pulse-bottom.png`、`ia-talk-empty.png`、`ia-talk-user.png`、`ia-talk-reply.png`、`ia-talk-context2.png`
**比对文档：** `reference/1.jpeg`、`SHOWCASE2_VISUAL_SPEC.md`、`SHOWCASE2_IMPLEMENTATION.md`、`docs/redesign/PRODUCT_MODEL.md`

---

## 0. 方法说明

1. 用 Playwright 以 390×844 真实运行当前 Showcase2（静态构建），生成 Pulse 顶部 / Pulse 底部 / Talk 空态 / Talk 发送中 / Talk 回复后 / Talk 上下文六张截图，控制台无 error。
2. 用视觉模型逐张提取实际结构（区块顺序、动作计数、header 解剖、密度）。
3. 与参考图布局语法、VS Spec 条款、Product Model 条款逐项对照。
4. 本文所有"应该/不应该"的结论都同时受两个标准约束：**参考图视觉质量 + Pulse 产品语义**。

**当前实现实测摘要（截图观察）**

| 区域 | 实测 |
|---|---|
| Pulse Header | `orb + "Pulse"` 在左，`● ATTENTIVE` 飘在右侧；无菜单钮 |
| Pulse Hero | 单行大标题 `Good morning, Wei.` + AI 语音副行 |
| Pulse 内容 | `Talk to Pulse` 胶囊 → 全宽 Needs You 卡（黄点+标题+why+meta+Review/Discuss/Defer）→ 全宽 Suggested 卡（紫点+单行+Confirm/Discuss/Dismiss）→ 无边框 Noticed 三行 |
| Pulse Composer | 胶囊内嵌发送钮（发送钮在输入框内部右侧） |
| Talk Header | 左：返回钮；中：orb + `Pulse` + `LISTENING`；右：空 |
| Talk 消息 | AI = 无边框纯文本 + 小紫点；User = 右对齐描边气泡 |
| Talk 上下文 | 输入框上方有 `↳ Preview deployment #412 ✕`（已验证可进入） |
| 动作计数（第一屏） | `Talk to Pulse` 1 + Review/Discuss/Defer 3 + Confirm/Discuss/Dismiss 3 + 发送 1 = **8 个显性动作** |

---

## 1. Current vs Reference（逐维度判定）

| 维度 | Reference | Current | 判定 | 原因 |
|---|---|---|---|---|
| overall composition | header → 两行 hero → 非对称 bento → 区块头 → 2×2 chips → CTA | header → 单行 hero → 全宽卡片 ×2 → 列表 → composer | **ADAPT FROM REFERENCE** | 参考图的"hero 压场 + 区块节奏"值得借；但它的 bento/chips 是工具目录结构，不能整体搬 |
| first visual focal point | hero 大标题（32–34，唯一最大元素） | 大标题 33 存在，但立即被两张**同尺寸卡片**分散（两卡都是 radius 20、同宽、同 padding） | **ADAPT FROM REFERENCE** | 需要"一个焦点"：hero 或 featured item，而当前是"标题 + 两张并列卡"，没有唯一主角 |
| header | 40 头像 + 两行栈（小字上/大字下）+ 44 菜单 | orb + 单行 `Pulse`，状态飘在右侧 | **ADAPT FROM REFERENCE** | 两行栈是正确的 AI presence 语法（见 §7）；当前"状态在右"是 status badge 语法，不是 presence |
| hero | 两行 32–34/700，无副标题 | 单行 33 + AI 副行 | **ADAPT** | 保留副行（AI 语音是 Pulse 语义），两行标题可选：拆行能提高"AI 在说话"的节奏 |
| card composition | 1 大 + 2 小，卡内 tile + 标题 + 箭头 | 2 张同权重全宽卡 + 无边框行 | **REPLACE（但非照搬 bento，见 §2）** | 当前 Needs You 与 Suggested 卡片权重几乎相同（都是圆角卡+同 padding，仅点色/border 不同），最高优先级没有视觉特权 |
| density | 中（bento 集中信息） | 低-中（卡片 + 行，区块间距 36） | **KEEP CURRENT** | Pulse 的"密度递减"（Needs You → Suggested → Noticed）是产品语义；参考图 bento 会提高密度并压平递减 |
| whitespace | 24/14 较紧 | 区块间 36 较松 | **KEEP CURRENT** | AI 叙述需要章节停顿；这是 VS Spec §4 的明确选择 |
| section rhythm | hero→bento 24，bento→区块头 24 | 均匀 36 | **KEEP CURRENT** | 三章节感保留 |
| action hierarchy | 1 主 CTA + 静默 chips | 1 gradient（Confirm）+ 8 个平权 chip/text 动作 | **ADAPT**（偏过载） | 参考图"一个主 + 其余静默"更符合"AI speaks first"；当前 Suggested 卡上有 3 个控件（Confirm/Discuss/Dismiss），Needs You 也有 3 个 |
| composer | 首页 = CTA 胶囊 + 独立圆钮；对话页 = 输入胶囊 + 独立圆钮 | 输入胶囊 + **内嵌**发送钮 | **ADAPT FROM REFERENCE** | 独立圆钮（胶囊外 10px）更清晰，且让"胶囊 = 入口/输入"与"圆钮 = 发送/开始"职责分离；首页形态见 §5 |
| AI identity | 大 orb + AI 消息 orb 头像 | orb（含 halo）但偏小；AI 消息只有小紫点，无头像 | **ADAPT** | orb 已是发光球体，但"AI 在说话"的消息级身份缺失；见 §6 |
| navigation | 三屏状态切换 + 二级返回 | Pulse root → Talk push，无 tab | **KEEP CURRENT**（REJECT tab） | 单 surface + 上下文对话是产品模型核心；参考图的三屏结构不可搬 |
| Talk visual language | 双侧描边气泡 + orb + 消息 chips | AI 无边框文本 + 用户描边气泡 + context chip | **REJECT（AI 气泡）** | 见 §6：双侧气泡 = generic chat app 语法，与"AI 叙述"冲突 |

---

## 2. Bento validation

**前置事实：** 参考图的 bento 是"3 个并列功能入口"（生成图片/文档/会议），彼此**无优先级、无叙事**，它的价值是"入口网格"。Pulse 的条目是"AI 在说话"的不同分量：Needs You（决策请求）、Suggested（提议）、Noticed（告知）。

### Scenario A — 0 actionable

- 规则：隐藏 bento。
- 结果：Pulse = header + hero + Noticed + composer。页面安静，"AI 只说了问候和观察"。
- **判断：自然。** 无内容时 bento 不存在，没有硬伤。

### Scenario B — 1 item

- 规则：大卡占满整行，右列隐藏。
- 结果：本质上是**一张全宽 featured card**，非对称网格消失。
- **判断：自然，但"bento"名不副实。** 这正是建议的 Featured 形态；如果目标是 bento 就不成立，如果目标是"重点条目强化"则成立。

### Scenario C — 1 Needs You + 1 Suggested（**当前 mock 的真实状态**）

- 结果：大卡约 250 高；右列只有 **1 张小卡，高度被拉伸到 250**，而内容只有 36px tile + 一行标题 + 箭头。
- **判断：最不自然。** 容器高度与内容量严重失衡（250 高承载约 60 高的内容），视觉上会出现一块"空荡的右列"。这是 bento 在真实数据下会立刻暴露的问题。

### Scenario D — 1 Needs You + 2 Suggested + Noticed

- 结果：大卡 + 2 小卡，正好是参考图的完整形态，视觉完整。
- **判断：视觉自然，但语义降级。** Suggested 的内容（如 "keep an eye on Huabao Medical ETF"）被压缩成"单行标题 + 箭头"的入口卡形态，信息量被削减；而它其实是 AI 的**提议**，需要被读到并 Confirm。
- 结论：形态漂亮，代价是把"提议"降级成"入口"。

### Scenario E — 多个 Needs You + 多个 Suggested

- 结果：bento 最多容纳 3 条（1 大 + 2 小），**剩余条目无处安放**；它没有列表语义、不能"加载更多"、不能分组。
- **判断：不自然/不可扩展。** 这是 bento 作为固定结构的结构性缺陷。

### 结论

> **"大卡 + 小卡"确实能表达一次优先级（1 条重点 vs 1–2 条次要），但它只在"恰好 3 条、且条目同构为并列入口"时自然。**
> Pulse 的数据是"数量不定 + 分量不同 + 需要被读到 + 需要 AI 叙述"，因此 **bento 不应成为固定结构**。

**推荐变体：Featured + Flow（不叫 bento）**

```text
FEATURED（唯一强容器）
  第一条 Needs You：surfaceElevated + accentBorder + tile 44
  + 标题 + why + meta + Review/Discuss/Defer

SUPPORTING（轻容器行，任意条数）
  其余 Needs You / Suggested：dot + 单行命题 + 右侧一个轻动作（Review/Confirm）
  —— 类似当前 Suggested 卡的"去卡片化"：surface 填充无边框，或无容器行

NOTICED（无容器）
  现有行保持
```

- 容器强度即优先级：**强卡 > 轻行 > 无行**，任意条数都自然。
- 如果坚持要非对称网格，建议只在"Needs You ≥ 2"时出现（那是真正的多决策场景），且仅用于 Needs You 段。

---

## 3. Pulse visual composition 比较

### Composition A（当前）

`Header → Hero → Needs You → Suggested → Noticed → Composer`

- **visual weight**：Needs You 卡与 Suggested 卡几乎等重（同宽、同 radius、同 padding、同字号层）。唯一差异是点色与背景明度，第一眼分不出主次。
- **section density**：三个大写 section label（NEEDS YOUR DECISION · 1 / SUGGESTED / NOTICED）把页面分成三段，像三个模块分区。
- **hierarchy**：hero 之后立刻是卡片；没有"过渡句"，从问候直接跳到事务。
- **whitespace**：区块间距 36，足够，但被标签打断成"模块"而非"章节"。
- **card count**：2 张同规格卡 + 3 行无容器。
- **focal point**：不明确（标题、卡 1、卡 2 竞争）。
- **判断：偏 dashboard。** AI 语音只存在于 hero 副行，之后全部是"模块 + 列表"。

### Composition B（参考图式）

`Header → Hero → Featured/Bento → Noticed → Conversation entry`

- 信息量最少，但把 Suggested 与 Needs You 合并成"Featured"，丢失 L2/L3 的语义差（决策请求 vs 提议），且 Noticed 直接跟在 Featured 后，节奏断层。
- **判断：偏参考图模仿。** 清爽但语义损失大。

### Composition C（推荐）

`Header → AI narrative → Featured item → Supporting items → Noticed → Conversation entry`

- **visual weight**：明确的单一主角（Featured item 最强容器），supporting 只是轻行，Noticed 最轻。
- **section density**：用 AI 第一人称句子替代部分标签（如 "One thing needs your decision."），保留三段语义但把"分区感"换成"叙述感"；标签最多保留 NOTICED。
- **hierarchy**：hero（AI 说话）→ featured（AI 请我决定）→ supporting（AI 建议）→ noticed（AI 告知）→ entry（我回应）。这是**对话弧线**。
- **whitespace**：段落间 28–36，用于"AI 说话的停顿"。
- **card count**：1 张强卡 + N 条轻行（N 可变）+ 3 条无容器。
- **focal point**：Featured item。
- **判断：最像"AI 在与用户交流"。**

**逐项结论：** C > A > B。C 与 A 的差别不在"更好看"，而在**优先级由容器强度表达**，且任意数据量下都成立；A 的"两卡平权"永远无法表达"哪件事更重要"，B 则牺牲了语义。

---

## 4. Quick Actions validation

| 候选 | 分类 | 依据 |
|---|---|---|
| Summarize overnight | **B（勉强）conversational starter** | 有 `aiLine: "I kept an eye on things overnight."` 作为已建立的能力暗示；点击只进 Talk、不产生 Assignment，可接受 |
| Plan my day | **C invented feature** | 产品模型里 Planning 只是示例 domain（Schedule conflict detected）；第一版没有日历/计划能力，chip 会承诺一个未实现的功能 |
| Ask about deploy | **C invented feature（且不稳定）** | 它把某条 mock 内容（deploy 阻塞）提升为全局入口；条目处理后 chip 立刻过时，且"deploy"是具体业务 domain，违反"不绑定 domain" |
| Ask anything | **B 但冗余** | 纯泛化入口，与 composer/Talk 入口完全重复，等于同一动作出现两次 |

**判定：4 条中只有 1 条勉强合格，2 条是 invented feature，1 条冗余。**

### 不绑定具体业务 domain 的 starter 设计（3 条即可）

```text
1. "What did you notice today?"     ← 呼应 Pulse 的自我定义（AI 主动观察）
2. "What should I focus on?"        ← 求助式，AI 用自己的上下文回答
3. "Let's think something through." ← 呼应 Talk 的语义（Let's think）
```

要求核对：

- 不暗示未实现能力：三条都是**向 AI 提问**，不是承诺 AI 能执行某个动作；
- 不创建 canonical concept：没有新名词（不引入 Assignment / Plan / Report）；
- 点击只进入 Talk；
- 不产生 Assignment / Proposal / Attention；
- 不产生新语义。

### 更进一步的建议

**Quick Actions 网格本身是"工具目录"语法（参考图的 dashboard 特征），不建议放在 Pulse 首页。** 更符合产品语义的位置是 **Talk 空态**（进入对话后不知道说什么时给出起点）。Pulse 首页保持单一 conversation entry（见 §5），可以让第一屏显性动作从 8 个降到 5–6 个。

---

## 5. Pulse bottom composer

### Option A：入口形态（Pulse 上点击 → 进入 Talk → 真正输入）

- 优点：
  - 与 `PRODUCT_MODEL §23` 完全一致（"Pulse is not a generic chat screen…双向对话需显式进入"）；
  - 与参考图首页一致（参考图首页底部是 "Start New Chat" CTA + 圆钮，**不是输入框**）；
  - Pulse 表面不存在"随时可打字"的暗示 → 没有交互债务，不会演化成 chat screen；
  - 视觉更安静：入口胶囊不需要持续吸引注意力；未来 voice 入口（麦克风）也自然。
- 缺点：多一次点击才能输入；需要文案引导（"Talk to Pulse…"）让人知道点进去是哪里。

### Option B：直接输入（当前实现）

- 优点：少一步；符合 ChatGPT 首页的肌肉记忆；用户可直接表达。
- 缺点：
  - 与 §23 冲突；输入框的常驻会持续暗示"这里是聊天页"；
  - 首页焦点被输入框分流（输入框天然是"等待你"的控件，会与 AI 的主动叙述竞争注意力）；
  - 长期会把 Pulse 的产品形态拉向 generic chat。

### 明确回答

> **第一版 Showcase2 应采用 Option A。**
> 更能阻止 Pulse 演化成 generic chat screen 的就是 A：**输入能力不在 Pulse 表面存在**，用户与 AI 的双向通道只有一个显式动作（进入 Talk）。B 看似省一步，实际是用产品定位换交互便利。

**落地形态（不绑定具体实现）：** 胶囊内部不是 TextInput，而是 Pressable：`＋ · "Talk to Pulse…" · 🎤`，右侧独立圆形渐变钮（点击同样进入 Talk）。Talk 页保持真正的输入胶囊 + 独立发送钮。

---

## 6. Talk visual language

### 是否应该把 AI 改成 bordered bubble？

| 角度 | 分析 |
|---|---|
| readability | 当前 AI 文本受屏幕边距约束（reader 实测可读），气泡只多一层边界。差异不大，气泡略胜 |
| AI identity | 当前"小紫点 + 纯文本"确实弱；但补强 identity 的正确做法是 **orb 头像**，不是气泡 |
| Companion feeling | 纯文本 = "AI 在对我叙述"；气泡 = "聊天对象在回我消息"。Companion 更偏前者 |
| generic chatbot risk | **双侧描边气泡正是 WhatsApp/ChatGPT 的语言**。VS Spec §15 已明确把 "bordered AI chat bubbles" 列入 **Reject** |
| relationship hierarchy | 当前结构：AI 无容器（叙述者/主体）+ 用户有色容器（回应者）。这表达"AI 主导叙述、用户回应"，是 companion 的正确关系；换成双侧气泡会让双方变成对等聊天 |
| visual similarity to reference | 参考图是 chatbot 产品，它的气泡解决的是"多轮碎片消息"问题；Pulse 的 Talk 是"AI 先给出上下文陈述"，形态需求不同 |

**判定：REJECT 简单照搬参考图的 AI 描边气泡。** 相似度不是目标，关系层级才是。

### 建议的 Pulse 版 Talk 消息规格

```text
AI
  orb 24（组首；轻发光 halo，呼吸沿用）
  文本无边框（保持），但行高提升到 24–26
  消息间距 16（段内 8）——比现在更"段落化"
  消息级 chips（Copy / Discuss）只挂在该组最新一条下方
  当消息带 Memory/KB 附件时，附件 chips 承担"容器"角色（现有做法）

User
  保持 subtle violet bubble：
  fill rgba(139,92,246,0.15)
  border hairline rgba(167,139,250,0.28)
  radius 18（保留对称圆角；参考图的"单角切"是 chat 语法，可不学）
  max-width 80%，右对齐

如果需要更重的 AI 容器（可选，仅在有附件的消息上）：
  surface rgba(139,92,246,0.06)
  border rgba(167,139,250,0.14)
  radius 16
  padding 12/16
  max-width 88%
```

**核心：身份用 orb 补，不用气泡补。**

---

## 7. Header validation

| 方向 | 结构 | 判断 |
|---|---|---|
| A | `● Pulse` 大 + `attentive` 小 | 名字在前 → 像**联系人卡片**（profile 语法），状态是附属信息 |
| B | `ATTENTIVE` 小在上 + `Pulse` 大在下 | 状态是"此刻的存在证据"，最先被读到；名字是稳定身份 → **presence 语法** |
| C | orb / `Pulse` / `attentive` 三元素纵向 | orb 与状态点重复，三行结构松散，视觉更复杂 |

**判定：B 最符合 AI presence。** 理由：

1. 参考图的两行栈（问候 + 人名）是 profile 语法，Pulse 应保留**结构**、反转**语义**：上行放动态状态（ATTENTIVE / LISTENING / THINKING），下行放名称。这样 header 的第一信息就是"AI 现在活着、在关注"。
2. A 的"名字大 + 状态小"与 Messenger/通讯录一致，会让 AI 像"一个联系人"。
3. C 引入第三行且与 orb 重复，不需要。
4. 状态语法统一为 `● STATE`（6px dot + 11px/0.12em/uppercase/#A78BFA）。

**关于右侧菜单钮：建议 REJECT（至少第一版）。** 当前 Showcase2 没有 Memory / Me / 设置等 destination（`SHOWCASE2_IMPLEMENTATION.md §16` 禁止新增），菜单钮会是死按钮。Talk 页右侧同理（可留空）。参考图的菜单依赖它自己的信息架构，Pulse 没有对应物；视觉平衡不构成实现一个无功能按钮的理由。

---

## 8. Action density

按模拟数据（Needs You 1 + Suggested 2 + Noticed 3 + Quick Actions 4 + Composer 1）统计当前结构：

| 区块 | 显性动作 | 数量 |
|---|---|---|
| Needs You | Review / Discuss / Defer | 3 |
| Suggested ×2 | Confirm / Discuss / Dismiss ×2 | 6 |
| Noticed ×3 | 行点击（隐性）+ （可选 See All） | 0–1 |
| Quick Actions | 4 chips | 4 |
| Composer | 发送 | 1 |
| **合计** | | **14–15** |

**判定：过载。** 而且过载发生在"AI 应该先说话"的屏幕上——用户第一屏看到 8 个控件（当前 mock）或 13+ 个（模拟数据），控件密度已经接近工具面板。

### 减法方案（按收益排序）

1. **Quick Actions 移出 Pulse**（−4）：改为 Talk 空态 starter（见 §4）。这是最大且最正确的一刀。
2. **Suggested 收敛为 2 个控件**（−2）：`Confirm` chip + `Dismiss` 文本；Discuss 由"点击卡片"承载或省略。VS Spec §6 本就规定 Suggested = "One inline chip (APPLY) + DISMISS text"。
3. **Noticed 的 See All 仅在 >5 条时出现**（−1）；≤5 条时不需要。
4. **Needs You 保持 3 个**（Review/Discuss/Defer）：这是唯一值得的动作密度，因为它是最高优先级决策。
5. **Pulse 底部入口 = 1 个动作**（Option A），不再有"Talk to Pulse 胶囊 + composer"两个入口重复。

减法后显性动作：`3（NY）+ 4（Suggested×2）+ 0（Noticed）+ 1（entry）= 8`；若 Suggested 只有 1 条（当前 mock）则为 **6**。达到"AI speaks first; actions remain quiet"。

---

## 9. Final recommendation（第二轮布局建议）

```text
HEADER
  orb 40 + 两行栈：● ATTENTIVE（上）/ Pulse（下）
  右侧留空（不放无 destination 的菜单钮）

HERO
  两行大标题：Good morning, / Wei.（33–34 / 700 / lh 1.18）
  AI voice 副行：I kept an eye on things overnight.（15 / textSecondaryBright / mt 8）

PRIMARY CONTENT — Featured
  第一条 Needs You（唯一强容器）
  渐变表面 #221E38→#1B1830 + accentBorder + tile 44
  标题 18–19 / 600 + why + meta + Review/Discuss/Defer（唯一 3 动作组）

SECONDARY CONTENT — Supporting
  其余 Needs You / Suggested（任意条数）
  轻容器行：dot + 单行命题 + 一个轻动作（Review 或 Confirm）
  0 条则整段隐藏

NOTICED
  区块头：NOTICED（左，可带计数）＋ See All（右，仅 >5 条时）
  无边框行 ≤5（dot 6 / text flex1 minWidth0 / time flexShrink0 右对齐）
  点击 → 详情 sheet（只读，不产生 handling）

CONVERSATION ENTRY
  底部入口胶囊（＋ / "Talk to Pulse…" / 🎤）+ 独立圆形渐变钮
  点击/聚焦 → 进入 Talk；Pulse 上不直接输入
```

### What to adopt from reference

- 两行 hero 语法（大标题压场）
- header 的两行文字栈结构（语义改为状态/名字）
- 区块头双端结构（标签 + 文字动作）
- 卡片解剖（tile / 标题 / 描述 / meta / 动作行）——用于 Featured
- 底部"胶囊 + 独立圆形按钮"的 composer 形态
- Talk 居中标题 header（返回 / Pulse + 状态 / 右侧留空）
- AI 消息带 orb 头像；消息级 Copy/Discuss chips
- 非对称网格**只在 Needs You ≥ 2 时**用于决策条目（可选）

### What to adapt

- header 两行栈的语义（状态在上、名字在下）
- hero 内容：greeting 拆行 + AI voice 副行
- Featured 内容：真实 Needs You 条目 + 现有动作，不造功能
- Quick Actions → 不绑定 domain 的 3 条 conversation starters，或迁移到 Talk 空态
- composer：独立圆钮照搬；Pulse 上是"入口"而非输入（Option A）

### What to reject

- 非对称 bento 作为**固定结构**（Scenario C/E 暴露的问题）
- Generate Document / Organizing Meeting / Generating Visual / Recent Chat / Start New Chat
- **AI 描边气泡**（保留无边框叙述 + orb，见 §6）
- 2×2 工具目录网格放在 Pulse 首页
- header 右侧无 destination 的菜单钮
- 语音页整体
- 紫粉双色光痕与任何第二色相

### What should remain unique to Pulse

- 三段语义的**密度递减**（决策 → 提议 → 告知）与 AI 第一人称叙述
- 无边框 Noticed 行 + 只读详情 sheet
- context chip 的上下文 Talk（`↳ 条目`）
- AI 状态 caption（`● ATTENTIVE / LISTENING / THINKING`）作为 header 第一信息
- Talk 中"AI 无边框叙述 + 用户气泡"的关系层级
- 单一 docked conversation entry（不是 generic chat input）

---

## 10. Critical rule — 判定记录

| 参考图元素 | 视觉质量 | 对 Pulse 语义的影响 | 结论 |
|---|---|---|---|
| 非对称 bento（固定） | 高 | 条目数不定时失衡；把 AI 叙述变成入口网格 | **REJECT as structure**（可用 Featured+Flow 替代） |
| Quick Actions 2×2 | 高 | 工具目录语法；动作过载；与 composer 重复 | **REJECT on Pulse**（可移到 Talk 空态） |
| AI 描边气泡 | 中 | 双侧气泡 = chat app；削弱 AI 叙述关系 | **REJECT** |
| header 右侧菜单钮 | 中 | 无 destination → 死按钮 | **REJECT（v1）** |
| 两行 header 文字栈 | 高 | 改成状态/名字后强化 presence | **ADOPT** |
| 两行 hero | 高 | 无副作用 | **ADOPT** |
| 区块头双端结构 | 高 | 无副作用 | **ADOPT** |
| 胶囊 + 独立圆钮 composer | 高 | 与"入口/输入分离"一致 | **ADOPT** |
| 卡片解剖（tile/标题/箭头） | 高 | 用于 Featured/Supporting 合适 | **ADAPT** |
| Featured + Supporting（替代 bento） | — | 任意条数自然，优先级由容器强度表达 | **PROPOSE** |

> 最终标准（本轮实际使用）：**Reference Visual Quality + Pulse Product Semantics 同时满足**才采用。凡是会让 Pulse 变成 SaaS dashboard（bento 固定网格）、AI tool directory（Quick Actions）、generic chat app（AI 气泡 / Pulse 输入框）或 task manager（动作过载）的元素，一律拒绝。

---

*本轮只读；未修改任何代码。截图证据保留在 /tmp/opencode/ia-\*.png。*
