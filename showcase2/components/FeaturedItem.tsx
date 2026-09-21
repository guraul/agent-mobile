/**
 * FeaturedItem — the single strong container on Pulse.
 * Carries exactly the first open Needs You item; hidden when none exists.
 * REVIEW is the primary action; DISCUSS and DEFER stay quiet.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, spacing, radii } from '../theme';
import { NeedsYouItem } from '../mock/types';
import { InlineChip, TextAction } from './ActionChips';

/** Minimal linear alert glyph for the tile (no icon dependency). */
function AlertGlyph({ size = 20, color = colors.attention }: { size?: number; color?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: size * 0.41,
          borderWidth: 1.5,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.18,
          width: 1.6,
          height: size * 0.26,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.54,
          width: 1.8,
          height: 1.8,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

interface Props {
  item: NeedsYouItem;
  onReview: (item: NeedsYouItem) => void;
  onDiscuss: (item: NeedsYouItem) => void;
  onDefer: (item: NeedsYouItem) => void;
}

export function FeaturedItem({ item, onReview, onDiscuss, onDefer }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.lead}>One thing needs you</Text>

      <View style={styles.card}>
        <View style={styles.titleRow}>
          <View style={styles.tile}>
            <AlertGlyph />
          </View>
          <Text style={styles.title}>{item.title}</Text>
        </View>

        <Text style={styles.why}>{item.why}</Text>
        <Text style={styles.meta}>
          {item.source} · {item.time}
        </Text>

        <View style={styles.actions}>
          <InlineChip kind="review" label="Review" onPress={() => onReview(item)} />
          <TextAction
            label="Discuss"
            color={colors.textSecondaryBright}
            onPress={() => onDiscuss(item)}
          />
          <TextAction label="Defer" color={colors.textMuted} onPress={() => onDefer(item)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.xxxl },
  lead: {
    ...type.body,
    fontWeight: '600',
    color: colors.textSecondaryBright,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.radiusCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.accentBorder,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radii.radiusTile,
    backgroundColor: 'rgba(139,92,246,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167,139,250,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.heading, color: colors.textPrimary, flex: 1, marginTop: 2 },
  why: { ...type.bodySmall, color: colors.textSecondary },
  meta: { ...type.metadata, color: colors.textMuted },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
});
