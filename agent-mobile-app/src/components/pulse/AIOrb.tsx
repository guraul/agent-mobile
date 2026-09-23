/**
 * AIOrb — presence orb, SHOWCASE2_VISUAL_SPEC.md §7.
 * Soft glowing violet sphere: bright core -> accent -> deep violet + soft halo.
 * States: attentive / engaged / thinking / noticed / needs-you / offline.
 * Only motion: slow breathing (opacity + scale), one-time ping for noticed/needs-you.
 * Exactly one orb per screen. Halo via layered transparent circle (no boxShadow).
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, motion } from '../../theme/companion';
import { PresenceState } from './showcase-types';

const SIZES = {
  dot: 8,
  avatar: 28,
  header: 40,
  hero: 108,
} as const;

interface Props {
  state: PresenceState;
  size?: keyof typeof SIZES;
  /** idle pulse factor; 1 = attentive speed, higher = engaged (faster) */
  speed?: number;
}

const STATE_COLOR: Record<PresenceState, string> = {
  attentive: colors.accent,
  engaged: colors.accentBright,
  thinking: colors.accentBright,
  noticed: colors.accent,
  'needs-you': colors.attention,
  offline: colors.offline,
};

export function AIOrb({ state, size = 'avatar', speed = 1 }: Props) {
  const breath = useSharedValue(0);
  const ping = useSharedValue(0);
  const base = SIZES[size];
  const color = STATE_COLOR[state];
  const isStatic = state === 'offline';
  const range = motion.breathingRange;

  // Breathing — pause-compatible loop; respects Reduce Motion via withReduceMotion.
  useEffect(() => {
    if (isStatic) {
      breath.value = 0;
      return;
    }
    breath.value = 0;
    breath.value = withRepeat(
      withTiming(1, {
        duration: motion.breathing / speed,
        easing: Easing.inOut(Easing.ease),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
    );
    return () => {
      // clear loop on unmount
    };
  }, [isStatic, speed, breath]);

  // One-time ping for noticed / needs-you.
  useEffect(() => {
    if (state === 'noticed' || state === 'needs-you') {
      ping.value = 0;
      ping.value = withSequence(
        withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 0 }),
      );
    }
  }, [state, ping]);

  const orbStyle = useAnimatedStyle(() => {
    const t = isStatic || state === 'thinking' ? 0 : breath.value;
    const scale = 1 + (range.scale[1] - 1) * t;
    const opacity = range.opacity[0] + (range.opacity[1] - range.opacity[0]) * t;
    return { transform: [{ scale }], opacity };
  });

  const pingStyle = useAnimatedStyle(() => {
    const d = base + 16 * ping.value;
    return {
      width: d,
      height: d,
      borderRadius: d / 2,
      opacity: 1 - ping.value,
      transform: [{ translateX: -d / 2 }, { translateY: -d / 2 }],
    };
  });

  const haloW = base * 2.1;

  return (
    <View style={[styles.wrap, { width: base, height: base }]}>
      {(state === 'noticed' || state === 'needs-you') && (
        <Animated.View
          pointerEvents="none"
          style={[styles.ping, { borderColor: color }, pingStyle]}
        />
      )}
      <Animated.View
        style={[
          styles.sphere,
          { width: base, height: base },
          orbStyle,
        ]}
      >
        {state !== 'offline' && (
          <View
            pointerEvents="none"
            style={[
              styles.halo,
              {
                width: haloW,
                height: haloW,
                borderRadius: haloW / 2,
                marginLeft: -haloW / 2,
                marginTop: -haloW / 2,
                backgroundColor: colors.glowHalo,
              },
            ]}
          />
        )}
        <LinearGradient
          colors={['#D6C6FF', colors.accentBright, colors.accent, '#4C1D95']}
          start={{ x: 0.2, y: 0.05 }}
          end={{ x: 0.8, y: 1 }}
          style={[styles.core, { width: base, height: base, borderRadius: base / 2 }]}
        />
        {base >= 24 && (
          <View
            pointerEvents="none"
            style={[styles.spec, { width: base * 0.32, height: base * 0.2 }]}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  sphere: { alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  core: { position: 'absolute' },
  spec: {
    position: 'absolute',
    top: '18%',
    left: '30%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
    transform: [{ rotate: '-28deg' }],
    opacity: 0.5,
  },
  ping: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    borderWidth: 1,
  },
});
