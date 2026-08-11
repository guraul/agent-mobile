import React from "react";
import { View, ScrollView } from "react-native";
import Markdown from "react-native-markdown-display";
import { Text, Box } from "../index";
import { colors, spacing, radius } from "../../theme";
import type { OpenCodeMessage, OpenCodePart } from "../../services/opencode-client";

function ToolCallView({ part }: { part: Extract<OpenCodePart, { type: "tool" }> }) {
  const tool = part.tool ?? "tool";
  const status = part.state?.status ?? "running";
  const input = part.input ? JSON.stringify(part.input).slice(0, 200) : "";
  return (
    <Box
      backgroundColor="surface.1"
      padding="sm"
      rounded="md"
      marginBottom="xs"
      style={{ borderWidth: 1, borderColor: colors.border.default }}
    >
      <Text variant="captionStrong" color="accent">
        {tool} · {status}
      </Text>
      {input ? (
        <Text variant="caption" color="muted" numberOfLines={3}>
          {input}
        </Text>
      ) : null}
    </Box>
  );
}

export function MessageBubble({ message }: { message: OpenCodeMessage }) {
  const role = message.info.role;
  const isUser = role === "user";

  const textParts = message.parts.filter(
    (p): p is Extract<OpenCodePart, { type: "text" }> => p.type === "text" && !!p.text,
  );
  const toolParts = message.parts.filter(
    (p): p is Extract<OpenCodePart, { type: "tool" }> => p.type === "tool",
  );

  const body = textParts.map((p) => p.text).join("\n");

  return (
    <Box
      marginBottom="sm"
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: "92%",
      }}
    >
      <Box
        padding="sm"
        rounded="md"
        style={{
          backgroundColor: isUser ? colors.accent.default : colors.surface[2],
          borderBottomRightRadius: isUser ? radius.xs : radius.md,
          borderBottomLeftRadius: isUser ? radius.md : radius.xs,
        }}
      >
        {toolParts.map((tp, i) => (
          <ToolCallView key={i} part={tp} />
        ))}
        {body ? (
          <ScrollView style={{ maxHeight: 400 }} nestedScrollEnabled>
            <Markdown
              style={{
                body: { color: colors.ink, fontSize: 14, lineHeight: 20 },
                heading1: { color: colors.ink, fontSize: 18, fontWeight: "700" },
                heading2: { color: colors.ink, fontSize: 16, fontWeight: "700" },
                heading3: { color: colors.ink, fontSize: 15, fontWeight: "700" },
                code_inline: { color: colors.accent.bright, backgroundColor: colors.surface[1] },
                fence: { color: colors.ink, backgroundColor: colors.surface[1], padding: 8 },
                code_block: { color: colors.ink, backgroundColor: colors.surface[1] },
                link: { color: colors.accent.bright },
                paragraph: { marginVertical: 4 },
                bullet_list_icon: { color: colors.muted },
              }}
            >
              {body}
            </Markdown>
          </ScrollView>
        ) : (
          !isUser && <Text variant="body" color="muted">…</Text>
        )}
      </Box>
    </Box>
  );
}
