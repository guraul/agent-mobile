import React, { useState } from "react";
import { Pressable, ActivityIndicator, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, spacing, radius, motion, iconStroke } from "../../theme";
import { Text } from "./Text";
import { Icon, type IconColorToken } from "./Icon";

type TextColorToken =
  | "onAccent"
  | "ink"
  | "accent"
  | "error"
  | "disabled";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export interface ButtonProps {
  variant?: ButtonVariant;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: LucideIcon;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  testID?: string;
}

interface VariantConfig {
  backgroundColor: string;
  pressedBackgroundColor: string;
  textColor: string;
  textColorToken: TextColorToken;
  iconColor: IconColorToken;
  borderRadius: number;
  paddingVertical: number;
  paddingHorizontal: number;
  borderWidth: number;
  borderColor: string;
  spinnerColor: string;
  disabledBackgroundColor: string;
  disabledTextColor: string;
  disabledBorderColor: string;
  minWidth: number;
  minHeight: number;
}

const variantConfigs: Record<ButtonVariant, VariantConfig> = {
  primary: {
    backgroundColor: colors.accent.default,
    pressedBackgroundColor: colors.accent.pressed,
    textColor: colors.onAccent,
    textColorToken: "onAccent",
    iconColor: "onAccent",
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderWidth: 0,
    borderColor: "transparent",
    spinnerColor: colors.accent.default,
    disabledBackgroundColor: "rgba(245, 166, 36, 0.3)",
    disabledTextColor: "rgba(26, 20, 16, 0.4)",
    disabledBorderColor: "transparent",
    minWidth: 0,
    minHeight: 44,
  },
  secondary: {
    backgroundColor: colors.surface[2],
    pressedBackgroundColor: colors.surface[3],
    textColor: colors.ink,
    textColorToken: "ink",
    iconColor: "ink",
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.default,
    spinnerColor: colors.body,
    disabledBackgroundColor: colors.surface[1],
    disabledTextColor: colors.disabled,
    disabledBorderColor: colors.border.disabled,
    minWidth: 0,
    minHeight: 44,
  },
  ghost: {
    backgroundColor: "transparent",
    pressedBackgroundColor: "transparent",
    textColor: colors.accent.default,
    textColorToken: "accent",
    iconColor: "accent",
    borderRadius: radius.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 0,
    borderColor: "transparent",
    spinnerColor: colors.accent.default,
    disabledBackgroundColor: "transparent",
    disabledTextColor: colors.disabled,
    disabledBorderColor: "transparent",
    minWidth: 0,
    minHeight: 44,
  },
  destructive: {
    backgroundColor: colors.status.fill.error,
    pressedBackgroundColor: "rgba(199, 92, 76, 0.25)",
    textColor: colors.status.error,
    textColorToken: "error",
    iconColor: "error",
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(199, 92, 76, 0.3)",
    spinnerColor: colors.status.error,
    disabledBackgroundColor: colors.surface[1],
    disabledTextColor: colors.disabled,
    disabledBorderColor: colors.border.disabled,
    minWidth: 0,
    minHeight: 44,
  },
};

export function Button({
  variant = "primary",
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  accessibilityLabel,
  testID,
}: ButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const config = variantConfigs[variant];

  const isDisabled = disabled || loading;

  const backgroundColor = isDisabled
    ? config.disabledBackgroundColor
    : isPressed
      ? config.pressedBackgroundColor
      : config.backgroundColor;

  const textColor = isDisabled ? config.disabledTextColor : config.textColor;
  const borderColor = isDisabled ? config.disabledBorderColor : config.borderColor;

  const containerStyle: ViewStyle = {
    backgroundColor,
    borderRadius: config.borderRadius,
    borderWidth: config.borderWidth,
    borderColor,
    paddingVertical: config.paddingVertical,
    paddingHorizontal: config.paddingHorizontal,
    minHeight: config.minHeight,
    ...(fullWidth && { width: "100%" }),
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  };

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      disabled={isDisabled}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed && { transform: [{ scale: motion.scale.pressed }] },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={config.spinnerColor} />
      ) : (
        <>
          {icon && (
            <Icon
              icon={icon}
              size="md"
              color={isDisabled ? "disabled" : config.iconColor}
              strokeWidth={iconStroke}
            />
          )}
          <Text
            variant="button"
            color={isDisabled ? "disabled" : config.textColorToken}
          >
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
