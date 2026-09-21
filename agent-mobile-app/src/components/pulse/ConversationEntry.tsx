import React, { useState } from "react";
import { Pressable, View } from "react-native";
import { MessageCircle, Plus } from "lucide-react-native";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { colors, motion, radius, spacing } from "../../theme";

/**
 * ConversationEntry — Pulse bottom dock (Showcase2 §11 / §12).
 * NOT a TextInput and NOT a Send: the whole capsule is a Pressable that
 * pushes Talk, where the real composer lives. Pulse never sends a message.
 */
export function ConversationEntry({
  onPress,
  testID = "conversation-entry",
}: {
  onPress: () => void;
  testID?: string;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Talk to Pulse"
        testID={testID}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        onPress={onPress}
        style={{
          flex: 1,
          height: 52,
          borderRadius: radius.pill,
          backgroundColor: pressed ? colors.surface[3] : colors.surface[2],
          borderWidth: 1,
          borderColor: colors.border.subtle,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
        }}
      >
        <Icon icon={Plus} size="sm" color="muted" />
        <Text variant="button" color="muted">
          Talk to Pulse…
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Enter Talk"
        testID={`${testID}-enter`}
        onPress={onPress}
        style={({ pressed: p }) => ({
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: p ? colors.accent.pressed : colors.accent.default,
          alignItems: "center",
          justifyContent: "center",
          ...(p ? { transform: [{ scale: motion.scale.pressed }] } : null),
        })}
      >
        <Icon icon={MessageCircle} size="md" color="onAccent" />
      </Pressable>
    </View>
  );
}
