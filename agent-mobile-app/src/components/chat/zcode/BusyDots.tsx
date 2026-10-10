// 状态行三点脉动（#58 方案 B）——busy 的视觉只落在「现有状态行」内，
// 不新增布局元素、不新增卡片，不展示工具名/摘要、不可展开。
//
// 用 react-native 自带 Animated（非 reanimated）：RN Web 兼容、零新依赖。
// 颜色/尺寸一律走 theme/light.ts，禁止硬编码。reduce motion 时退化为静止三点。
import React, { useEffect, useState } from "react";
import { Animated, Easing, AccessibilityInfo, StyleSheet, View } from "react-native";
import { lightColors, lightSizes, motion, spacing } from "../../../theme";

const DOT_COUNT = 3;
const DOT_SIZE = lightSizes.dot; // 6
const DOT_OFF_OPACITY = 0.3;
const DOT_ON_OPACITY = 1;
// 半点时长：一个点 half up + half down；三点用起始错峰形成"依次脉动"
const STEP_MS = motion.duration.standard; // 200

export interface BusyDotsProps {
  /** 点颜色，默认与状态行 Bot 图标同色（amber） */
  color?: string;
  testID?: string;
}

/**
 * 装饰性脉动三点：父级状态行已有「运行中…」文案，故对读屏隐藏
 * （不产出第二份可朗读内容）。
 */
export function BusyDots({ color = lightColors.amber, testID }: BusyDotsProps) {
  // lazy state initializer (not a ref) so render never touches a ref value —
  // keeps react-hooks/refs clean and gives stable Animated.Values across renders.
  const [dots] = useState<Animated.Value[]>(() =>
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(DOT_OFF_OPACITY)),
  );
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
    if (reduceMotion) {
      for (const dot of dots) dot.setValue(DOT_ON_OPACITY);
      return;
    }
    const started = dots.map((dot, index) => {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: DOT_ON_OPACITY,
            duration: STEP_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: DOT_OFF_OPACITY,
            duration: STEP_MS,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      const timer = setTimeout(() => animation.start(), index * STEP_MS);
      return { animation, timer };
    });
    return () => {
      for (const { animation, timer } of started) {
        clearTimeout(timer);
        animation.stop();
      }
    };
  }, [dots, reduceMotion]);

  return (
    <View
      style={styles.row}
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
    >
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[styles.dot, { backgroundColor: color }, { opacity: dot }]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
});
