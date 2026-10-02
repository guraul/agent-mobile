// Sessions 抽屉（#34F / issue #46，mock chatcode.html .drawer-left）：
// 用户 2026-10-01 拍板——解禁抽屉、与"绑最新 session"并存（抽屉 = 显式入口）、
// 直接做移动端边缘手势。RN Web 无原生 drawer：transform + PanResponder 自实现
//（手势松手决策抽纯函数 drawer-gesture.ts + 单测）。
// 替代 chat 侧原 LightSheet 会话选择器（#46：避免两个会话选择 UI 并存）。
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Plus, X } from "lucide-react-native";
import { Text } from "../../index";
import { iconStroke, lightColors, lightChatColors } from "../../../theme";
import { clampDrawerTranslate, decideDrawerSnap, isHorizontalDrag } from "../../../services/drawer-gesture";
import type { OpenCodeSession } from "../../../services/opencode-client";

const DRAWER_WIDTH = 306;

function relativeTime(epoch: number): string {
  if (!epoch) return "";
  const diff = Date.now() - epoch;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "刚刚";
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  return new Date(epoch).toLocaleDateString();
}

export function SessionsDrawer({
  visible,
  onClose,
  sessions,
  activeId,
  error,
  onSwitch,
  onCreate,
  onGestureClose,
  /** 边缘右滑唤起（chat 侧开启；chatcode 待用户确认，暂不挂） */
  edgeGesture = false,
}: {
  visible: boolean;
  onClose: () => void;
  sessions: OpenCodeSession[];
  activeId?: string | null;
  error?: string | null;
  onSwitch: (s: OpenCodeSession) => void;
  onCreate: () => void;
  /** 手势拖关时同步父组件状态——否则 visible 停留 true，透明 scrim 会全屏拦截点击（实测踩坑） */
  onGestureClose?: () => void;
  edgeGesture?: boolean;
}) {
  const { width: screenW } = useWindowDimensions();
  const width = Math.min(DRAWER_WIDTH, screenW * 0.84);
  // translateX：0 = 全开，-width = 全关（JS 驱动，web 兼容同 LightSheet 注释）
  const translate = useRef(new Animated.Value(-width)).current;
  const scrim = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  // PanResponder 只创建一次，handler 里经 ref 读最新 width，避免闭包过期
  const widthRef = useRef(width);
  widthRef.current = width;
  const animateToRef = useRef<(open: boolean) => void>(() => {});
  const gestureCloseRef = useRef(onGestureClose);
  gestureCloseRef.current = onGestureClose;

  const animateTo = (open: boolean) => {
    Animated.timing(translate, { toValue: open ? 0 : -widthRef.current, duration: 200, useNativeDriver: false }).start();
    Animated.timing(scrim, { toValue: open ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  };
  animateToRef.current = animateTo;

  useEffect(() => {
    Animated.timing(translate, { toValue: visible ? 0 : -width, duration: 260, useNativeDriver: false }).start();
    Animated.timing(scrim, { toValue: visible ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [visible, width, translate, scrim]);

  // 抽屉本体拖拽（开态左滑收回）
  const drawerPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => isHorizontalDrag(g.dx, g.dy) && g.dx < 0 && visibleRef.current,
      onPanResponderMove: (_e, g) => {
        translate.setValue(clampDrawerTranslate(0, g.dx, widthRef.current));
      },
      onPanResponderRelease: (_e, g) => {
        const snap = decideDrawerSnap(g.dx, widthRef.current, g.vx);
        animateToRef.current(snap === "open");
        // 手势拖关必须回传父组件（visible 同步），否则 scrim 拦截全屏
        if (snap === "close") gestureCloseRef.current?.();
      },
      onPanResponderTerminate: () => animateToRef.current(true),
    }),
  ).current;

  // 边缘右滑唤起（关态，从屏幕左缘起手）。
  // onStartShouldSetPanResponder：RN Web 的 move 协商在鼠标路径下不可靠（实测热区命中
  // 却不 grant），热区本身只有 24px 宽且无子元素，down 时直接认领无副作用；
  // 非水平拖拽（纵向滚动）在 move 阶段交还：isHorizontalDrag 不满足则不更新位移，
  // 松手 snap(dx≈0) = close，视觉无扰动。
  const edgePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => isHorizontalDrag(g.dx, g.dy) && g.dx > 0 && !visibleRef.current,
      onPanResponderGrant: () => setDragging(true),
      onPanResponderMove: (_e, g) => {
        if (isHorizontalDrag(g.dx, g.dy) && g.dx > 0) {
          translate.setValue(clampDrawerTranslate(-widthRef.current, g.dx, widthRef.current));
        }
      },
      onPanResponderRelease: (_e, g) => {
        setDragging(false);
        const snap = decideDrawerSnap(g.dx, widthRef.current, g.vx);
        animateToRef.current(snap === "open");
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        animateToRef.current(false);
      },
    }),
  ).current;

  return (
    <>
      {/* 边缘手势热区：左侧 24px 全高细条（drawer 关态也常驻，只有 chat 侧挂载） */}
      {edgeGesture ? (
        <View style={styles.edgeStrip} pointerEvents="box-only" {...edgePan.panHandlers} testID="drawer-edge-strip" />
      ) : null}

      {/* 遮罩 */}
      <Animated.View
        testID="drawer-scrim"
        style={[
          styles.scrim,
          { opacity: scrim, pointerEvents: visible && !dragging ? "auto" : "none" },
        ]}
      >
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="关闭抽屉" accessibilityRole="button" onPress={onClose} />
      </Animated.View>

      {/* 抽屉本体（cream 底，右侧 30px 圆角，mock .drawer-left） */}
      <Animated.View
        testID="sessions-drawer"
        style={[
          styles.drawer,
          { width, transform: [{ translateX: translate }], pointerEvents: visible || dragging ? "auto" : "none" },
        ]}
        {...drawerPan.panHandlers}
      >
        <View style={styles.head}>
          <Text variant="lightBodyStrong" color="lightInk">会话</Text>
          <Pressable
            onPress={onClose}
            accessibilityLabel="关闭抽屉"
            accessibilityRole="button"
            hitSlop={10}
            style={styles.closeBtn}
          >
            <X color={lightColors.ink} size={18} strokeWidth={iconStroke} />
          </Pressable>
        </View>
        <ScrollView style={styles.list} nestedScrollEnabled>
          {error ? (
            <Text variant="lightCaption" color="lightUpRed">{error}</Text>
          ) : sessions.length === 0 ? (
            <Text variant="lightCaption" color="lightGray">暂无会话</Text>
          ) : (
            sessions.map((s) => {
              const active = activeId === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => onSwitch(s)}
                  style={[styles.sessionItem, active && styles.sessionItemActive]}
                  accessibilityRole="button"
                  accessibilityLabel={s.title?.trim() || s.id}
                >
                  <Text variant="lightBody" color={active ? "lightInk" : "lightSubtle"} numberOfLines={1}>
                    {s.title?.trim() || s.id}
                  </Text>
                  <Text variant="lightCaption" color="lightGray">
                    {relativeTime(s.time?.updated ?? 0)}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
        <View style={styles.footer}>
          <Pressable
            onPress={onCreate}
            accessibilityRole="button"
            accessibilityLabel="New session"
            style={styles.peachBtn}
          >
            <Plus color={lightColors.ink} size={16} strokeWidth={2} />
            <Text variant="lightBodyStrong" color="lightInk">New session</Text>
          </Pressable>
        </View>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  // 边缘热区：不挡视觉，只捕横向手势
  edgeStrip: { position: "absolute", left: 0, top: 0, bottom: 0, width: 24, zIndex: 40 },
  scrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: lightColors.scrim,
    zIndex: 45,
  },
  // mock .drawer-left：cream 底，右缘 30px 圆角，左侧投影
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    backgroundColor: lightColors.cream,
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    zIndex: 50,
    paddingTop: 10,
    shadowColor: "#000000",
    shadowOffset: { width: 24, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 48,
    elevation: 12,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.divider,
  },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  list: { flex: 1, paddingHorizontal: 8 },
  sessionItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 2,
  },
  sessionItemActive: { backgroundColor: lightChatColors.peachSubtle },
  footer: {
    borderTopWidth: 1,
    borderTopColor: lightColors.divider,
    padding: 12,
  },
  peachBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 20,
    backgroundColor: lightColors.peach,
  },
});
