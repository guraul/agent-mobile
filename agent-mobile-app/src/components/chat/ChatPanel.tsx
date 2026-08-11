import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Send, Square } from "lucide-react-native";
import { Text, Box, Button } from "../index";
import { colors, spacing, radius, iconStroke } from "../../theme";
import {
  opencodeClient,
  type OpenCodeMessage,
  type OpenCodePart,
} from "../../services/opencode-client";
import { subscribeToOpenCodeEvents } from "../../services/opencode-events";
import {
  applyMessageUpdated,
  applyPartUpdated,
  applyMessageRemoved,
} from "../../services/message-reducer";
import { MessageBubble } from "./MessageBubble";

interface ChatPanelProps {
  sessionID: string;
}

export function ChatPanel({ sessionID }: ChatPanelProps) {
  const [messages, setMessages] = useState<OpenCodeMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<OpenCodeMessage>>(null);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const list = await opencodeClient.listMessages(sessionID);
      setMessages(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sessionID]);

  useEffect(() => {
    loadMessages();
    const unsub = subscribeToOpenCodeEvents((event) => {
      if (event.type === "message.updated") {
        const props = event.properties as {
          sessionID?: string;
          info?: { id: string; role: "user" | "assistant"; time?: { created?: number }; sessionID?: string };
        };
        if (props.sessionID === sessionID && props.info) {
          const info = props.info;
          setMessages((prev) => applyMessageUpdated(prev, info));
        }
      } else if (event.type === "message.part.updated") {
        const props = event.properties as { sessionID?: string; part?: OpenCodePart };
        if (props.sessionID === sessionID && props.part) {
          const part = props.part;
          setMessages((prev) => applyPartUpdated(prev, part));
        }
      } else if (event.type === "message.removed") {
        const props = event.properties as { sessionID?: string; messageID?: string };
        if (props.sessionID === sessionID && props.messageID) {
          const messageID = props.messageID;
          setMessages((prev) => applyMessageRemoved(prev, messageID));
        }
      }
    });
    return unsub;
  }, [sessionID, loadMessages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setError(null);
    try {
      await opencodeClient.sendMessageAsync(sessionID, {
        parts: [{ type: "text", text }],
      });
      await loadMessages();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSending(false);
    }
  };

  const abort = async () => {
    try {
      await opencodeClient.abort(sessionID);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) {
    return (
      <Box padding="lg">
        <Text variant="body" color="muted">Loading messages…</Text>
      </Box>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {error ? (
        <Box padding="sm" backgroundColor="surface.1" rounded="md" margin="sm">
          <Text variant="caption" color="error">{error}</Text>
        </Box>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.info.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.listContent}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        style={styles.list}
      />

      <Box padding="sm" style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message opencode…"
          placeholderTextColor={colors.disabled}
          multiline
        />
        {sending ? (
          <Pressable onPress={abort} style={styles.sendBtn} accessibilityLabel="Stop">
            <Square color={colors.onAccent} size={20} strokeWidth={iconStroke} />
          </Pressable>
        ) : (
          <Pressable
            onPress={send}
            disabled={!input.trim()}
            style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
            accessibilityLabel="Send"
          >
            <Send color={colors.onAccent} size={20} strokeWidth={iconStroke} />
          </Pressable>
        )}
      </Box>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { flex: 1 },
  listContent: { padding: spacing.md, paddingBottom: spacing.lg },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: colors.surface[1],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: 15,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent.default,
    alignItems: "center",
    justifyContent: "center",
  },
});
