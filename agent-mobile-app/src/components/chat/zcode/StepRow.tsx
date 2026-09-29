import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Brain, ChevronDown, ChevronRight, Loader, Terminal } from "lucide-react-native";
import { Text } from "../../index";
import { lightColors, lightSpacing } from "../../../theme";
import type { DisplayStep } from "../../../services/message-merging";

type ProcessStep = Extract<DisplayStep, { kind: "reasoning" } | { kind: "tool" }>;

// ZCode 风格可折叠步骤行（浅色，#29）：折叠态 = 图标 + 标签（工具附带命令摘要）+ 状态；
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
        {running ? (
          <Loader color={lightColors.amber} size={12} strokeWidth={2} />
        ) : (
          <IdleIcon color={lightColors.grayText} size={12} strokeWidth={2} />
        )}
        <View style={s.label}>
          <Text variant="lightCaption" color={running ? "lightAmberDeep" : "lightGray"} numberOfLines={1}>
            {label}
            {step.kind === "tool" && step.inputSummary ? ` · ${step.inputSummary}` : ""}
          </Text>
        </View>
        {running ? (
          <Text variant="lightCaption" color="lightGray">进行中</Text>
        ) : expandable ? (
          open ? (
            <ChevronDown color={lightColors.grayText} size={12} strokeWidth={2} />
          ) : (
            <ChevronRight color={lightColors.grayText} size={12} strokeWidth={2} />
          )
        ) : null}
      </Pressable>
      {open && detail ? (
        <View style={s.detail}>
          <Text variant={step.kind === "tool" ? "monoCaption" : "lightCaption"} color="lightScheduleMeta">{detail}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: lightSpacing.cardGap / 4, paddingVertical: 4 },
  label: { flex: 1 },
  detail: {
    backgroundColor: lightColors.rowGray,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
});
