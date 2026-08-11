# DATA.md —— 数据查询指南

> 最后更新：2026-08-11 · commit：`072537f`（opencode 集成 + 消息顺序修复）

## 数据实体清单

| 实体 | 字段 | 存储位置 | 文件路径 |
|---|---|---|---|
| OpenCodeProject | id/worktree/vcs | OpenCode Server（REST /project） | 类型：`agent-mobile-app/src/services/opencode-client.ts` |
| OpenCodeSession | id/title/directory/agent/model/time/summary/cost | OpenCode Server（REST /session） | 同上 |
| OpenCodeMessage | info(id/role/sessionID/time)/parts[] | OpenCode Server（REST /session/{id}/message + SSE） | 同上 |
| ProjectEvent（聚合） | id/projectPath/name/status/statusLabel/summary/updated/sessionIDs | 运行时计算（useProjectEvents refs） | `agent-mobile-app/src/services/project-status.ts` |
| DisplayMessage（合并后） | id/role/text/tools/createdAt | 运行时计算（mergeMessages） | `agent-mobile-app/src/services/message-merging.ts` |
| 主题令牌 | colors/typography/spacing/radius/motion/icons/shadows | TS 常量 | `agent-mobile-app/src/theme/*.ts` |
| 应用配置 | name/slug/package/主题色 | JSON | `agent-mobile-app/app.json` |
| 构建配置 | build profiles | JSON | `agent-mobile-app/eas.json` |
| 连接参数 | baseUrl/username/password | `.env.local`（未提交） | `agent-mobile-app/src/config/opencode.ts` |

**应用无本地数据库**：项目/会话/消息数据全部由 OpenCode Server 提供（REST + SSE 流式增量）。

## 常见查询场景

| 我想查 X | 数据源 | 怎么查 |
|---|---|---|
| 项目列表（Pulse 首页） | REST `/project` | `opencodeClient.getProject()`，过滤 `id==="global"` |
| 某项目的全部会话 | REST `/session?directory=` | `opencodeClient.listSessions(projectPath)`（**必须带 directory**，不带只返回默认工作区） |
| 会话当前忙闲状态 | REST `/session/status` | `opencodeClient.getSessionStatus()`；**只含活跃会话**，其余按 idle 处理 |
| 会话最近一条消息时间 | REST `/session/{id}` | `getSession(id).time.updated`（状态判定的活跃度基准，勿用 project.time.updated） |
| 某会话最近 50 条消息 | REST `/session/{id}/message?limit=50` | `opencodeClient.listMessages(id, {limit:50})`；返回 **chronological（旧在前）** |
| 消息是否包含工具调用 | SSE / REST parts | `msg.parts` 中 `type==="tool"`（tool/state.status/input） |
| 某项目聚合状态 | 计算 | `determineProjectStatus()`（见 project-status.ts，优先级：pending 权限 → busy/retry → idle） |
| 状态有哪些取值 | `project-status.ts` | `ProjectStatus = "running" \| "needs-you" \| "idle"` |
| 颜色值 | `agent-mobile-app/src/theme/colors.ts` | `colors.*` |
| 应用包名/名称 | `agent-mobile-app/app.json` | `expo.name` / `expo.android.package` |
| 构建 profile | `agent-mobile-app/eas.json` | `build.preview/production` |

## 数据变更链路

```
谁写入                    存在哪                         谁读取
────────────────────────────────────────────────────────────────
用户发消息 (prompt_async)  OpenCode Server (内存+磁盘)    ChatPanel (SSE + 全量刷新)
agent 回复 (SSE 流式)      OpenCode Server                message-reducer → mergeMessages → MessageBubble
opencode serve 运行态      /session/status (活跃表)       useProjectEvents (30s 轮询 + SSE)
session CRUD               OpenCode Server                useProjectEvents / ProjectChat
开发者编辑                 theme/*.ts / app.json         组件与页面（import）
```

## 调试技巧

- 直接 curl 验证数据：`curl -u opencode:$PASS http://127.0.0.1:4096/session/ses_xxx/message?limit=5`（Basic auth）。
- SSE 事件流验证：`curl -N -u opencode:$PASS http://127.0.0.1:4096/global/event`（注意 `sync` 内部帧会被客户端过滤）。
- 消息顺序问题排查：先 curl 确认 API 返回顺序（**chronological**），再检查 reducer 插入与 mergeMessages 是否保持了该顺序。
