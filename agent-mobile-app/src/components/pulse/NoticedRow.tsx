import React from "react";
import { Pressable, View } from "react-native";
import { Text } from "../primitives/Text";
import { spacing } from "../../theme";

/**
 * NoticedRow — informational L1 observation, lowest visual weight.
 * Borderless typographic row: tiny dot + one/two-line fact + relative time.
 * Tap opens a read-only detail sheet (viewing never mutates anything).
 */
export function NoticedRow({
  text,
  time,
  onPress,
  testID,
}: {
  text: string;
  time: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "flex-start",
        gap: spacing.sm,
        paddingVertical: spacing.xs,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: "#6B7BB8",
          marginTop: 7,
        }}
      />
      <View style={{ flex: 1 }}>
        <Text variant="body" color="body" numberOfLines={2}>
          {text}
        </Text>
      </View>
      <Text variant="monoCaption" color="muted">
        {time}
      </Text>
    </Pressable>
  );
}
