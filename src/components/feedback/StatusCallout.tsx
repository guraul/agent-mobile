import React from "react";
import { View, type ViewStyle } from "react-native";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader,
  Circle,
  type LucideIcon,
} from "lucide-react-native";
import { colors, spacing, radius, iconStroke } from "../../theme";
import { Text } from "../primitives/Text";
import { Icon, type IconColorToken } from "../primitives/Icon";
import type { StatusType } from "./StatusDot";

interface StatusCalloutConfig {
  backgroundColor: string;
  borderColor: string;
  icon: LucideIcon;
  iconColor: IconColorToken;
}

const statusCalloutConfig: Record<StatusType, StatusCalloutConfig> = {
  running: {
    backgroundColor: colors.status.fill.running,
    borderColor: colors.status.border.running,
    icon: Loader,
    iconColor: "running",
  },
  idle: {
    backgroundColor: colors.status.fill.idle,
    borderColor: colors.status.border.idle,
    icon: Circle,
    iconColor: "idle",
  },
  success: {
    backgroundColor: colors.status.fill.success,
    borderColor: colors.status.border.success,
    icon: CheckCircle2,
    iconColor: "success",
  },
  error: {
    backgroundColor: colors.status.fill.error,
    borderColor: colors.status.border.error,
    icon: XCircle,
    iconColor: "error",
  },
  warning: {
    backgroundColor: colors.status.fill.warning,
    borderColor: colors.status.border.warning,
    icon: AlertTriangle,
    iconColor: "warning",
  },
};

export interface StatusCalloutProps {
  status: StatusType;
  title: string;
  body?: string;
  testID?: string;
}

export function StatusCallout({
  status,
  title,
  body,
  testID,
}: StatusCalloutProps) {
  const config = statusCalloutConfig[status];

  const containerStyle: ViewStyle = {
    backgroundColor: config.backgroundColor,
    borderColor: config.borderColor,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
  };

  return (
    <View testID={testID} style={containerStyle}>
      <Icon
        icon={config.icon}
        size="lg"
        color={config.iconColor}
        strokeWidth={iconStroke}
        accessibilityLabel={`Status icon: ${title}`}
      />
      <View style={{ flex: 1, gap: spacing.xxs }}>
        <Text variant="title" color={config.iconColor}>
          {title}
        </Text>
        {body && <Text variant="body" color="body">{body}</Text>}
      </View>
    </View>
  );
}
