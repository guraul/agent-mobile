# Pulse Showcase2 — AI Companion UI Prototype

Showcase2 是一个**完全独立**的 Expo + React Native 交互原型，用于验证 Agent Mobile / Pulse 的
新视觉语言与信息架构（AI Companion，single-surface）。

**与生产应用（`../agent-mobile-app`）完全隔离**：不引用生产代码、不调用生产 API、不注册进生产 router。

## 运行

```bash
cd showcase2
npm install
npm start            # Expo dev server（手机 Expo Go 或浏览器）
```

其他命令：

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # expo lint
npm test             # vitest（mock actions 状态转换）
```

Web 静态构建：

```bash
npx expo export --platform web --clear
```

## 范围（第一轮）

完整实现：app shell、theme tokens、AI Presence、Pulse Home（Needs You / Suggested / Noticed）、
直接 "Talk to Pulse" 入口、Pulse → Talk 上下文过渡、Mock Talk、交互式 mock state、
contextual Memory / KB sheet、轻量 Responsibilities cue。

**不包含**：Memory / KB / Responsibilities 独立页面、通知中心、语音、设置、会话历史、第二套导航。

## 结构

```
showcase2/
├── theme/            colors · typography · spacing · surfaces · motion（视觉 token 唯一来源）
├── mock/             types · actions（状态变更驱动 UI）· useStore · 单测
├── components/       AIOrb · AIStatus · PulseAttention/Suggestion/Noticed · AIComposer ·
│                     ContextChip · ConversationMessage · ThinkingDots · MemorySheet · KnowledgeSheet …
├── screens/          PulseScreen（root）· TalkScreen（全屏会话）
└── navigation/       AppRouter（Pulse root → Talk push；back 保持滚动位置）
```

## 规范

视觉实现以 `SHOWCASE2_VISUAL_SPEC.md` 为唯一视觉来源，产品范围以
`SHOWCASE2_IMPLEMENTATION.md` 为准。
