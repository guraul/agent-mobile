import React from "react";
import { View, ScrollView } from "react-native";
import Markdown from "react-native-markdown-display";
import { Text, Box } from "../index";
import { colors, radius } from "../../theme";
import type { DisplayStep } from "../../services/message-merging";
import { StepChip } from "./StepChip";

const userMarkdown = {
  body: { color: colors.onAccent, fontSize: 15, lineHeight: 22 },
  code_inline: { color: colors.onAccent, backgroundColor: "rgba(255,255,255,0.2)", padding: 0, lineHeight: 22 },
  paragraph: { marginVertical: 4 },
};

const aiMarkdown = {
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  heading1: { color: colors.ink, fontSize: 18, fontWeight: "700" as const },
  heading2: { color: colors.ink, fontSize: 16, fontWeight: "700" as const },
  heading3: { color: colors.ink, fontSize: 15, fontWeight: "700" as const },
  code_inline: { color: colors.accent.bright, backgroundColor: colors.surface[1], padding: 0, borderRadius: 3, lineHeight: 22 },
  fence: { color: colors.ink, backgroundColor: colors.surface[1], padding: 8, borderRadius: 6 },
  code_block: { color: colors.ink, backgroundColor: colors.surface[1] },
  link: { color: colors.accent.bright },
  paragraph: { marginVertical: 4 },
  bullet_list_icon: { color: colors.muted },
};

export function MessageBubble({ step }: { step: DisplayStep }) {
  if (step.kind === "step-start" || step.kind === "reasoning" || step.kind === "tool" || step.kind === "step-finish") {
    return <StepChip step={step} />;
  }

  if (step.kind === "user") {
    return (
      <Box marginBottom="sm" style={{ alignItems: "flex-end" }}>
        <Box padding="sm" rounded="md" style={{ maxWidth: "92%", backgroundColor: colors.accent.default, borderBottomRightRadius: radius.xs }}>
          <Markdown style={userMarkdown}>{step.text}</Markdown>
        </Box>
      </Box>
    );
  }

  return (
    <Box marginBottom="sm" style={{ alignItems: "flex-start" }}>
      <Box marginLeft="xxs" marginBottom="xxs">
        <Text variant="captionStrong" color="accent">Pulse</Text>
      </Box>
      <Box padding="sm" rounded="md" style={{ maxWidth: "92%", backgroundColor: colors.surface[2], borderBottomLeftRadius: radius.xs }}>
        <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
          <Markdown style={aiMarkdown}>{step.text}</Markdown>
        </ScrollView>
      </Box>
    </Box>
  );
}
