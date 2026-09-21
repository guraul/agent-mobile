import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import Markdown from "react-native-markdown-display";
import { Check, Copy } from "lucide-react-native";
import { Text, Box, Icon } from "../../index";
import { colors, radius, spacing } from "../../../theme";
import type { DisplayStep } from "../../../services/message-merging";
import { StepRow } from "./StepRow";
import { AIOrb } from "../../pulse/AIOrb";

// User message: subtle violet bubble (accentSoft), no border.
const userMarkdown = {
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  code_inline: { color: colors.ink, backgroundColor: "rgba(255,255,255,0.12)", padding: 0, lineHeight: 22 },
  paragraph: { marginVertical: 0 },
};

// AI message: plain text, no bubble — the voice, not a chat widget.
const aiMarkdown = {
  body: { color: "#B4AECB", fontSize: 15, lineHeight: 24 },
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
      <View style={[s.actions, align === "right" ? s.actionsRight : s.actionsLeft]}>
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

  // User: right-aligned subtle violet bubble.
  if (step.kind === "user") {
    return (
      <Box marginBottom="xs" style={{ alignItems: "flex-end" }}>
        <Box paddingHorizontal="lg" paddingVertical="md" style={{ minWidth: 40, maxWidth: "80%", marginLeft: 20, backgroundColor: "rgba(139,92,246,0.15)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(167,139,250,0.28)" }}>
          <Markdown style={userMarkdown}>{step.text}</Markdown>
        </Box>
        <Actions text={step.text} createdAt={step.createdAt} align="right" />
      </Box>
    );
  }

  // Error / system intervention: semantic pill, never dressed as normal conversation.
  if (step.kind === "error") {
    return (
      <Box marginBottom="sm" style={{ alignItems: "flex-start" }}>
        <Box padding="sm" rounded="md" style={{ maxWidth: "92%", backgroundColor: colors.surface[2], borderLeftWidth: 3, borderLeftColor: colors.status.error }}>
          <Text variant="body" color="error">{step.text}</Text>
        </Box>
      </Box>
    );
  }

  // AI: plain text, no bubble — orb avatar + indent (showcase2 ConversationMessage).
  return (
    <Box marginBottom="xs" style={{ alignItems: "flex-start" }}>
      <Box style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, paddingLeft: 4, maxWidth: "94%" }}>
      <View style={{ marginTop: 2 }}>
        <AIOrb state="attentive" size="dot" />
      </View>
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* No fixed-height scroll container here: the typewriter reveals the
            text character by character, so the block must grow with the text. */}
        <Markdown style={aiMarkdown}>{step.text}</Markdown>
      </Box>
      </Box>
      <Actions text={step.text} createdAt={step.createdAt} align="left" />
    </Box>
  );
});

const s = StyleSheet.create({
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xxs, paddingHorizontal: 0 },
  // 用户气泡（右对齐）：复制+时间整体贴气泡右边缘，跟气泡本体对齐
  actionsRight: { alignSelf: "flex-end", paddingRight: spacing.xs },
  // AI 纯文本（左对齐）：与文本缩进对齐
  actionsLeft: { alignSelf: "flex-start", paddingLeft: spacing.sm },
  actionBtn: { padding: 2 },
});
