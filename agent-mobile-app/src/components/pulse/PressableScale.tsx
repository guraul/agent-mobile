/**
 * PressableScale — subtle press feedback: scale 0.97 over 120ms (spec §8).
 * Respects Reduce Motion.
 */
import React from 'react';
import { Pressable, PressableProps, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends PressableProps {
  scaleTo?: number;
}

export function PressableScale({ scaleTo = 0.97, style, children, ...rest }: Props) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withTiming(scaleTo, {
          duration: 120,
          easing: Easing.out(Easing.ease),
          reduceMotion: ReduceMotion.System,
        });
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withTiming(1, {
          duration: 120,
          easing: Easing.out(Easing.ease),
          reduceMotion: ReduceMotion.System,
        });
        rest.onPressOut?.(e);
      }}
      style={[styles.base, animStyle, style]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: { opacity: 1 },
});
