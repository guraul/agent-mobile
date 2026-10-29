/**
 * MarketGroupItem — 同一交易日 / 同一创建授权 / 同一有效窗的多条 market Attention
 * 在 Pulse 上收成一行（#140 / docs/pipeline/MARKET_ALERT_GROUPING_CARD.md）。
 *
 * - 合并是**视图**：成员仍是独立 Attention，展开后逐条原样显示（各自标题与摘要，不改写），
 *   点成员进各自的 /attention/[id]。
 * - 计数写在标题里（"3 funds …"），标题永不说 "one"；不做组级 Dismiss / Handle。
 * - 组行继承组内最新成员的位置与视觉权重：featured = 白卡 + 琥珀铃铛，supporting = 绿卡内条目。
 * - 展示上展开前 MAX_VISIBLE_MEMBERS 条 + `+N more`（再点全部展开）；一条都不丢。
 */
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Bell } from "lucide-react-native";
import {
  lightColors,
  lightTypography,
  lightRadius,
  lightSpacing,
  lightSizes,
} from "../../theme/light";
import { PressableScale } from "./PressableScale";
import { LightTextAction } from "./LightAtoms";
import { formatRelative } from "../../services/assignment/projection";
import type { PulseMarketGroupUnit } from "../../services/attention/grouping";
import type { PulseAttentionItem } from "../../services/attention/store";
import { t, useLocale } from "../../i18n";

/** 展开后一次最多显示几条，其余折进 `+N more` */
const MAX_VISIBLE_MEMBERS = 5;

interface Props {
  group: PulseMarketGroupUnit;
  onOpenMember: (item: PulseAttentionItem) => void;
  /** featured = 白卡（首位）；supporting = 绿卡内条目 */
  variant?: "featured" | "supporting";
  testID?: string;
}

export function MarketGroupItem({ group, onOpenMember, variant = "featured", testID }: Props) {
  useLocale();
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const featured = variant === "featured";
  const title = t("pulse.marketGroup.title", { count: group.count });
  const subtitle = t("pulse.marketGroup.subtitle");
  const newest = group.members[0];
  const meta = `${t("pulse.domain.market")} · ${formatRelative(newest.createdAt)}`;
  const visibleMembers = expanded
    ? showAll
      ? group.members
      : group.members.slice(0, MAX_VISIBLE_MEMBERS)
    : [];
  const hiddenCount = group.members.length - visibleMembers.length;
  const toggleLabel = expanded
    ? t("pulse.marketGroup.collapse")
    : t("pulse.marketGroup.expand", { count: group.count });

  return (
    <View style={featured ? styles.card : styles.row} testID={testID}>
      <PressableScale
        onPress={() => setExpanded((v) => !v)}
        scaleTo={0.99}
        style={featured ? styles.head : styles.headInline}
        accessibilityRole="button"
        accessibilityLabel={t("pulse.marketGroup.a11y", { count: group.count })}
        testID={testID ? `${testID}-head` : undefined}
      >
        {featured ? (
          <View style={styles.titleRow}>
            <View style={styles.iconWrap}>
              <Bell size={lightSizes.iconFeatured} color={lightColors.amberDeep} strokeWidth={2} />
            </View>
            <Text style={styles.title} numberOfLines={2}>
              {title}
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.labelRow}>
              <Bell size={lightSizes.iconInline} color={lightColors.scheduleInk} strokeWidth={1.6} />
              <Text style={styles.label}>{t("pulse.supporting.groupReview")}</Text>
            </View>
            <Text style={styles.rowTitle} numberOfLines={2}>
              {title}
            </Text>
          </>
        )}

        <View style={featured ? styles.subtitleWrap : styles.subtitleWrapInline}>
          <Text style={featured ? styles.subtitle : styles.rowSubtitle}>{subtitle}</Text>
        </View>

        <Text style={featured ? styles.meta : styles.rowMeta}>{meta}</Text>
      </PressableScale>

      <View style={styles.toggleRow}>
        <LightTextAction
          label={toggleLabel}
          quiet={featured}
          style={featured ? undefined : styles.rowAction}
          onPress={() => setExpanded((v) => !v)}
          testID={testID ? `${testID}-toggle` : undefined}
        />
        {hiddenCount > 0 ? (
          <LightTextAction
            label={t("pulse.marketGroup.more", { count: hiddenCount })}
            quiet={featured}
            style={featured ? undefined : styles.rowAction}
            onPress={() => setShowAll(true)}
            testID={testID ? `${testID}-more` : undefined}
          />
        ) : null}
      </View>

      {visibleMembers.map((item) => (
        <PressableScale
          key={item.id}
          onPress={() => onOpenMember(item)}
          scaleTo={0.99}
          style={styles.member}
          accessibilityRole="button"
          accessibilityLabel={t("pulse.featured.reviewA11y", { title: item.title })}
          testID={testID ? `${testID}-member-${item.id}` : `market-group-member-${item.id}`}
        >
          <Text style={styles.memberTitle} numberOfLines={2}>
            {item.title}
          </Text>
          {item.summary !== "" ? <Text style={styles.memberSummary}>{item.summary}</Text> : null}
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── featured 变体（复用 FeaturedItem 的白卡 / 字号 / 色 token）──────────
  card: {
    backgroundColor: lightColors.white,
    borderRadius: lightRadius.card,
    padding: lightSpacing.cardPad,
    gap: 8,
  },
  head: { gap: 8 },
  headInline: { gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  iconWrap: { marginTop: 3, flexShrink: 0 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 },
  label: {
    fontSize: lightTypography.scheduleLabel.fontSize,
    fontWeight: lightTypography.scheduleLabel.fontWeight,
    lineHeight: lightTypography.scheduleLabel.lineHeight,
    color: lightColors.scheduleInk,
  },
  title: {
    fontSize: lightTypography.title.fontSize,
    fontWeight: lightTypography.title.fontWeight,
    lineHeight: lightTypography.title.lineHeight,
    color: lightColors.ink,
    flex: 1,
  },
  subtitleWrap: {
    backgroundColor: lightColors.rowGray,
    borderRadius: lightRadius.row,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  subtitle: {
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

  // ── supporting 变体（绿卡内条目，.sched-item 同款）──────────────────────
  row: {
    backgroundColor: lightColors.greenInner,
    borderRadius: lightRadius.inner,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 9,
  },
  subtitleWrapInline: { marginTop: 4 },
  rowTitle: {
    fontSize: lightTypography.scheduleTitle.fontSize,
    fontWeight: lightTypography.scheduleTitle.fontWeight,
    lineHeight: lightTypography.scheduleTitle.lineHeight,
    color: lightColors.rowInk,
    flex: 1,
  },
  rowSubtitle: {
    fontSize: lightTypography.scheduleMeta.fontSize,
    fontWeight: lightTypography.scheduleMeta.fontWeight,
    lineHeight: lightTypography.scheduleMeta.lineHeight,
    color: lightColors.scheduleMeta,
  },
  rowMeta: {
    fontSize: lightTypography.scheduleMeta.fontSize,
    fontWeight: lightTypography.scheduleMeta.fontWeight,
    lineHeight: lightTypography.scheduleMeta.lineHeight,
    color: lightColors.scheduleMeta,
  },
  rowAction: { color: lightColors.scheduleMeta },

  // ── 共享：meta 行 / 成员行 / 溢出 ─────────────────────────────────────
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
  },
  member: {
    borderTopWidth: 1,
    borderTopColor: lightColors.divider,
    paddingTop: 8,
    marginTop: 8,
    gap: 2,
  },
  memberTitle: {
    fontSize: lightTypography.scheduleTitle.fontSize,
    fontWeight: lightTypography.scheduleTitle.fontWeight,
    lineHeight: lightTypography.scheduleTitle.lineHeight,
    color: lightColors.ink,
  },
  memberSummary: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
  },
});
