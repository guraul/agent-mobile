import React, { useState } from "react";
import { Pressable, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { radius, motion, iconStroke } from "../../theme";
import { Icon, type IconColorToken } from "./Icon";

const PRESSED_BACKGROUND = "rgba(255, 255, 255, 0.08)";

export interface IconButtonProps {
  icon: LucideIcon;
  onPress?: () => void;
  disabled?: boolean;
  color?: IconColorToken;
  accessibilityLabel: string;
  testID?: string;
}

export function IconButton({
  icon,
  onPress,
  disabled = false,
  color = "body",
  accessibilityLabel,
  testID,
}: IconButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const backgroundColor = isPressed && !disabled
    ? PRESSED_BACKGROUND
    : "transparent";

  const iconColor: IconColorToken = disabled ? "disabled" : color;

  const containerStyle: ViewStyle = {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor,
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed && !disabled && { transform: [{ scale: motion.scale.pressed }] },
      ]}
    >
      <Icon
        icon={icon}
        size="md"
        color={iconColor}
        strokeWidth={iconStroke}
      />
    </Pressable>
  );
}
