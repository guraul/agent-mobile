import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Brain, ChevronDown, ChevronRight, Loader, Terminal } from "lucide-react-native";
import { Text, Icon } from "../../index";
import { colors, spacing } from "../../../theme";
import type { DisplayStep } from "../../../services/message-merging";

type ProcessStep = Extract<DisplayStep, { kind: "reasoning" } | { kind: "tool" }>;

// ZCode 风格可折叠步骤行：折叠态 = 图标 + 标签（工具附带命令摘要）+ 状态；
// 展开态 = reasoning 正文 / 工具入参摘要（mono）。真实时长不做（数据无结束时间戳）。
export function StepRow({ step }: { step: ProcessStep }) {
  const [open, setOpen] = useState(false);
  const running = step.kind === "tool" && (step.status === "running" || step.status === "pending");
  const detail = step.kind === "reasoning" ? step.text || undefined : step.inputSummary;
  const label = step.kind === "reasoning" ? "思考" : step.tool;
  const IdleIcon = step.kind === "reasoning" ? Brain : Terminal;
  const expandable = Boolean(detail) && !running;

  return (
    <View style={s.wrap}>
      <Pressable
        onPress={() => expandable && setOpen((o) => !o)}
        style={s.row}
        accessibilityLabel={`步骤 ${label}`}
        accessibilityRole={expandable ? "button" : undefined}
      >
        <Icon icon={running ? Loader : IdleIcon} size="xs" color={running ? "accent" : "muted"} />
        <View style={s.label}>
          <Text variant="caption" color={running ? "body" : "muted"} numberOfLines={1}>
            {label}
            {step.kind === "tool" && step.inputSummary ? ` · ${step.inputSummary}` : ""}
          </Text>
        </View>
        {running ? (
          <Text variant="caption" color="muted">进行中</Text>
        ) : expandable ? (
          <Icon icon={open ? ChevronDown : ChevronRight} size="xs" color="muted" />
        ) : null}
      </Pressable>
      {open && detail ? (
        <View style={s.detail}>
          <Text variant={step.kind === "tool" ? "monoCaption" : "caption"} color="muted">{detail}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: spacing.xxs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xxs },
  label: { flex: 1 },
  detail: {
    backgroundColor: colors.surface[1],
    borderRadius: 8,
    padding: spacing.sm,
    marginTop: spacing.xxs,
  },
});
