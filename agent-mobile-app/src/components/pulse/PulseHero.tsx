import React from "react";
import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { spacing } from "../../theme";

/**
 * PulseHero — greeting (large, two lines when the greeting has a comma),
 * the AI companion line, and the Responsibilities presence line.
 * The presence line exists only when active assignments > 0 and navigates
 * to /assignments; it never renders assignment rows on Pulse.
 */
export function PulseHero({
  greeting,
  aiLine,
  watchingCount,
  onWatchingPress,
  testID = "pulse-hero",
}: {
  greeting: string;
  aiLine: string;
  watchingCount: number;
  onWatchingPress: () => void;
  testID?: string;
}) {
  const comma = greeting.indexOf(",");
  const line1 = comma > 0 ? greeting.slice(0, comma + 1) : greeting;
  const line2 = comma > 0 ? greeting.slice(comma + 1).trim() : "";

  return (
    <View testID={testID} style={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}>
      <View>
        <Text variant="hero" color="ink">
          {line1}
        </Text>
        {line2 ? (
          <Text variant="hero" color="ink">
            {line2}
          </Text>
        ) : null}
      </View>
      <Text variant="body" color="body" testID={`${testID}-ai-line`}>
        {aiLine}
      </Text>
      {watchingCount > 0 ? (
        <Pressable
          onPress={onWatchingPress}
          accessibilityRole="button"
          accessibilityLabel={`Watching ${watchingCount} things for you`}
          testID="watching-line"
          hitSlop={8}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text variant="caption" color="muted">
            {`Watching ${watchingCount} thing${watchingCount === 1 ? "" : "s"} for you`}
          </Text>
          <Icon icon={ChevronRight} size="xs" color="muted" />
        </Pressable>
      ) : null}
    </View>
  );
}
