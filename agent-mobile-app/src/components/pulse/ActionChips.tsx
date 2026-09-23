/**
 * Action language atoms — SHOWCASE2_VISUAL_SPEC.md §6.
 * Most actions are chips or text; at most one filled primary per screen.
 * Review = AI "look at this" signature chip; Discuss = quiet neutral chip.
 * Primary (Confirm) = violet gradient pill.
 */
import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, type, radii } from '../../theme/companion';
import { PressableScale } from './PressableScale';

export function InlineChip({
  label,
  onPress,
  kind = 'neutral',
  testID,
}: {
  label: string;
  onPress?: () => void;
  kind?: 'neutral' | 'review' | 'discuss';
  testID?: string;
}) {
  const style =
    kind === 'review'
      ? styles.reviewChip
      : kind === 'discuss'
        ? styles.discussChip
        : styles.neutralChip;
  const textColor =
    kind === 'review'
      ? '#C4B5FD'
      : kind === 'discuss'
        ? '#D8D4E8'
        : colors.textSecondary;

  return (
    <PressableScale onPress={onPress} style={[styles.chip, style]}>
      <Text style={[styles.chipLabel, { color: textColor }]}>{label}</Text>
    </PressableScale>
  );
}

export function ConfirmPill({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      style={[styles.confirmPill, disabled && styles.disabled]}
    >
      <LinearGradient
        colors={[colors.accentBright, colors.accentDeep]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Text style={styles.confirmLabel}>{label}</Text>
    </PressableScale>
  );
}

export function TextAction({
  label,
  onPress,
  color = colors.accentBright,
  testID,
}: {
  label: string;
  onPress?: () => void;
  color?: string;
  testID?: string;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={8} testID={testID}>
      <Text style={[styles.textAction, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 32,
    borderRadius: radii.radiusChip,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipLabel: { ...type.bodySmall, fontWeight: '500' },
  neutralChip: {
    backgroundColor: colors.surface,
    borderColor: colors.borderSubtle,
  },
  reviewChip: {
    backgroundColor: 'rgba(139,92,246,0.10)',
    borderColor: 'rgba(167,139,250,0.40)',
  },
  discussChip: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderColor: colors.borderSubtle,
  },
  confirmPill: {
    height: 42,
    borderRadius: radii.radiusChip,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  confirmLabel: { ...type.bodySmall, fontWeight: '600', color: '#FFFFFF' },
  disabled: { opacity: 0.4 },
  textAction: { ...type.bodySmall, fontWeight: '600' },
});
