/**
 * KnowledgeSheet — bottom sheet previewing a KB source (spec §11).
 * Overlay: scrim + backgroundElevated sheet, top radius 24, handle.
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
import { KnowledgeSource } from '../mock/types';
import { InlineChip } from './ActionChips';

export function KnowledgeSheet({
  source,
  onClose,
}: {
  source: KnowledgeSource;
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
        <Text style={styles.title}>▸ {source.name}</Text>
        <Text style={styles.excerpt}>{source.excerpt}</Text>
        <View style={styles.actions}>
          <InlineChip label="Open" />
          <InlineChip label="Ask about this" />
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
  title: { ...type.heading, color: colors.textPrimary },
  excerpt: { ...type.body, color: colors.textSecondary },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
