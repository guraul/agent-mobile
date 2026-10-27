import React from "react";
import { View } from "react-native";
import { Loader, Wrench } from "lucide-react-native";
import { Text } from "../index";
import { colors, spacing } from "../../theme";
import type { DisplayStep } from "../../services/message-merging";
import { t, useLocale } from "../../i18n";

type ProcessStep = Extract<DisplayStep,
  { kind: "reasoning" } | { kind: "tool" } | { kind: "toolGroup" }>;

function label(step: ProcessStep): string {
  switch (step.kind) {
    case "reasoning": return t("chat.think.pending");
    case "tool": return t("chat.tools.running", { tool: step.tool });
    case "toolGroup": return t("chat.tools.runningMany", { n: step.tools.length });
  }
}

function icon(step: ProcessStep) {
  const size = 12;
  const color = colors.muted;
  switch (step.kind) {
    case "reasoning": return <Loader color={color} size={size} strokeWidth={2} />;
    case "tool": return <Wrench color={color} size={size} strokeWidth={2} />;
    case "toolGroup": return <Wrench color={color} size={size} strokeWidth={2} />;
  }
}

export function StepChip({ step }: { step: ProcessStep }) {
  useLocale();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xxs }}>
      {icon(step)}
      <Text variant="caption" color="muted">{label(step)}</Text>
    </View>
  );
}
