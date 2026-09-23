/**
 * ConversationEntry — Pulse bottom entry (spec V2 §11).
 * NOT a TextInput. The whole capsule is a Pressable that enters Talk,
 * and the round gradient button on the right is "Enter Talk", not Send.
 * Real input lives in Talk only.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, type, spacing } from '../../theme/companion';
import { PressableScale } from './PressableScale';

export function ConversationEntry({ onEnter, testID }: { onEnter: () => void; testID?: string }) {
  return (
    <View style={styles.row} testID={testID}>
      <PressableScale style={styles.pill} onPress={onEnter} testID={testID ? `${testID}-enter` : undefined}>
        <Text style={styles.plus}>+</Text>
        <Text style={styles.label}>Talk to Pulse…</Text>
      </PressableScale>

      <PressableScale style={styles.circle} onPress={onEnter}>
        <LinearGradient
          colors={[colors.accentBright, colors.accentDeep]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Text style={styles.arrow}>→</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  pill: {
    flex: 1,
    height: 54,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceElevatedDeep,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  plus: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '400',
    color: colors.accentBright,
  },
  label: { ...type.body, color: colors.textSecondaryBright },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: { color: '#FFFFFF', fontSize: 18 },
});
