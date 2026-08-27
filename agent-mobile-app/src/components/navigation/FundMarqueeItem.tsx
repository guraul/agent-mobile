import React from "react";
import { Pressable, View, type ViewStyle } from "react-native";
import { colors, spacing, motion } from "../../theme";
import { Box } from "../primitives/Box";
import { Text } from "../primitives/Text";
import { StatusPill } from "../feedback/StatusPill";
import { Marquee } from "./Marquee";
import type { FundEstimateItem } from "../../services/fund-events";

export interface FundMarqueeItemProps {
  funds: FundEstimateItem[];
  hasAlert?: boolean;
  onPress?: () => void;
}

/**
 * 基金行情条目——UI 与 EventItem（项目列）完全一致：
 * 同 surface.1 背景、边框、padding、gap；type 标签 + title/summary 两行 + StatusPill。
 * title 行为基金名跑马灯滚动，summary 行为估值 + 涨跌幅跑马灯滚动。
 * hasAlert 时 StatusPill 变 warning"有基金需要交易"，否则 idle"Watching"。
 * 可点击（onPress，与 EventItem 同 pressed 反馈）。
 */
export function FundMarqueeItem({ funds, hasAlert = false, onPress }: FundMarqueeItemProps) {
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
      accessibilityLabel={hasAlert ? "有基金需要交易" : "基金行情"}
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
        <StatusPill
          status={hasAlert ? "warning" : "idle"}
          label={hasAlert ? `有基金需要交易(${funds.length})` : "Watching"}
        />
      </Box>
    </Pressable>
  );
}
