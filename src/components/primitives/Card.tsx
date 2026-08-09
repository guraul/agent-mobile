import React, { useState } from "react";
import { Pressable, type ViewProps, type ViewStyle } from "react-native";
import { colors, spacing, radius, motion } from "../../theme";

export type CardPadding = "md" | "lg";

export interface CardProps extends ViewProps {
  padding?: CardPadding;
  selected?: boolean;
  onPress?: () => void;
  testID?: string;
  children?: React.ReactNode;
}

export function Card({
  padding = "md",
  selected = false,
  onPress,
  testID,
  children,
  style,
  ...rest
}: CardProps) {
  const [isPressed, setIsPressed] = useState(false);

  const padValue = padding === "md" ? spacing.md : spacing.lg;

  const backgroundColor = (() => {
    if (isPressed || selected) return colors.surface[2];
    return colors.surface[1];
  })();

  const borderColor = (() => {
    if (selected) return colors.border.strong;
    return colors.border.default;
  })();

  const baseStyle: ViewStyle = {
    backgroundColor,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor,
    padding: padValue,
  };

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPressIn={() => setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          pressed && { transform: [{ scale: motion.scale.pressed }] },
          style,
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <Pressable testID={testID} style={[baseStyle, style]} {...rest}>
      {children}
    </Pressable>
  );
}
