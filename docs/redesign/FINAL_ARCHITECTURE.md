# FINAL_ARCHITECTURE.md —— 系统最终架构（Phase 7 定稿）

> 状态：Phase 7 Final Integration Audit 产物。语义唯一来源：`PRODUCT_MODEL.md`（冻结）；
> runtime 决策记录：`PHASE5_IMPLEMENTATION.md`；剩余工作：`BACKLOG.md`（冻结）。
> 本文是 implementation architecture，不重新定义产品语义。

---

## 1. 最终架构图

```text
                        ┌────────────────────────────┐
                        │   Mobile（Expo web 9928）  │
                        │  Pulse / Talk / Memory / Me │
                        └──────────────┬─────────────┘
                                       │ JWT（/api/opencode/rest proxy + /api/product/*）
                        ┌──────────────▼─────────────┐
                        │      BFF（family-finance   │
                        │       next dev :19234）    │
                        └──────────────┬─────────────┘
                                       │
       ┌───────────────┬───────────────┼────────────────┬──────────────┐
       │               │               │                │              │
       ▼               ▼               ▼                ▼              ▼
┌────────────┐  ┌────────────┐  ┌─────────────┐  ┌───────────┐  ┌───────────┐
│ OpenCode   │  │ Event      │  │ Assignment  │  │ Memory    │  │ KB        │
│ Server     │  │ pipeline   │  │ runtime     │  │ (memx)    │  │ (llm-wiki │
│ :4096      │  │            │  │             │  │           │  │  vault)   │
└─────┬──────┘  └─────┬──────┘  └──────┬──────┘  └─────┬─────┘  └─────┬─────┘
      │               │                │               │              │
      │ permission    │ product_events │ assignments + │ USER.md      │ vault/*.md
      │ bridge        │ (append-only)  │ proposals     │ .mem/*.md    │ raw-ideas/
      │ (tap)         │                │ trigger cron  │ MEMORY.md    │
      │               │                │ (later.js)    │              │
      │               ▼                ▼               │              │
      │         ┌─────────── rules ───────────┐        │              │
      │         │ named-rule:                 │        │              │
      │         │  permission.blocking        │        │              │
      │         │  market.target-nav          │        │              │
      │         │ assignment-authorization:   │        │              │
      │         │  trigger.fire → Attention   │        │              │
      │         └──────────────┬──────────────┘        │              │
      │                        ▼                       │              │
      │               ┌────────────────┐               │              │
      │               │ attention_items│               │              │
      │               │ OPEN→HANDLED/  │               │              │
      │               │ DISMISSED/     │               │              │
      │               │ EXPIRED        │               │              │
      │               └───────┬────────┘               │              │
      │                       ▼                        ▼              ▼
      │               ┌────────────────┐    ┌──────────────────────────┐
      │               │ Pulse 需求面    │    │ /api/product/memory /kb  │
      │               │ (needs-you =   │    │ （只读投影 + forget /     │
      │               │  Attention）   │    │  raw-idea 最小写入）      │
      │               └───────┬────────┘    └──────────────────────────┘
      │                       ▼
      │               ┌────────────────┐
      └──────────────▶│ Talk（Chat）   │
        Session       │ Resume/Create  │
        (canonical    └───────┬────────┘
         在 OpenCode）        ▼
                        ┌────────────────┐
                        │ Handling       │
                        │ (reply/决定/   │
                        │  对话结论)      │
                        └────────────────┘
```

数据通道：手机端 SSE 两条（`/api/opencode/stream` chat delta；`/api/product/stream` attention 变更）；
L1 行情跑马灯走 legacy `/api/events/stream`（退役条件见 §3）。

## 2. Source of truth（§4 审计结论：无双重 canonical）

| 概念 | canonical | 产品层表示 |
|---|---|---|
| Session / 消息 | OpenCode Server | 引用（sessionId） |
| Event | `product_events`（SQLite，append-only） | — |
| Attention | `attention_items` | 无副本（mobile store 是**缓存投影**，SSE reconcile） |
| Assignment | `assignments` / `assignment_proposals` | 无副本 |
| Memory | `~/.opencode`（memx 文件） | 无 mirror（BFF 只读投影 + forget bridge） |
| KB | llm-wiki vault（`LLM_WIKI_VAULT`） | 无 mirror（rg 检索 + Raw Idea 原子写） |
| Open Thread | （未实现——Backlog Future） | PM §24 marker 语义，当前无实体 |
| Pulse | presentation only（Attention 渲染 + L1 statement） | 无持久化 |
| Talk | interaction surface（OpenCode 会话） | handling_ref 引用 |

## 3. Legacy 退役登记（Phase 7 执行）

| 项 | 状态 | 说明 |
|---|---|---|
| `/api/events/ack` | **已删除**（404） | mobile 零消费；语义由 `POST /api/product/attention/:id/dismiss` 承担 |
| trade-alert SSE 派生 + 重放（legacy-shim.ts） | **已删除** | mobile 零消费；needs-you 语义只在 Attention |
| `lib/events/publisher.ts`（内存 lastEvents 残余） | **已删除** | 零生产 consumer |
| `/api/events/stream` | **deprecated，保留** | 唯一职责 = fund.estimate L1 跑马灯（活跃 consumer）。**Removal condition**：mobile 切换到专用 L1 端点（如 `/api/product/market/estimates`）或并入 `/api/product/stream` 后整体删除。owner：BFF + mobile services/fund-events.ts |
| mobile `screens/events.ts`、`SessionPanel.tsx` | **已删除** | 死代码（IMPLEMENTATION_MODEL P2 清单） |
| mobile `FundMarqueeItem.hasAlert` | **已删除** | trade-alert 残留 prop |

## 4. Authority 快捷方式检查（§3，全绿）

- `eventIngestor` 无 HTTP 暴露——客户端不能创建 Attention/Event。
- Assignment 创建唯一入口 = proposals + confirmation matrix（`POST /api/product/assignments` 405）。
- Assignment 代码零 OpenCode permission 引用——activation ≠ runtime permission。
- `session.idle`/`message.*` 不进 product 管道（tap 白名单）。
- 查看/进 Talk/Session 删除无任何 Attention state 写路径。
- Raw Idea 保存无 product store 写路径（保存 ≠ 执行）。
- Attention creation authority 实际清单：`named-rule`（permission blocking / market target-nav）+ `assignment-authorization`（trigger fire）。`user-instruction` 为 CHECK 允许的合法形态，当前无生产者。

## 5. 关键不变式（运行验证）

- Event：append-only、idempotent（INSERT OR IGNORE / 确定性 id）、occurred_at≠created_at。
- Attention：dedup_key UNIQUE、终态不可逆、`expires_at NULL` 永不过期、viewing 零状态写入。
- Assignment：activation 唯一路径（proposals+matrix）、one-shot 消费即 commit point、
  execution identity（occurrence）幂等、revoke race deterministic（见 PHASE5_IMPLEMENTATION §2-4）。
- Legacy seed：exactly-once（`fund-estimation` disabled ⇔ replacement Assignment 存在）。
- Proposal：proposed 7 天未决 → expired（不能事后 confirm）。
