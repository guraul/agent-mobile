# BACKLOG.md —— 剩余工作冻结清单（Phase 7 定稿）

> 状态：**冻结**。本文是 Phase 1-7 完成后全部剩余工作的权威清单。
> 分类：P0（必须马上修）/ P1（下一阶段需要）/ P2（可延后）/ UX（交互设计）/ Runtime（基础设施）/ Future（产品能力——**不应为了"产品完整"而现在实现**）。
> 每项：item · reason · dependency · owner layer · blocked by · now/next。
> 语义裁决以 `PRODUCT_MODEL.md`（冻结）为准；本文不引入新产品概念。

---

## P0（必须马上修）

*（当前无 P0——Phase 5.5 hardening 后未发现影响 correctness/safety 的活跃缺陷。）*

---

## P1（下一阶段需要）

### P1-1 one-shot missed-run 策略
- **item**：one-shot Assignment 在 BFF 停机错过 occurrence 后保持 active，下次 occurrence 才 fire（如"今天 18:00 提醒"跨停机顺延一天）。
- **reason**：skip missed run 是 deterministic 安全解（Phase 5.5 决策），但 reminder 类责任对时间敏感，静默顺延可能违背用户意图——需要产品语义（重启后经 Pulse 询问用户，需新的授权形态）。
- **dependency**：需要 PM 层面的用户确认交互设计（不重开 PM，属 PM 已允许的"实现期决策"）。
- **owner layer**：BFF（trigger runtime）+ Pulse（询问卡）。
- **blocked by**：Pulse 的 L2 交互承载"补提醒/静默完成/保持"三选。
- **when**：next（下一个功能轮的第一个候选项）。

### P1-2 failed trigger repair
- **item**：trigger 评估失败（如市场数据源故障）时，fired 事件带 error、执行机会已消费，无自动重试。
- **reason**：偶发网络故障会把一次评估变成永久失败事实；需要 repair 路径（重放同 occurrence 或人工重触发）。
- **dependency**：execution identity 已就绪（确定性 event id），repair = 对同 occurrence 重新评估并更新事件 payload 或追加 correction 事件——需定 repair 语义。
- **owner layer**：BFF（assignment-triggers）。
- **blocked by**：repair 语义裁决（追加 correction 事件 vs 重写——建议追加，保 append-only）。
- **when**：next。

### P1-3 assignment-proposals 的 duplicate 收敛 UX
- **item**：propose 返回 `duplicateOf` 提示，但 Talk 命令流仅文本提示；用户缺少"查看并撤销既有 Assignment"的顺手入口。
- **reason**：PM §10 duplicate 语义已有后端支撑，缺最小 UI 闭环。
- **owner layer**：mobile（assignments 列表展示已有 `/assignments` 命令，可升级为 Pulse 卡）。
- **blocked by**：无。
- **when**：next（可与 UX-1 合并）。

### P1-4 BFF 部署固化
- **item**：BFF 以 `next dev` 长跑，本轮起由 systemd transient unit（`ff-bff-dev`）托管并自动重启；尚未固化为正式 unit 文件 + `next start`（生产模式）。
- **reason**：dev server 重启慢、编译不稳定；生产模式更稳。托管方式已解决"进程消失"问题。
- **owner layer**：Runtime。
- **blocked by**：无（systemd-run 已验证）。
- **when**：next。

---

## P2（可以延后）

### P2-1 multi-instance scheduler
- **item**：BFF 若多实例部署，later.js timer 各实例独立触发（安全性由 execution identity + 事件幂等保证，不产生双事实，但会重复做评估工作）。
- **reason**：当前单实例部署是既定事实；幂等设计已兜底正确性。leader 选举属基础设施投入。
- **owner layer**：Runtime。**blocked by**：多实例部署需求真实出现。**when**：not now。

### P2-2 retention TTL
- **item**：`retention_class`（transient/audit）已持久化但无清理 job；product_events 持续增长。
- **reason**：SQLite 单文件体量在当前量级（每日数十条）可运行数年；清理策略（TTL 数值）是纯策略决策。
- **owner layer**：BFF（新增 sweep job，模式同 attention-expiry）。**blocked by**：TTL 数值裁决。**when**：not now。

### P2-3 structured observability
- **item**：correlation 链（assignmentId→executionId→eventId→attentionId）已在 console 行日志与事件 payload 中；无结构化日志系统/查询面。
- **reason**：单进程、低量级，console + SQLite 审计已可追溯。
- **owner layer**：Runtime。**blocked by**：真实排障需求出现。**when**：not now。

### P2-4 user memory 物理删除/恢复
- **item**：user memory forget 只有弃用标记（memx 语义，物理保留）；无恢复（undelete）入口。
- **reason**：弃用标记已满足"不再呈现/不再注入的语义路径"（memx 提炼时忽略 deprecated）；物理删除不可逆且 memx 无此先例。
- **owner layer**：BFF bridge + memx 侧。**blocked by**：memx 引入物理删除语义。**when**：not now。

### P2-5 dead prop / 小清理扫尾
- **item**：`ProjectChat`（旧聊天组件，`USE_ZCODE_CHAT_SHEET=false` 的回退路径）保留为回退开关；`fund-events.ts` 的 legacy 注释与类型残留。
- **reason**：回退开关是有意保留（单点故障回退）；注释残留无行为影响。
- **owner layer**：mobile。**blocked by**：ZCode fork 稳定期结束（回退开关退役时一并删）。**when**：not now。

---

## UX（交互设计）

### UX-1 Assignment 管理面
- **item**：Pulse/Me 中查看 active assignments、一键 revoke 的卡片（当前仅 Talk 命令 + REST）。
- **reason**：revoke 是显式用户动作，值得一级入口；命令式交互对新用户不友好。
- **when**：next。

### UX-2 Attention market 类的"已执行交易"动作
- **item**：PHASE1 §8 预告：market Attention 增"已执行 → HANDLED + artifact"按钮（当前"确认处理"= DISMISSED）。
- **reason**：线下交易完成是合法 handling artifact，HANDLED 与 DISMISSED 语义应可区分。
- **when**：next。

### UX-3 Talk 占位页
- **item**：`(tabs)/talk.tsx` 仍为 Placeholder；Direct Talk 入口（PM §8.1）未开。
- **reason**：当前 Talk 都从 Pulse/Attention 上下文进入（Contextual Talk 已真实验证）；Direct Talk 的空会话体验需要设计。
- **when**：next。

---

## Runtime（基础设施）

### RT-1 L1 数据面端点化
- **item**：新建 `GET /api/product/market/estimates`（或并入 product stream），mobile 跑马灯迁移后删除 legacy `/api/events/stream`（FINAL_ARCHITECTURE §3 退役条件）。
- **reason**：最后一个 legacy 路径的正式退出路径。
- **when**：next。

### RT-2 opencode tap 启动回填扩展
- **item**：BFF 重启期间的 opencode 事件（非 permission）不可恢复（live tail 无重放）——当前只回填 permission。
- **reason**：Phase 1 决议：其余类型接受丢失（无消费方）；session.deleted 已入库但无动作。
- **when**：not now。

---

## Future（产品能力——**明确标记：不应为了"产品完整"而现在实现**）

| item | 说明 | PM 依据 |
|---|---|---|
| **Coding Assignment（delegated work）** | "今晚继续 Project 2，完成告诉我" → one-shot coding Assignment + completion trigger。需要 execution scope 授权语义与 opencode 异步工作编排 | PM §31 |
| **Reconstruct** | 原 Session 不可用时从 KB/Memory 重建新 Session | PM §4.2 |
| **KB → Talk 深度集成** | 从 KB 搜索结果直接带 ref 上下文开 Session（当前只有搜索/读取） | PM §7 |
| **L1 speaking rule 清单化** | named standing rule 的 L1 呈现默认清单（fund.estimate 数据面已存在；completion 播报等） | PM §22 |
| **Agent Observation pipeline** | permitted observation rule（"同一处反复失败"类）→ Attention | PM §19 |
| **Notification delivery 队列** | Attention/L1 → 外部通道（邮件/企微/微信）的投递层重设计（当前 market 通知仍是 handler 内 best-effort 调用） | IMPLEMENTATION_MODEL §11 |
| **Open Thread** | PM §24-26 的会话续点 marker（当前无任何实现；needs proposal/activation 类最小语义裁决） | PM §24 |
| **Memory/KB reconciliation 入口** | 两侧表征分歧时的 re-evaluate 交互（不自动覆盖） | PM §6 |
| **多 Agent Runtime** | Pi/DSH/自定义 runtime 抽象层 | PM §34 |
| **proposal TTL 产品化** | 7 天为 BFF 实现默认值；是否产品化（用户可见"待确认提案"列表 + 自定义时限） | PM §10 |

---

## 冻结说明

1. 本清单之外的新想法，进入下轮规划时**先问 PM 依据**，再入表。
2. Future 项的实现顺序不由本文排序——由下一个功能轮的需求牵引决定。
3. P1 项的"next"含义：下一个开发轮的候选池，不是承诺。
4. 移除任何 legacy 路径前必须满足 `FINAL_ARCHITECTURE.md` §3 的 removal condition。
