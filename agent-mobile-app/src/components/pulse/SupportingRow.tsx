import React from "react";
import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { ActionChip, QuietAction } from "./Chips";
import { colors, spacing } from "../../theme";

export type SupportingKind = "needs-you" | "suggested" | "running" | "market";

const DOT_COLOR: Record<SupportingKind, string> = {
  "needs-you": colors.status.running,
  suggested: colors.accent.default,
  running: colors.accent.bright,
  market: "#6B7BB8",
};

/**
 * SupportingRow — one light row in the single continuous Supporting region.
 * Category is communicated at row level (micro-label only on the first row
 * of a category + dot color + action naming), never as a section header.
 */
export function SupportingRow({
  kind,
  label,
  statement,
  meta,
  actionLabel,
  onAction,
  quietActionLabel,
  onQuietAction,
  onPress,
  testID,
}: {
  kind: SupportingKind;
  label?: string;
  statement: string;
  meta?: string | string[];
  actionLabel?: string;
  onAction?: () => void;
  quietActionLabel?: string;
  onQuietAction?: () => void;
  onPress?: () => void;
  testID?: string;
}) {
  return (
    <View testID={testID} style={{ paddingHorizontal: spacing.lg, gap: 2 }}>
      {label ? (
        <Text variant="label" color="muted" testID={testID ? `${testID}-label` : undefined}>
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm }}>
        <Pressable
          onPress={onPress}
          disabled={!onPress}
          accessibilityRole={onPress ? "button" : undefined}
          accessibilityLabel={statement}
          testID={testID ? `${testID}-body` : undefined}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "flex-start",
            gap: spacing.sm,
            paddingVertical: 6,
            opacity: pressed && onPress ? 0.6 : 1,
          })}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: DOT_COLOR[kind],
              marginTop: 7,
            }}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <Text variant="body" color="body">
              {statement}
            </Text>
            {meta ? (
              <View style={{ gap: 1 }}>
                {(Array.isArray(meta) ? meta : [meta]).map((line, i) => (
                  <Text key={i} variant="caption" color="muted">
                    {line}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </Pressable>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingTop: 6 }}>
          {actionLabel && onAction ? (
            <ActionChip
              label={actionLabel}
              onPress={onAction}
              testID={testID ? `${testID}-action` : undefined}
            />
          ) : null}
          {quietActionLabel && onQuietAction ? (
            <QuietAction
              label={quietActionLabel}
              onPress={onQuietAction}
              testID={testID ? `${testID}-quiet` : undefined}
            />
          ) : null}
          {onPress && !actionLabel && !quietActionLabel ? (
            <Icon icon={ChevronRight} size="xs" color="muted" />
          ) : null}
        </View>
      </View>
    </View>
  );
}
