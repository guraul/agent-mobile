/**
 * FeaturedItem — the single strong container on Pulse（RN 迁移 #E 浅色重做，D10）。
 * 整卡可点 → /attention/[id]；无 lead 文字（恒 ≤1）、无行内动作 chips——
 * Review/Discuss 动作收进详情页（D10）；"needs you" 仅 Featured 独占语义不变。
 * 样式基准 pulseB.html .featured-card；颜色/字号走 theme/light.ts。
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { lightColors, lightTypography, lightRadius, lightSpacing, lightSizes } from "../../theme/light";
import { PressableScale } from "./PressableScale";
import { NeedsYouItem } from "./showcase-types";

interface Props {
  item: NeedsYouItem;
  onReview: (item: NeedsYouItem) => void;
  testID?: string;
}

export function FeaturedItem({ item, onReview, testID }: Props) {
  return (
    <PressableScale
      onPress={() => onReview(item)}
      testID={testID}
      style={styles.card}
      accessibilityRole="button"
      accessibilityLabel={`Review: ${item.title}`}
    >
      <View style={styles.titleRow}>
        <View style={styles.iconWrap}>
          <Bell size={lightSizes.iconFeatured} color={lightColors.amberDeep} strokeWidth={2} />
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
      </View>

      {item.why !== "" && (
        <View style={styles.whyWrap}>
          <Text style={styles.why}>{item.why}</Text>
        </View>
      )}
      <Text style={styles.meta}>
        {item.source} · {item.time}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: lightColors.white,
    borderRadius: lightRadius.card,
    padding: lightSpacing.cardPad,
    gap: 8, // mock .featured-card gap 8
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10, // mock .feat-head gap 10
  },
  iconWrap: { marginTop: 3, flexShrink: 0 }, // mock .feat-icon margin-top 3
  title: {
    fontSize: lightTypography.title.fontSize,
    fontWeight: lightTypography.title.fontWeight,
    lineHeight: lightTypography.title.lineHeight,
    color: lightColors.ink,
    flex: 1,
  },
  whyWrap: {
    backgroundColor: lightColors.rowGray,
    borderRadius: lightRadius.row,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  why: {
    fontSize: lightTypography.body.fontSize,
    fontWeight: lightTypography.body.fontWeight,
    lineHeight: lightTypography.body.lineHeight,
    color: lightColors.bodyText,
  },
  meta: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
  },
});
