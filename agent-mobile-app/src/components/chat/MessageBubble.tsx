import React from "react";
import { View } from "react-native";
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

export const MessageBubble = React.memo(function MessageBubble({ step }: { step: DisplayStep }) {
  if (step.kind === "reasoning" || step.kind === "tool") {
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

  if (step.kind === "error") {
    return (
      <Box marginBottom="sm" style={{ alignItems: "flex-start" }}>
        <Box marginLeft="xxs" marginBottom="xxs">
          <Text variant="captionStrong" color="error">Pulse · 出错了</Text>
        </Box>
        <Box padding="sm" rounded="md" style={{ maxWidth: "92%", backgroundColor: colors.surface[2], borderLeftWidth: 3, borderLeftColor: colors.status.error }}>
          <Text variant="body" color="error">{step.text}</Text>
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
        {/* No fixed-height scroll container here: the typewriter reveals the
            text character by character, so the bubble must grow with the text
            (like a messaging app). A fixed maxHeight would pin the bubble and
            scroll inside it, hiding the typing growth. */}
        <Markdown style={aiMarkdown}>{step.text}</Markdown>
      </Box>
    </Box>
  );
});
