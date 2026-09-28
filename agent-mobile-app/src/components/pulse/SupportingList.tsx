/**
 * SupportingList — In motion 绿卡（RN 迁移 #E 浅色重做）。
 * 四语义组（To review / Suggested / Running / Market，固定顺序，D7 文案红线）
 * 合流为单张 Schedule 风格绿卡：组标签占时间位（11.5px + 13px 线性图标），
 * 条目标题 14/600，行内动作收右侧。样式基准 pulseB.html .card.green；
 * 字值有意偏离 7-token（11.5/14，D1），走 light.ts schedule* token。
 * props 与旧版兼容（index.tsx / ListSheet 装配零改动）；
 * Confirm/Reject 仍是 suggestion 唯一推进路径，查看 ≠ 授权（D9）。
 */
import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { Eye, Lightbulb, Activity, TrendingUp } from "lucide-react-native";
import { lightColors, lightTypography, lightRadius, lightSpacing, lightSizes } from "../../theme/light";
import { NeedsYouItem, SuggestionItem } from "./showcase-types";
import { LightChip, LightTextAction } from "./LightAtoms";
import { PressableScale } from "./PressableScale";

export interface RunningRow {
  id: string;
  name: string;
  status: "running" | "idle";
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

/** 组定义（D7 顺序红线：To review → Suggested → Running → Market） */
const GROUP_LABELS = {
  review: "To review",
  suggested: "Suggested",
  running: "Running",
  market: "Market",
} as const;

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
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>
          <Text style={styles.bracket}>[</Text> In motion <Text style={styles.bracket}>]</Text>
        </Text>
      </View>

      {hasNeedsYou &&
        needsYou.map((item) => (
          <View key={item.id} style={styles.item} testID={`supporting-ny-${item.id}`}>
            <View style={styles.itemTime}>
              <Eye size={lightSizes.iconInline} color={lightColors.scheduleInk} strokeWidth={1.6} />
              <Text style={styles.itemTimeLabel}>{GROUP_LABELS.review}</Text>
            </View>
            <View style={styles.titleRow}>
              <PressableScale
                onPress={() => onDiscussNeedsYou(item)}
                scaleTo={0.99}
                style={styles.titleTap}
                testID={`supporting-ny-${item.id}-body`}
              >
                <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">
                  {item.title}
                </Text>
              </PressableScale>
              <LightChip
                label="Review"
                kind="review"
                onPress={() => onReview(item)}
                testID={`supporting-ny-${item.id}-action`}
              />
            </View>
          </View>
        ))}

      {hasSuggestions &&
        suggestions.map((item) => {
          const confirmed = item.status === "confirmed";
          return (
            <View key={item.id} style={styles.item} testID={`supporting-sg-${item.id}`}>
              <View style={styles.itemTime}>
                <Lightbulb size={lightSizes.iconInline} color={lightColors.scheduleInk} strokeWidth={1.6} />
                <Text style={styles.itemTimeLabel}>{GROUP_LABELS.suggested}</Text>
              </View>
              <View style={styles.titleRow}>
                <PressableScale
                  onPress={() => onDiscussSuggestion(item)}
                  scaleTo={0.99}
                  style={styles.titleTap}
                  testID={`supporting-sg-${item.id}-body`}
                >
                  <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">
                    {item.proposal}
                  </Text>
                </PressableScale>
                {confirmed ? (
                  <Text style={styles.watching}>Watching</Text>
                ) : (
                  <View style={styles.rowActions}>
                    <LightChip
                      label="Confirm"
                      kind="review"
                      onPress={() => onConfirm(item)}
                      testID={`supporting-sg-${item.id}-action`}
                    />
                    <LightTextAction
                      label="Dismiss"
                      quiet
                      style={styles.quietInGreen}
                      onPress={() => onDismiss(item)}
                      testID={`supporting-sg-${item.id}-quiet`}
                    />
                  </View>
                )}
              </View>
            </View>
          );
        })}

      {hasRunning &&
        running.map((row) => (
          <PressableScale
            key={row.id}
            onPress={() => onOpenRunning?.(row)}
            scaleTo={0.99}
            style={styles.item}
            testID={`supporting-run-${row.id}`}
          >
            <View style={styles.itemTime}>
              <Activity size={lightSizes.iconInline} color={lightColors.scheduleInk} strokeWidth={1.6} />
              <Text style={styles.itemTimeLabel}>{GROUP_LABELS.running}</Text>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">
                {row.name}
              </Text>
              <Text style={styles.itemMeta}>{row.status === "running" ? "Running" : "Idle"}</Text>
            </View>
          </PressableScale>
        ))}

      {hasMarket &&
        market.map((row) => (
          <PressableScale
            key={row.id}
            onPress={() => onOpenMarket?.(row)}
            scaleTo={0.99}
            style={styles.item}
            testID={`supporting-mkt-${row.id}`}
          >
            <View style={styles.itemTime}>
              <TrendingUp size={lightSizes.iconInline} color={lightColors.scheduleInk} strokeWidth={1.6} />
              <Text style={styles.itemTimeLabel}>{GROUP_LABELS.market}</Text>
            </View>
            <View style={styles.titleRow}>
              <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">
                {row.name}
              </Text>
              {row.changePct !== null && (
                <Text
                  style={[
                    styles.itemMeta,
                    row.changePct >= 0 ? styles.metaUp : styles.metaDown,
                  ]}
                >
                  {row.changePct >= 0 ? "+" : ""}
                  {row.changePct.toFixed(2)}%
                </Text>
              )}
            </View>
          </PressableScale>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.greenCard,
    borderRadius: lightRadius.card,
    padding: lightSpacing.cardPad,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10, // mock .card-head
  },
  cardTitle: {
    fontSize: lightTypography.title.fontSize,
    fontWeight: lightTypography.title.fontWeight,
    lineHeight: lightTypography.title.lineHeight,
    color: lightColors.ink,
  },
  bracket: { fontWeight: "400" }, // mock .card-title .bracket
  item: {
    backgroundColor: lightColors.greenInner,
    borderRadius: lightRadius.inner,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 9, // mock .sched-item + .sched-item（末条多出的 9 由卡片 padding 吸收）
  },
  itemTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5, // mock .sched-time gap 5
    marginBottom: 2,
  },
  itemTimeLabel: {
    fontSize: lightTypography.scheduleLabel.fontSize,
    fontWeight: lightTypography.scheduleLabel.fontWeight,
    lineHeight: lightTypography.scheduleLabel.lineHeight,
    color: lightColors.scheduleInk,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10, // mock .sched-title-row gap 10
  },
  titleTap: { flex: 1, minWidth: 0 },
  itemTitle: {
    fontSize: lightTypography.scheduleTitle.fontSize,
    fontWeight: lightTypography.scheduleTitle.fontWeight,
    lineHeight: lightTypography.scheduleTitle.lineHeight,
    color: lightColors.rowInk,
    flex: 1,
  },
  rowActions: { flexDirection: "row", alignItems: "center", gap: 14, flexShrink: 0 },
  quietInGreen: { color: lightColors.scheduleMeta }, // mock .sched-item .text-action.quiet #4A5D4A
  itemMeta: {
    fontSize: lightTypography.scheduleMeta.fontSize,
    fontWeight: lightTypography.scheduleMeta.fontWeight,
    lineHeight: lightTypography.scheduleMeta.lineHeight,
    color: lightColors.scheduleMeta,
    flexShrink: 0,
  },
  metaUp: { color: lightColors.upRed, fontWeight: "600" }, // 红涨
  metaDown: { color: lightColors.green, fontWeight: "600" }, // 绿跌
  watching: {
    fontSize: lightTypography.scheduleMeta.fontSize,
    fontWeight: lightTypography.scheduleMeta.fontWeight,
    lineHeight: lightTypography.scheduleMeta.lineHeight,
    color: lightColors.green,
    flexShrink: 0,
  },
});
