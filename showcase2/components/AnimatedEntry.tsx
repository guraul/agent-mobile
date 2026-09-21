/**
 * AnimatedEntry — fade + translateY appearance, spec §8.
 * Used for Pulse item first-render stagger. Respects Reduce Motion
 * via reduceMotion: System (drops to instant).
 */
import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { motion } from '../theme';

export function AnimatedEntry({
  index = 0,
  children,
}: {
  index?: number;
  children: React.ReactNode;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(
      index * motion.itemStagger,
      withTiming(1, {
        duration: motion.itemAppear,
        easing: Easing.out(Easing.cubic),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * motion.itemTranslateY }],
  }));

  return <Animated.View style={style}>{children}</Animated.View>;
}
