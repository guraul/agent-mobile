# API.md —— 接口清单

> 最后更新：2026-08-10 · commit：`022b4a6`

## 结论

**当前项目无任何对外 HTTP/网络接口。**

- 无后端服务、无 REST/GraphQL、无 WebSocket。
- 应用内所有"接口"为演示桩：`alert()`（Pulse 页操作按钮、指令条、ScreenHeader 铃铛）。
- 数据全部来自硬编码常量（见 DATA.md）。

## 应用内可扩展接口点（现状）

| 位置 | 现状 | 未来接入点 |
|---|---|---|
| `src/screens/events.ts` `PulseEvent.actions[].alert` | alert 演示文案 | 替换为真实路由/调用 |
| pulse.tsx `TextInput` + Send/Mic `onPress` | alert 演示 | 接入 Talk 会话发送 |
| `BottomSheet.onClose` | 本地 state | 保持本地即可 |

## Web 静态服务（serve-static.mjs）

| 路径 | 方法 | 行为 |
|---|---|---|
| `/` | GET | 302 → `/pulse` |
| `/pulse` `/talk` `/memory` `/me` 等 | GET | 返回对应 `.html`（自动补扩展名） |
| `/_expo/static/**` | GET | 静态资源（JS/CSS，gzip 压缩） |
| 其他 | GET | 404 |

鉴权：无（内网/公网直开）。端口 9928。
