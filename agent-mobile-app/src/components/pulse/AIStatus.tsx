/**
 * AIStatus — the AI presence caption: "● STATE".
 * One syntax everywhere: 11px / 0.12em / uppercase.
 * Pulse header line 1 and Talk header line 3 both use this component.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme/companion';
import { PresenceState } from './showcase-types';

const LABEL: Record<PresenceState, string> = {
  attentive: 'Attentive',
  engaged: 'Listening',
  thinking: 'Thinking',
  noticed: 'Noticed',
  'needs-you': 'Needs you',
  offline: 'Offline',
};

const COLOR: Record<PresenceState, string> = {
  attentive: colors.accentBright,
  engaged: colors.accentBright,
  thinking: colors.accentBright,
  noticed: colors.accentBright,
  'needs-you': colors.attention,
  offline: colors.offline,
};

export function AIStatus({ state }: { state: PresenceState }) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: COLOR[state] }]} />
      <Text style={[styles.caption, { color: COLOR[state] }]}>
        {LABEL[state]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    letterSpacing: 1.32,
    textTransform: 'uppercase',
  },
});
