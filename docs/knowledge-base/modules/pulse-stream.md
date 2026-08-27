# modules/pulse-stream.md —— Pulse 首页（项目导航 + 基金估值）

> 最后更新：2026-08-27 · commit：`5565b12`（交易提醒交互闭环：点看详情 + 确认处理）

## 模块职责

Pulse 首页：问候 + AI 在场状态 + **真实项目导航**（按状态分组）+ **基金估值跑马灯** + 全屏聊天 sheet。点击项目直接进入对话。是产品核心页（设计源头：`docs/knowledge-base/AI_INTERACTION_DESIGN.md`）。逐步向 Jarvis 形态演进（除 opencode 项目事件外，接入 family-finance 基金事件）。

> 历史：早期为 mock 事件流（`src/screens/events.ts` + PULSE_SECTIONS），2026-08-11 重构为 opencode 项目导航。`src/screens/events.ts` 已无引用（保留供设计期参考）。

## 入口文件

`agent-mobile-app/src/app/(tabs)/index.tsx`（Pulse 首页；历史名 `pulse.tsx`，已并入 index.tsx 作为默认 tab）

## 关键文件清单

| 文件路径 | 职责 |
|---|---|
| `agent-mobile-app/src/app/(tabs)/index.tsx` | 页面：状态分组 + 其他项目折叠栏 + 基金跑马灯 + sheet 装配 |
| `agent-mobile-app/src/hooks/useProjectEvents.ts` | 聚合 opencode 项目 + 会话 + 状态 + SSE 实时 |
| `agent-mobile-app/src/hooks/useFundEvents.ts` | 订阅基金事件流：`funds`（最新估值）+ `alert`（交易提醒） |
| `agent-mobile-app/src/services/fund-events.ts` | 订阅 BFF `/api/events/stream`（JWT + 指数退避重连） |
| `agent-mobile-app/src/components/navigation/Marquee.tsx` | 横向自动滚动跑马灯组件（基金名/估值滚动） |
| `agent-mobile-app/src/components/navigation/FundMarqueeItem.tsx` | 基金行情列表条目（与 EventItem 同视觉，MARKET 标签 + 两行跑马灯 + StatusPill） |
| `agent-mobile-app/src/services/project-status.ts` | `determineProjectStatus` 纯函数（状态判定） |
| `agent-mobile-app/src/services/opencode-client.ts` | REST 客户端（/project、/session、/session/status） |
| `agent-mobile-app/src/services/opencode-events.ts` | opencode SSE 订阅（session.* / permission.* / server.connected） |
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
    ├── groups[]（2026-08-27 起支持混合条目 project + market）：
    │   ├── NEEDS YOU（永远最上）：项目 EventItem + 有 trade-alert 时第一项是 MARKET（warning"有基金需要交易"）
    │   ├── TODAY：running 项目 EventItem
    │   └── MARKET（2026-08-27，无 trade-alert 时）：FundMarqueeItem 行情条目，Today 之后
    └── OTHER PROJECTS 可折叠栏（2026-08-25 新增，otherOpen state）
        └── 展开后：不活跃项目列表（同 EventItem，status="idle"）
└── BottomSheet(fullScreen, testID="project-chat-sheet")
    └── activeProject && <ProjectChat projectPath onBack />
```

> **分组条目类型（2026-08-27）**：`groups[].items` 由 `GroupItem` 联合类型组成——`{kind:"project", event}`（项目）或 `{kind:"market", hasAlert}`（基金行情）。渲染时按 kind 分发到 `EventItem` 或 `FundMarqueeItem`。
> **跑马灯布局规则（2026-08-27 重构）**：跑马灯不再置顶。无 trade-alert 时作为独立 MARKET 分组（Today 之后）；收到 `fund.trade-alert` 时升级为 NEEDS YOU 第一项（StatusPill 变 warning"有基金需要交易"）。FundMarqueeItem 与 EventItem 视觉一致（同 surface.1/边框/padding/圆角），UI 上像普通列表列。
> **交易提醒交互闭环（2026-08-27）**：alert 时点击 MARKET 条目（`aria-label="有基金需要交易"`，Pressable）→ 弹 `trade-alert-sheet` BottomSheet 展示各基金（估净/目标/超出%）；点"确认处理" → `dismissAlert()` 清空 alert → sheet 关闭，MARKET 回落独立分组。

## 分组规则

| section | 条件 |
|---|---|
| Needs you | `event.status === "needs-you"`（等待授权 / agent 空闲等待输入） |
| Today | `event.status === "running"`（agent 正在工作） |
| 过滤 | 仅当天活跃（`updated >= 当天 0 点`），按 `updated` 降序 |
| **Other projects** | **当天不活跃的项目**（`useProjectEvents` 的 `otherProjects`），按 `updated` 降序；默认收起，点击 chevron 展开 |

> **其他项目栏（2026-08-25）**：活跃过滤会让不活跃项目"无处可看"。`useProjectEvents` 新增 `otherProjects` state，把被活跃过滤掉的项目单独返回；pulse.tsx 在底部渲染可折叠栏（`ChevronDown/Right` + "OTHER PROJECTS (N)"），点击项目照常进聊天（`ProjectChat` 自己 `listSessions` 找会话）。

## 基金事件流（2026-08-27 新增）

```
family-finance BFF /api/events/stream（SSE，JWT）
  ├── fund.estimate 每 5s：未归档基金实时估算净值 {code,name,estimatedNav,prevNav,changePct}
  │     └── useFundEvents.handleEstimate → setFunds → Marquee 跑马灯渲染
  └── fund.trade-alert（14:50 定时任务实际发送通知后）{code,name,estimatedNav,targetNav,diff}
        └── useFundEvents.handleAlert → setAlert → alertRow "有基金需要交易(N)"
```

- **fund-events.ts**：fetch SSE 订阅 `/api/events/stream`，复用 `tokenHeader` JWT；断线指数退避重连（同 opencode-events 模式）；只解析 `fund.estimate` / `fund.trade-alert`。
- **Marquee.tsx**：内容超宽（>90% 屏宽）时 `Animated.loop` translateX 无缝循环滚动（内容复制两份），否则静止展示。
- **FundMarqueeItem.tsx**：与 EventItem 相同视觉的行情条目（MARKET 标签 + 基金名/估值两行跑马灯 + StatusPill）；`hasAlert` 时 StatusPill 为 warning"有基金需要交易(N)"，否则 idle"Watching"；Pressable 可点击（onPress）。
- **useFundEvents.dismissAlert()（2026-08-27）**：确认处理后清空 alert（needs-you 消失，跑马灯回落 MARKET 分组）。alert 是前端 state，收到 trade-alert 后保持，直到 dismiss 或新事件覆盖。
- 涨跌颜色：changePct>=0 用 `success`（红涨），否则 `error`（绿跌）——注意中国市场红涨绿跌约定。

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
- **跑马灯数据源**：`useFundEvents.funds` 来自 BFF 事件流，勿在前端硬编码基金列表；无活跃基金时 BFF 静默不推（`funds` 为空 → 区块不渲染）。
- **trade-alert 是一次性事件**：只在 14:50 定时任务实际发送通知后推一次，不是持续流；`useFundEvents.alert` 收到后保持显示，下次触发才更新。
- 单测：`src/services/project-status.test.ts`（9 例）。
