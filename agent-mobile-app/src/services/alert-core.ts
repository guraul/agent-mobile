/**
 * Alert 反馈的纯逻辑（issue #43）。
 *
 * 与 `alert.tsx`（RN 组件层）分离：本项目 vitest 环境是 `node`（见 vitest.config.ts），
 * 无法直接加载含 JSX / RN 依赖的模块，故可测部分一律放这里（红线：新逻辑独立纯函数 + 单测）。
 *
 * ⚠️ 背景：`react-native-web` 的 `Alert.alert` 是空函数
 * （`class Alert { static alert() {} }`），9928 静态版跑在 web 上 → 全仓 25 处
 * `Alert.alert` 零反馈，表现为"点了没反应"。详见 CONVENTIONS.md 同名条目。
 */

export interface AlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface AlertPayload {
  title: string;
  message?: string;
  buttons?: AlertButton[];
}

/**
 * 决定 sheet 实际渲染哪些按钮。
 * - 无按钮 / 空数组 → 给一个"知道了"（原生 Alert 无按钮时点确定即关闭，语义一致）
 * - 有按钮 → 原样使用（保留 cancel / destructive 样式与各自回调）
 */
export function resolveAlertButtons(buttons?: AlertButton[]): AlertButton[] {
  return buttons && buttons.length > 0 ? buttons : [{ text: "知道了", style: "default" }];
}

/** 把 title/message 拼成单行日志文案（错误路径的可观测信号，Web 无原生弹窗时的唯一线索） */
export function formatAlertLog(p: { title: string; message?: string }): string {
  return `[alert] ${p.title}${p.message ? ` — ${p.message}` : ""}`;
}
