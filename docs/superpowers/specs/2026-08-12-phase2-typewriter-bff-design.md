# 阶段 2 设计：打字机效果 + family-finance BFF 中间层

> 日期：2026-08-12
> 范围：agent-mobile（pulse 手机端）+ family-finance（BFF 宿主）
> 目标：引入中间层（BFF），手机端不再直连 opencode；通过 BFF 增量事件流实现真流式打字机

## 背景与动机

阶段 1 已完成：DisplayStep 独立气泡 + 过程旁白、轮询兜底、agent/model 切换。当前手机端直连 opencode server（:4096，Basic auth），存在三个问题：

1. **凭证暴露**：opencode 的 Basic auth 密码在手机端配置里（`.env.local`），任何拿到 APK 的人都能逆向出 opencode 控制凭证。opencode 是高权限遥控器（可执行工具、读写项目文件），凭证落客户端风险高。
2. **无打字机**：`message.part.updated` 推完整 part，UI 只能整块替换，无逐 chunk 打字机效果。
3. **模型列表硬编码**：agent/model 列表硬编码在 `ChatPanel.tsx` 常量里，未接 `/provider` 全量模型。

**中间层（BFF）定位**：全量 BFF——手机端完全不再直连 opencode，所有 REST + SSE 交互走 family-finance web（:19234）。BFF 负责认证、REST 转发、SSE 增量事件转换（打字机数据源）、模型列表聚合。

**关键技术前提（已源码确认）**：opencode 原生推 `message.part.delta` 增量事件（`session.ts:498` 走 `EventV2Bridge.Service`，与 `message.part.updated` 同路径，必然出现在 `/global/event` 流）。`text-delta` / `reasoning-delta` 均触发（`processor.ts:499`、`:294`）。因此 **BFF 无需自己差分文本**，只需缓冲合并 delta 后转发。

## 范围界定

**本阶段（阶段 2）包含：**

- ✅ family-finance web 新增 opencode BFF 路由组（`/api/opencode/*`）
- ✅ JWT 认证（复用家庭理财账号体系，Bearer header 供 RN App 使用）
- ✅ REST 转发代理（session/message/project/status/abort/provider）
- ✅ SSE 增量事件流（`/api/opencode/stream`）：缓冲合并 `message.part.delta` → 推送 `delta` 事件
- ✅ 模型列表聚合（`GET /api/opencode/rest/config/providers` → opencode `/config/providers`）
- ✅ 手机端改造：baseUrl 改 BFF、带 JWT、消费 `delta` 事件实现打字机、动态模型列表
- ❌ 本阶段**不做** family-finance Mobile 客户端（BFF 接口保留复用，客户端后续）
- ❌ 本阶段**不做** 多账号/权限分层（仅"登录即可用 opencode"，admin 分层留待后续）
- ❌ 本阶段**不做** BFF 缓存层（provider 列表除外）

## 目标架构

```
Pulse 手机端 (agent-mobile-app, RN/Expo)
   │  JWT Bearer 认证 + 自定义增量事件协议
   ▼
family-finance Web (:19234, Next.js App Router)
   ├── /api/opencode/auth/login    → 复用家庭理财账号登录发 JWT
   ├── /api/opencode/rest/*        → 转发 opencode REST
   ├── /api/opencode/rest/config/providers → 聚合 /config/providers 模型列表
   └── /api/opencode/stream        → 订阅 /global/event，缓冲合并 delta，推增量事件
         │  凭证藏在服务端环境变量（OPENCODE_*），手机端永不接触
         ▼
opencode serve (:4096, Basic auth)
```

## 增量事件协议（BFF → 手机端 SSE）

`/api/opencode/stream` 推送以下事件（`?sessionID=` 查询参数按会话过滤）：

```
{ type: "delta",           sessionID, messageID, partID, field: "text", text: "<增量>" }
{ type: "part.updated",    sessionID, part: <完整 part> }
{ type: "message.updated", sessionID, info: {id, role, time} }
{ type: "message.removed", sessionID, messageID }
```

**BFF 缓冲逻辑：**
- 订阅 opencode `/global/event`（复用现有 fetch + SSE 解析思路）
- `message.part.delta` 进队列，每 32ms 合并为一个 `delta` 事件推送；多个 part 的 delta 分条推送（避免合并错位）
- `message.part.updated` / `message.updated` / `message.removed` 原样转换转发
- `step-start` / `step-finish` 等冗余事件在 BFF 端过滤（目前前端 filter 的迁移到 BFF 端，减带宽）

**前端打字机语义：** `delta` 事件是"追加式的 part.updated"——前端定位 `messageID → partID`，把 `text` 追加到 `part.text`。server 端 part.text 也是累积语义，轮询 / `part.updated` 完整覆盖时与本地一致，天然纠偏。

## REST 代理（`/api/opencode/rest/*`）

| BFF 路由 | opencode 端点 | 说明 |
|---|---|---|
| `POST /api/opencode/auth/login` | 家庭理财登录 | 复用现有账号体系，发 JWT |
| `GET  /api/opencode/rest/session` | `/session` | 列表（带 directory） |
| `GET  /api/opencode/rest/session/:id` | `/session/:id` | 详情（agent/model） |
| `POST /api/opencode/rest/session` | `/session` | 创建 |
| `DELETE /api/opencode/rest/session/:id` | `/session/:id` | 删除 |
| `PATCH /api/opencode/rest/session/:id` | `/session/:id` | 重命名 |
| `GET  /api/opencode/rest/session/:id/message` | `/session/:id/message` | 分页消息 |
| `GET  /api/opencode/rest/session/status` | `/session/status` | 项目状态 |
| `POST /api/opencode/rest/session/:id/prompt_async` | `/prompt_async` | 发消息（带 agent/model） |
| `POST /api/opencode/rest/session/:id/abort` | `/abort` | 中止 |
| `GET  /api/opencode/rest/config/providers` | `/config/providers` | 模型列表聚合源（返回 `{providers, default}`，需 Basic auth） |

**实现要点：**
- Next.js App Router 动态路由 `packages/web/app/api/opencode/rest/[...path]/route.ts` 单文件承接，按 `path[0]` 分派到 opencode REST（fetch + Basic auth，凭证读 `process.env.OPENCODE_*`）
- 手机端 `opencode-client.ts` 改拼 `BASE_URL/api/opencode/rest/...` + `Authorization: Bearer <jwt>`，方法签名保持不变 → `pulse.tsx`/`ChatPanel`/`ProjectChat` 零改动
- `GET /api/opencode/rest/session/status` 与 `GET /api/opencode/rest/session/:id/message` 路由冲突需处理：动态段 `:id` 与固定 `status` 段——Next.js 中 `session/status` 优先于 `session/[id]`，需确认并测试（若冲突，用路径中不含 `message` 子段的判断区分）。

## 认证

- `requireAuth(request)` 现只读 cookie；新增 `requireAuthHeader(request)` 支持 `Authorization: Bearer`（RN App 用），两套共用 `verifyToken`
- `/api/opencode/*` 全部强制鉴权（包括 stream），未登录 401
- login 复用现有 `POST /api/auth/login` 账号体系（首管理员种子账号）
- opencode Basic auth 凭证只在 family-finance 服务端环境变量：`OPENCODE_BASE_URL` / `OPENCODE_USERNAME` / `OPENCODE_PASSWORD`（默认 `http://127.0.0.1:4096` / opencode / 空）

## 模型列表聚合

- `GET /api/opencode/rest/config/providers` 转发 opencode `/config/providers`，返回 `{ providers, default }`（providers 各含 models 列表，default 为默认模型 ID 映射）
- 手机端 `ChatPanel.tsx` 的 `AGENT_MODELS` 常量替换为动态拉取 + 缓存（退出 BottomSheet 时刷新）
- 保留 `PRIMARY_AGENTS`（agent 循环切换不依赖 provider 列表，model 跟随 agent 默认）

## 手机端改造清单（agent-mobile-app）

| 文件 | 改动 |
|---|---|
| `src/config/opencode.ts` | baseUrl 改 BFF（env `EXPO_PUBLIC_OPENCODE_URL` 指向 `:19234`）；新增 `token` 字段 |
| `src/services/opencode-client.ts` | 请求带 `Authorization: Bearer <token>`；新增 `login()` / `listProviders()` / `getToken` / `setToken`（AsyncStorage 持久化） |
| `src/services/opencode-events.ts` | 改连 `/api/opencode/stream`；`OpenCodeEvent` 类型加 `delta`；解析新事件 |
| `src/services/message-reducer.ts` | 新增 `applyPartDelta`（追加文本）+ 单测 |
| `src/components/chat/ChatPanel.tsx` | SSE 分支加 `case "delta"` → `applyPartDelta` → `recomputeDisplay`；mount 时无 token 先登录；`AGENT_MODELS` 动态拉取 |
| `src/app/_layout.tsx` 或 pulse 入口 | 登录态判断（无 token → 引导登录 / 显示错误） |

## 错误处理

- BFF 转发失败 → 返回 opencode 原始状态码 + 语义化 message；手机端沿用现有 `setError`
- JWT 过期（401）→ 手机端自动重登一次，仍失败则显示"请重新登录"
- BFF 到 opencode 连接失败 → 返回 502，手机端显示服务不可用
- stream 断线重连沿用现有指数退避（`backoffDelay`）

## 测试计划

- **agent-mobile-app 单测**：`message-reducer.test.ts` 增 `applyPartDelta`（追加/乱序/兜底覆盖）；`order-sim.test.ts` 适配 delta 链路
- **BFF 集成测试**（node 脚本，`test/`）：mock opencode 返回，验证缓冲合并、sessionID 过滤、鉴权 401
- **Playwright E2E**（`test/`）：登录 → 打开项目 → 发消息 → 校验打字机增量出现 + step 顺序；`model-sheet` 校验动态模型列表
- **知识库更新**：`modules/chat.md`、`API.md`、`OPERATIONS.md`（新环境变量 + BFF 部署）

## 验收标准

1. 手机端任何请求（REST / stream）不再直连 opencode :4096，全部经 BFF 且带 JWT 校验；无凭证落客户端
2. 发消息后 text 气泡内容逐 chunk 增长（打字机），step 顺序与阶段 1 一致
3. `step-start`/`step-finish` 不再出现在手机端（BFF 端已过滤）
4. 模型选择 BottomSheet 显示动态模型列表（来自 provider）
5. JWT 过期自动重登一次，重登失败显示错误
6. `tsc --noEmit` 通过；单测全绿；Playwright E2E 通过
7. family-finance 既有功能（登录/交易/估值）不回归

## 风险与边界

1. **`session/status` vs `session/[id]` 路由冲突**：需验证 Next.js 静态段优先级，必要时用 catch-all 内判断
2. **SSE 在 Next.js 中长连接**：需 `dynamic = 'force-dynamic'` + streaming response；dev/生产均需验证心跳与断连
3. **打字机与轮询兜底竞态**：`applyPartDelta` 追加后若轮询返回的完整 part 覆盖时序冲突，以"增量追加 + 完整覆盖"语义兜底（server 累积一致）
4. **CORS**：手机端为 RN 原生，无 CORS 约束；web 预览（9928）需确认 BFF 允许来源
