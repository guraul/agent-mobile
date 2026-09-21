/**
 * ThinkingDots — 3-dot opacity wave, spec §8 (never a spinner).
 * Dots oscillate in phase offset: 0.3 -> 1.0 -> 0.3, 1.2s loop.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { colors } from '../theme';

const DURATION = 1200;

function useDot() {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = 0;
    t.value = withRepeat(
      withTiming(1, { duration: DURATION, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
      -1,
    );
  }, [t]);
  return useAnimatedStyle(() => {
    const wave = 0.5 + 0.5 * Math.sin(t.value * Math.PI * 2);
    return { opacity: 0.3 + 0.7 * wave };
  });
}

function Dot({ delay }: { delay: number }) {
  const style = useDot();
  return <Animated.View style={[styles.dot, style]} />;
}

export function ThinkingDots() {
  return (
    <View style={styles.row}>
      <Dot delay={0} />
      <Dot delay={0.15} />
      <Dot delay={0.3} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 18 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
  },
});
