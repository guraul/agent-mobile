# Agent Mobile / Pulse

> **Agent Mobile / Pulse** 是一个持续陪伴式 AI 工作助手。Pulse 负责主动呈现值得用户注意的信息，Talk 负责交互，Memory 负责长期理解，Me 负责工作方式与责任管理。

已通过 MVP 验收（见 [MVP_ACCEPTANCE](docs/redesign/MVP_ACCEPTANCE.md)）：一个连续的 AI 伴侣——理解你当前的工作、接受责任、异步执行、注意到有意义的结果，并在需要你时回到你面前。

本产品**不是** OpenCode 的移动客户端或仪表盘。OpenCode 是当前的 runtime 实现——是实现选择，不是产品身份；产品语义不依赖具体 runtime，runtime 可替换（[PRODUCT_MODEL §34](docs/redesign/PRODUCT_MODEL.md)）。

## 四个表面

| 表面 | 含义 | 呈现内容 |
|---|---|---|
| **Pulse** | *"我注意到了。"* | 主动呈现面，五个呈现分组（见下）。 |
| **Talk** | *"我们来想想。"* | 与 Agent Session 的双向对话（Resume 既有 / Create 新建）、显式决策、`/assign` `/confirm` `/reject` 命令、handling。 |
| **Memory** | *"我记得。"* | 长期理解：Memory 投影、Responsibilities（Assignment 管理面，含授权与执行历史）、Knowledge Base 检索。 |
| **Me** | *"我理解我们的协作方式。"* | 账号、BFF 地址、model 偏好。 |

Pulse 五个呈现分组——**全部是呈现（presentation），不是新的 canonical entity**：

- **Needs You** —— Attention Item：当前等待用户处理的持久记录。
- **Suggested** —— Assignment Proposal 的 user-facing projection（"Agent 建议承担一个责任"）。Confirm / Reject 是唯一推进路径。
- **Noticed** —— 经授权的 L1 / Observation 陈述：仅信息呈现，无需动作、无 lifecycle。
- **Today** —— 运行中的项目（信息呈现）。
- **Market** —— 基金估算跑马灯（信息性 L1）。

## 架构（高层）

```text
User
  ↓
Agent Session（OpenCode —— 当前 runtime）
  ↓
Conversation / Decision
  ├── Assignment      （责任：proposal → 显式 confirm → active）
  ├── Open Thread     （Post-MVP）
  ├── Raw Idea        （→ Knowledge Base）
  └── Memory

Assignment → Trigger → Execution → Event          （Event = 事实，append-only）

Event → Attention（等待用户处理）→ Pulse "Needs You" → Talk → Handling
Event → 经授权的 Observation rule
        ├── L1 陈述   （presentation，非 canonical entity）→ Pulse "Noticed"
        └── Proposal  （proposed 期间是 canonical）
              → Pulse "Suggested" → Confirm（activation moment，显式）→ Assignment
                                  → Reject → 什么都不会激活
```

核心语义（权威来源：[PRODUCT_MODEL](docs/redesign/PRODUCT_MODEL.md)）：

- **Event** 是事实。它本身永远不是 Attention。
- **Attention** 是"某事需要用户处理"的持久记录（`OPEN → HANDLED / DISMISSED / EXPIRED`）。查看它、或就它进入对话，都不推进其状态。
- **L1** 是 presentation。不是 canonical entity，不携带义务。
- **Suggested** 是 Assignment Proposal 的投影——proposal（存在 BFF）始终是唯一事实来源。
- **Assignment 激活需要显式授权**（按域确认矩阵）。看到 Suggestion、点开它、进入 Talk，都不会 confirm 任何东西。
- **Pulse 不拥有业务状态。** 它只做呈现；canonical 状态在 BFF（SQLite）、OpenCode（会话）、Memory 与 Knowledge Base 文件中。

## 文档

| 文档 | 角色 |
|---|---|
| [docs/redesign/PRODUCT_MODEL.md](docs/redesign/PRODUCT_MODEL.md) | **冻结的 canonical 语义模型** —— 产品含义的唯一来源。 |
| [docs/redesign/FINAL_ARCHITECTURE.md](docs/redesign/FINAL_ARCHITECTURE.md) | **实现架构** —— 实体、authority 模型、lifecycle、恢复、安全边界。 |
| [docs/redesign/MVP_ACCEPTANCE.md](docs/redesign/MVP_ACCEPTANCE.md) | **最终验收结论** —— `ACCEPTED WITH NON-BLOCKING GAPS`、已知问题、Post-MVP 登记。 |
| [docs/knowledge-base/INDEX.md](docs/knowledge-base/INDEX.md) | **知识库** —— 模块文档、API、数据流、运维约定。 |
| [docs/redesign/](docs/redesign/) | Phase 9–13 设计 / 报告 / 审计记录。 |

## 仓库结构

```text
├── agent-mobile-app/      # ★ 当前活跃的 Expo（SDK 57）应用 —— Pulse / Talk / Memory / Me
│   ├── src/app/           #   路由（tabs + assignments/attention 屏）
│   ├── src/services/      #   BFF 客户端（attention / assignment / proposal / l1 / memory / kb）
│   └── src/components/    #   组件库（只用 theme token）
├── src/                   # 设计期 React/TSX 参考（非运行态）
├── showcase/              # 静态 HTML UI 原型（历史参考）
├── docs/
│   ├── redesign/          # ★ 产品模型 / 架构 / 验收 / 各阶段文档
│   └── knowledge-base/    # ★ 模块文档、API、数据流、运维
└── test/                  # 临时测试脚本、截图、日志（不随发布交付）
```

## Setup

**前置要求**：Node.js 20+ 与 pnpm。应用连接一个 **BFF**（`family-finance` 仓库——独立 Git 仓库，持有全部产品状态）和一个 **OpenCode server**（提供会话/聊天内容）。

**1. BFF（family-finance，独立仓库）**

```bash
cd family-finance
pnpm install:all
# packages/web/.env.local —— JWT_SECRET、ADMIN_USERNAME、ADMIN_PASSWORD、OPENCODE_*（见 family-finance 文档）
./app.sh start            # next dev，端口 19234（或：pnpm dev）
```

**2. 移动应用（本仓库）**

```bash
cd agent-mobile-app
pnpm install

# .env.local（已 gitignore）—— 指向 BFF：
#   EXPO_PUBLIC_OPENCODE_URL=http://<bff-host>:19234

pnpm start                # Expo dev server
```

**3. Web 静态构建（当前部署形态，9928 端口）**

```bash
cd agent-mobile-app
EXPO_PUBLIC_OPENCODE_URL=http://<bff-host>:19234 pnpm exec expo export --platform web --clear
# dist/ 由 scripts/serve-static.mjs 提供（端口 9928）；重启该服务以加载新 bundle
```

## 测试

```bash
cd agent-mobile-app
pnpm test                 # vitest 单测（纯逻辑：store/投影/client）
pnpm exec tsc --noEmit    # 类型检查
pnpm lint                 # expo lint

pnpm e2e                  # Playwright E2E（会发送真实聊天消息——请有意使用）
pnpm e2e:nosend           # 同上，跳过发消息步骤
node scripts/e2e/phase9-e2e.mjs    # Phase 9 套件（Responsibilities / 详情屏）
node scripts/e2e/phase13-e2e.mjs   # Phase 13 套件（Suggestion → Confirm/Reject → 清理）
```

E2E 依赖：已构建的 web 版（默认 `E2E_URL=http://127.0.0.1:9928/`）、可达的 BFF（`E2E_BFF_URL` 或 `EXPO_PUBLIC_OPENCODE_URL`）、管理员凭据（从 BFF 的 `.env.local` 读取，或 `E2E_USER`/`E2E_PASS`）。E2E 只调用既有 BFF API，并撤销其创建的 Assignment。OpenCode runtime 用于聊天/项目内容；没有它 Pulse 产品分组仍可工作。

BFF 测试（独立仓库）：`cd family-finance && pnpm test` —— 全部测试使用隔离临时数据库；fail-fast 守卫拒绝测试触碰生产数据库。类型检查：`cd family-finance/packages/web && npx tsc --noEmit`。

## 当前 MVP 范围（已验收）

Event 管道 · Attention lifecycle · Assignment + Assignment Proposal（确认矩阵）· Agent Observation（repeated-decline）· L1 呈现 · Pulse **Needs You / Suggested / Noticed / Today / Market** · Talk 与 handling · Memory / Knowledge Base · delivery 基础设施（outbox + Email/WeCom/WeChat 适配器）· 重启/恢复语义 · 授权边界（无显式确认不激活任何东西）。

## Post-MVP（规划中，不属于当前 MVP）

Observation → Attention 路径 · LLM 驱动的 observation · Open Thread · 更丰富的主动行为 · push 投递扩展 · Agent Runtime 抽象。见 [MVP_ACCEPTANCE](docs/redesign/MVP_ACCEPTANCE.md) 与 [BACKLOG](docs/redesign/BACKLOG.md)。
