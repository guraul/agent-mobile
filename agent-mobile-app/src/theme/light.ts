/**
 * Light token 命名空间（RN 迁移 #8，D1 新旧共存）。
 *
 * 基准：docs/newdesign/html/pulseB*.html（mock 快照 2026-09-28，快照已贴进 issue #8-#15）。
 * 与 `theme/`（暗色 Companion）并存，互不影响；全部页面切换完成后（epic #7 收尾）删除旧值。
 * 红线：浅色页面的颜色/字号/间距/圆角一律从这里取，禁止硬编码。
 *
 * 注意：本文件保持**零 react-native 依赖**（纯 token 数据）——单测需在 vitest 下
 * 直接加载（vitest 无法解析 RN 的 Flow 源码）。不写 fontFamily：RN Text 默认
 * 系统字体（iOS=SF Pro / Android=Roboto），与 mock 系统字体栈同源（D2）。
 */

/** 字阶 token 结构（与 RN TextStyle 兼容的子集） */
export type LightTextStyle = {
  fontFamily?: string;
  fontSize: number;
  fontWeight: "400" | "500" | "600" | "700";
  lineHeight: number;
  letterSpacing: number;
};

/* ------------------------------------------------------------------ */
/* 颜色（pulseB 家族 :root 全量收编 + 结构色）                            */
/* ------------------------------------------------------------------ */

export const lightColors = {
  /* 画布与卡面 */
  cream: "#F7F5DC", // 页面画布
  white: "#FFFFFF", // 白卡 / 白字（dock pill 内）
  greenCard: "#B2D7B5", // In motion 绿卡
  greenInner: "#C8EBCB", // 绿卡内条目
  rowGray: "#F0F0F0", // 灰底行 / 输入框 / why 块

  /* 文字 */
  ink: "#0D0D0D", // 主文字（greeting / 标题）
  black: "#0A0A0A", // dock pill 底 / login 图标
  bodyText: "#2A2A2A", // why 块 / Noticed fact
  subtleText: "#6F6F6F", // aiVoice / sub / empty-line
  grayText: "#9C9C9C", // 弱化文字（meta / time / placeholder）
  chipText: "#3A3A3A", // neutral chip 字
  fieldText: "#1A1A1A", // 输入框字 / fund-name / ev-body
  groupLabel: "#7C8577", // 组标签字（Noticed / Related responsibility）
  dockDismiss: "rgba(255,255,255,.65)", // 详情页 dock 弱化 Dismiss

  /* accent（紫罗兰，与暗色主题同值族） */
  accent: "#8B5CF6",
  accentBright: "#A78BFA", // 渐变亮端
  accentDeep: "#6D4FD8", // 渐变深端 / presence 与 TextAction 字色
  accentSubtle: "rgba(139,92,246,.10)", // review chip 底
  accentBorder: "rgba(139,92,246,.38)", // review chip 边
  focusRing: "rgba(139,92,246,.4)", // 输入框 focus 光圈

  /* 语义 */
  amber: "#E5A13A", // amber dot
  amberDeep: "#D97706", // 详情页铃铛（#8 快照 review 页区分值）
  green: "#5CBB63", // presence 呼吸点 / Noticed dot / 跌色
  greenDeep: "#2E7D32", // ACTIVE pill 字
  greenSubtle: "rgba(92,187,99,.16)", // ACTIVE pill 底
  upRed: "#E5484D", // 涨色（红涨绿跌）

  /* In motion 绿卡内文字（有意偏离 token 的 11.5/14 字阶专用色，D1） */
  scheduleInk: "#233323", // 组标签字
  rowInk: "#101710", // 条目标题字
  scheduleMeta: "#4A5D4A", // 条目 meta / 绿卡内 quiet 动作字

  /* 结构 */
  scrim: "rgba(10,10,10,.45)", // sheet 遮罩
  handle: "rgba(0,0,0,.18)", // sheet handle
  hairline: "rgba(0,0,0,.08)", // chip 边
  dangerBorder: "rgba(13,13,13,.14)", // 破坏性动作按钮描边（#43；hairline .08 对白底仅 1.19:1，边界会消失）
  divider: "rgba(0,0,0,.05)", // Noticed 行分隔
  peach: "#F3BA8F", // chat FAB / dock 箭头
  peachHalo: "rgba(243,186,143,.3)", // FAB 光环
} as const;

export type LightColorToken = keyof typeof lightColors;

/* ------------------------------------------------------------------ */
/* 7-token 字阶（D1：无大写、无字距；lineHeight 显式整数）                  */
/* mock 有明确 lh 的照抄（display 1.24 / body 1.5），                    */
/* 其余 round(fontSize × 1.45)。                                        */
/* ------------------------------------------------------------------ */

export const lightTypography = {
  display: {
    // greeting：26/400 lh1.24（mock .greeting）
    fontSize: 26,
    fontWeight: "400" as const,
    lineHeight: 32,
    letterSpacing: 0,
  },
  pageTitle: {
    // Header 居中标题：24/700（mock .app-title）
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 35, // round(24 × 1.45)
    letterSpacing: 0,
  },
  title: {
    // 卡标题 / feat-title：17/700（mock .card-title / .feat-title / .sheet-title）
    fontSize: 17,
    fontWeight: "700" as const,
    lineHeight: 25, // round(17 × 1.45)
    letterSpacing: 0,
  },
  body: {
    // 正文：15/400 lh1.5（mock .feat-why / .nrow .fact / .resp-body / .ev-body）
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
    letterSpacing: 0,
  },
  bodyStrong: {
    // 正文强调：15/600（mock .text-action / .dock-text / .btn-primary 字）
    fontSize: 15,
    fontWeight: "600" as const,
    lineHeight: 22,
    letterSpacing: 0,
  },
  caption: {
    // 弱注：12/400（mock .feat-meta / .nrow .time / .note / .hint）
    fontSize: 12,
    fontWeight: "400" as const,
    lineHeight: 17, // round(12 × 1.45)
    letterSpacing: 0,
  },
  label: {
    // 组标签 / presence：12/600（mock .group-label / .presence）
    fontSize: 12,
    fontWeight: "600" as const,
    lineHeight: 17, // round(12 × 1.45)
    letterSpacing: 0,
  },
  /* In motion 绿卡内偏移字阶（有意偏离 7-token，照抄 pulse.html schedule，D1） */
  scheduleLabel: {
    // 组标签占时间位：11.5px（mock .sched-time）
    fontSize: 11.5,
    fontWeight: "400" as const,
    lineHeight: 17, // round(11.5 × 1.45)
    letterSpacing: 0,
  },
  scheduleTitle: {
    // 条目标题：14/600（mock .sched-title / .pill-statement）
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 20, // round(14 × 1.45)
    letterSpacing: 0,
  },
  scheduleMeta: {
    // 条目 meta / 涨跌：11.5px（mock .sched-meta）
    fontSize: 11.5,
    fontWeight: "400" as const,
    lineHeight: 17, // round(11.5 × 1.45)
    letterSpacing: 0,
  },
} as const;

export type LightTypographyToken = keyof typeof lightTypography;

/* ------------------------------------------------------------------ */
/* 间距 / 圆角 / 组件尺寸                                               */
/* ------------------------------------------------------------------ */

export const lightSpacing = {
  pageX: 25, // 页面水平 padding（mock .screen padding 0 25px）
  cardGap: 14, // 卡片纵向间距（mock .stack gap）
  cardPad: 13, // 卡片 padding（mock .card padding）
  contentTop: 14, // 内容区顶部（白卡贴住问候）
  contentBottom: 128, // 内容区底部（给 dock 让位，mock .content padding-bottom）
} as const;

export const lightRadius = {
  card: 24, // 卡片（mock .card）
  inner: 15, // 绿卡内条目（mock .sched-item）
  row: 14, // 灰底行 / why 块 / 输入框（mock .feat-why / .ev-row / .field）
  sheetTop: 28, // sheet 顶角（mock .sheet border-radius 28px 28px 0 0）
  pill: 999, // 全圆（chip / 按钮及 pill 族）
  handle: 2, // sheet handle（mock .sheet-handle）
} as const;

export const lightSizes = {
  dot: 6, // 语义 dot（mock .dot）
  presenceDot: 14, // presence 呼吸点（mock .presence .pdot）
  chipHeight: 30, // chip 高（mock .chip）
  chipPadX: 14,
  buttonHeight: 42, // 主按钮（mock .btn-primary）
  fieldHeight: 44, // 输入框（mock .field）
  dockHeight: 62, // dock pill 高（mock .dock）
  dockBottom: 50, // dock 距底（mock .dock bottom）
  fabSize: 50, // chat FAB（mock .dock-fab）
  sheetHandleWidth: 36,
  sheetHandleHeight: 4,
  iconInline: 13, // 绿卡组图标（mock .sched-time svg）
  iconFeatured: 16, // Featured 铃铛（mock .feat-icon）
  iconDock: 22, // FAB chat 图标（mock .dock-fab svg）
  arrowIcon: 17, // dock 箭头字号（mock .dock-text .arrow）
} as const;

/* 主行动作紫渐变（mock .btn-primary / 详情页 .dock-pill，135deg 三段） */
export const lightGradient = {
  primary: ["#A78BFA", "#8B5CF6", "#6D4FD8"] as const,
} as const;

/* 阴影（mock .sheet box-shadow 0 -8px 30px rgba(0,0,0,.18)；iOS shadow + Android elevation） */
export const lightShadows = {
  sheetUp: {
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.18,
    shadowRadius: 30,
  },
} as const;

/* ------------------------------------------------------------------ */
/* chat 专属段（chat.html mock，2026-09-29 #29）                         */
/* cream 画布 + 双气泡 + peach 主行动作（替代 pulseB 的 violet）           */
/* ------------------------------------------------------------------ */

export const lightChatColors = {
  bubbleUser: "#F7F3D3", // user 气泡（mock --bubble-user）
  bubbleAi: "#F1F1F1", // AI 气泡（mock --bubble-ai）
  chatArea: "#FFFFFF", // 白色聊天区面板（mock .chat-area）
  badge: "#F5F5D5", // user check-badge 底（mock .check-badge）
  greenCheck: "#5CBB63", // badge 对勾（mock --green-check，同 lightColors.green）
  bubbleInk: "#1A1A1A", // 气泡正文（mock .bubble color）
  peachGlow: "rgba(243,186,143,.55)", // ai-orb 光晕（mock box-shadow）
  orbHaloOuter: "rgba(243,186,143,.16)", // ai-orb 外圈光晕（分层透明圆）
  orbHaloInner: "rgba(243,186,143,.26)", // ai-orb 内圈光晕
  inputBorder: "#0D0D0D", // input pill 3px 描边（mock .input-pill）
  inputPlaceholder: "rgba(13,13,13,.4)", // mock input::placeholder
  roundBtnBorder: "rgba(13,13,13,.3)", // round-btn 1.5px 边（mock .round-btn）
  orbCore: "#241708", // ai-orb 径向核心（mock .ai-orb）
  orbCore2: "#4A2E12", // 径向 30%
  orbMid: "#B97B3F", // 径向 48%
  peachSubtle: "rgba(243,186,143,.22)", // peach 语义 active 高亮底（model 选中行/session 选中项，#31）
  /* tech/code 段（chatcode.html，#32 信息层）：工具折叠组 + thinking 块 + diff 代码卡 */
  techSurface: "#FBF9EC", // tech-card 暖白底（mock --tech-surface）
  techBorder: "rgba(13,13,13,.12)", // tech-card 细边（mock --tech-border）
  techHeadText: "#3A3A32", // tech-head 标题字（mock .tech-head）
  techMono: "#6B6B60", // tool-row mono 摘要字（mock .tool-row .tt）
  techIcon: "rgba(13,13,13,.5)", // tool-row 图标（mock .tool-row .ic）
  thinkText: "#6B6B63", // think-body 斜体字（mock .think-body）
  thinkBorder: "rgba(13,13,13,.18)", // think-card 虚线边（mock .think-card）
  codeSurface: "#322B24", // code-card 深暖底（mock --dark-surface）
  codeHeadText: "#B8AB93", // code-head 字（mock .code-head）
  codeText: "#EDE3CE", // code-line 字（mock .code-line）
  codeDelText: "#F0A69A", // 删行字（mock .code-line.del）
  codeDelBg: "rgba(196,87,74,.16)", // 删行底（mock rgba(196,87,74,.16)）
  codeAddText: "#B5D6A5", // 增行字（mock .code-line.add）
  codeAddBg: "rgba(95,141,61,.18)", // 增行底（mock rgba(95,141,61,.18)）
  diffAdd: "#5F8D3D", // diffstat +N（mock .diffstat .a）
  diffDel: "#C4574A", // diffstat −N / danger（mock .diffstat .d / --danger）
  /* 交互层（chatcode.html，#33）：排队 chip / 停止态 */
  chipWarmBg: "#F8EDDD", // q-btn 暖杏底（mock .q-btn / .sugg-chip）
  chipWarmText: "#8A5A2B", // q-btn 字/图标（mock .q-btn）
  stopBg: "#E5988B", // 发送键 stop 形态底（mock .composer-send.stop / .send-btn.stop）
} as const;

export const lightChatTypography = {
  chatTitle: {
    // header 居中标题：21/700（mock .chat-title）
    fontSize: 21,
    fontWeight: "700" as const,
    lineHeight: 30, // round(21 × 1.45)
    letterSpacing: 0,
  },
  bubble: {
    // 气泡正文：14.5/400（mock .bubble 14.5px lh1.45）
    fontSize: 14.5,
    fontWeight: "400" as const,
    lineHeight: 21, // round(14.5 × 1.45)
    letterSpacing: 0,
  },
} as const;

export const lightChatSizes = {
  bubbleRadius: 16, // mock .bubble border-radius
  bubbleMaxWidth: "76%" as const, // mock .bubble max-width
  bubblePadX: 13, // mock .bubble padding 11px 13px
  bubblePadY: 11,
  msgGap: 11, // mock .chat-area gap
  chatAreaRadius: 30, // mock .chat-area
  chatAreaPadX: 18, // mock .chat-area padding 18px 18px 12px
  chatAreaPadTop: 18,
  chatAreaPadBottom: 12,
  headerHeight: 60, // mock .chat-header
  orbSize: 24, // mock .ai-orb
  badgeSize: 20, // mock .check-badge
  rowGap: 7, // mock .msg-row gap（气泡 ↔ orb/badge）
  inputPillHeight: 58, // mock .input-pill
  inputPillRadius: 29,
  inputPillBorder: 3,
  roundBtn: 42, // mock .round-btn
  sendBtn: 58, // mock .send-btn
  inputBarPadX: 25, // mock .chat-inputbar padding 10px 25px 24px
  inputBarPadTop: 10,
  inputBarPadBottom: 24,
  techRadius: 14, // tech-card / think-card / code-card 圆角（mock 均为 14px）
} as const;

/* ai-orb 径向渐变色标（mock .ai-orb radial-gradient；react-native-svg RadialGradient 用） */
export const lightChatOrbStops = [
  { offset: "0%", color: lightChatColors.orbCore },
  { offset: "30%", color: lightChatColors.orbCore2 },
  { offset: "48%", color: lightChatColors.orbMid },
  { offset: "62%", color: lightColors.peach },
  { offset: "72%", color: "rgba(243,186,143,0)" },
] as const;

export const lightChat = {
  colors: lightChatColors,
  typography: lightChatTypography,
  sizes: lightChatSizes,
  orbStops: lightChatOrbStops,
} as const;

/* 浅色命名空间聚合导出 */
export const light = {
  colors: lightColors,
  typography: lightTypography,
  spacing: lightSpacing,
  radius: lightRadius,
  sizes: lightSizes,
  gradient: lightGradient,
  shadows: lightShadows,
  chat: lightChat,
} as const;

export type Light = typeof light;
