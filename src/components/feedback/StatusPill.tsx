import React from "react";
import { View, type ViewStyle } from "react-native";
import { colors, spacing, radius, typography } from "../../theme";
import { Text } from "../primitives/Text";
import { StatusDot, type StatusType } from "./StatusDot";

interface StatusPillConfig {
  backgroundColor: string;
  textColor: "running" | "idle" | "success" | "error" | "warning";
  dotColor: StatusType;
}

const statusPillConfig: Record<StatusType, StatusPillConfig> = {
  running: {
    backgroundColor: colors.status.fill.running,
    textColor: "running",
    dotColor: "running",
  },
  idle: {
    backgroundColor: colors.status.fill.idle,
    textColor: "idle",
    dotColor: "idle",
  },
  success: {
    backgroundColor: colors.status.fill.success,
    textColor: "success",
    dotColor: "success",
  },
  error: {
    backgroundColor: colors.status.fill.error,
    textColor: "error",
    dotColor: "error",
  },
  warning: {
    backgroundColor: colors.status.fill.warning,
    textColor: "warning",
    dotColor: "warning",
  },
};

export interface StatusPillProps {
  status: StatusType;
  label: string;
  testID?: string;
}

export function StatusPill({ status, label, testID }: StatusPillProps) {
  const config = statusPillConfig[status];

  const containerStyle: ViewStyle = {
    backgroundColor: config.backgroundColor,
    borderRadius: radius.pill,
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    alignSelf: "flex-start",
  };

  return (
    <View testID={testID} style={containerStyle}>
      <StatusDot
        status={status}
        size={6}
        accessibilityLabel={`Status: ${label}`}
      />
      <Text variant="captionStrong" color={config.textColor}>
        {label}
      </Text>
    </View>
  );
}
