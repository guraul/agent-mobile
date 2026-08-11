import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Mic, Send, Square } from "lucide-react-native";
import { Text, Box } from "../index";
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
import { mergeMessages, type DisplayMessage } from "../../services/message-merging";
import { MessageBubble } from "./MessageBubble";

const PAGE_SIZE = 50;
// keep a bounded window in memory: SSE events keep appending to the list loaded
// by loadMessages; trimming the head keeps the list from growing unbounded
// while preserving the most recent messages (matches the PAGE_SIZE reload window).
const MAX_MESSAGES = PAGE_SIZE * 2;

interface ChatPanelProps {
  sessionID: string;
}

export function ChatPanel({ sessionID }: ChatPanelProps) {
  const [messages, setMessages] = useState<OpenCodeMessage[]>([]);
  const [display, setDisplay] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList<DisplayMessage>>(null);
  // stick to bottom when user is near the bottom; pause when they scroll up
  const stickToBottom = useRef(true);

  // Recompute display messages whenever raw messages change.
  // listMessages returns chronological (oldest first); sort by creation time so
  // streaming updates land in the right spot regardless of API ordering, then
  // merge assistant steps into single turns.
  const recomputeDisplay = useCallback((raw: OpenCodeMessage[]) => {
    const chronological = [...raw].sort(
      (a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0),
    );
    setDisplay(mergeMessages(chronological));
  }, []);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      // fetch only the most recent messages; pull-to-refresh reloads for new ones
      const list = await opencodeClient.listMessages(sessionID, { limit: PAGE_SIZE });
      setMessages(list);
      recomputeDisplay(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sessionID, recomputeDisplay]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const list = await opencodeClient.listMessages(sessionID, { limit: PAGE_SIZE });
      setMessages(list);
      recomputeDisplay(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setRefreshing(false);
    }
  }, [sessionID, recomputeDisplay]);

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
          setMessages((prev) => {
            const next = applyMessageUpdated(prev, info);
            recomputeDisplay(next);
            return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
          });
        }
      } else if (event.type === "message.part.updated") {
        const props = event.properties as { sessionID?: string; part?: OpenCodePart };
        if (props.sessionID === sessionID && props.part) {
          const part = props.part;
          setMessages((prev) => {
            const next = applyPartUpdated(prev, part);
            recomputeDisplay(next);
            return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
          });
        }
      } else if (event.type === "message.removed") {
        const props = event.properties as { sessionID?: string; messageID?: string };
        if (props.sessionID === sessionID && props.messageID) {
          const messageID = props.messageID;
          setMessages((prev) => {
            const next = applyMessageRemoved(prev, messageID);
            recomputeDisplay(next);
            return next;
          });
        }
      }
    });
    return unsub;
  }, [sessionID, loadMessages, recomputeDisplay]);

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
      stickToBottom.current = true;
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

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);
    // near bottom => stick; scrolled up => pause autoscroll
    stickToBottom.current = distanceFromBottom < 80;
  };

  const handleContentSizeChange = () => {
    if (stickToBottom.current) {
      listRef.current?.scrollToEnd({ animated: true });
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
        data={display}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => <MessageBubble message={item} />}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />
        }
      />

      <View style={styles.inputRow}>
        <Pressable
          onPress={() => alert("Voice input")}
          accessibilityLabel="Voice input"
          accessibilityRole="button"
          style={styles.voiceBtn}
        >
          <Mic color={colors.body} size={20} strokeWidth={iconStroke} />
        </Pressable>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message Pulse…"
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
      </View>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.canvas,
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
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
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
