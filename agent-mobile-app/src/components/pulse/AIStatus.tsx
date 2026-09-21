import React from "react";
import { Text } from "../primitives/Text";
import type { OrbState } from "./AIOrb";

/**
 * AIStatus — the one presence caption syntax: "● STATE".
 * 12px / +0.6 tracking / uppercase, one style everywhere (Showcase2 §7).
 */
export function AIStatus({ state, testID }: { state: OrbState; testID?: string }) {
  const label = state === "needs-you" ? "NEEDS YOU" : state.toUpperCase();
  const color = state === "offline" ? "muted" : state === "needs-you" ? "running" : "accentBright";

  return (
    <Text
      variant="label"
      color={color}
      testID={testID}
      accessibilityLabel={`Pulse status: ${label}`}
    >
      {`● ${label}`}
    </Text>
  );
}
