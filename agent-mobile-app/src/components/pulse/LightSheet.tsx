/**
 * LightSheet —— 浅色 sheet 原语（RN 迁移 #C）。
 * mock：pulseB-sheet-*.html SHEET OVERLAY 家族共用（scrim + 白卡 + 顶圆角 28 + handle）。
 * 一原语三处复用：DetailSheet（#C 重做）/ FundSheet / ListSheet（#F 切入）。
 *
 * 与旧 BottomSheet（暗色，服务 Settings/Memory/Knowledge/登录）并存（D1）；
 * 动画与 web 兼容策略照搬 BottomSheet 的成熟实现（useNativeDriver:false +
 * visible gate render —— RN Web 不桥接 translateY interpolation，见旧文件注释）。
 * 所有颜色/圆角/阴影取自 theme/light.ts。
 */
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  useWindowDimensions,
  AccessibilityInfo,
} from "react-native";
import { lightColors, lightRadius, lightSizes, lightShadows } from "../../theme/light";

export interface LightSheetProps {
  visible: boolean;
  onClose: () => void;
  children?: React.ReactNode;
  testID?: string;
}

export function LightSheet({ visible, onClose, children, testID }: LightSheetProps) {
  const { height } = useWindowDimensions();
  const slideAnim = useRef(new Animated.Value(1)).current;
  const scrimAnim = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        slideAnim.setValue(0);
        scrimAnim.setValue(1);
      } else {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            // useNativeDriver:false：web 无原生模块且 JS fallback 不落 DOM
            // transform（BottomSheet 同源坑，见旧文件注释）
            useNativeDriver: false,
          }),
          Animated.timing(scrimAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
        ]).start();
      }
    } else {
      if (reduceMotion) {
        slideAnim.setValue(1);
        scrimAnim.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(slideAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
          Animated.timing(scrimAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
        ]).start();
      }
    }
  }, [visible, reduceMotion, slideAnim, scrimAnim]);

  const scrimStyle = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: lightColors.scrim,
    opacity: scrimAnim,
    pointerEvents: visible ? ("auto" as const) : ("none" as const),
  };

  const sheetContainerStyle = {
    position: "absolute" as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: lightColors.white,
    borderTopLeftRadius: lightRadius.sheetTop,
    borderTopRightRadius: lightRadius.sheetTop,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 40,
    ...lightShadows.sheetUp,
    pointerEvents: visible ? ("auto" as const) : ("none" as const),
  };

  const animatedSheetStyle = reduceMotion
    ? { opacity: scrimAnim }
    : {
        transform: [
          {
            translateY: slideAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, height],
            }),
          },
        ],
      };

  return (
    <>
      <Animated.View
        testID={testID ? `${testID}-scrim` : undefined}
        style={scrimStyle}
      >
        <Pressable
          style={{ flex: 1 }}
          accessibilityLabel="Close sheet"
          accessibilityRole="button"
          onPress={onClose}
        />
      </Animated.View>
      {/* visible gate：同 BottomSheet 的 web 坑（closed 时 sheet 覆盖屏幕） */}
      {visible ? (
        <Animated.View testID={testID} style={[sheetContainerStyle, animatedSheetStyle]}>
          <View
            style={{
              width: lightSizes.sheetHandleWidth,
              height: lightSizes.sheetHandleHeight,
              borderRadius: lightRadius.handle,
              backgroundColor: lightColors.handle,
              alignSelf: "center",
              marginBottom: 12,
              marginTop: 6,
            }}
          />
          {children}
        </Animated.View>
      ) : null}
    </>
  );
}
