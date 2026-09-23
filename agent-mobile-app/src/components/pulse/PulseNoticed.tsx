/**
 * PulseNoticed — informational, lowest visual weight.
 * Borderless typographic row + tiny dot + muted metadata. Tap -> Talk with context.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, spacing } from '../../theme/companion';
import { NoticedItem } from './showcase-types';
import { PressableScale } from './PressableScale';

export function PulseNoticed({
  item,
  onPress,
  testID,
}: {
  item: NoticedItem;
  onPress: (item: NoticedItem) => void;
  testID?: string;
}) {
  return (
    <PressableScale
      style={styles.row}
      onPress={() => onPress(item)}
      scaleTo={0.99}
      testID={testID}
    >
      <View style={styles.dot} />
      <Text style={styles.fact} numberOfLines={1}>
        {item.fact}
      </Text>
      <Text style={styles.time}>{item.time}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: 52,
    paddingVertical: 13,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.noticed,
    marginTop: 7,
    flexShrink: 0,
  },
  fact: { ...type.body, color: colors.textSecondary, flex: 1, minWidth: 0 },
  time: { ...type.metadata, color: colors.textMuted, flexShrink: 0 },
});
