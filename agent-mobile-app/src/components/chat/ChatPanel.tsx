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
import { BottomSheet } from "../navigation/BottomSheet";
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
  mergeRecentMessages,
  applyPartDelta,
} from "../../services/message-reducer";
import { mergeMessages, type DisplayStep } from "../../services/message-merging";
import { MessageBubble } from "./MessageBubble";

const PAGE_SIZE = 50;
// keep a bounded window in memory: SSE events keep appending to the list loaded
// by loadMessages; trimming the head keeps the list from growing unbounded
// while preserving the most recent messages (matches the PAGE_SIZE reload window).
const MAX_MESSAGES = PAGE_SIZE * 2;

// primary agents (mode: "primary" in opencode.json) cycled by the agent pill.
// Their configured default models are loaded dynamically from the opencode
// server on mount (listAgents) so model changes on the server take effect on
// the next session open — the models below are only a fallback while loading.
const FALLBACK_AGENTS = [
  { id: "build", model: { providerID: "deepseek", modelID: "deepseek-v4-flash" } },
  { id: "plan", model: { providerID: "deepseek", modelID: "deepseek-v4-flash" } },
  { id: "design", model: { providerID: "deepseek", modelID: "deepseek-v4-flash" } },
] as const;

interface ChatPanelProps {
  sessionID: string;
}

export function ChatPanel({ sessionID }: ChatPanelProps) {
  const [messages, setMessages] = useState<OpenCodeMessage[]>([]);
  const [display, setDisplay] = useState<DisplayStep[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // agent pill cycles PRIMARY_AGENTS; model pill picks from AGENT_MODELS.
  // both are applied per-message via prompt_async (agent/model cannot be
  // mutated on an existing session via the opencode API).
  const [agentIdx, setAgentIdx] = useState(0);
  const [model, setModel] = useState<{ providerID: string; modelID: string }>(FALLBACK_AGENTS[0].model);
  const [agents, setAgents] = useState<{ id: string; model: { providerID: string; modelID: string } }[]>(
    FALLBACK_AGENTS.map((a) => ({ id: a.id, model: { providerID: a.model.providerID, modelID: a.model.modelID } })),
  );
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [modelList, setModelList] = useState<{ providerID: string; modelID: string }[]>([]);
  const listRef = useRef<FlatList<DisplayStep>>(null);
  // stick to bottom when user is near the bottom; pause when they scroll up
  const stickToBottom = useRef(true);
  // during the initial auto-scroll window, ignore onScroll stickToBottom overrides:
  // programmatic scrollToEnd lands mid-list while content is still rendering, which
  // would otherwise flip stickToBottom off and freeze the list short of the latest message.
  const ignoreScrollUntil = useRef(0);

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
      // after initial load, jump to the latest message once the list has laid out.
      // The BottomSheet expand animation grows the list height from 0, so a single
      // scrollToEnd can fire while the list is still 0-height; retry a few times.
      stickToBottom.current = true;
      ignoreScrollUntil.current = Date.now() + 2000;
      for (const delay of [150, 400, 800, 1500]) {
        setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), delay);
      }
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
      } else if (event.type === "delta") {
        const d = event.properties as { sessionID: string; messageID: string; partID: string; field: string; text: string };
        if (d.sessionID === sessionID) {
          setMessages((prev) => {
            const next = applyPartDelta(prev, { messageID: d.messageID, partID: d.partID, field: d.field, text: d.text });
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
    }, undefined, sessionID);
    return unsub;
  }, [sessionID, loadMessages, recomputeDisplay]);

  // Poll-based fallback: the local TUI and this opencode server (4096) are
  // separate instances sharing the DB but not their SSE event streams, so
  // messages created in the TUI never reach our /global/event subscription.
  // Periodically diff the newest messages against the local list and merge:
  // insert unseen messages and catch up parts on messages we already show.
  useEffect(() => {
    let cancelled = false;
    const sync = async () => {
      try {
        const recent = await opencodeClient.listMessages(sessionID, { limit: 10 });
        if (cancelled) return;
        setMessages((prev) => {
          const { messages: merged, changed } = mergeRecentMessages(prev, recent);
          if (changed) {
            recomputeDisplay(merged);
            return merged.length > MAX_MESSAGES ? merged.slice(merged.length - MAX_MESSAGES) : merged;
          }
          return prev;
        });
      } catch {
        // transient network/server hiccup — next tick retries
      }
    };
    sync();
    const timer = setInterval(sync, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [sessionID, recomputeDisplay]);

  // load primary agents' configured models from the opencode server so the
  // agent pill follows server-side agent.model (opencode.json), not a hardcoded copy.
  useEffect(() => {
    let cancelled = false;
    opencodeClient
      .listAgents()
      .then((list) => {
        if (cancelled) return;
        const primary = list.filter((a) => a.mode === "primary" && a.model);
        const known = FALLBACK_AGENTS.filter((f) => primary.some((a) => a.name === f.id));
        if (known.length === 0) return;
        setAgents(
          primary
            .filter((a) => FALLBACK_AGENTS.some((f) => f.id === a.name))
            .map((a) => ({ id: a.name, model: { providerID: a.model!.providerID, modelID: a.model!.modelID } })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // initialize agent/model pills from the session's configured values
  useEffect(() => {
    let cancelled = false;
    opencodeClient
      .getSession(sessionID)
      .then((s) => {
        if (cancelled) return;
        if (s.agent) {
          const idx = agents.findIndex((a) => a.id === s.agent);
          if (idx !== -1) setAgentIdx(idx);
        }
        // Only adopt the session model when it matches one of the primary
        // agents' defaults; stale session models (e.g. from before the model
        // migration) must not pin the chat to an old provider.
        if (
          s.model?.providerID &&
          s.model?.id &&
          agents.some(
            (a) => a.model.providerID === s.model!.providerID && a.model.modelID === s.model!.id,
          )
        ) {
          setModel({ providerID: s.model.providerID, modelID: s.model.id });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionID, agents]);

  // dynamic model list from config/providers; fall back to primary agents' models
  const loadModels = useCallback(() => {
    opencodeClient
      .listProviders()
      .then((data) => {
        const flat: { providerID: string; modelID: string }[] = [];
        for (const p of data.providers) {
          for (const modelID of Object.keys(p.models ?? {})) {
            flat.push({ providerID: p.id, modelID });
          }
        }
        if (flat.length > 0) setModelList(flat);
      })
      .catch(() => {
        setModelList(agents.map((a) => ({ ...a.model })));
      });
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setError(null);
    try {
      await opencodeClient.sendMessageAsync(sessionID, {
        parts: [{ type: "text", text }],
        agent: agents[agentIdx].id,
        model,
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
    if (Date.now() < ignoreScrollUntil.current) return;
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
        keyExtractor={(s) => s.id}
        renderItem={({ item, index }) => {
          const prev = display[index - 1];
          const isTurnStart = !prev || prev.kind === "user" || item.kind === "user";
          return (
            <View style={{ marginTop: isTurnStart ? spacing.md : spacing.xxs }}>
              <MessageBubble step={item} />
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
        style={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />
        }
      />

      <View style={styles.agentRow}>
        <Pressable
          onPress={() => {
            setAgentIdx((idx) => (idx + 1) % agents.length);
            setModel(agents[(agentIdx + 1) % agents.length].model);
          }}
          accessibilityLabel="Switch agent"
          accessibilityRole="button"
          style={styles.agentPill}
        >
          <Text variant="caption" color="accent">{agents[agentIdx].id}</Text>
          <Text variant="caption" color="muted">⇄</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            loadModels();
            setModelMenuOpen(true);
          }}
          accessibilityLabel="Select model"
          accessibilityRole="button"
          style={styles.agentPill}
        >
          <Text variant="caption" color="muted" numberOfLines={1}>{model.modelID}</Text>
        </Pressable>
      </View>

      <BottomSheet visible={modelMenuOpen} onClose={() => setModelMenuOpen(false)}>
        <View style={styles.modelSheetHeader}>
          <Text variant="body" color="ink">选择模型</Text>
        </View>
        {modelList.map((m, i) => (
          <Pressable
            key={`${m.providerID}:${m.modelID}`}
            onPress={() => {
              setModel(m);
              setModelMenuOpen(false);
            }}
            style={[styles.modelItem, m.modelID === model.modelID && styles.modelItemActive]}
          >
            <Text variant="body" color={m.modelID === model.modelID ? "accent" : "ink"}>
              {m.modelID}
            </Text>
          </Pressable>
        ))}
      </BottomSheet>

      <View style={styles.inputRow}>
        <Pressable
          onPress={() => alert("Voice input")}
          accessibilityLabel="Voice input"
          accessibilityRole="button"
          style={styles.voiceBtn}
        >
          <Mic color={colors.body} size={18} strokeWidth={iconStroke} />
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
            <Square color={colors.onAccent} size={18} strokeWidth={iconStroke} />
          </Pressable>
        ) : (
          <Pressable
            onPress={send}
            disabled={!input.trim()}
            style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
            accessibilityLabel="Send"
          >
            <Send color={colors.onAccent} size={18} strokeWidth={iconStroke} />
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
  agentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxs,
    backgroundColor: colors.canvas,
  },
  agentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.surface[1],
    borderWidth: 1,
    borderColor: colors.border.default,
    maxWidth: 180,
  },
  modelSheetHeader: {
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    marginBottom: spacing.xs,
  },
  modelItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
  },
  modelItemActive: {
    backgroundColor: colors.accent.subtle,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.canvas,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    boxSizing: "border-box",
    backgroundColor: colors.surface[1],
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    color: colors.ink,
    fontSize: 15,
    textAlign: "center",
    textAlignVertical: "center",
  },
  voiceBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.accent.default,
    alignItems: "center",
    justifyContent: "center",
  },
});
