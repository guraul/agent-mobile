# Agent Mobile 项目知识库 · 索引总览

> 最后更新：2026-08-10 · commit：`c836209`（reactCompiler 禁用 + BottomSheet 修复 + dev server 托管）
> 维护：见 [CONVENTIONS.md](CONVENTIONS.md)「知识库维护约定」

## 使用说明

| 场景 | 加载文档 |
|---|---|
| 第一次接触 / 全局定位 | 本文件 INDEX.md |
| 理解架构与数据流 | ARCHITECTURE.md |
| 改 Pulse 事件流页面 | modules/pulse-stream.md |
| 改组件库 | modules/components.md |
| 改颜色/字号/间距等 token | modules/theme.md |
| 改路由/新增页面 | modules/router.md |
| 查数据在哪 / 怎么改 mock | DATA.md |
| 有没有对外接口 | API.md |
| 构建/部署/预览 | OPERATIONS.md |
| 改代码前的红线与坑 | CONVENTIONS.md |

## 项目定位

**Agent Mobile** — AI 编码 agent（OpenCode 等）的移动端遥控器。"Mission Control for AI agents"。
当前形态：Expo（SDK 57）应用，完成 Pulse（事件流）首页，其余 3 个 tab 为占位页；另有设计期源码与 HTML showcase。

## 核心功能清单

| 功能 | 所属模块 | 入口文件 |
|---|---|---|
| Pulse 首页（事件流 + 全屏详情 sheet） | pulse-stream | `agent-mobile-app/src/app/(tabs)/pulse.tsx` |
| 事件数据（mock） | pulse-stream | `agent-mobile-app/src/screens/events.ts` |
| 底部 4-tab 导航 | router | `agent-mobile-app/src/app/(tabs)/_layout.tsx` |
| Talk/Memory/Me 占位页 | router | `agent-mobile-app/src/app/(tabs)/talk.tsx` 等 |
| 组件库（primitives/feedback/navigation） | components | `agent-mobile-app/src/components/index.ts` |
| 设计 token（暗色主题） | theme | `agent-mobile-app/src/theme/index.ts` |
| Web 静态预览服务（9928，gzip） | ops | `agent-mobile-app/scripts/serve-static.mjs` |

## 技术栈表

| 类别 | 技术/库 | 版本 | 用途 |
|---|---|---|---|
| 框架 | Expo | ~57.0.11 | 应用骨架、构建（SDK 57） |
| 路由 | expo-router | ~57.0.11 | 文件路由（Stack + Tabs） |
| UI 框架 | React Native | 0.86.2 | 原生渲染 |
| 语言 | TypeScript | ~6.0.3 | 全量类型 |
| Web 渲染 | react-native-web | ~0.21.0 | web 导出/预览 |
| 图标 | lucide-react-native | ^1.31.0 | 全部图标 |
| 动画 | react-native-reanimated | 4.5.1 | BottomSheet 动画 |
| 手势 | react-native-gesture-handler | ~2.32.0 | 手势基础 |
| 安全区 | react-native-safe-area-context | ~5.7.0 | 刘海屏适配 |
| 构建(云) | eas-cli（EAS Build） | 21.x | Android APK/AAB |
| 静态服务 | node:http（自写） | — | 9928 web 预览 |

## 仓库拓扑

```
agent-mobile/                                  # git 根仓库
├── README.md / README_zh.md                   # 项目说明（英/中）
├── session.md                                 # 早期设计会话记录
├── docs/
│   ├── promptA.md                            # 知识库生成规范（模板）
│   ├── knowledge-base/                       # ★ 全部文档：设计规范 + 知识库（合并）
│   │   ├── DESIGN.md / DESIGN_DIRECTION.md   # 设计系统规范
│   │   ├── AI_INTERACTION_DESIGN.md          # Pulse 交互设计源头
│   │   ├── VISION_REVIEW.md / UX_REVIEW.md   # 评审
│   │   ├── COMPONENT_*.md / SCREEN_REVIEW*.md # 组件/屏幕评审
│   │   ├── SHOWCASE_*.md                     # HTML showcase 相关
│   │   ├── INDEX.md / ARCHITECTURE.md / ...  # 知识库（promptA 规范生成）
│   │   └── modules/*.md
├── src/                                       # 设计期 RN 源码（React/TSX，无 package.json，非运行态）
│   ├── components/  screens/  theme/
├── showcase/                                  # 静态 HTML UI 原型（浏览器打开 index.html）
└── agent-mobile-app/                          # ★ 当前活跃的 Expo 应用
    ├── app.json / eas.json                    # EAS + 应用配置
    ├── package.json                           # 依赖（见技术栈表）
    ├── scripts/serve-static.mjs               # 9928 静态服务器（gzip + /→/pulse）
    ├── scripts/reset-project.js               # create-expo-app 模板残留（可忽略）
    ├── assets/                                # 图标/启动图
    └── src/
        ├── app/_layout.tsx                    # 根 Stack
        ├── app/(tabs)/_layout.tsx             # Tabs（4 tab）
        ├── app/(tabs)/pulse.tsx               # Pulse 页（完整）
        ├── app/(tabs)/talk|memory|me.tsx      # 占位页
        ├── screens/events.ts                  # 事件数据 + 类型
        ├── components/                        # primitives/feedback/navigation + index.ts
        └── theme/                             # colors/typography/spacing/radius/motion/icons/shadows
```

## 模块依赖关系

```
theme（无依赖，叶子）
  ↑
components（依赖 theme）
  ↑
pulse-stream（pulse.tsx + events.ts，依赖 components + theme）
  ↑
router（app/_layout → (tabs)/_layout → 各页面，依赖全部）
  ↑
ops（serve-static.mjs，服务 dist/ 导出产物，与应用代码解耦）
```

## 数据流向总览

```
数据来源 → 处理 → 展示
events.ts (硬编码 mock)
   → pulse.tsx 的 eventMap（Map 索引）+ PULSE_SECTIONS 分组
   → EventItem 列表渲染
   → 点击 → selectedEvent state → BottomSheet(fullScreen) 详情
   → sheet 内按钮 → alert()（纯演示，无真实动作）
```

## 速查表

| 常见任务 | 涉及文件 |
|---|---|
| 新增/修改 Pulse 事件 | `agent-mobile-app/src/screens/events.ts` |
| 改事件列表 UI | `agent-mobile-app/src/app/(tabs)/pulse.tsx` |
| 改事件条组件 | `agent-mobile-app/src/components/navigation/EventItem.tsx` |
| 改详情 sheet | `agent-mobile-app/src/components/navigation/BottomSheet.tsx` + pulse.tsx |
| 新增 tab / 页面 | `agent-mobile-app/src/app/(tabs)/_layout.tsx` + 新建路由文件 |
| 改颜色 | `agent-mobile-app/src/theme/colors.ts` |
| 新增组件 | `agent-mobile-app/src/components/<category>/xxx.tsx` + 在 index.ts 导出 |
| 预览 web 版 | `npx expo export --platform web` → 9928 服务（见 OPERATIONS.md） |
| 打 APK | `eas build -p android --profile preview`（见 OPERATIONS.md） |
| 改应用元信息（包名/名称/主题色） | `agent-mobile-app/app.json` |
