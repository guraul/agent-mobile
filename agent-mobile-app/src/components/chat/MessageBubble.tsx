import React, { useState } from "react";
import { View, Pressable, ScrollView } from "react-native";
import Markdown from "react-native-markdown-display";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { Text, Box } from "../index";
import { colors, spacing, radius } from "../../theme";
import type { DisplayMessage, ToolCallSummary } from "../../services/message-merging";

function ToolRow({ tool }: { tool: ToolCallSummary }) {
  const done = tool.status === "completed";
  return (
    <View style={styles.toolRow}>
      <View style={[styles.toolDot, done ? styles.toolDotDone : styles.toolDotRunning]} />
      <Box style={styles.toolText}>
        <Text variant="caption" color="muted" numberOfLines={1}>
          {tool.tool} · {tool.status}
        </Text>
      </Box>
    </View>
  );
}

function ToolSummary({ tools }: { tools: ToolCallSummary[] }) {
  const [open, setOpen] = useState(false);
  if (tools.length === 0) return null;
  const shown = open ? tools : tools.slice(0, 3);
  return (
    <View style={styles.toolWrap}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.toolToggle} accessibilityRole="button">
        {open ? (
          <ChevronDown color={colors.muted} size={12} strokeWidth={2} />
        ) : (
          <ChevronRight color={colors.muted} size={12} strokeWidth={2} />
        )}
        <Text variant="caption" color="muted">
          {tools.length} tool call{tools.length > 1 ? "s" : ""}
        </Text>
      </Pressable>
      {open &&
        shown.map((t, i) => (
          <ToolRow key={i} tool={t} />
        ))}
    </View>
  );
}

export function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";

  return (
    <Box marginBottom="sm" style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
      {!isUser ? (
        <Box marginLeft="xxs" marginBottom="xxs">
          <Text variant="captionStrong" color="accent">Pulse</Text>
        </Box>
      ) : null}
      <Box
        padding="sm"
        rounded="md"
        style={{
          maxWidth: "92%",
          backgroundColor: isUser ? colors.accent.default : colors.surface[2],
          borderBottomRightRadius: isUser ? radius.xs : radius.md,
          borderBottomLeftRadius: isUser ? radius.md : radius.xs,
        }}
      >
        {message.text ? (
          <ScrollView style={styles.markdownScroll} nestedScrollEnabled>
            <Markdown
              style={{
                body: { color: isUser ? colors.onAccent : colors.ink, fontSize: 15, lineHeight: 22 },
                heading1: { color: isUser ? colors.onAccent : colors.ink, fontSize: 18, fontWeight: "700" },
                heading2: { color: isUser ? colors.onAccent : colors.ink, fontSize: 16, fontWeight: "700" },
                heading3: { color: isUser ? colors.onAccent : colors.ink, fontSize: 15, fontWeight: "700" },
                code_inline: {
                  color: isUser ? colors.onAccent : colors.accent.bright,
                  backgroundColor: isUser ? "rgba(255,255,255,0.2)" : colors.surface[1],
                },
                fence: {
                  color: colors.ink,
                  backgroundColor: colors.surface[1],
                  padding: 8,
                  borderRadius: 6,
                },
                code_block: { color: colors.ink, backgroundColor: colors.surface[1] },
                link: { color: isUser ? colors.onAccent : colors.accent.bright },
                paragraph: { marginVertical: 4 },
                bullet_list_icon: { color: isUser ? colors.onAccent : colors.muted },
              }}
            >
              {message.text}
            </Markdown>
          </ScrollView>
        ) : null}
        {!isUser && message.tools.length > 0 && <ToolSummary tools={message.tools} />}
        {!isUser && !message.text && message.tools.length === 0 ? (
          <Text variant="body" color="muted">…</Text>
        ) : null}
      </Box>
    </Box>
  );
}

const styles = {
  markdownScroll: { maxHeight: 400 },
  toolWrap: {
    marginTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    paddingTop: spacing.xxs,
    gap: spacing.xxs,
  },
  toolToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  toolRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 1,
  },
  toolDot: { width: 6, height: 6, borderRadius: 3 },
  toolDotDone: { backgroundColor: colors.status.success },
  toolDotRunning: { backgroundColor: colors.accent.default },
  toolText: { flex: 1 },
} as const;
