import React from "react";
import type { LucideIcon } from "lucide-react-native";
import { iconSizes, iconStroke, colors } from "../../theme";

export type IconSizeToken = keyof typeof iconSizes;

export type IconColorToken =
  | "ink"
  | "body"
  | "muted"
  | "disabled"
  | "onAccent"
  | "accent"
  | "accentBright"
  | "accentPressed"
  | "success"
  | "error"
  | "warning"
  | "running"
  | "idle";

const colorMap: Record<IconColorToken, string> = {
  ink: colors.ink,
  body: colors.body,
  muted: colors.muted,
  disabled: colors.disabled,
  onAccent: colors.onAccent,
  accent: colors.accent.default,
  accentBright: colors.accent.bright,
  accentPressed: colors.accent.pressed,
  success: colors.status.success,
  error: colors.status.error,
  warning: colors.status.warning,
  running: colors.status.running,
  idle: colors.status.idle,
};

export interface IconProps {
  icon: LucideIcon;
  size?: IconSizeToken;
  color?: IconColorToken;
  strokeWidth?: number;
  accessibilityLabel?: string;
  testID?: string;
}

export function Icon({
  icon: LucideIconComponent,
  size = "md",
  color = "body",
  strokeWidth = iconStroke,
  accessibilityLabel,
  testID,
}: IconProps) {
  const sizePx = iconSizes[size];
  const colorValue = colorMap[color];

  return (
    <LucideIconComponent
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessible={true}
      size={sizePx}
      color={colorValue}
      strokeWidth={strokeWidth}
    />
  );
}
