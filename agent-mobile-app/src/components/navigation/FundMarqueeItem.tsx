import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { colors, spacing, motion } from "../../theme";
import { Box } from "../primitives/Box";
import { Text } from "../primitives/Text";
import { StatusPill } from "../feedback/StatusPill";
import { Marquee } from "./Marquee";
import type { L1MarketEstimateData } from "../../services/l1";

export interface FundMarqueeItemProps {
  funds: L1MarketEstimateData[];
  onPress?: () => void;
}

/**
 * 基金行情条目——UI 与 EventItem（项目列）完全一致。
 * Phase 10：数据源从 legacy /api/events/stream 迁移到 L1（/api/product/l1）。
 * L1 = authorized informational presentation（PM §22）：无 obligation、无 badge、无 lifecycle。
 * StatusPill 恒 idle"Watching"——L1 行情数据面。
 * 可点击（onPress，与 EventItem 同 pressed 反馈）。
 */
export function FundMarqueeItem({ funds, onPress }: FundMarqueeItemProps) {
  const containerStyle: ViewStyle = {
    backgroundColor: colors.surface[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xxs,
    borderRadius: 0,
  };

  if (funds.length === 0) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="基金行情"
      style={({ pressed }) => [
        containerStyle,
        pressed && { backgroundColor: colors.surface[2] },
        pressed && { transform: [{ scale: motion.scale.pressed }] },
      ]}
    >
      <Text variant="captionStrong" color="muted">
        MARKET
      </Text>
      <Box gap="xxs">
        <Marquee>
          {funds.map((f) => (
            <View key={f.code} style={{ paddingRight: spacing.md }}>
              <Text variant="captionStrong" color="ink" numberOfLines={1}>
                {f.name}
              </Text>
            </View>
          ))}
        </Marquee>
        <Marquee>
          {funds.map((f) => (
            <View key={f.code} style={{ paddingRight: spacing.md }}>
              <Text
                variant="captionStrong"
                color={f.changePct >= 0 ? "success" : "error"}
              >
                {f.estimatedNav.toFixed(4)} 昨 {f.prevNav.toFixed(4)} {f.changePct >= 0 ? "+" : ""}
                {f.changePct.toFixed(2)}%
              </Text>
            </View>
          ))}
        </Marquee>
      </Box>
      <Box style={{ flexDirection: "row", justifyContent: "flex-end", alignSelf: "stretch" }}>
        <StatusPill status="idle" label="Watching" />
      </Box>
    </Pressable>
  );
}
