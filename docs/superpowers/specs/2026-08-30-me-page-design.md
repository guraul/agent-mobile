# Me 页设计：连接与账号 / BFF 地址切换 / model 偏好配置

> 日期：2026-08-30
> 范围：agent-mobile Me tab（`agent-mobile-app/src/app/(tabs)/me.tsx`，当前为占位页）
> 目标：把占位的 Me 页做成 Jarvis 式「配置/个人中心」翼——账号登出、BFF 地址运行时切换、按 agent 配默认 model

## 背景与动机

agent-mobile 定位为「类似 Jarvis 的移动助手」，4 tab 对应四翼：Pulse（感知，已实现）/ Talk（交互，占位）/ Memory（记忆，占位）/ Me（配置，占位）。Me 页当前仅 `<PlaceholderScreen title="Me"/>`。

本次落地 Me 翼，三块由用户确认：

1. **连接与账号**：当前登录用户名 + BFF 在线状态 + 登出
2. **BFF 地址配置**：运行时切换 BFF 的 IP+port（换云主机场景）
3. **model 偏好**：在 Me 集中配置各 agent 的默认 model，免去在 Pulse 聊天里每次手选 deepseek

## 范围界定

- ✅ BFF 地址切换走**方案 C（重启生效）**：写 AsyncStorage，启动读一次设 `runtimeBaseUrl`，运行中不热切
- ✅ model 偏好走**手机端覆盖模式**：存 AsyncStorage，ChatPanel 读偏好设默认 pill，发消息带 `model` 覆盖（不改 server opencode.json）
- ✅ model 选择沿用现有 **deepseek 筛选**（不放开其他 provider，与 ChatPanel `loadModels` 一致）
- ✅ model 选择弹窗 = **SearchInput 实时过滤 + ScrollView 可滚**（列表长）
- ✅ 未登录不在 Me 内嵌登录组件：提示「去 Pulse 登录」切 tab 0，复用 Pulse 现有 `needLogin` 登录 sheet
- ❌ **不做** BFF 地址运行时热切（方案 A，不处理 SSE 断开/token 失效重连）
- ❌ **不做** opencode server 端 agent.model 写入（opencode 不暴露写 API，配置走 opencode.json 文件）
- ❌ **不做** BFF `/api/auth/me` 端点（用 login 时存 username 替代，简单可靠）
- ❌ **不做** 通知偏好 / 关于 / 主题 / 设备信息（本期三块之外，二期再说）
- ❌ ChatPanel 手选 model 不自动持久化为偏好（本次覆盖，不改默认）

## 页面结构

Me 页 = `ScrollView` 垂直堆叠 3 个 `Card`（复用 primitives，颜色走 `theme`）。

**Card 1 · 连接与账号**
- 已登录态：在线状态点（`StatusDot` 绿/灰）+ `username` + BFF 地址 + 「登出」`Button`
- 未登录态：离线灰点 + 「未登录」+ 「去 Pulse 登」`Button`（切 tab 0）

**Card 2 · BFF 地址**
- 当前生效地址只读（标注「默认」=env / 「自定义」=AsyncStorage 覆盖）
- 新地址 `Input` + 「保存」`Button` → `setRuntimeBaseUrl` → 提示重启生效
- 「恢复默认」`Button` → `clearRuntimeBaseUrl`

**Card 3 · model 偏好**
- `listAgents` 拉 primary agent 列表（build/plan/design 等）
- 每 agent 一行：agent 名 + 当前偏好 `provider:model` + 「›」
- 点击 → `BottomSheet`：标题 + 关闭 + `SearchInput`（实时按 modelID 子串不分大小写过滤）+ `ScrollView` 列出 `listProviders` 的 deepseek model（匹配项）+ 「确认」
- 选中 → `setModelPref(agent, {providerID, modelID})` → 行刷新

## 数据 / 状态层（纯逻辑，可单测）

**① `config/opencode.ts`**
```
opencodeConfig = { baseUrl(env), runtimeBaseUrl(null), token }
getBaseUrl() = runtimeBaseUrl ?? baseUrl   // 新导出
```
启动时（合并进现有 `loadToken()` 启动流程）调 `getRuntimeBaseUrl()` → 设 `runtimeBaseUrl`；不新增独立调用点。

**② `services/auth.ts`**
`login(u,p)` 成功 → `setUsername(u)`（AsyncStorage key `pulse_username`）；`logout`/`handleUnauthorized` 清；新增 `getUsername()`。

**③ `services/model-prefs.ts`（新）**
```
getModelPref(agent): {providerID, modelID} | null
setModelPref(agent, {providerID, modelID})
loadModelPrefs(): agent→model 的 map
```
key `pulse_model_pref_<agent>`。

**④ `services/bff-config.ts`（新）**
```
getRuntimeBaseUrl(): string | null
setRuntimeBaseUrl(url): 写 AsyncStorage
clearRuntimeBaseUrl(): 恢复默认
```

**⑤ `services/bff-health.ts`（新）**
Me mount 时探测 `getBaseUrl()`（超时 3s）→ 在线/离线点。失败静默。

**⑥ `filterModels(list, query)`（纯函数）**
modelID 子串不分大小写过滤，给弹窗用，可复用。

## 数据流 + ChatPanel 集成

**Me 页 mount**：读 `getBaseUrl()/getUsername()/loadModelPrefs()` → 并行拉 `listAgents` + `listProviders`(筛 deepseek) + `bff-health`。

**ChatPanel 集成（关键改动）**：
- mount 加 `loadModelPrefs()`，设各 agent 默认 pill
- **优先级：Me 偏好 > server `agent.model` > fallback**
- model pill 初始读偏好；无偏好走现逻辑。发消息 `model` 覆盖逻辑不变
- 手选 = 本次覆盖不持久

## 错误处理

- `listAgents/listProviders` 失败：Card 3 显「加载失败 + 重试」
- `bff-health` 超时/失败：显离线灰点，不阻断其他卡片
- 登出 `/logout` 失败：仍清本地 token+username，提示「服务端登出失败，已本地登出」
- `loadModelPrefs` 失败：静默回退现逻辑，不影响对话
- AsyncStorage 写失败：提示「保存失败」

## 测试点（vitest 纯逻辑单测）

- `getBaseUrl`：runtime 优先回退 env
- `model-prefs`：`set/get/load` 一致；覆盖单 agent 不影响其他
- `bff-config`：`set/get/clear` 生命周期
- `auth` username：login 存 / logout 清
- `filterModels(list, query)`：子串不分大小写
- E2E（Playwright）可选，先单测保底

## 关键约束

- **Expo SDK 57**：依赖用 `npx expo install`，版本匹配 SDK 57；改前读 `https://docs.expo.dev/versions/v57.0.0/`
- **改完验证**：`pnpm exec tsc --noEmit` + `pnpm test`
- **颜色/字号/间距**走 `src/theme/`，不硬编码
- **AsyncStorage** 已是依赖（`auth.ts` 在用）
- `getBaseUrl()` 落地后，所有读 `opencodeConfig.baseUrl` 处（`auth.ts` login / `opencode-client.ts` request / `opencode-events.ts` SSE / `fund-events.ts` SSE）改读 `getBaseUrl()`
