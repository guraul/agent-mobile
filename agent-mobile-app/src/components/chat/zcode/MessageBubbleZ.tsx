import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import Markdown from "react-native-markdown-display";
import { Check, Copy } from "lucide-react-native";
import { Text, Box, Icon } from "../../index";
import { colors, radius, spacing } from "../../../theme";
import type { DisplayStep } from "../../../services/message-merging";
import { StepRow } from "./StepRow";

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

// 气泡下操作行：复制（1.5s Check 反馈）+ HH:mm 时间戳。复制 step.text 全文，
// 不受打字机 slice 影响（slice 只发生在 ChatPanelZ 的展示层）。
function Actions({ text, createdAt, align }: { text: string; createdAt: number; align: "left" | "right" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* 剪贴板失败静默 */ }
  };
  const time = new Date(createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={[s.actions, align === "right" && s.actionsRight]}>
      <Pressable onPress={copy} accessibilityLabel="复制消息" style={s.actionBtn} hitSlop={6}>
        <Icon icon={copied ? Check : Copy} size="xs" color={copied ? "success" : "muted"} />
      </Pressable>
      <Text variant="caption" color="muted">{time}</Text>
    </View>
  );
}

export const MessageBubbleZ = React.memo(function MessageBubbleZ({ step }: { step: DisplayStep }) {
  if (step.kind === "reasoning" || step.kind === "tool") {
    return <StepRow step={step} />;
  }

  if (step.kind === "user") {
    return (
      <Box marginBottom="xs" style={{ alignItems: "flex-end" }}>
        <Box padding="sm" rounded="md" style={{ maxWidth: "92%", backgroundColor: colors.accent.default, borderBottomRightRadius: radius.xs }}>
          <Markdown style={userMarkdown}>{step.text}</Markdown>
        </Box>
        <Actions text={step.text} createdAt={step.createdAt} align="right" />
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
    <Box marginBottom="xs" style={{ alignItems: "flex-start" }}>
      <Box marginLeft="xxs" marginBottom="xxs">
        <Text variant="captionStrong" color="accent">Pulse</Text>
      </Box>
      <Box padding="sm" rounded="md" style={{ maxWidth: "92%", backgroundColor: colors.surface[2], borderBottomLeftRadius: radius.xs }}>
        {/* No fixed-height scroll container here: the typewriter reveals the
            text character by character, so the bubble must grow with the text. */}
        <Markdown style={aiMarkdown}>{step.text}</Markdown>
      </Box>
      <Actions text={step.text} createdAt={step.createdAt} align="left" />
    </Box>
  );
});

const s = StyleSheet.create({
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xxs, paddingHorizontal: spacing.xs },
  actionsRight: { justifyContent: "flex-end" },
  actionBtn: { padding: 2 },
});
