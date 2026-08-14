import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Pressable,
  Animated,
  useWindowDimensions,
  AccessibilityInfo,
  type ViewStyle,
} from "react-native";
import { colors, spacing, radius, motion, shadows } from "../../theme";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  fullScreen?: boolean;
  children?: React.ReactNode;
  testID?: string;
}

export function BottomSheet({
  visible,
  onClose,
  fullScreen = false,
  children,
  testID,
}: BottomSheetProps) {
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
            duration: motion.duration.deliberate,
            // useNativeDriver unsupported on web (no native module) and the
            // "JS fallback" never applies the interpolated transform to the
            // DOM — sheets then render at translateY(0) and cover the screen
            // even when visible={false}.
            useNativeDriver: false,
          }),
          Animated.timing(scrimAnim, {
            toValue: 1,
            duration: motion.duration.standard,
            useNativeDriver: false,
          }),
        ]).start();
      }
    } else {
      if (reduceMotion) {
        slideAnim.setValue(1);
        scrimAnim.setValue(0);
      } else {
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 1,
            duration: motion.duration.standard,
            useNativeDriver: false,
          }),
          Animated.timing(scrimAnim, {
            toValue: 0,
            duration: motion.duration.quick,
            useNativeDriver: false,
          }),
        ]).start();
      }
    }
  }, [visible, reduceMotion, slideAnim, scrimAnim]);

  const scrimStyle: ViewStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
    opacity: scrimAnim,
    pointerEvents: visible ? "auto" : "none",
  };

  const sheetContainerStyle: ViewStyle = fullScreen
    ? {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: colors.surface[3],
        pointerEvents: visible ? "auto" : "none",
      }
    : {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface[3],
        borderTopLeftRadius: radius.lg,
        borderTopRightRadius: radius.lg,
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        paddingTop: spacing.lg,
        paddingBottom: spacing.lg,
        paddingHorizontal: spacing.xl,
        ...shadows.sheet,
        pointerEvents: visible ? "auto" : "none",
      };

  const grabberStyle: ViewStyle = {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignSelf: "center",
    marginBottom: spacing.sm,
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
      {/* react-native-web does not bridge `transform: [{ translateY:
          <AnimatedInterpolation> }]` to the DOM — the sheet then paints at
          its natural position even when visible={false}, covering the
          underlying screen with an opaque surface. Gate the render so the
          sheet is reliably hidden when closed on web. */}
      {visible ? (
          <Animated.View
            testID={testID}
            style={[sheetContainerStyle, animatedSheetStyle]}
          >
            {!fullScreen && <View style={grabberStyle} />}
            {children}
          </Animated.View>
        ) : null}
    </>
  );
}