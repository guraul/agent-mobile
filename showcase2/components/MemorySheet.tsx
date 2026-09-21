/**
 * MemorySheet — bottom sheet showing a quoted memory (spec §11).
 * Overlay: scrim rgba(0,0,0,0.5) + backgroundElevated sheet, top radius 24, handle.
 * Uses plain conditional overlay (works reliably on native + RN Web).
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { colors, type, spacing, radii } from '../theme';
import { MemoryChip } from '../mock/types';
import { InlineChip, TextAction } from './ActionChips';

export function MemorySheet({
  memory,
  onClose,
}: {
  memory: MemoryChip;
  onClose: () => void;
}) {
  const slide = useSharedValue(0);

  useEffect(() => {
    slide.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [slide]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - slide.value) * 120 }],
  }));

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />
        <Text style={styles.title}>From memory</Text>
        <Text style={styles.quote}>“{memory.detail}”</Text>
        <Text style={styles.source}>{memory.source}</Text>
        <View style={styles.actions}>
          <InlineChip label="Discuss" />
          <TextAction label="Forget" color={colors.danger} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radii.radiusSheet,
    borderTopRightRadius: radii.radiusSheet,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 24,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: { ...type.label, color: colors.textMuted },
  quote: { ...type.subheading, color: colors.textPrimary },
  source: { ...type.metadata, color: colors.textMuted },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
});
