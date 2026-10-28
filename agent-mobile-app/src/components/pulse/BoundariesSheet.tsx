import React from "react";
import { ScrollView, View } from "react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { StatusPill } from "../feedback/StatusPill";
import { Text } from "../primitives/Text";
import { BOUNDARY_TIERS } from "../../services/agency/boundaries";
import { colors, spacing } from "../../theme";
import { t, useLocale } from "../../i18n";

/**
 * BoundariesSheet — "How we work together"：她现在的自主边界（只读）。
 *
 * 内容全部来自 `services/agency/boundaries.ts`（唯一事实源），这里只做渲染：
 * 三层各一颗 StatusPill + 逐条「标题 / 实际行为」。没有开关、没有写操作、
 * 没有跳转——想改边界只能去 Talk 说，或在代码里改那份数据。
 */
export function BoundariesSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  // 订阅语言：切换时 sheet 重渲染，渲染期 t() 取到新文案。
  useLocale();

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="boundaries-sheet">
      {/* header 与 MemorySheet / KnowledgeSheet 同一套：title + caption，xxs 间距 */}
      <View style={{ gap: spacing.xxs, marginBottom: spacing.sm }}>
        <Text variant="title" color="ink">{t("pulse.boundaries.title")}</Text>
        <Text variant="caption" color="muted">{t("pulse.boundaries.caption")}</Text>
      </View>

      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.md }}>
        {BOUNDARY_TIERS.map((tier) => (
          <View key={tier.id} style={{ gap: spacing.xxs }}>
            {/* 层名用 StatusPill：颜色即授权等级（running / warning / idle） */}
            <StatusPill
              status={tier.tone}
              label={t(tier.labelKey)}
              testID={`boundaries-tier-${tier.id}`}
            />
            <Text variant="caption" color="muted">{t(tier.captionKey)}</Text>
            {tier.items.map((item) => (
              <View key={item.id} testID={`boundaries-item-${item.id}`} style={rowStyle}>
                <View style={rowBodyStyle}>
                  <Text variant="bodyStrong" color="ink">{t(item.titleKey)}</Text>
                  <Text variant="caption" color="body">{t(item.detailKey)}</Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      <View style={{ marginTop: spacing.sm }} testID="boundaries-footer">
        <Text variant="caption" color="muted">{t("pulse.boundaries.footer")}</Text>
      </View>
    </BottomSheet>
  );
}

// 行样式与 SettingsSheet / MemorySheet 一致（paddingVertical xs + 1px border.subtle）。
const rowStyle = {
  flexDirection: "row" as const,
  alignItems: "flex-start" as const,
  gap: spacing.xs,
  paddingVertical: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.border.subtle,
};

const rowBodyStyle = { flex: 1, gap: 2 };
