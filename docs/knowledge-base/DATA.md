# DATA.md —— 数据查询指南

> 最后更新：2026-08-10 · commit：`022b4a6`

## 数据实体清单

| 实体 | 字段 | 存储位置 | 文件路径 |
|---|---|---|---|
| PulseEvent | id/type/title/summary/status/statusLabel/detail/actions | TS 常量（内存态） | `agent-mobile-app/src/screens/events.ts` |
| PULSE_SECTIONS | label/eventIds | TS 常量 | 同上 |
| 主题令牌 | colors/typography/spacing/radius/motion/icons/shadows | TS 常量 | `agent-mobile-app/src/theme/*.ts` |
| 应用配置 | name/slug/package/主题色 | JSON | `agent-mobile-app/app.json` |
| 构建配置 | build profiles | JSON | `agent-mobile-app/eas.json` |

**无数据库、无文件存储、无网络数据。全部为编译期常量。**

## 常见查询场景

| 我想查 X | 去哪个文件 | 怎么查 |
|---|---|---|
| 事件列表数据 | `agent-mobile-app/src/screens/events.ts` | `PULSE_EVENTS`（数组）、`PULSE_SECTIONS`（分组） |
| 某个事件详情字段 | 同上 | 按 `id`（如 `"migration"`）在 `PULSE_EVENTS` 中查找 |
| 事件在列表哪一组 | 同上 | `PULSE_SECTIONS[].eventIds` 是否含 id |
| 状态有哪些取值 | `agent-mobile-app/src/components/feedback/StatusDot.tsx` | `StatusType` 类型定义 |
| 颜色值 | `agent-mobile-app/src/theme/colors.ts` | `colors.*` |
| 应用包名/名称 | `agent-mobile-app/app.json` | `expo.name` / `expo.android.package` |
| 构建 profile | `agent-mobile-app/eas.json` | `build.preview/production` |

## 数据变更链路

```
谁写入        存在哪                谁读取
──────────────────────────────────────────────
开发者编辑     events.ts（编译期）   pulse.tsx（eventMap 索引 + 分组渲染）
开发者编辑     theme/*.ts           组件与页面（import）
开发者编辑     app.json             运行时配置（EAS/Expo）
```

- 运行时唯一"写入"是页面内存 state（`selectedEvent`、`prompt`），随页面销毁消失。
- 改 mock 数据无需重启服务：web 预览需重新 `expo export`；Expo Go/dev 模式热更新。
