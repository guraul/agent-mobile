import React from "react";
import { View, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, spacing } from "../../theme";
import { Text } from "../primitives/Text";
import { IconButton } from "../primitives/IconButton";

export interface ScreenHeaderProps {
  title: string;
  leftIcon?: LucideIcon;
  onLeftPress?: () => void;
  leftAccessibilityLabel?: string;
  rightIcon?: LucideIcon;
  onRightPress?: () => void;
  rightAccessibilityLabel?: string;
  sticky?: boolean;
  testID?: string;
}

export function ScreenHeader({
  title,
  leftIcon,
  onLeftPress,
  leftAccessibilityLabel,
  rightIcon,
  onRightPress,
  rightAccessibilityLabel,
  sticky = false,
  testID,
}: ScreenHeaderProps) {
  const containerStyle: ViewStyle = {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    ...(sticky && {
      borderBottomWidth: 1,
      borderBottomColor: colors.border.default,
    }),
  };

  const leftStyle: ViewStyle = {
    width: 44,
    alignItems: "flex-start",
  };

  const rightStyle: ViewStyle = {
    width: 44,
    alignItems: "flex-end",
  };

  return (
    <View testID={testID} style={containerStyle}>
      <View style={leftStyle}>
        {leftIcon && (
          <IconButton
            icon={leftIcon}
            onPress={onLeftPress}
            color="ink"
            accessibilityLabel={leftAccessibilityLabel ?? "Back"}
          />
        )}
      </View>
      <Text variant="title" color="ink" align="center" numberOfLines={1}>
        {title}
      </Text>
      <View style={rightStyle}>
        {rightIcon && (
          <IconButton
            icon={rightIcon}
            onPress={onRightPress}
            color="body"
            accessibilityLabel={rightAccessibilityLabel ?? "More"}
          />
        )}
      </View>
    </View>
  );
}
