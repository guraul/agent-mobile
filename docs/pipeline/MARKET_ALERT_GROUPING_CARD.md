# 施工卡 · 市场告警「同类合并降噪」（Tier 1 先做后报 首个场景）

> 状态：**待拍板**（本卡不含代码，拍板后才开工）· 2026-10-28
> 背景依据：`homebase/packages/web/lib/product/`（Attention 创建链路）、`agent-mobile/docs/redesign/PRODUCT_MODEL.md` §16 / §17 / §19 / §20 / §21
> 结论先行：**在 Pulse 呈现层合并，不新建 Attention、不改创建路径、不写新 Event。**

---

## 0. 一句话结论

同一交易日、同一创建授权、同一有效窗内命中的多只基金，**在 Pulse 上收成一行**（`3 funds crossed the targets you set.`），点开仍是各自独立的 Attention 条目。合并是**视图**，不是新的产品对象。

这样做的代价：`attention_items` 一天仍是 3 行；收益在**首屏位子**和**一次决策感**，不在数据量。

---

## 1. 现状（生产库实测，只读）

### 1.1 一天几条

| 口径 | 数值 |
|---|---|
| 历史市场 Attention 总量 | 87 条（expired 84 / dismissed 2 / handled 1 → **96% 从未被处理**） |
| 2026-09-22 → 10-12 稳态 | **3 条/天**（同一天、同一 assignment、3 只不同基金） |
| 峰值日 2026-09-21 | **11 条**（3 条 assignment 路径 + 8 条 legacy named-rule 路径，同基金双份） |
| 10-12 修复 target=0 假命中后 | 到 10-26 只有 1 条（当日仅 1 只基金真实达标） |
| 当前可命中上限 | **5 只**（`funds.target_nav > 0 且未归档`） |
| 生存窗口 | **9 分钟**（14:50:00 建 → 15:00:00 到期），过期即从 Pulse 消失 |

> 结论：**噪声不是"多"，是"挤"**。3 条挤在 9 分钟里，占掉 Pulse 首屏 5 个位子中的 3 个（1 featured + `SUPPORTING_BUDGET=4`，`app/index.tsx:49`），其他域（coding/personal）被挤到 "More (n)" 里。

### 1.2 dedupKey 怎么构造

| 创建路径 | dedupKey | 位置 |
|---|---|---|
| Assignment 触发（**现行唯一**） | `sha256("assignment:<asgId>\|fund:<code>\|trade:YYYY-MM-DD")` | `assignment-triggers.ts:312` |
| named-rule（legacy，被 `ensureSeedJobs` 压成 disabled） | `sha256("market.target-nav-threshold\|fund:<code>\|trade:YYYY-MM-DD")` | `rules.ts:98` |

- `windowId = trade:YYYY-MM-DD`，周末归上一交易日，`expiresAt` = 当日 15:00（`trade-window.ts:25-30`）。
- 落库是 `UNIQUE(dedup_key)` + `INSERT … ON CONFLICT DO NOTHING`（`attention-repo.ts:44-74`）；重复命中只**追加 evidence**，不新建、不复活（`attention-service.ts:29-39`）。

### 1.3 去重只覆盖三个维度

`(creation reason, subject, validity window)` —— 正是 PM §19 的原文口径（`PRODUCT_MODEL.md:1468`）。

**没覆盖的**：
- **跨基金**：一次检查命中 N 只 → N 条（本卡要解决的就是这个）
- **跨 Assignment**：同一基金被两个 assignment 盯 → 2 条（合法，两个责任）
- **跨创建授权**：named-rule 与 assignment 各建一条（09-21 的 8+3 就是这么来的；legacy 已停，不会重现）

---

## 2. 合并规则

| 项 | 决定 |
|---|---|
| **合并键** | `domain=market` ∧ `creationReasonRef` 相同 ∧ `expiresAt` 相同（⇒ 同一有效窗）。`groupKey = market:{reasonRef}:{expiresAt}` |
| **不用 trigger 类型做键** | 它已被 `creationReasonRef` 蕴含（一个 assignment / 一条 rule 就是一个 trigger） |
| **不用基金集合做键** | 基金集合是**被合并的内容**，不是键——用它当键就永远不会合并 |
| **不跨创建授权** | PM §16.2：instruction / named rule / observation 三种授权**不得混同**；跨授权合并等于把裁判权糊在一起 |
| **不跨窗口** | 跨日合并会破坏 §19 的 per-window 去重语义；且过期后条目已不在列表里 |
| **窗口长度** | 沿用条目自己的窗口（交易日，14:50→15:00，9 分钟）。**不新增窗口、不新增 timer**：成员过期，组自动消失 |
| **成组门槛** | N ≥ 2；N = 1 渲染成普通条目（不套壳） |
| **最多几条** | 语义上**不设上限**（上限 = 用户监控的基金数，当前 5）；展示上展开前 5 行 + `+N more`。**一条都不丢**——溢出只是折叠，成员始终可点 |
| **成员是否互斥** | 是。dedup 保证同一 (reason, subject, window) 只有一条 ⇒ 组内 `subject_id` 天然不重复，可在纯函数里断言 |

---

## 3. 不变量与可审计性

### 3.1 PM §16.1 有没有被触碰

**没有。** §16.1 管的是「什么可以**成为** Attention」。本方案**创建 0 个 Attention、0 个 Event**，只改已有条目的排布：

- user-action test 不变（还是"基金越过你设的目标，要不要卖"）
- 没有把 informational 的东西升格成 Attention（行情估算仍是 L1，`l1-rules.ts` 不动）
- 没有把 runtime 状态（idle/busy）引入

### 3.2 为什么不在创建层合并（这是本卡最关键的取舍）

如果真造一条"合并条目"，会撞三堵墙：

1. **§19 的 dedup 是 per-subject**：合并条目的 subject 是一个**集合**，现有 `subject_kind` CHECK 里没有这个概念（`migrations.ts:34-59`）；加枚举值要**重建 attention_items 表**（有两个 FK 子表，`migrations.ts:127-233` 已有同款重建的代价先例）。
2. **evidence 关系变模糊**：`attention_evidence` 的主键是 `(attention_id, event_id)`，一条合成条目挂 3 只基金的多条证据，审计时无法回答"这条证据属于哪只基金"。
3. **§21 明确要求分开**：「The underlying Attention Items remain separate objects」——Pulse 负责简报化，条目本身保持独立。

### 3.3 可审计性怎么保

- **不新增 provenance**：没有新行，就没有新 provenance 要写。成员的 `provenance` / `attention_evidence` 原封不动，谁建的、依据哪条 Event、被哪次检查触发，逐条可查。
- **组合 id 可重算**：`market:{reasonRef}:{expiresAt}` 是**确定性派生**，任何时刻都能从 `attention_items` 复现"当时为什么这三条在一组"，不需要另存。
- **唯一的额外留痕（可选）**：用户从组里点开某条时，记一条既有类型的交互 `opened`，metadata `{via:"pulse-market-group", groupKey}`。这是**交互元数据，不是 lifecycle**（§17: seen is not a state）。
- **`product_events` 仍是 canonical**：本方案**不写 event**。特别注意：**不要**为了"可审计"新增 `attention.grouped` 事件——那是为了描述一次渲染去**制造一条事实**，与 §16.2 的精神冲突（"must not manufacture an artificial Event merely to satisfy the model"）。

---

## 4. 「报」落在哪

### 4.1 位置

**组行本身**，不是弹窗、不是 TodayDigest、不是新 toast。

理由：Pulse 顶部已有 `TodayDigest`（"I checked N things for you today — M raised a flag"），但它的计数单位是**执行次数**（`services/activity/digest.ts:57-62`），不是条目数。再往里塞一句"合并了 3 条"会出现两个单位打架（1 次检查 / 3 条告警）。**单位不一致是既有问题，本卡不顺带修。**

### 4.2 文案（英文，克制）

| 位置 | 文案 |
|---|---|
| 组行标题 | `3 funds crossed the targets you set.` |
| 组行副标题（"报"的那一句） | `Today's check — kept together.` |
| 元信息 | `Market · just now` |
| 展开后 | 每条成员**原样显示**（各自的标题与摘要，不改写），第一行不重复 |
| 溢出 | `+2 more`（点开即全部展开，不新增页面） |
| a11y | `Review 3 market alerts from today's check` |

- 单数不套壳：N=1 直接渲染原条目。
- **不说 "I merged N items"**：那是描述管道，不是描述结果。`kept together` 已经说清了她替你做的事，且不邀功。
- 备选（更直白）：`3 alerts from one check, kept together.`

### 4.3 明确不做

- 不做组级 Dismiss / Handle（PM §17 是 per-item 生命周期；一次点击改 3 条状态需要单独授权与确认文案，Tier 1 不碰）
- 不做汇总角标、不弹 toast、不改 TodayDigest
- 不改动排序（组占**最新成员**的位置，不是把它顶到最前）

---

## 5. 失败与回退

| 问题 | 处理 |
|---|---|
| 分组函数抛错 | 调用点 try/catch → **fail-open 返回未分组列表**。合并永远不能吃掉条目 |
| 键算错导致误合并 | 三个键因子都是**结构相等**（字符串/整数），无模糊匹配；纯函数单测覆盖跨授权/跨窗/跨域不合并 |
| 旧客户端 | 分组在客户端，老 bundle 不分组 = 现状，**不会坏**（无 API 契约变更） |
| 回退 | 一行常量置 false + 重新 `expo export` 部署（与任何 UI 改动同价，约 3 分钟）。**不做运行时开关**：本仓没有远程配置通道，加开关等于加一条没人用的路径 |
| 预置止损 | 上线 2 周内对比「组行展开率 / 单条打开率」，若组行打开率明显低于原单条，直接回退 |

---

## 6. 改动面与工作量

**只动 agent-mobile，不动 homebase。无迁移、无 API 变更、无服务端发布。**

| # | 文件 | 动作 |
|---|---|---|
| 1 | `src/services/attention/grouping.ts` | 新增：纯函数 `buildPulseUnits(items) → Unit[]`（`attention` \| `market-group`），含 `groupKey`、`count`、`members` |
| 2 | `src/services/attention/grouping.test.ts` | 新增：N=1 套壳、跨授权不合并、跨窗不合并、跨域不合并、溢出、顺序、成员唯一性 |
| 3 | `src/components/pulse/MarketGroupItem.tsx` | 新增：组行 + 展开成员（复用 `FeaturedItem` 的卡片/字号/色 token，不自拼样式） |
| 4 | `src/app/index.tsx` | 改：`featured` / `supporting` 从"条目"改为"渲染单元"（`index.tsx:226-235`），`SUPPORTING_BUDGET` 按单元计 |
| 5 | `src/i18n/index.ts` | 加 3 个键（en + zh） |

工作量：**小 ~ 中**（纯函数 0.5d / 组件 0.5d / 拼接 0.25d / 文案与测试 0.25d，合计 ≈ 1.5 人日）。
验证：`pnpm exec tsc --noEmit` + `pnpm test` + 本地 web 截图（3 条同族告警 → 1 组 + 展开）。

---

## 7. 反对意见（最可能错在哪）

| # | 风险 | 缓解 |
|---|---|---|
| 1 | **「合并后用户以为只有一件事」**——这是最大风险。3 只基金可能是 3 个不同卖出决策 | 计数写在标题里（`3 funds`），不是"1 alert"；展开逐条原样显示；标题永不说 "one" |
| 2 | **合并不产生真实降噪**：`attention_items` 还是 3 行，通知/统计口径不变；老客户端看不到任何变化 | 诚实标注收益在**首屏位子**与**决策感**；不要对外宣称"减少了 N 条告警" |
| 3 | **分组合法但无价值**：最近一次命中日（10-26）只有 1 只基金达标，≥2 同时命中的日子**历史上是少数**（最近一次可证是 10-12 的 3 条，其中 2 条还是假命中）。为一个低频场景做改动 | 成本压在 1.5 人日内、零迁移零风险；且它是未来扩大监控（5 只基金全设目标）的**前置条件** |
| 4 | **合并会把"坏条目"藏起来**：生产里出现过 `高于目标 0.0000` 的荒谬标题，单独看很刺眼，合并后只剩一个计数 | 展开必须原样显示成员标题；条件层的 target=0 守卫已于 10-12 修复（`assignment-conditions.ts:97-101`）；组标题只报数，不替成员美化 |
| 5 | **紧迫感被稀释**：3 张卡看起来"有事"，1 张卡看起来"通知" | 组行继承组内最新成员的位置与视觉权重（白卡 + 琥珀铃铛，不降级成 ghost 卡） |
| 6 | **"先做后报"名不副实**：这只是排版，不是可观察的外部动作 | 承认。若判定 Tier 1 必须"动世界"，本场景应从 Tier 1 移出——**这是本卡最需要用户裁决的一点** |

---

## 8. 待拍板（3 项）

1. **层级**：认可"呈现层合并 / 不新建 Attention"？（否则进入"创建期合并"，需重建 `attention_items` 表，工作量升到**大**）
2. **组级动作**：Tier 1 只展开、不做批量 Dismiss/Handle —— 认可？
3. **归属**：本场景算不算 Tier 1 的合格样本？若"必须动世界"才算，则改挂"呈现优化"，不占 Tier 1 名额。

---

### 附：不采纳的方案（存档）

| 方案 | 为何不采纳 |
|---|---|
| 创建期合并成 1 条（subject = assignment） | 违反 §19 per-subject 去重与 §21 "remain separate objects"；证据关系模糊；要重建表 |
| 新增 `subject_kind = 'fund-set'` | 枚举变更 = attention_items 全表重建（含两个 FK 子表回填），代价与收益严重不匹配 |
| 复用 legacy `fund-estimation` 的每日回执 | 回执已经在合并（`buildMarketDigest` 一次列 N 只），但它是**投递通道**，不是 Pulse；两者单位不同，不能互相替代 |
| 发一条 `attention.grouped` Event 做审计 | 为描述渲染而制造事实，违反 §16.2 |
