/**
 * ContextChip — pinned quiet chip above composer in Talk (spec §10).
 * "↳ Huabao Medical ETF" · surface + accentBorder · dismissible.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, type, spacing, radii } from '../../theme/companion';

export function ContextChip({
  label,
  onDismiss,
}: {
  label: string;
  onDismiss?: () => void;
}) {
  return (
    <View style={styles.chip}>
      <Text style={styles.arrow}>↳</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      {onDismiss && (
        <Pressable onPress={onDismiss} hitSlop={8}>
          <Text style={styles.dismiss}>✕</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 32,
    borderRadius: radii.radiusChip,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  arrow: { ...type.bodySmall, color: colors.accentBright },
  label: { ...type.bodySmall, color: colors.textPrimary, flexShrink: 1 },
  dismiss: { ...type.bodySmall, color: colors.textMuted },
});
