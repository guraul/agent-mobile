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
   ├── /api/auth/login（复用）      → 家庭理财账号登录，JSON 响应带 token
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
- Next.js App Router 动态路由 `packages/web/app/api/opencode/rest/[...path]/route.ts` 单文件承接，按 `path` 拼接转发到 opencode REST（fetch + Basic auth，凭证读 `process.env.OPENCODE_*`）
- **catch-all 路由无 `session/status` vs `session/[id]` 冲突**（所有段在一个 handler 内拼接到上游，无静态段优先级问题）
- 手机端 `opencode-client.ts` 改拼 `BASE_URL/api/opencode/rest/...` + `Authorization: Bearer <jwt>`，方法签名保持不变 → `pulse.tsx`/`ChatPanel`/`ProjectChat` 零改动
- **CORS**：所有 `/api/opencode/*` 路由响应带 `Access-Control-Allow-Origin: <BFF 允许的 9928 origins>` + `Access-Control-Allow-Headers: authorization, content-type` + `Access-Control-Allow-Methods: GET, POST, PATCH, DELETE, OPTIONS`；OPTIONS 请求返回 204。web 预览（9928）跨域 fetch 依赖此头；RN 原生无 CORS 约束

## 认证与登录 UX

- `requireAuth(request)` 现只读 cookie；新增 `requireAuthHeader(request)` 支持 `Authorization: Bearer`（RN App 用），两套共用 `verifyToken`
- `/api/opencode/*` 全部强制鉴权（包括 stream），未登录 401
- **登录复用现有 `POST /api/auth/login`**（账号体系 + 限速 + 种子管理员账号），JSON 响应新增返回 `token`（JWT 有效期 1 天，与现有 cookie maxAge 一致）
- **手机端登录 UX（轻量横幅）**：pulse 首页顶部显示"未登录"横幅（无 token 或 token 失效时），点击弹窗输入家庭理财账号/密码 → 登录成功存 token（AsyncStorage）→ 横幅消失；**不强制拦截浏览**（未登录仅显示横幅，页面其他内容照常加载失败显示错误）
- **401 处理**：任何请求返回 401 → 清 token → 显示"未登录"横幅（用户手动重新登录；不做自动重登，因不存密码）
- opencode Basic auth 凭证只在 family-finance 服务端环境变量：`OPENCODE_BASE_URL` / `OPENCODE_USERNAME` / `OPENCODE_PASSWORD`（默认 `http://127.0.0.1:4096` / opencode / 空）
- **安全收窄**：手机端不再直连后，opencode serve 改 `--hostname 127.0.0.1`（仅本机 BFF 可访问，关闭公网暴露）；手机端 `.env.local` 删除 `EXPO_PUBLIC_OPENCODE_PASSWORD`（凭证不再进 APK）

## 模型列表聚合

- `GET /api/opencode/rest/config/providers` 转发 opencode `/config/providers`，返回 `{ providers, default }`（providers 各含 models 列表，default 为默认模型 ID 映射）
- 手机端 `ChatPanel.tsx` 的 `AGENT_MODELS` 常量替换为动态拉取 + 缓存（退出 BottomSheet 时刷新）
- 保留 `PRIMARY_AGENTS`（agent 循环切换不依赖 provider 列表，model 跟随 agent 默认）

## 手机端改造清单（agent-mobile-app）

| 文件 | 改动 |
|---|---|
| `src/config/opencode.ts` | baseUrl 改 BFF（env `EXPO_PUBLIC_OPENCODE_URL` 指向 `:19234`）；新增 `token` 字段；删除 username/password（凭证不再进客户端） |
| `src/services/auth.ts`（新） | `getToken` / `setToken`（AsyncStorage 持久化）/ `login(username,password)` 调 `/api/auth/login` / `tokenHeader()` |
| `src/services/opencode-client.ts` | 请求带 `Authorization: Bearer <token>`；新增 `listProviders()`；401 时回调清 token |
| `src/services/opencode-events.ts` | 改连 `/api/opencode/stream`；`subscribeToOpenCodeEvents` 加可选 `sessionID` 参数（拼 `?sessionID=`）；`OpenCodeEvent` 类型加 `delta` |
| `src/services/message-reducer.ts` | 新增 `applyPartDelta`（追加文本）+ 单测 |
| `src/components/chat/ChatPanel.tsx` | SSE 分支加 `case "delta"` → `applyPartDelta` → `recomputeDisplay`；订阅时传 `sessionID`；`AGENT_MODELS` 动态拉取 |
| `src/app/(tabs)/pulse.tsx` | 顶部"未登录"横幅 + 登录弹窗（复用 theme 组件），401 时联动显示 |

## 错误处理

- BFF 转发失败 → 返回 opencode 原始状态码 + 语义化 message；手机端沿用现有 `setError`
- JWT 过期/无效（401）→ 手机端清 token → 显示"未登录"横幅，用户手动重新登录
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
5. 未登录时 pulse 顶部显示横幅，点击弹窗登录成功横幅消失；401 清 token 后横幅重现
6. `tsc --noEmit` 通过；单测全绿；Playwright E2E 通过（web 预览跨域 fetch BFF 成功）
7. family-finance 既有功能（登录/交易/估值）不回归
8. opencode serve 收窄为 127.0.0.1 监听；手机端 `.env.local` 无 `EXPO_PUBLIC_OPENCODE_PASSWORD`

## 风险与边界

1. **SSE 在 Next.js 中长连接**：需 `dynamic = 'force-dynamic'` + streaming response；dev/生产均需验证心跳与断连
2. **打字机渲染性能**：BFF 每 32ms 推 delta → `recomputeDisplay` 全量 `mergeMessages` → 可见气泡 markdown 全量重渲染。移动端 markdown 高频重渲染可能卡顿；缓解：前端把 delta 并入现有 16ms dispatcher 批量处理，或对未变气泡 memo
3. **reasoning delta 一并推送**：opencode 对 reasoning part 同样发 `field:"text"` 的 delta，BFF 统一转为 `delta` 事件；前端 `applyPartDelta` 会追加到 reasoning part 但 UI 不显示内容（旁白），无害但占带宽（已知行为，不做 BFF 端 part 类型跟踪）
4. **打字机与轮询兜底竞态**：`applyPartDelta` 追加后若轮询返回的完整 part 覆盖时序冲突，以"增量追加 + 完整覆盖"语义兜底（server 累积一致）
5. **CORS**：BFF 路由响应带 `Access-Control-Allow-Origin`（9928 origins）；RN 原生无 CORS 约束
