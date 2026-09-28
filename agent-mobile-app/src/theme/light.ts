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

/* 浅色命名空间聚合导出 */
export const light = {
  colors: lightColors,
  typography: lightTypography,
  spacing: lightSpacing,
  radius: lightRadius,
  sizes: lightSizes,
  gradient: lightGradient,
} as const;

export type Light = typeof light;
