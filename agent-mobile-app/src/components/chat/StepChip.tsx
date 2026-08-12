import React from "react";
import { View } from "react-native";
import { Loader, Check, Wrench } from "lucide-react-native";
import { Text } from "../index";
import { colors, spacing } from "../../theme";
import type { DisplayStep } from "../../services/message-merging";

type ProcessStep = Extract<DisplayStep,
  { kind: "step-start" } | { kind: "reasoning" } | { kind: "tool" } | { kind: "step-finish" }>;

function label(step: ProcessStep): string {
  switch (step.kind) {
    case "step-start": return "开始执行…";
    case "reasoning": return "思考中…";
    case "tool": return `工具(${step.tool})调用中…`;
    case "step-finish": return "完成";
  }
}

function icon(step: ProcessStep) {
  const size = 12;
  const color = colors.muted;
  switch (step.kind) {
    case "step-start": return <Wrench color={color} size={size} strokeWidth={2} />;
    case "reasoning": return <Loader color={color} size={size} strokeWidth={2} />;
    case "tool": return <Wrench color={color} size={size} strokeWidth={2} />;
    case "step-finish": return <Check color={colors.status.success} size={size} strokeWidth={2} />;
  }
}

export function StepChip({ step }: { step: ProcessStep }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xxs }}>
      {icon(step)}
      <Text variant="caption" color="muted">{label(step)}</Text>
    </View>
  );
}
