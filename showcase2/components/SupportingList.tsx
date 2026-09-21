/**
 * SupportingList — the light information flow below Featured.
 * Two semantic micro-groups, never mixed without labels:
 *   NEEDS YOU · n  → amber dot + REVIEW (quiet DEFER)
 *   SUGGESTED · n  → violet dot + CONFIRM (quiet DISMISS)
 * Tapping the statement opens contextual Talk (Discuss).
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, type, spacing } from '../theme';
import { NeedsYouItem, SuggestionItem } from '../mock/types';
import { InlineChip, TextAction } from './ActionChips';
import { PressableScale } from './PressableScale';

interface Props {
  needsYou: NeedsYouItem[];
  suggestions: SuggestionItem[];
  onReview: (item: NeedsYouItem) => void;
  onDiscussNeedsYou: (item: NeedsYouItem) => void;
  onDefer: (item: NeedsYouItem) => void;
  onDiscussSuggestion: (item: SuggestionItem) => void;
  onConfirm: (item: SuggestionItem) => void;
  onDismiss: (item: SuggestionItem) => void;
}

export function SupportingList({
  needsYou,
  suggestions,
  onReview,
  onDiscussNeedsYou,
  onDefer,
  onDiscussSuggestion,
  onConfirm,
  onDismiss,
}: Props) {
  const hasNeedsYou = needsYou.length > 0;
  const hasSuggestions = suggestions.length > 0;

  if (!hasNeedsYou && !hasSuggestions) return null;

  return (
    <View style={styles.wrap}>
      {hasNeedsYou && (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>Needs you · {needsYou.length}</Text>
          {needsYou.map((item) => (
            <View key={item.id} style={styles.row}>
              <PressableScale
                style={styles.tap}
                scaleTo={0.99}
                onPress={() => onDiscussNeedsYou(item)}
              >
                <View style={[styles.dot, { backgroundColor: colors.attention }]} />
                <Text style={styles.statement} numberOfLines={2}>
                  {item.title}
                </Text>
              </PressableScale>
              <View style={styles.rowActions}>
                <InlineChip kind="review" label="Review" onPress={() => onReview(item)} />
                <TextAction label="Defer" color={colors.textMuted} onPress={() => onDefer(item)} />
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
              <View key={item.id} style={styles.row}>
                <PressableScale
                  style={styles.tap}
                  scaleTo={0.99}
                  onPress={() => onDiscussSuggestion(item)}
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
                      />
                      <TextAction
                        label="Dismiss"
                        color={colors.textMuted}
                        onPress={() => onDismiss(item)}
                      />
                    </>
                  )}
                </View>
              </View>
            );
          })}
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
