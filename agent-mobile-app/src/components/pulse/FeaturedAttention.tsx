import React from "react";
import { View } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { ActionChip, QuietAction } from "./Chips";
import { colors, radius, spacing } from "../../theme";

/**
 * FeaturedAttention — the single strong container on Pulse.
 * Carries exactly the first OPEN Attention; hidden by the caller when none.
 * Suggested / Running / Market never take this slot.
 */
export function FeaturedAttention({
  title,
  summary,
  meta,
  onReview,
  onDiscuss,
  testID = "featured-attention",
}: {
  title: string;
  summary: string;
  meta: string;
  onReview: () => void;
  onDiscuss: () => void;
  testID?: string;
}) {
  return (
    <View style={{ gap: spacing.sm, paddingHorizontal: spacing.lg }} testID={testID}>
      <Text variant="captionStrong" color="body">
        One thing needs you
      </Text>
      <View
        style={{
          backgroundColor: colors.surface[2],
          borderWidth: 1,
          borderColor: colors.accentBorder,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.xs,
        }}
      >
        <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: colors.status.fill.running,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon icon={AlertTriangle} size="md" color="running" />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title" color="ink" numberOfLines={2}>
              {title}
            </Text>
          </View>
        </View>
        <Text variant="caption" color="body">
          {summary}
        </Text>
        <Text variant="monoCaption" color="muted">
          {meta}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            marginTop: spacing.xxs,
          }}
        >
          <ActionChip label="REVIEW" onPress={onReview} testID={`${testID}-review`} />
          <QuietAction label="Discuss" onPress={onDiscuss} testID={`${testID}-discuss`} />
        </View>
      </View>
    </View>
  );
}
