# modules/router.md —— 路由与应用壳

> 最后更新：2026-10-02 · commit：`feat(chat): sessions 抽屉 + 移动端边缘滑入手势 #34F (#47)`（epic #35 全部收官；新增抽屉导航路径，见"双 chat 页分流"节末）
> 上一版：2026-09-21 `feat/companion-ui-migration`（Companion UI Migration：单表面导航，取消 4-tab）

## 模块职责

Expo Router 文件路由：根 Stack（单表面 Companion 导航），承载全部页面注册。
Pulse 是唯一根界面；Talk / Attention / Responsibilities / Knowledge 是 contextual stack 路由；
Settings / Memory / Knowledge 检索以 contextual sheet 呈现（不再是 tab 页）。

## 入口文件

- `agent-mobile-app/src/app/_layout.tsx`（根，SafeAreaProvider + StatusBar(light) + Stack）

## 关键文件清单

| 文件路径 | 路由 | 内容 |
|---|---|---|
| `src/app/_layout.tsx` | — | SafeAreaProvider + StatusBar(light) + Stack（headerShown:false；web 端 fatal error 兜底屏） |
| `src/app/index.tsx` | `/` | **Pulse 根界面**（唯一表面）：Hero（问候+AI 文案+watching 行）/ Featured（≤1 attention）/ Supporting（≤4 行）/ Noticed（≤5）+ Conversation Entry + Settings 入口 |
| `src/app/talk.tsx` | `/talk` | Talk contextual stack（**双 chat 页分流入口**，见下节）：params sessionId/projectPath/attention/autoSendContext/autoContextText；runtime 不可用时呈现 orb header + 离线卡片（带返回） |
| `src/app/assignments.tsx` | `/assignments` | Responsibilities 列表（WATCHING 行 → FundSheet） |
| `src/app/assignments/[id].tsx` | `/assignments/[id]` | Responsibility 详情 |
| `src/app/attention/[id].tsx` | `/attention/[id]` | Attention 详情（evidence + 关联 assignment 只读投影） |
| `src/app/kb/doc.tsx` | `/kb/doc` | KB 文档阅读屏（params ref/title） |
| `src/app/memory.tsx` | `/memory` | **Redirect → `/`**（legacy 兼容，避免旧深链 404） |
| `src/app/me.tsx` | `/me` | **Redirect → `/`**（legacy 兼容；配置能力迁入 SettingsSheet） |
| `src/app/+not-found.tsx` | 404 | expo-router 自动生成（未列，由模板提供） |

**已删除**：`src/app/(tabs)/` 整个目录（`_layout.tsx` / `index.tsx` / `talk.tsx` / `memory.tsx` / `me.tsx`）。
底部 tab bar 已不存在；`(tabs)/_layout.tsx` 的 Tab 配置随之废弃。

## 双 chat 页分流（/talk 单路由 → chat / chatcode 两壳，epic #35，2026-09-29）

**不拆 `/chat` + `/chatcode` 两条路由**（用户 2026-09-28 拍板 C1）。`/talk` 仍是唯一聊天路由，
进页后按会话 `directory` **运行时分流**到两个壳：

```
/talk ──(薄入口)──> talk.tsx 解析 session
                     │  resolveConversationKind(session.directory)   ← 纯函数 + 单测
                     ├─ "chat"     → ProjectChatZ（伴侣页）  标题 "Pulse — Chat"
                     │                 · 有 Layers 会话选择器
                     │                 · cream 底 + 白面板 + 双气泡 + peach 主行动作
                     │                 · Duties / Projects 斜杠内白卡
                     └─ "chatcode" → ProjectChatZ（工作台壳）标题 "Pulse — Code Chat"
                                       · **无会话选择器**（绑项目最新 session = resume-most-recent）
                                       · 工具折叠组 / thinking / diff 卡 / composer 两态 / 排队 chip
```

### 判据表（`src/services/conversation-kind.ts`）

| 会话 `directory` | kind | 壳 |
|---|---|---|
| 空 / 未设置 / `/`（裸进入、Direct Talk 默认） | `chat` | 伴侣页 |
| `MARKET_TALK_DIRECTORY` = `/root/project/family-finance`（market 工作区：Attention market 域 / Suggested 会话） | `chat` | 伴侣页 |
| 其余任意真实代码仓库目录 | `chatcode` | 工作台 |

判据一句话：**对话的 subject 是不是需要真实操作的代码仓库？**

### 为什么判据放运行时（勿改回跳转前）

`directory` 是 **session 属性**，进页解析会话后才知道；跳转前（Pulse 侧）拿不到。
因此判据必须在运行时求值，`talk.tsx` 把 `kind` 传给 `ProjectChatZ`（标题按 kind 分流）。

### 会话切换导航（#34F 抽屉，2026-10-01 拍板 A 方案）

- **chat 侧**：header Layers 图标（aria-label "Switch session"）唤起 `SessionsDrawer`（自实现 drawer：cream 306px + 左缘 24px 热区右滑唤起 + 抽屉内拖拽关闭），**替代**原 LightSheet 会话选择器——列表/切换/新建同一份 listSessions 数据
- **chatcode 侧**：维持"绑最新 session"无选择器、无抽屉入口（#31 拍板不变）；是否加抽屉入口待用户确认（实现是一行 prop 改动）
- 抽屉实现与三个手势坑见 `modules/chat.md` #34F 段；松手决策纯函数在 `src/services/drawer-gesture.ts`
**所有既有 route params（autoSendContext / autoContextText / attId / projectPath / subjectId / sessionId）全兼容，e2e 零改动。**

`MARKET_TALK_DIRECTORY` 常量原声明在 `services/attention/talk.ts`，为让判据文件零依赖可单测已收编到
`conversation-kind.ts`，`attention/talk.ts` 转为 re-export（勿重复声明）。

### 边界与已知限制

- chatcode 侧**不渲染 Layers 按钮**；若日后要做 sessions 抽屉（epic #35 #34，仍待讨论），会与"绑最新 session"机制冲突，须先拍板。
- 内白卡（Duties/Projects）是 chat 侧能力，但 `/assignments`、`/projects` 的**客户端拦截在 `ChatPanelZ` 内**，两壳共用（chatcode 里发同样斜杠命令也会出卡）。
- 两壳共享 `ChatPanelZ` / `MessageBubbleZ` 全部数据逻辑；分流只影响 header 形态与呈现。

细节（token / 卡片 / composer / 队列）见 [chat.md](chat.md)。

## 导航语义（Companion IA）

- Pulse 根界面不渲染 tab bar；唯一输入 affordance 是底部 Conversation Entry（胶囊输入 + 发送按钮），
  进入即 `/talk`（无既有 attention 上下文时）。
- Attention 动作路由：REVIEW → `/attention/[id]`；Discuss → `/talk`（带 attention 上下文）；Mark handled / Dismiss 在卡内完成。
- Settings / Memory / Knowledge / Fund 详情均为 **sheet**（`components/pulse/*Sheet.tsx`），挂在 `index.tsx`。
- `/talk` 是 stack 路由：关闭走 `router.back()`（无可返回时 `router.replace("/")`），
  离线/加载态 header 也带返回按钮（`talk-back`），不会把用户困在子页。
- `/talk` 内部按会话 directory 运行时分流到 chat / chatcode 两壳，**不新增路由**（见上节）。

## 对外暴露的接口/导出

- 无程序化导出；仅默认导出布局组件。

## 依赖关系

- 依赖：expo-router、lucide-react-native、`src/theme`（colors/iconStroke）、各页面
- 被依赖：应用入口（`package.json` `"main": "expo-router/entry"`）

## 修改注意事项

- **新增页面**：在 `src/app/` 下建文件即注册路由；同时必须在 `_layout.tsx` 的 `<Stack.Screen>` 登记。
- **不要再建 tab**：IA 已冻结为单表面（PRODUCT_MODEL / PRODUCTION_UI_MIGRATION_MAPPING.md）；
  contextual 能力一律 sheet 或 stack push。
- expo 静态导出（web）按路由生成独立 HTML（`index.html` / `talk.html` / `memory.html` / `me.html` /
  `assignments.html` / `attention/[id].html` / `kb/doc.html`），`serve-static.mjs` 处理 `/`、无扩展名
  与动态段回退（`/attention/x` → `attention/[id].html`）。
- `/memory` `/me` 保留仅为旧深链兼容，不要再往里加功能。
- **勿新增 `/chat` 或 `/chatcode` 路由**：双页分流是单路由运行时分流（拍板 C1），拆路由会破坏
  route params 兼容性与 e2e 基线。新增聊天形态一律在 `ProjectChatZ`/`ChatPanelZ` 内按 `kind` 分支。
- **勿把 `resolveConversationKind` 的判据搬到跳转前**：`directory` 是 session 属性，Pulse 侧拿不到；
  前置判据会导致裸进入（无 directory）永远进不了 chatcode。
