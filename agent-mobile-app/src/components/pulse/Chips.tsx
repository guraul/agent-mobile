import React from "react";
import { Pressable } from "react-native";
import { Text } from "../primitives/Text";
import { colors, motion, radius, spacing } from "../../theme";

/**
 * ActionChip — the signature "AI is asking you to look" affordance.
 * Quiet bordered pill (accentBorder + accentBright label), never a filled button.
 */
export function ActionChip({
  label,
  onPress,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => ({
        borderWidth: 1,
        borderColor: colors.accentBorder,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 5,
        opacity: disabled ? 0.4 : 1,
        ...(pressed ? { transform: [{ scale: motion.scale.pressed }] } : null),
      })}
    >
      <Text variant="captionStrong" color="accentBright">
        {label}
      </Text>
    </Pressable>
  );
}

/** QuietAction — text action with no container (Discuss / Dismiss / Defer are NOT it). */
export function QuietAction({
  label,
  onPress,
  danger = false,
  disabled = false,
  testID,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => ({
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
      })}
    >
      <Text variant="captionStrong" color={danger ? "error" : "muted"}>
        {label}
      </Text>
    </Pressable>
  );
}
