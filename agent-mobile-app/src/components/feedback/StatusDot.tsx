import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, AccessibilityInfo, type ViewStyle } from "react-native";
import { colors, motion } from "../../theme";

export type StatusType = "running" | "idle" | "success" | "error" | "warning";

interface StatusColorMap {
  color: string;
}

const statusColorMap: Record<StatusType, StatusColorMap> = {
  running: { color: colors.status.running },
  idle: { color: colors.status.idle },
  success: { color: colors.status.success },
  error: { color: colors.status.error },
  warning: { color: colors.status.warning },
};

export interface StatusDotProps {
  status: StatusType;
  size?: number;
  pulse?: boolean;
  accessibilityLabel: string;
  testID?: string;
}

export function StatusDot({
  status,
  size = 8,
  pulse = true,
  accessibilityLabel,
  testID,
}: StatusDotProps) {
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const isRunning = status === "running" && pulse;
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
    if (isRunning && !reduceMotion) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.4,
            duration: motion.duration.ambient / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: motion.duration.ambient / 2,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      animation.start();
      return () => animation.stop();
    } else {
      opacityAnim.setValue(1);
    }
  }, [isRunning, reduceMotion, opacityAnim]);

  const { color } = statusColorMap[status];

  const dotStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
  };

  return (
    <Animated.View
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
      style={[dotStyle, { opacity: opacityAnim }]}
    />
  );
}
