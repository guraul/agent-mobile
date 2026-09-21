/**
 * DetailSheet — read-only detail for a Noticed statement (spec V2 §9).
 * Viewing never changes product state: no handle, no dismiss,
 * no Assignment / Proposal / lifecycle change.
 * Discuss is the only way out of the sheet into Talk.
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
import { InlineChip } from './ActionChips';

export function DetailSheet({
  label,
  body,
  meta,
  onDiscuss,
  onClose,
}: {
  label: string;
  body: string;
  meta: string;
  onDiscuss?: () => void;
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
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.meta}>{meta}</Text>
        <View style={styles.actions}>
          {onDiscuss && <InlineChip label="Discuss" onPress={onDiscuss} />}
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
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
  label: { ...type.label, color: colors.textLabel },
  body: { ...type.subheading, color: colors.textPrimary, fontWeight: '400', lineHeight: 24 },
  meta: { ...type.metadata, color: colors.textMuted },
  actions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm },
});
