/**
 * Alert 反馈兜底（issue #43）——RN Web 修复。
 *
 * 背景：`react-native-web/dist/exports/Alert/index.js` 就是
 *   `class Alert { static alert() {} }`
 * 即 **Web 端 `Alert.alert` 是空函数**。9928 静态版跑在 web 上，全仓 25 处
 * `Alert.alert` 全部零反馈：用户点按钮后看不到任何反应，也抓不到 console error，
 * 表现为"点了没反应"。
 *
 * 本模块提供 `showAlert()` 作为统一入口，行为按平台分流：
 * - **原生**：保持调用 `Alert.alert`（系统原生弹窗，行为不变）
 * - **Web**：走全局订阅 + `<AlertHost/>` 呈现（LightSheet 风格，贴合浅色主题）
 *
 * 设计要点：
 * 1. **不改调用方语义**——原 `Alert.alert(title, message, buttons)` 参数一一对应；
 *    原生分支透传按钮数组（含 `onPress` 回调），Web 分支渲染成 sheet 里的按钮。
 * 2. **模块级单例订阅**（`subscribeAlert`）避免每个页面都维护 state；
 *    `<AlertHost/>` 只需在 App 根挂一次。
 * 3. Web 分支同时打 `console.error`（issue #43 要求：错误路径至少可调试）。
 *
 * 纯逻辑（按钮兜底、日志文案）在 `alert-core.ts`——vitest 环境是 `node`，
 * 载不动含 JSX / RN 依赖的本文件。
 *
 * ⚠️ 红线：`AlertHost` 内部用 LightSheet，而 **LightSheet 无 zIndex、靠渲染顺序压层**
 * ——它必须挂在组件树**最后**（见 `src/app/_layout.tsx`）。
 */
import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components";
import { LightSheet } from "../components/pulse/LightSheet";
import { lightColors, lightRadius } from "../theme/light";
import {
  formatAlertLog,
  resolveAlertButtons,
  type AlertButton,
  type AlertPayload,
} from "./alert-core";

export type { AlertButton, AlertPayload };

type Listener = (payload: AlertPayload | null) => void;

const listeners = new Set<Listener>();

function emit(payload: AlertPayload | null) {
  for (const l of listeners) l(payload);
}

/** AlertHost 订阅（内部用） */
export function subscribeAlert(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * 统一的 alert 入口。参数与 RN `Alert.alert` 兼容。
 * Web 上 `Alert.alert` 是空函数，故走本地 sheet 呈现 + console 日志。
 */
export function showAlert(
  title: string,
  message?: string,
  buttons?: AlertButton[],
): void {
  // 错误路径始终留日志：Web 无原生弹窗兜底时，这是唯一的可观测信号。
  console.error(formatAlertLog({ title, message }));
  if (Platform.OS !== "web") {
    // 原生：保持系统弹窗行为不变
    Alert.alert(title, message, buttons as never);
    return;
  }
  emit({ title, message, buttons });
}

/**
 * 全局 Alert 宿主。**必须挂在 App 组件树最后**（LightSheet 靠渲染顺序压层）。
 * 放根 `_layout.tsx` 的 Stack 之后。
 */
export function AlertHost() {
  const [payload, setPayload] = useState<AlertPayload | null>(null);

  useEffect(() => subscribeAlert(setPayload), []);

  const close = () => {
    setPayload(null);
  };

  if (!payload) return null;

  const buttons = resolveAlertButtons(payload.buttons);

  return (
    <LightSheet visible onClose={close} testID="alert-sheet">
      <View style={s.body}>
        <Text variant="lightTitle" color="lightInk">
          {payload.title}
        </Text>
        {payload.message ? (
          // 正文用 subtleText（白底对比 5.0:1）而非 grayText（仅 2.75:1，低于 AA）——
          // 弹窗正文是要用户读的决策信息，不能用 meta/时间戳那一档的弱化色
          <Text variant="lightBody" color="lightSubtle">
            {payload.message}
          </Text>
        ) : null}
        <View style={s.actions}>
          {buttons.map((b, i) => (
            <Pressable
              key={`${b.text}-${i}`}
              onPress={() => {
                // 先关闭再执行回调：回调常触发路由跳转，保留 sheet 会挡住新页面
                setPayload(null);
                b.onPress?.();
              }}
              accessibilityRole="button"
              accessibilityLabel={b.text}
              testID={`alert-btn-${b.text}`}
              style={[s.btn, b.style === "destructive" && s.btnDanger]}
            >
              <Text
                variant="lightBodyStrong"
                color={b.style === "destructive" ? "lightUpRed" : "lightInk"}
              >
                {b.text}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </LightSheet>
  );
}

const s = StyleSheet.create({
  body: { gap: 10, paddingTop: 6, paddingBottom: 4 },
  actions: { flexDirection: "row", gap: 12, marginTop: 6 },
  btn: {
    flex: 1,
    borderRadius: lightRadius.pill,
    backgroundColor: lightColors.peach,
    paddingVertical: 12,
    alignItems: "center",
  },
  // destructive：白底 + 描边，描边需可见（hairline 0.08 对白底仅 1.19:1，边界会消失）。
  // 主次方向刻意保持"安全动作=peach 实心、破坏性动作=弱化描边"——防误触优先。
  btnDanger: {
    backgroundColor: lightColors.white,
    borderWidth: 1,
    borderColor: lightColors.dangerBorder,
  },
});