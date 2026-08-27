# modules/pulse-stream.md —— Pulse 首页（项目导航）

> 最后更新：2026-08-25 · commit：`b8a122b`（工作区未提交）+其他项目可折叠栏

## 模块职责

Pulse 首页：问候 + AI 在场状态 + **真实项目导航**（按状态分组）+ 全屏聊天 sheet。点击项目直接进入对话。是产品核心页（设计源头：`docs/knowledge-base/AI_INTERACTION_DESIGN.md`）。

> 历史：早期为 mock 事件流（`src/screens/events.ts` + PULSE_SECTIONS），2026-08-11 重构为 opencode 项目导航。`src/screens/events.ts` 已无引用（保留供设计期参考）。

## 入口文件

`agent-mobile-app/src/app/(tabs)/index.tsx`（Pulse 首页；历史名 `pulse.tsx`，已并入 index.tsx 作为默认 tab）

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/app/(tabs)/index.tsx` | 页面：状态分组 + 其他项目折叠栏渲染、sheet 装配 |
| `agent-mobile-app/src/hooks/useProjectEvents.ts` | 聚合 opencode 项目 + 会话 + 状态 + SSE 实时 |
| `agent-mobile-app/src/services/project-status.ts` | `determineProjectStatus` 纯函数（状态判定） |
| `agent-mobile-app/src/services/opencode-client.ts` | REST 客户端（/project、/session、/session/status） |
| `agent-mobile-app/src/services/opencode-events.ts` | SSE 订阅（session.* / permission.* / server.connected） |
| `agent-mobile-app/src/components/navigation/EventItem.tsx` | 列表条目组件（ACTION/PROJECT 两态） |
| `agent-mobile-app/src/components/navigation/BottomSheet.tsx` | 全屏 sheet 容器（fullScreen 模式无 padding） |
| `agent-mobile-app/src/components/feedback/StatusDot.tsx` | 状态点（支持 pulse 呼吸动画） |
| `agent-mobile-app/src/components/chat/ProjectChat.tsx` | 项目聊天入口（见 modules/chat.md） |

## 页面结构（pulse.tsx）

```
KeyboardAvoidingView (ios: padding)
├── ScreenHeader (title="Pulse", right Bell → alert("Notifications"))
├── greetingWrap: getGreeting() 时间问候 + StatusDot(running, pulse) + "I'm here."
└── ScrollView
    ├── error callout（若有）
    ├── loading / 空态
    ├── groups[]：{ label: "NEEDS YOU" | "TODAY", items: GroupedEvent[] }
    │   └── EventItem（onPress → setActiveProject → BottomSheet fullScreen）
    └── OTHER PROJECTS 可折叠栏（2026-08-25 新增，otherOpen state）
        └── 展开后：不活跃项目列表（同 EventItem，status="idle"）
└── BottomSheet(fullScreen, testID="project-chat-sheet")
    └── activeProject && <ProjectChat projectPath onBack />
```

## 分组规则

| section | 条件 |
|---|---|
| Needs you | `event.status === "needs-you"`（等待授权 / agent 空闲等待输入） |
| Today | `event.status === "running"`（agent 正在工作） |
| 过滤 | 仅当天活跃（`updated >= 当天 0 点`），按 `updated` 降序 |
| **Other projects** | **当天不活跃的项目**（`useProjectEvents` 的 `otherProjects`），按 `updated` 降序；默认收起，点击 chevron 展开 |

> **其他项目栏（2026-08-25）**：活跃过滤会让不活跃项目"无处可看"。`useProjectEvents` 新增 `otherProjects` state，把被活跃过滤掉的项目单独返回；pulse.tsx 在底部渲染可折叠栏（`ChevronDown/Right` + "OTHER PROJECTS (N)"），点击项目照常进聊天（`ProjectChat` 自己 `listSessions` 找会话）。

## 状态判定优先级（project-status.ts）

```
1. 任一 session 有 pending 权限   → needs-you（"Needs authorization"）
2. 任一 session busy/retry        → running（"Running"/"Retrying"）
3. 任一 session 已知 idle         → needs-you（"Needs you"，agent 在等输入）
4. 兜底                           → idle
```

**注意**：opencode `/session/status` 只报告活跃（busy/retry）会话；存在但不在 map 中的 session 视为 idle（在 hook 中显式补 `"idle"`）。

## useProjectEvents 数据流

```
refresh()（30s 轮询 + server.connected 触发）
  ├─ getProject()                    → projectsRef（过滤 id="global"）
  ├─ listSessions(directory)（按项目）→ sessionsRef
  └─ getSessionStatus()              → sessionStatusRef
recompute()：
  ├─ session 按 directory 分组到项目
  ├─ 每个项目补 idle 状态 + determineProjectStatus
  ├─ 过滤当天活跃 + updated 降序 → setEvents
  └─ 被过滤掉的不活跃项目 → setOtherProjects（updated 降序）
SSE 事件 → 更新 refs 后 recompute：
  session.status / permission.updated / permission.replied / session.updated / session.created / session.deleted
```

## 修改本模块的注意事项

- **勿用 `project.time.updated` 判活跃**：其值被 watcher 污染，活跃度必须基于 `session.time.updated`。
- **`/session` 不带 directory 参数只返回默认工作区会话**：必须按项目 `directory` 分别查询。
- **分组/判定逻辑改动**：先改 `project-status.ts`（纯函数 + 单测），再改 hook/页面。
- **BottomSheet fullScreen 无 padding**：内容组件（如 ProjectChat header）需自带 padding。
- 单测：`src/services/project-status.test.ts`（9 例）。
