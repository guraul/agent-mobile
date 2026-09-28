/**
 * Light action atoms（RN 迁移 #9）—— pulseB.html SHARED ATOMS 的 RN 落地。
 * 与旧 ActionChips（暗色 Companion）并存（D1 新旧共存）：#D–#H 逐页切换，
 * 全部切完后随 epic 收尾删除旧值。
 * 所有颜色/字号/尺寸一律取自 theme/light.ts，禁止硬编码。
 */
import React from "react";
import {
  Text,
  View,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MessageCircleMore } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  ReduceMotion,
} from "react-native-reanimated";
import { lightColors, lightRadius, lightSizes, lightTypography, lightGradient } from "../../theme/light";
import { PressableScale } from "./PressableScale";

/* ------------------------------------------------------------------ */
/* LightChip —— mock .chip：h30 px14 全圆 12/600，三语义                */
/* ------------------------------------------------------------------ */

export function LightChip({
  label,
  onPress,
  kind = "neutral",
  testID,
}: {
  label: string;
  onPress?: () => void;
  kind?: "neutral" | "review" | "discuss";
  testID?: string;
}) {
  const isReview = kind === "review";
  return (
    <PressableScale
      onPress={onPress}
      testID={testID}
      style={[styles.chip, isReview ? styles.chipReview : styles.chipNeutral]}
    >
      <Text
        style={[
          styles.chipLabel,
          { color: isReview ? lightColors.accentDeep : lightColors.chipText },
        ]}
      >
        {label}
      </Text>
    </PressableScale>
  );
}

/* ------------------------------------------------------------------ */
/* LightTextAction —— mock .text-action：15/600；quiet 变体弱化          */
/* （绿卡内 quiet 的 #4A5D4A 由调用方经 style.color 覆盖，见 E 步快照）   */
/* ------------------------------------------------------------------ */

export function LightTextAction({
  label,
  onPress,
  quiet = false,
  testID,
  style,
}: {
  label: string;
  onPress?: () => void;
  quiet?: boolean;
  testID?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} testID={testID}>
      <Text
        style={[
          styles.textAction,
          { color: quiet ? lightColors.grayText : lightColors.accentDeep },
          style,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* LightDot —— mock .dot：6×6 语义圆点                                  */
/* ------------------------------------------------------------------ */

const DOT_TONES = {
  amber: lightColors.amber,
  violet: lightColors.accent,
  green: lightColors.green,
} as const;

export function LightDot({ tone }: { tone: keyof typeof DOT_TONES }) {
  return <View style={[styles.dot, { backgroundColor: DOT_TONES[tone] }]} />;
}

/* ------------------------------------------------------------------ */
/* LightStatusPill —— mock .pill-active（review 页 ACTIVE）：h24 全圆    */
/* ------------------------------------------------------------------ */

export function LightStatusPill({ label }: { label: string }) {
  return (
    <View style={styles.statusPill}>
      <Text style={styles.statusPillLabel}>{label}</Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* LightPresenceDot —— mock .presence .pdot：14px 呼吸点（2.4s 循环）；  */
/* offline 灰色静止。呼吸 = Header 唯一发光元素（替代 AIOrb 的迁移路径， */
/* 红线：发光元素同时只允许一处）。Reduce Motion 下静止。               */
/* ------------------------------------------------------------------ */

export function LightPresenceDot({ online = true }: { online?: boolean }) {
  const scale = useSharedValue(1);
  const halo = useSharedValue(0);

  const dotStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: (1 - halo.value) * 0.45,
    transform: [{ scale: 1 + halo.value * 0.9 }],
  }));

  React.useEffect(() => {
    if (!online) return;
    scale.value = withRepeat(
      withTiming(1.35, { duration: 1200, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
      -1,
      true
    );
    halo.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
      -1,
      false
    );
  }, [online, scale, halo]);

  if (!online) {
    return <View style={[styles.presenceDot, { backgroundColor: lightColors.grayText }]} />;
  }

  return (
    <View style={styles.presenceWrap}>
      <Animated.View style={[styles.presenceHalo, haloStyle]} />
      <Animated.View style={[styles.presenceDot, { backgroundColor: lightColors.green }, dotStyle]} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* LightPrimaryButton —— mock .btn-primary：h42 全圆紫渐变主按钮         */
/* ------------------------------------------------------------------ */

export function LightPrimaryButton({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      style={[styles.primaryButton, disabled && styles.disabled]}
    >
      <LinearGradient
        colors={[...lightGradient.primary]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.primaryLabel}>{label}</Text>
    </PressableScale>
  );
}

/* ------------------------------------------------------------------ */
/* LightDock —— mock .dock：h62 黑底 pill + 白字 + 桃色箭头 + chat FAB   */
/* （整颗 pill 可点 → /talk；#D 装配，#H 详情页另有紫渐变变体）          */
/* ------------------------------------------------------------------ */

export function LightDock({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <View style={styles.dockWrap}>
      <PressableScale onPress={onPress} testID={testID} style={styles.dockPill}>
        <View style={styles.dockTextRow}>
          <Text style={styles.dockLabel}>{label}</Text>
          <Text style={styles.dockArrow}>{"\u2192"}</Text>
        </View>
        <View style={styles.dockFabHalo}>
          <View style={styles.dockFab}>
            <MessageCircleMore size={lightSizes.iconDock} color={lightColors.black} strokeWidth={2} />
          </View>
        </View>
      </PressableScale>
    </View>
  );
}

/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  /* chip */
  chip: {
    height: lightSizes.chipHeight,
    paddingHorizontal: lightSizes.chipPadX,
    borderRadius: lightRadius.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipNeutral: {
    backgroundColor: lightColors.white,
    borderColor: lightColors.hairline,
  },
  chipReview: {
    backgroundColor: lightColors.accentSubtle,
    borderColor: lightColors.accentBorder,
  },
  chipLabel: {
    fontSize: lightTypography.label.fontSize,
    fontWeight: lightTypography.label.fontWeight,
    lineHeight: lightTypography.label.lineHeight,
  },
  /* text action */
  textAction: {
    fontSize: lightTypography.bodyStrong.fontSize,
    fontWeight: lightTypography.bodyStrong.fontWeight,
    lineHeight: lightTypography.bodyStrong.lineHeight,
  },
  /* dot */
  dot: {
    width: lightSizes.dot,
    height: lightSizes.dot,
    borderRadius: lightSizes.dot / 2,
  },
  /* status pill */
  statusPill: {
    height: 24,
    paddingHorizontal: 10,
    borderRadius: lightRadius.pill,
    backgroundColor: lightColors.greenSubtle,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  statusPillLabel: {
    fontSize: lightTypography.label.fontSize,
    fontWeight: lightTypography.label.fontWeight,
    lineHeight: lightTypography.label.lineHeight,
    color: lightColors.greenDeep,
  },
  /* presence dot */
  presenceWrap: {
    width: lightSizes.presenceDot,
    height: lightSizes.presenceDot,
    alignItems: "center",
    justifyContent: "center",
  },
  presenceDot: {
    width: lightSizes.presenceDot,
    height: lightSizes.presenceDot,
    borderRadius: lightSizes.presenceDot / 2,
  },
  presenceHalo: {
    position: "absolute",
    width: lightSizes.presenceDot,
    height: lightSizes.presenceDot,
    borderRadius: lightSizes.presenceDot / 2,
    backgroundColor: lightColors.green,
  },
  /* primary button */
  primaryButton: {
    height: lightSizes.buttonHeight,
    borderRadius: lightRadius.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  primaryLabel: {
    fontSize: lightTypography.bodyStrong.fontSize,
    fontWeight: lightTypography.bodyStrong.fontWeight,
    lineHeight: lightTypography.bodyStrong.lineHeight,
    color: lightColors.white,
  },
  disabled: { opacity: 0.4 },
  /* dock */
  dockWrap: {
    height: lightSizes.dockHeight,
    position: "relative",
  },
  dockPill: {
    flex: 1,
    borderRadius: lightSizes.dockHeight / 2,
    backgroundColor: lightColors.black,
    alignItems: "center",
    justifyContent: "center",
  },
  dockTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dockLabel: {
    fontSize: lightTypography.bodyStrong.fontSize,
    fontWeight: lightTypography.bodyStrong.fontWeight,
    lineHeight: lightTypography.bodyStrong.lineHeight,
    color: lightColors.white,
  },
  dockArrow: {
    fontSize: lightSizes.arrowIcon,
    lineHeight: Math.round(lightSizes.arrowIcon * 1.45),
    color: lightColors.peach,
  },
  dockFabHalo: {
    position: "absolute",
    right: 6,
    top: (lightSizes.dockHeight - (lightSizes.fabSize + 6)) / 2,
    width: lightSizes.fabSize + 6,
    height: lightSizes.fabSize + 6,
    borderRadius: (lightSizes.fabSize + 6) / 2,
    backgroundColor: lightColors.peachHalo,
    alignItems: "center",
    justifyContent: "center",
  },
  dockFab: {
    width: lightSizes.fabSize,
    height: lightSizes.fabSize,
    borderRadius: lightSizes.fabSize / 2,
    backgroundColor: lightColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
});
