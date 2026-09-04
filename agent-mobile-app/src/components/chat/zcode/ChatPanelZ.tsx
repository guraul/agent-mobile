// Fork of src/components/chat/ChatPanel.tsx —— ZCode 风格渲染层改造（StepRow 折叠行 /
// 气泡复制/时间戳 / 状态行 / 圆角输入栏）。数据逻辑（SSE 订阅 / reducer / typewriter /
// pagination / agents+model prefs）与上游保持一致，上游修复需手动同步；
// 回退开关：src/app/(tabs)/index.tsx 的 USE_ZCODE_CHAT_SHEET。
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  FlatList,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  StyleSheet,
  Alert,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Bot, Cpu, Mic, Send, Square } from "lucide-react-native";
import { Text, Box, Button, Icon } from "../../index";
import { BottomSheet } from "../../navigation/BottomSheet";
import { colors, spacing, radius, iconStroke } from "../../../theme";
import {
  opencodeClient,
  type OpenCodeMessage,
  type OpenCodePart,
  type QuestionInfo,
  type PermissionRequest,
} from "../../../services/opencode-client";
import { subscribeToOpenCodeEvents } from "../../../services/opencode-events";
import {
  applyMessageUpdated,
  applyPartUpdated,
  applyMessageRemoved,
  applyPartDelta,
  nextRevealChars,
} from "../../../services/message-reducer";
import { mergeMessages, type DisplayStep } from "../../../services/message-merging";
import { loadModelPrefs } from "../../../services/model-prefs";
import { MessageBubbleZ } from "./MessageBubbleZ";

const PAGE_SIZE = 50;
// keep a bounded window in memory: SSE events keep appending to the list loaded
// by loadMessages; trimming the head keeps the list from growing unbounded
// while preserving the most recent messages (matches the PAGE_SIZE reload window).
const MAX_MESSAGES = PAGE_SIZE * 2;

// --- typewriter pacing -----------------------------------------------------
// deepseek streams the whole reply in ~1.5s; applying every delta immediately
// makes the text pop in as one block. We still apply deltas to the underlying
// messages for correctness, but reveal text to the UI at a fixed rate so the
// reply visibly types out. Per tick we reveal a few characters and re-render
// only the affected bubble (MessageBubble is memoized).
const TYPING_TICK_MS = 40;
const TYPING_CHARS_PER_TICK = 3;

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

export function ChatPanelZ({ sessionID }: ChatPanelProps) {
  const [messages, setMessages] = useState<OpenCodeMessage[]>([]);
  const [display, setDisplay] = useState<DisplayStep[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  // ZCode 风格状态行：中止后显示「已停止」，新消息发送时清除
  const [abortedAt, setAbortedAt] = useState<number | null>(null);
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
  // question tool: agent asks a clarifying question and blocks until answered.
  // We queue the request and show one question at a time in a BottomSheet, then
  // POST the reply so the agent can continue.
  const [pendingQuestion, setPendingQuestion] = useState<{
    requestID: string;
    questions: QuestionInfo[];
    index: number;
  } | null>(null);
  const [questionSelections, setQuestionSelections] = useState<string[]>([]);
  const [questionCustom, setQuestionCustom] = useState("");
  // accumulated answers for questions already stepped past (answer[0..index-1])
  const questionAnswersRef = useRef<string[][]>([]);
  // permission request: agent wants to run a tool / access a file and blocks
  // until the user allows or rejects.
  const [pendingPermission, setPendingPermission] = useState<{
    id: string;
    permission: string;
    patterns?: string[];
    metadata?: Record<string, unknown>;
    always?: string[];
  } | null>(null);
  const listRef = useRef<FlatList<DisplayStep>>(null);
  // stick to bottom when user is near the bottom; pause when they scroll up
  const stickToBottom = useRef(true);
  // during the initial auto-scroll window, ignore onScroll stickToBottom overrides:
  // programmatic scrollToEnd lands mid-list while content is still rendering, which
  // would otherwise flip stickToBottom off and freeze the list short of the latest message.
  const ignoreScrollUntil = useRef(0);
  // --- typewriter reveal state ---------------------------------------------
  // deltas arrive far faster than a human can read (deepseek streams a whole
  // reply in ~1.5s), so applying them instantly makes the text pop in as one
  // block. We keep the real messages array authoritative (delta → applyPartDelta)
  // but only reveal a bounded window of characters per tick to the rendered
  // bubbles. A part is identified by `${messageID}-${partID}` (matches the
  // DisplayStep id for text steps built in mergeMessages).
  const [revealChars, setRevealChars] = useState<Record<string, number>>({});
  const revealCharsRef = useRef<Record<string, number>>({});
  // full target text length per part (updated as deltas accumulate)
  const revealTargets = useRef<Record<string, number>>({});
  // messages that existed before this chat opened are shown in full, not typed
  // out — only parts that receive a delta while we're watching get paced.
  const typingPartsRef = useRef<Set<string>>(new Set());
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const ensureTypingTimer = useCallback(() => {
    if (typingTimerRef.current) return;
    typingTimerRef.current = setInterval(() => {
      const next = nextRevealChars(revealCharsRef.current, revealTargets.current, typingPartsRef.current, TYPING_CHARS_PER_TICK);
      if (next === revealCharsRef.current) {
        // no part still streaming — stop the ticker
        if (typingTimerRef.current) {
          clearInterval(typingTimerRef.current);
          typingTimerRef.current = null;
        }
        return;
      }
      revealCharsRef.current = next;
      setRevealChars(next);
      // keep the latest characters in view as the text grows
      listRef.current?.scrollToEnd({ animated: false });
    }, TYPING_TICK_MS);
  }, []);

  const stopTypingTimer = useCallback(() => {
    if (typingTimerRef.current) {
      clearInterval(typingTimerRef.current);
      typingTimerRef.current = null;
    }
  }, []);

  useEffect(() => stopTypingTimer, [stopTypingTimer]);

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
      // A question tool that is still running (agent waiting for an answer) may
      // predate this chat opening — the SSE stream won't replay `question.v2.asked`.
      // Recover it from the pending-question list so the user can answer instead
      // of the agent hanging forever.
      try {
        const pending = await opencodeClient.listQuestions();
        const mine = pending.find((q) => q.sessionID === sessionID && q.questions.length > 0);
        if (mine) {
          questionAnswersRef.current = [];
          setPendingQuestion({ requestID: mine.id, questions: mine.questions, index: 0 });
          setQuestionSelections([]);
          setQuestionCustom("");
        }
      } catch {
        // transient — the live SSE stream will surface new questions anyway
      }
      // Same recovery for a permission request that predates this chat open.
      try {
        const pendingPerms = await opencodeClient.listPermissions();
        const mine = pendingPerms.find((p) => p.sessionID === sessionID);
        if (mine) {
          setPendingPermission({
            id: mine.id,
            permission: mine.permission,
            patterns: mine.patterns,
            metadata: mine.metadata,
            always: mine.always,
          });
        }
      } catch {
        // transient — the live SSE stream will surface new permissions anyway
      }
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
          info?: { id: string; role: "user" | "assistant"; time?: { created?: number }; sessionID?: string; error?: unknown };
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
            // the final part.updated carries the complete text; extend the
            // typewriter target so the reveal can finish typing out the tail.
            const p = part as { id?: string; text?: string };
            if (p.id && typeof p.text === "string" && typingPartsRef.current.has(p.id)) {
              revealTargets.current[p.id] = Math.max(
                revealTargets.current[p.id] ?? 0,
                p.text.length,
              );
            }
            recomputeDisplay(next);
            return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
          });
        }
      } else if (event.type === "delta") {
        const d = event.properties as { sessionID: string; messageID: string; partID: string; field: string; text: string };
        if (d.sessionID === sessionID) {
          setMessages((prev) => {
            const next = applyPartDelta(prev, { messageID: d.messageID, partID: d.partID, field: d.field, text: d.text });
            // pace this part through the typewriter so the reply types out
            // instead of popping in as one block (deepseek streams too fast to read).
            // DisplayStep ids for text parts are the part's own id (mergeMessages),
            // so key the reveal state on partID alone.
            typingPartsRef.current.add(d.partID);
            const msg = next.find((m) => m.info.id === d.messageID);
            const part = msg?.parts.find((p) => (p as { id?: string }).id === d.partID);
            revealTargets.current[d.partID] = ((part as { text?: string } | undefined)?.text ?? "").length;
            ensureTypingTimer();
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
      } else if (event.type === "question.asked" || event.type === "question.v2.asked") {
        const req = event.properties as {
          id: string;
          sessionID: string;
          questions: QuestionInfo[];
        };
        if (req.sessionID === sessionID && req.questions.length > 0) {
          questionAnswersRef.current = [];
          setPendingQuestion({ requestID: req.id, questions: req.questions, index: 0 });
          setQuestionSelections([]);
          setQuestionCustom("");
        }
      } else if (
        event.type === "question.replied" ||
        event.type === "question.rejected" ||
        event.type === "question.v2.replied" ||
        event.type === "question.v2.rejected"
      ) {
        const props = event.properties as { sessionID?: string; requestID?: string };
        if (props.sessionID === sessionID) {
          setPendingQuestion(null);
          setQuestionSelections([]);
          setQuestionCustom("");
          questionAnswersRef.current = [];
        }
      } else if (event.type === "permission.asked") {
        const req = event.properties as PermissionRequest;
        if (req.sessionID === sessionID) {
          setPendingPermission({
            id: req.id,
            permission: req.permission,
            patterns: req.patterns,
            metadata: req.metadata,
            always: req.always,
          });
        }
      } else if (event.type === "permission.replied") {
        const props = event.properties as { sessionID?: string; requestID?: string };
        if (props.sessionID === sessionID) {
          setPendingPermission(null);
        }
      }
    }, undefined, sessionID);
    return unsub;
  }, [sessionID, loadMessages, recomputeDisplay]);

  // Poll-based fallback: the local TUI and this opencode server (4096) are
  // separate instances sharing the DB but not their SSE event streams, so
  // messages created in the TUI never reach our /global/event subscription.
  //
  // DISABLED (2026-08-14): the 5s poll competed with the SSE typewriter — every
  // poll fetched the full text of a streaming part and replaced it wholesale,
  // fighting the per-char reveal. For the phone use-case we rely solely on the
  // SSE stream; re-enable only if cross-instance TUI sync is needed again.
  // useEffect(() => {
  //   let cancelled = false;
  //   const sync = async () => {
  //     try {
  //       const recent = await opencodeClient.listMessages(sessionID, { limit: 10 });
  //       if (cancelled) return;
  //       setMessages((prev) => {
  //         const { messages: merged, changed } = mergeRecentMessages(prev, recent);
  //         if (changed) {
  //           // polling can carry the full text of a part we're still typing out —
  //           // extend the target so the reveal doesn't stall short of the real text.
  //           for (const m of merged) {
  //             for (const part of m.parts) {
  //               const p = part as { id?: string; text?: string };
  //               if (p.id && typingPartsRef.current.has(p.id) && typeof p.text === "string") {
  //                 revealTargets.current[p.id] = Math.max(
  //                   revealTargets.current[p.id] ?? 0,
  //                   p.text.length,
  //                 );
  //               }
  //             }
  //           }
  //           recomputeDisplay(merged);
  //           return merged.length > MAX_MESSAGES ? merged.slice(merged.length - MAX_MESSAGES) : merged;
  //         }
  //         return prev;
  //       });
  //     } catch {
  //       // transient network/server hiccup — next tick retries
  //     }
  //   };
  //   sync();
  //   const timer = setInterval(sync, 5000);
  //   return () => {
  //     cancelled = true;
  //     clearInterval(timer);
  //   };
  // }, [sessionID, recomputeDisplay]);

  // load primary agents' configured models from the opencode server so the
  // agent pill follows server-side agent.model (opencode.json), not a hardcoded copy.
  useEffect(() => {
    let cancelled = false;
    opencodeClient
      .listAgents()
      .then(async (list) => {
        if (cancelled) return;
        const primary = list.filter((a) => a.mode === "primary" && a.model);
        const known = FALLBACK_AGENTS.filter((f) => primary.some((a) => a.name === f.id));
        if (known.length === 0) return;
        const prefs = await loadModelPrefs();
        setAgents(
          primary
            .filter((a) => FALLBACK_AGENTS.some((f) => f.id === a.name))
            .map((a) => {
              // Me 偏好优先,否则 server agent.model
              const p = prefs[a.name];
              return {
                id: a.name,
                model: p
                  ? { providerID: p.providerID, modelID: p.modelID }
                  : { providerID: a.model!.providerID, modelID: a.model!.modelID },
              };
            }),
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
      .then(async (s) => {
        if (cancelled) return;
        if (s.agent) {
          const idx = agents.findIndex((a) => a.id === s.agent);
          if (idx !== -1) setAgentIdx(idx);
        }
        // 初始 model pill:Me 偏好优先,无则 adopt session model(若匹配 primary)
        const prefs = await loadModelPrefs();
        const curAgent = s.agent ?? agents[agentIdx]?.id;
        const pref = curAgent ? prefs[curAgent] : null;
        if (pref) {
          setModel({ providerID: pref.providerID, modelID: pref.modelID });
        } else if (
          s.model?.providerID &&
          s.model?.id &&
          agents.some(
            (a) => a.model.providerID === s.model!.providerID && a.model.modelID === s.model!.id,
          )
        ) {
          // Only adopt the session model when it matches one of the primary
          // agents' defaults; stale session models (e.g. from before the model
          // migration) must not pin the chat to an old provider.
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
          // only DeepSeek models, excluding openrouter / siliconflow-cn
          if (p.id === "openrouter" || p.id === "siliconflow-cn") continue;
          for (const modelID of Object.keys(p.models ?? {})) {
            // only surface DeepSeek models in the picker
            if (!modelID.toLowerCase().includes("deepseek")) continue;
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
    setAbortedAt(null);
    setError(null);
    try {
      // No full reload here: the SSE stream echoes the user message back as
      // `message.updated` (role=user), which the subscription above inserts
      // chronologically. Reloading would rebuild the whole list and make the
      // scroll position jump for every send.
      await opencodeClient.sendMessageAsync(sessionID, {
        parts: [{ type: "text", text }],
        agent: agents[agentIdx].id,
        model,
      });
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
      setAbortedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  // toggle a selected option for the current question
  const toggleQuestionOption = (label: string) => {
    const q = pendingQuestion;
    if (!q) return;
    const info = q.questions[q.index];
    setQuestionSelections((prev) => {
      if (info?.multiple) {
        return prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label];
      }
      return prev.includes(label) ? [] : [label];
    });
  };

  // advance to the next question, or submit when the last one is answered
  const answerCurrentQuestion = () => {
    const q = pendingQuestion;
    if (!q) return;
    const info = q.questions[q.index];
    const selected = [...questionSelections];
    const customVal = questionCustom.trim();
    if (info?.custom !== false && customVal) selected.push(customVal);
    const answer = selected.length ? selected : [];
    questionAnswersRef.current[q.index] = answer;

    if (q.index < q.questions.length - 1) {
      setPendingQuestion({ ...q, index: q.index + 1 });
      setQuestionSelections([]);
      setQuestionCustom("");
    } else {
      submitQuestionAnswers([...questionAnswersRef.current]);
    }
  };

  const submitQuestionAnswers = async (allAnswers: string[][]) => {
    const q = pendingQuestion;
    if (!q) return;
    try {
      await opencodeClient.replyQuestion(q.requestID, allAnswers);
      setPendingQuestion(null);
      setQuestionSelections([]);
      setQuestionCustom("");
      questionAnswersRef.current = [];
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const rejectQuestion = async () => {
    const q = pendingQuestion;
    if (!q) return;
    try {
      await opencodeClient.rejectQuestion(q.requestID);
      setPendingQuestion(null);
      setQuestionSelections([]);
      setQuestionCustom("");
      questionAnswersRef.current = [];
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const replyPermission = async (reply: "once" | "always" | "reject") => {
    const p = pendingPermission;
    if (!p) return;
    try {
      await opencodeClient.replyPermission(p.id, reply);
      setPendingPermission(null);
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
    // while a reply is actively typing, always chase the latest text so the
    // newest characters are never stranded behind the agent/model row.
    if (stickToBottom.current) {
      listRef.current?.scrollToEnd({ animated: false });
    }
  };

  if (loading) {
    return (
      <Box padding="lg">
        <Text variant="body" color="muted">Loading messages…</Text>
      </Box>
    );
  }

  const listFooter = sending ? (
    <View style={styles.statusRow}>
      <Bot color={colors.accent.default} size={12} strokeWidth={2} />
      <Text variant="caption" color="muted">运行中…</Text>
    </View>
  ) : abortedAt ? (
    <View style={styles.statusRow}>
      <Text variant="caption" color="muted">已停止</Text>
    </View>
  ) : null;

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
        extraData={revealChars}
        keyExtractor={(s) => s.id}
        renderItem={({ item, index }) => {
          const prev = display[index - 1];
          const isTurnStart = !prev || prev.kind === "user" || item.kind === "user";
          // typewriter pacing: while a part is mid-stream, show only the
          // characters revealed so far so the reply visibly types out.
          let step = item;
          if (item.kind === "text") {
            const shown = revealChars[item.id];
            if (shown !== undefined && shown < item.text.length) {
              step = { ...item, text: item.text.slice(0, shown) };
            }
          }
          return (
            <View style={{ marginTop: isTurnStart ? spacing.md : spacing.xxs }}>
              <MessageBubbleZ step={step} />
            </View>
          );
        }}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={listFooter}
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
          <Bot color={colors.accent.default} size={12} strokeWidth={iconStroke} />
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
          <Cpu color={colors.muted} size={12} strokeWidth={iconStroke} />
          <Text variant="caption" color="muted" numberOfLines={1}>{model.modelID}</Text>
        </Pressable>
      </View>

      <BottomSheet visible={modelMenuOpen} onClose={() => setModelMenuOpen(false)}>
        <View style={styles.modelSheetHeader}>
          <Text variant="body" color="ink">选择模型</Text>
        </View>
        <ScrollView style={styles.modelSheetScroll}>
          {modelList.map((m, i) => (
            <Pressable
              key={`${m.providerID}:${m.modelID}`}
              onPress={() => {
                setModel(m);
                setModelMenuOpen(false);
              }}
              style={[
                styles.modelItem,
                m.providerID === model.providerID && m.modelID === model.modelID && styles.modelItemActive,
              ]}
            >
              <Text
                variant="body"
                color={m.providerID === model.providerID && m.modelID === model.modelID ? "accent" : "ink"}
              >
                {m.providerID}: {m.modelID}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </BottomSheet>

      {pendingQuestion ? (
        <BottomSheet visible onClose={rejectQuestion} testID="question-sheet">
          <View style={styles.modelSheetHeader}>
            <Text variant="body" color="ink">
              {pendingQuestion.questions[pendingQuestion.index].header ||
                `问题 ${pendingQuestion.index + 1}/${pendingQuestion.questions.length}`}
            </Text>
          </View>
          <Box padding="sm" gap="sm">
            <Text variant="body" color="ink">
              {pendingQuestion.questions[pendingQuestion.index].question}
            </Text>
            {pendingQuestion.questions[pendingQuestion.index].options?.map((opt) => {
              const active = questionSelections.includes(opt.label);
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => toggleQuestionOption(opt.label)}
                  accessibilityRole="button"
                  style={[styles.questionOption, active && styles.questionOptionActive]}
                >
                  <Text variant="body" color={active ? "accent" : "ink"}>
                    {opt.label}
                  </Text>
                  {opt.description ? (
                    <Text variant="caption" color="muted">{opt.description}</Text>
                  ) : null}
                </Pressable>
              );
            })}
            {pendingQuestion.questions[pendingQuestion.index].custom !== false ? (
              <TextInput
                style={styles.questionCustomInput}
                value={questionCustom}
                onChangeText={setQuestionCustom}
                placeholder="输入自定义答案（可选）"
                placeholderTextColor={colors.disabled}
              />
            ) : null}
            <Box gap="sm">
              <Button
                variant="primary"
                label={pendingQuestion.index < pendingQuestion.questions.length - 1 ? "下一步" : "提交"}
                onPress={answerCurrentQuestion}
              />
              <Button variant="ghost" label="跳过此问题" onPress={rejectQuestion} />
            </Box>
          </Box>
        </BottomSheet>
      ) : null}

      {pendingPermission ? (
        <BottomSheet visible onClose={() => replyPermission("reject")} testID="permission-sheet">
          <View style={styles.modelSheetHeader}>
            <Text variant="body" color="ink">权限请求</Text>
          </View>
          <Box padding="sm" gap="sm">
            <Text variant="body" color="ink">
              Agent 请求{pendingPermission.permission === "external_directory" ? "访问外部目录" : `执行 ${pendingPermission.permission}`}
            </Text>
            {pendingPermission.patterns?.length ? (
              <Text variant="caption" color="muted">
                {pendingPermission.patterns.join(", ")}
              </Text>
            ) : null}
            {typeof pendingPermission.metadata?.filepath === "string" ? (
              <Text variant="caption" color="muted">
                {pendingPermission.metadata.filepath}
              </Text>
            ) : null}
            <Box gap="sm">
              <Button variant="primary" label="允许一次" onPress={() => replyPermission("once")} />
              <Button variant="primary" label="始终允许" onPress={() => replyPermission("always")} />
              <Button variant="ghost" label="拒绝" onPress={() => replyPermission("reject")} />
            </Box>
          </Box>
        </BottomSheet>
      ) : null}

      <View style={styles.inputRow}>
        <Pressable
          onPress={() => Alert.alert("Voice input", "Coming soon.")}
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
  listContent: { padding: spacing.md, paddingBottom: 30 },
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
  modelSheetScroll: {
    maxHeight: 400,
  },
  modelItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
  },
  modelItemActive: {
    backgroundColor: colors.accent.subtle,
  },
  questionOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: 2,
  },
  questionOptionActive: {
    borderColor: colors.accent.default,
    backgroundColor: colors.accent.subtle,
  },
  questionCustomInput: {
    backgroundColor: colors.surface[2],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: 15,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
    backgroundColor: colors.canvas,
  },
  input: {
    flex: 1,
    height: 44,
    maxHeight: 44,
    boxSizing: "border-box",
    backgroundColor: colors.surface[1],
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 0,
    color: colors.ink,
    fontSize: 15,
    // center the caret/text vertically on both native and web. RN TextInput
    // ignores textAlignVertical on web, so use lineHeight there; native keeps
    // textAlignVertical. Fixed height + single line keeps the input on the
    // same axis as the voice/send icons.
    textAlignVertical: "center",
    ...Platform.select({
      web: { lineHeight: 44 },
      default: {},
    }),
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
