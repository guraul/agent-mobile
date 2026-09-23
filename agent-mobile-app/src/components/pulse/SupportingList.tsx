/**
 * SupportingList — the light information flow below Featured.
 * Semantic micro-groups, never mixed without labels:
 *   NEEDS YOU · n  → amber dot + REVIEW
 *   SUGGESTED · n  → violet dot + CONFIRM (quiet DISMISS)
 *   RUNNING · n    → neutral dot + project status (production extension)
 *   MARKET · n     → fund estimate (production extension)
 * Tapping the statement opens contextual Talk (Discuss).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, spacing } from '../../theme/companion';
import { NeedsYouItem, SuggestionItem } from './showcase-types';
import { InlineChip, TextAction } from './ActionChips';
import { PressableScale } from './PressableScale';

export interface RunningRow {
  id: string;
  name: string;
  status: 'running' | 'idle';
}

export interface MarketRow {
  id: string;
  name: string;
  changePct: number | null;
}

interface Props {
  needsYou: NeedsYouItem[];
  suggestions: SuggestionItem[];
  running?: RunningRow[];
  market?: MarketRow[];
  onReview: (item: NeedsYouItem) => void;
  onDiscussNeedsYou: (item: NeedsYouItem) => void;
  onDiscussSuggestion: (item: SuggestionItem) => void;
  onConfirm: (item: SuggestionItem) => void;
  onDismiss: (item: SuggestionItem) => void;
  onOpenRunning?: (row: RunningRow) => void;
  onOpenMarket?: (row: MarketRow) => void;
}

export function SupportingList({
  needsYou,
  suggestions,
  running = [],
  market = [],
  onReview,
  onDiscussNeedsYou,
  onDiscussSuggestion,
  onConfirm,
  onDismiss,
  onOpenRunning,
  onOpenMarket,
}: Props) {
  const hasNeedsYou = needsYou.length > 0;
  const hasSuggestions = suggestions.length > 0;
  const hasRunning = running.length > 0;
  const hasMarket = market.length > 0;

  if (!hasNeedsYou && !hasSuggestions && !hasRunning && !hasMarket) return null;

  return (
    <View style={styles.wrap}>
      {hasNeedsYou && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Needs you · {needsYou.length}</Text>
          {needsYou.map((item) => (
            <View key={item.id} style={styles.row} testID={`supporting-ny-${item.id}`}>
              <PressableScale
                style={styles.tap}
                scaleTo={0.99}
                onPress={() => onDiscussNeedsYou(item)}
                testID={`supporting-ny-${item.id}-body`}
              >
                <View style={[styles.dot, { backgroundColor: colors.attention }]} />
                <Text style={styles.statement} numberOfLines={2}>
                  {item.title}
                </Text>
              </PressableScale>
              <View style={styles.rowActions}>
                <InlineChip
                  kind="review"
                  label="Review"
                  onPress={() => onReview(item)}
                  testID={`supporting-ny-${item.id}-action`}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      {hasSuggestions && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Suggested · {suggestions.length}</Text>
          {suggestions.map((item) => {
            const confirmed = item.status === 'confirmed';
            return (
              <View key={item.id} style={styles.row} testID={`supporting-sg-${item.id}`}>
                <PressableScale
                  style={styles.tap}
                  scaleTo={0.99}
                  onPress={() => onDiscussSuggestion(item)}
                  testID={`supporting-sg-${item.id}-body`}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: confirmed ? colors.success : colors.accent },
                    ]}
                  />
                  <Text style={styles.statement} numberOfLines={2}>
                    {item.proposal}
                  </Text>
                </PressableScale>
                <View style={styles.rowActions}>
                  {confirmed ? (
                    <Text style={styles.watching}>Watching</Text>
                  ) : (
                    <>
                      <InlineChip
                        kind="review"
                        label="Confirm"
                        onPress={() => onConfirm(item)}
                        testID={`supporting-sg-${item.id}-action`}
                      />
                      <TextAction
                        label="Dismiss"
                        color={colors.textMuted}
                        onPress={() => onDismiss(item)}
                        testID={`supporting-sg-${item.id}-quiet`}
                      />
                    </>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}

      {hasRunning && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Running · {running.length}</Text>
          {running.map((row) => (
            <PressableScale
              key={row.id}
              style={styles.plainRow}
              scaleTo={0.99}
              onPress={() => onOpenRunning?.(row)}
              testID={`supporting-run-${row.id}`}
            >
              <View
                style={[
                  styles.dot,
                  { backgroundColor: row.status === 'running' ? colors.attention : colors.offline },
                ]}
              />
              <Text style={styles.statement} numberOfLines={1}>
                {row.name}
              </Text>
              <Text style={styles.rowMeta}>
                {row.status === 'running' ? 'Running' : 'Idle'}
              </Text>
            </PressableScale>
          ))}
        </View>
      )}

      {hasMarket && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Market · {market.length}</Text>
          {market.map((row) => (
            <PressableScale
              key={row.id}
              style={styles.plainRow}
              scaleTo={0.99}
              onPress={() => onOpenMarket?.(row)}
              testID={`supporting-mkt-${row.id}`}
            >
              <View style={[styles.dot, { backgroundColor: colors.noticed }]} />
              <Text style={styles.statement} numberOfLines={1}>
                {row.name}
              </Text>
              {row.changePct !== null && (
                <Text
                  style={[
                    styles.rowMeta,
                    { color: row.changePct >= 0 ? colors.success : colors.danger },
                  ]}
                >
                  {row.changePct >= 0 ? '+' : ''}
                  {row.changePct.toFixed(2)}%
                </Text>
              )}
            </PressableScale>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  group: { marginBottom: spacing.xxl },
  groupLabel: {
    ...type.label,
    color: colors.textLabel,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  plainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md - 2,
  },
  tap: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    flexShrink: 0,
  },
  statement: { ...type.body, color: colors.textSecondary, flex: 1, minWidth: 0 },
  rowMeta: {
    ...type.metadata,
    color: colors.textMuted,
    flexShrink: 0,
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flexShrink: 0,
  },
  watching: {
    ...type.metadata,
    color: colors.success,
    fontVariant: ['tabular-nums'],
  },
});
