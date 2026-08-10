import React from "react";
import { Pressable, type ViewStyle } from "react-native";
import { colors, spacing, radius, motion } from "../../theme";
import { Box } from "../primitives/Box";
import { Text } from "../primitives/Text";
import { StatusPill } from "../feedback/StatusPill";
import type { StatusType } from "../feedback/StatusDot";

export interface EventItemProps {
  type: string;
  title: string;
  summary: string;
  status: StatusType;
  statusLabel: string;
  onPress?: () => void;
  testID?: string;
}

export function EventItem({
  type,
  title,
  summary,
  status,
  statusLabel,
  onPress,
  testID,
}: EventItemProps) {
  const containerStyle: ViewStyle = {
    backgroundColor: colors.surface[1],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.xxs,
    borderRadius: 0,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${type}: ${title}`}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed && { backgroundColor: colors.surface[2] },
        pressed && { transform: [{ scale: motion.scale.pressed }] },
      ]}
    >
      <Text variant="captionStrong" color="muted">
        {type}
      </Text>
      <Box gap="xxs">
        <Text variant="captionStrong" color="ink" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="captionStrong" color="muted" numberOfLines={1}>
          {summary}
        </Text>
      </Box>
      <Box
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          alignSelf: "stretch",
        }}
      >
        <StatusPill status={status} label={statusLabel} />
      </Box>
    </Pressable>
  );
}
