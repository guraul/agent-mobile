// Fork of src/components/chat/ChatPanel.tsx —— ZCode 风格渲染层改造（#32 工具折叠组/工具输出 sheet /
// 气泡复制/时间戳 / 状态行 / 圆角输入栏）。数据逻辑（SSE 订阅 / reducer / typewriter /
// pagination / agents+model prefs）与上游保持一致，上游修复需手动同步；
// Companion migration：/talk stack route 的唯一聊天渲染层（ProjectChatZ 内嵌）。
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import {
  View,
  TextInput,
  Pressable,
  Text as RNText,
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
import { ArrowUp, Bot, Check, GripVertical, Mic, Plus, Send, Square, X } from "lucide-react-native";
import { Text, Box } from "../../index";
import { LightSheet } from "../../pulse/LightSheet";
import {
  spacing,
  iconStroke,
  lightColors,
  lightChatColors,
  lightChatSizes,
} from "../../../theme";
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
import { mergeMessages, groupToolSteps, type DisplayStep, type ToolStep } from "../../../services/message-merging";
import { loadModelPrefs } from "../../../services/model-prefs";
import { buildAttentionContext } from "../../../services/attention/context";
import { handleAttention } from "../../../services/attention/client";
import { parseAssignmentCommand, executeAssignmentCommand } from "../../../services/assignment/client";
import {
  fetchAssignments,
  revokeAssignment,
  repairAssignment,
  compensateAssignment,
} from "../../../services/assignment/client";
import { fetchAttentions } from "../../../services/attention/client";
import { buildDutyRows, buildProjectRows, type DutyAction, type DutyRow } from "../../../services/chat-cards";
import {
  dequeueFirst,
  enqueueMessage,
  moveQueuedUp,
  removeQueued,
  type QueuedMessage,
} from "../../../services/message-queue";
import type { EngagedAttentionRef } from "../../../services/attention/store";
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
  /** Phase 4：从 Attention 进入时携带——上下文卡 + 显式 Mark handled 入口 */
  attention?: EngagedAttentionRef;
  /** market 类 Create 流程：挂载后自动发送一条 Attention 上下文消息（用户显式 engage 的结果） */
  autoSendContext?: boolean;
  /** v0.1.1 通用上下文首消息（Suggested/Noticed → Talk）：挂载后发送一次；仅是对话开场，无 lifecycle/授权语义 */
  autoContextText?: string;
}

export function ChatPanelZ({ sessionID, attention, autoSendContext = false, autoContextText }: ChatPanelProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<OpenCodeMessage[]>([]);
  const [display, setDisplay] = useState<DisplayStep[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  // ZCode 风格状态行：中止后显示「已停止」，新消息发送时清除
  const [abortedAt, setAbortedAt] = useState<number | null>(null);
  // Phase 4：conversation handling —— 用户显式「标记已处理」（绝不由 idle/关闭/完成自动触发）
  const [markingHandled, setMarkingHandled] = useState(false);
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
  // #32 工具输出查看器：LightSheet 挂在组件尾部渲染（LightSheet 无 zIndex 靠渲染顺序压层）
  const [outputViewer, setOutputViewer] = useState<ToolStep | null>(null);
  const openToolOutput = useCallback((t: ToolStep) => setOutputViewer(t), []);
  // #30 本地卡片步（/assignments、/projects 斜杠命令产生；session 切换由 key remount 重置）
  const [localSteps, setLocalSteps] = useState<DisplayStep[]>([]);
  const [cardBusyId, setCardBusyId] = useState<string | null>(null);
  // #33 交互层：composer 两态（pill 收起 ↔ 展开全高输入）、agent 面板、客户端排队队列
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  // 发送失败后阻塞自动 flush（防无限重试）；用户对 chip 的任何操作解除阻塞
  const [queueBlocked, setQueueBlocked] = useState(false);
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
  // merge assistant steps into single turns (#32：连续 tool step 合并为折叠组——纯函数，语义同 mergeMessages）。
  const recomputeDisplay = useCallback((raw: OpenCodeMessage[]) => {
    const chronological = [...raw].sort(
      (a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0),
    );
    setDisplay(groupToolSteps(mergeMessages(chronological)));
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

  // Attention → Talk 上下文注入：Create 流程中把最小上下文作为首条用户消息发出
  //（PM §8.2：新 Session 由 Event/Attention 上下文化）。仅用户显式 engage 后执行一次。
  const contextSentRef = useRef(false);
  useEffect(() => {
    if (!autoSendContext || !attention || contextSentRef.current) return;
    if (loading) return;
    contextSentRef.current = true;
    const ctx = buildAttentionContext({
      id: attention.id, domain: "market", title: attention.title, summary: attention.summary,
      subjectKind: "fund", subjectId: attention.subjectId, creationReasonRef: "market.target-nav-threshold",
      sessionId: sessionID, createdAt: Date.now(), state: attention.state,
    });
    opencodeClient
      .sendMessageAsync(sessionID, {
        parts: [{ type: "text", text: ctx.messageText }],
        agent: agents[agentIdx].id,
        model,
      })
      .then(() => stickToBottom.current = true)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSendContext, attention, loading]);

  // v0.1.1：通用上下文首消息（Suggested/Noticed → Talk 的对话开场）。
  // 与 Attention 注入的区别：不带 engage/handle/subject 语义，只是一条用户消息——绝不触发任何 proposal/attention 动作。
  const autoContextSentRef = useRef(false);
  useEffect(() => {
    if (!autoContextText || autoContextSentRef.current) return;
    if (loading) return;
    autoContextSentRef.current = true;
    opencodeClient
      .sendMessageAsync(sessionID, {
        parts: [{ type: "text", text: autoContextText }],
        agent: agents[agentIdx].id,
        model,
      })
      .then(() => { stickToBottom.current = true; })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoContextText, loading]);

  const markHandled = async () => {
    if (!attention) return;
    setMarkingHandled(true);
    try {
      // artifact 先有（本会话即 handling 会话），再调 handle；不打到 Agent/不猜 artifact
      const { transitioned } = await handleAttention(attention.id, `handling:${sessionID}`);
      if (!transitioned) Alert.alert("已处理过", "该 Attention 已不在 OPEN 状态。");
    } catch (e) {
      Alert.alert("标记失败", e instanceof Error ? e.message : String(e));
    } finally {
      setMarkingHandled(false);
    }
  };

  /* ---- #30 气泡内卡片（Duties / Projects）：斜杠命令触发，动作回调后刷新卡 ---- */
  const DUTIES_CAPTION =
    "Revoke stops a duty for good. Retry re-runs the failed check; Run now / Skip settle a missed one-time reminder.";

  const refreshDutiesCard = useCallback(async () => {
    const [assignments, attentions] = await Promise.all([
      fetchAssignments("active"),
      fetchAttentions(),
    ]);
    const rows = buildDutyRows(assignments, attentions);
    setLocalSteps((prev) => {
      const idx = prev.map((x) => x.kind).lastIndexOf("dutiesCard");
      if (idx === -1) return prev;
      const next = [...prev];
      next[idx] = { kind: "dutiesCard", id: next[idx].id, createdAt: next[idx].createdAt, rows, caption: DUTIES_CAPTION };
      return next;
    });
  }, []);

  const pushDutiesCard = useCallback(async () => {
    try {
      const [assignments, attentions] = await Promise.all([
        fetchAssignments("active"),
        fetchAttentions(),
      ]);
      const rows = buildDutyRows(assignments, attentions);
      setLocalSteps((prev) => [
        ...prev,
        { kind: "dutiesCard", id: `card-duty-${Date.now().toString(36)}`, createdAt: Date.now(), rows, caption: DUTIES_CAPTION },
      ]);
    } catch (e) {
      Alert.alert("Duties", e instanceof Error ? e.message : String(e));
    }
  }, []);

  const pushProjectsCard = useCallback(async () => {
    try {
      const [sessions, status] = await Promise.all([
        opencodeClient.listSessions(),
        opencodeClient.getSessionStatus(),
      ]);
      const rows = buildProjectRows(sessions, status);
      setLocalSteps((prev) => [
        ...prev,
        { kind: "projectsCard", id: `card-proj-${Date.now().toString(36)}`, createdAt: Date.now(), rows },
      ]);
    } catch (e) {
      Alert.alert("Projects", e instanceof Error ? e.message : String(e));
    }
  }, []);

  const handleDutyAction = useCallback(async (action: DutyAction, row: DutyRow) => {
    setCardBusyId(row.id);
    try {
      if (action === "revoke") {
        const r = await revokeAssignment(row.id);
        if (!r.transitioned) Alert.alert("Revoke", "该职责已不在 active 状态。");
      } else if (action === "retry") {
        await repairAssignment(row.id);
      } else if (action === "run-now") {
        await compensateAssignment(row.id, "run-now");
      } else {
        await compensateAssignment(row.id, "skip");
      }
      await refreshDutiesCard();
    } catch (e) {
      Alert.alert("操作失败", e instanceof Error ? e.message : String(e));
    } finally {
      setCardBusyId(null);
    }
  }, [refreshDutiesCard]);

  const openProject = useCallback((path: string) => {
    router.push({ pathname: "/talk", params: { projectPath: path } });
  }, [router]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    // #30 斜杠卡片命令（客户端拦截：不进 agent、不进队列、不产生 opencode 消息）
    if (text === "/assignments") {
      setInput("");
      setComposerExpanded(false);
      void pushDutiesCard();
      return;
    }
    if (text === "/projects") {
      setInput("");
      setComposerExpanded(false);
      void pushProjectsCard();
      return;
    }
    // Assignment 命令（Phase 5 最小 Talk 接入）：结构化指令不发给 Agent——
    // /assign → proposal（market 需 /confirm 激活）；/confirm /reject /revoke /assignments → 生命周期动作。
    // 激活语义在 BFF confirmation matrix 把关；这里只做命令路由与结果反馈。
    // 命令是独立瞬时 API 调用，busy 时也立即执行（不进队列）。
    const assignmentCommand = parseAssignmentCommand(text);
    if (assignmentCommand) {
      setSending(true);
      setInput("");
      try {
        const feedback = await executeAssignmentCommand(assignmentCommand, sessionID);
        Alert.alert("Assignment", feedback);
      } catch (e) {
        Alert.alert("命令失败", e instanceof Error ? e.message : String(e));
      } finally {
        setSending(false);
      }
      return;
    }
    // #33 排队分支：busy（sending 沿用现有状态——prompt_async 挂起整个 agent 运行）
    // 时发送的消息进客户端队列，chip 可删除/上移/回填，busy 结束由 flush effect 依次发出。
    if (sending) {
      setQueue((prev) => enqueueMessage(prev, text, `q-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`));
      setInput("");
      return;
    }
    setInput("");
    setComposerExpanded(false);
    await doSend(text);
  };

  // 直接发送（正常路径；队列 flush 复用）。返回成功与否（失败时队列回填用）。
  // No full reload here: the SSE stream echoes the user message back as
  // `message.updated` (role=user), which the subscription above inserts
  // chronologically. Reloading would rebuild the whole list and make the
  // scroll position jump for every send.
  const doSend = useCallback(async (text: string): Promise<boolean> => {
    setSending(true);
    setAbortedAt(null);
    setError(null);
    try {
      await opencodeClient.sendMessageAsync(sessionID, {
        parts: [{ type: "text", text }],
        agent: agents[agentIdx].id,
        model,
      });
      stickToBottom.current = true;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSending(false);
    }
  }, [sessionID, agents, agentIdx, model]);

  // #33 排队队列操作统一入口：任何 chip 动作（删除/上移/回填）都解除发送阻塞
  const mutateQueue = useCallback((next: QueuedMessage[]) => {
    setQueueBlocked(false);
    setQueue(next);
  }, []);

  // #33 队列自动发送：busy（sending）翻转 false 且队列非空 → 取队首发出（agent/model
  // 取发送时刻的当前值）。发送失败：条目放回队首 + 阻塞自动 flush（防无限重试），
  // chip 上的删除/上移/回填操作会解除阻塞。不碰 messages 数组（轮询冲突教训）。
  useEffect(() => {
    if (sending || queueBlocked || queue.length === 0) return;
    const { next } = dequeueFirst(queue);
    if (!next) return;
    setQueue((prev) => prev.slice(1));
    let cancelled = false;
    void doSend(next.text).then((ok) => {
      if (!ok && !cancelled) {
        setQueue((prev) => [next, ...prev]);
        setQueueBlocked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sending, queueBlocked, queue, doSend]);

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

  // #30 本地卡片步追加在消息流尾部（display 身份随 localSteps 变化，FlatList 自动重渲染）
  // useMemo 必须在条件 return（loading 分支）之前——hooks 顺序红线
  const listData = useMemo(() => [...display, ...localSteps], [display, localSteps]);

  if (loading) {
    return (
      <Box padding="lg">
        <Text variant="lightBody" color="lightGray">Loading messages…</Text>
      </Box>
    );
  }

  const listFooter = sending ? (
    <View style={styles.statusRow}>
      <Bot color={lightColors.amber} size={12} strokeWidth={2} />
      <Text variant="lightCaption" color="lightGray">运行中…</Text>
    </View>
  ) : abortedAt ? (
    <View style={styles.statusRow}>
      <Text variant="lightCaption" color="lightGray">已停止</Text>
    </View>
  ) : null;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* 白色聊天区面板（chat.html .chat-area：radius 30 白底，消息流承载） */}
      <View style={styles.chatArea}>
        {error ? (
          <View style={styles.errorBanner}>
            <Text variant="lightCaption" color="lightUpRed">{error}</Text>
          </View>
        ) : null}

        <FlatList
          ref={listRef}
          data={listData}
          extraData={revealChars}
          keyExtractor={(s) => s.id}
          ListHeaderComponent={
            attention ? (
              <View style={styles.attentionCard}>
                <Text variant="lightLabel" color="lightAccentDeep">📌 处理中：{attention.title}</Text>
                <Text variant="lightCaption" color="lightGray">{attention.summary}</Text>
              </View>
            ) : null
          }
          renderItem={({ item, index }) => {
            const prev = display[index - 1];
            const isTurnStart = !prev || prev.kind === "user" || item.kind === "user";
            // typewriter pacing: while a part is mid-stream, show only the
            // characters revealed so far so the reply visibly types out.
            // #32：reasoning（thinking 块）与 text 同一套 revealChars/extraData 机制。
            let step = item;
            if (item.kind === "text" || item.kind === "reasoning") {
              const shown = revealChars[item.id];
              if (shown !== undefined && shown < (item.text ?? "").length) {
                step = { ...item, text: (item.text ?? "").slice(0, shown) };
              }
            }
            return (
              <View style={{ marginTop: isTurnStart ? lightChatSizes.msgGap + 5 : lightChatSizes.msgGap }}>
                <MessageBubbleZ step={step} onOpenOutput={openToolOutput} onCardAction={handleDutyAction} onOpenProject={openProject} />
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
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={lightColors.grayText} />
          }
        />

        {attention ? (
          <View style={styles.markHandledRow}>
            <Pressable
              onPress={markHandled}
              disabled={markingHandled}
              accessibilityRole="button"
              accessibilityLabel="标记已处理"
              testID="attention-mark-handled"
              style={styles.quietPill}
            >
              <Text variant="lightCaption" color={markingHandled ? "lightGray" : "lightInk"}>
                {markingHandled ? "标记中…" : "标记已处理"}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* #33 排队消息 chip 浮层（mock .float-panel）：busy 时排队的消息，可上移/删除/点文本回填编辑 */}
      {queue.length > 0 ? (
        <View style={styles.composerSlot} testID="queue-panel">
          <View style={styles.floatPanel}>
            {queue.map((q, i) => (
              <View key={q.id} style={styles.qChip}>
                <GripVertical color={lightChatColors.roundBtnBorder} size={14} strokeWidth={2} />
                <Pressable
                  onPress={() => {
                    mutateQueue(removeQueued(queue, q.id));
                    setInput(q.text);
                    setComposerExpanded(true);
                  }}
                  style={styles.qTextWrap}
                  accessibilityRole="button"
                  accessibilityLabel="编辑排队消息"
                >
                  <RNText style={styles.qText} numberOfLines={1}>{q.text}</RNText>
                </Pressable>
                <Pressable
                  disabled={i === 0}
                  onPress={() => mutateQueue(moveQueuedUp(queue, q.id))}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="上移排队消息"
                  style={styles.qBtn}
                >
                  <ArrowUp color={i === 0 ? lightColors.grayText : lightChatColors.chipWarmText} size={13} strokeWidth={2.5} />
                </Pressable>
                <Pressable
                  onPress={() => mutateQueue(removeQueued(queue, q.id))}
                  hitSlop={6}
                  accessibilityRole="button"
                  accessibilityLabel="删除排队消息"
                  style={styles.qBtn}
                >
                  <X color={lightChatColors.chipWarmText} size={13} strokeWidth={2.5} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {composerExpanded ? (
        /* 展开态（mock .composer-box）：全高输入 + 字数 + 附件/语音 + peach 发送/停止 */
        <View style={styles.composerSlot}>
          <View style={styles.composerBox}>
            <TextInput
              style={styles.composerInput}
              value={input}
              onChangeText={setInput}
              placeholder="Ask anything..."
              placeholderTextColor={lightChatColors.inputPlaceholder}
              multiline
              testID="composer-input"
            />
            <View style={styles.composerFooter}>
              <Pressable
                onPress={() => Alert.alert("附件", "附件功能即将上线")}
                accessibilityLabel="Add attachment"
                accessibilityRole="button"
                style={styles.composerMiniBtn}
                hitSlop={4}
              >
                <Plus color={lightColors.ink} size={17} strokeWidth={2} />
              </Pressable>
              <RNText style={styles.charCount}>{input.length}</RNText>
              <View style={styles.flexSpacer} />
              <Pressable
                onPress={() => Alert.alert("语音", "语音输入即将上线")}
                accessibilityLabel="Voice input"
                accessibilityRole="button"
                style={styles.composerMiniBtn}
                hitSlop={4}
              >
                <Mic color={lightColors.ink} size={16} strokeWidth={2} />
              </Pressable>
              {sending ? (
                <Pressable
                  onPress={abort}
                  style={[styles.composerSend, styles.composerSendStop]}
                  accessibilityLabel="Stop"
                  accessibilityRole="button"
                >
                  <Square color={lightColors.ink} size={19} strokeWidth={2.4} />
                </Pressable>
              ) : (
                <Pressable
                  onPress={send}
                  disabled={!input.trim()}
                  style={[styles.composerSend, !input.trim() && { opacity: 0.4 }]}
                  accessibilityLabel="Send"
                  accessibilityRole="button"
                >
                  <Send color={lightColors.ink} size={19} strokeWidth={2.4} />
                </Pressable>
              )}
            </View>
          </View>
        </View>
      ) : (
        /* 收起态（mock .pill-wrap）：pill（附件 + 草稿预览 + 语音 + 发送/停止）+ pill-sub（model/agent ma-btn）。
           草稿预览是 readonly TextInput（渲染为 textarea）——点击整行展开成全高输入。 */
        <View style={styles.composerSlot}>
          <View style={styles.inputPillCol}>
            <View style={styles.pillMain}>
              <Pressable
                onPress={() => Alert.alert("附件", "附件功能即将上线")}
                accessibilityLabel="Add attachment"
                accessibilityRole="button"
                style={styles.roundBtn}
                hitSlop={4}
              >
                <Plus color={lightColors.ink} size={18} strokeWidth={2} />
              </Pressable>
              <Pressable
                onPress={() => setComposerExpanded(true)}
                style={styles.pillPreview}
                accessibilityRole="button"
                accessibilityLabel="展开输入"
                testID="composer-preview"
              >
                {/* readonly TextInput：渲染为 textarea（e2e 语义"打开工作区含输入框"不破坏），
                    pointerEvents none 让点击穿透到外层 Pressable 触发展开 */}
                <TextInput
                  style={[styles.pillPreviewText, input.trim() ? styles.pillPreviewDraft : null]}
                  value={input}
                  placeholder="Ask anything..."
                  placeholderTextColor={lightChatColors.inputPlaceholder}
                  editable={false}
                  multiline
                  numberOfLines={1}
                  pointerEvents="none"
                />
              </Pressable>
              <Pressable
                onPress={() => Alert.alert("语音", "语音输入即将上线")}
                accessibilityLabel="Voice input"
                accessibilityRole="button"
                style={styles.roundBtn}
                hitSlop={4}
              >
                <Mic color={lightColors.ink} size={18} strokeWidth={2} />
              </Pressable>
              {sending ? (
                <Pressable
                  onPress={abort}
                  style={[styles.roundBtn, styles.pillStop]}
                  accessibilityLabel="Stop"
                  accessibilityRole="button"
                >
                  <Square color={lightChatColors.diffDel} size={17} strokeWidth={2.4} />
                </Pressable>
              ) : input.trim() ? (
                <Pressable
                  onPress={send}
                  style={[styles.roundBtn, styles.pillSend]}
                  accessibilityLabel="Send"
                  accessibilityRole="button"
                >
                  <Send color={lightColors.ink} size={17} strokeWidth={2.4} />
                </Pressable>
              ) : null}
            </View>
            <View style={styles.pillSub}>
              <Pressable
                onPress={() => {
                  loadModels();
                  setModelMenuOpen(true);
                }}
                accessibilityLabel="Select model"
                accessibilityRole="button"
                style={styles.maBtn}
              >
                <View style={styles.maDot} />
                <RNText style={styles.maText} numberOfLines={1}>{model.modelID}</RNText>
              </Pressable>
              <View style={styles.flexSpacer} />
              <Pressable
                onPress={() => {
                  setAgentIdx((idx) => (idx + 1) % agents.length);
                  setModel(agents[(agentIdx + 1) % agents.length].model);
                }}
                onLongPress={() => setAgentMenuOpen(true)}
                delayLongPress={400}
                accessibilityLabel="Switch agent"
                accessibilityRole="button"
                style={styles.maBtn}
              >
                <View style={styles.maDot} />
                <RNText style={styles.maText}>{agents[agentIdx].id}</RNText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      {/* model 面板（#31 机械换肤：LightSheet + light token，provider 前缀 + 双匹配高亮逻辑不变） */}
      <LightSheet visible={modelMenuOpen} onClose={() => setModelMenuOpen(false)} testID="model-sheet">
        <View style={styles.sheetHeader}>
          <Text variant="lightBodyStrong" color="lightInk">选择模型</Text>
        </View>
        <ScrollView style={styles.sheetScroll}>
          {modelList.map((m, i) => {
            const active = m.providerID === model.providerID && m.modelID === model.modelID;
            return (
              <Pressable
                key={`${m.providerID}:${m.modelID}`}
                onPress={() => {
                  setModel(m);
                  setModelMenuOpen(false);
                }}
                style={[styles.sheetItem, active && styles.sheetItemActive]}
              >
                <Text variant="lightBody" color={active ? "lightInk" : "lightSubtle"}>
                  {m.providerID}: {m.modelID}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </LightSheet>

      {/* #33 agent 面板（agent ma-btn 长按唤起；轻点仍是循环切换）：LightSheet 载体 */}
      <LightSheet visible={agentMenuOpen} onClose={() => setAgentMenuOpen(false)} testID="agent-sheet">
        <View style={styles.sheetHeader}>
          <Text variant="lightBodyStrong" color="lightInk">选择 Agent</Text>
        </View>
        <ScrollView style={styles.sheetScroll}>
          {agents.map((a, i) => {
            const active = i === agentIdx;
            return (
              <Pressable
                key={a.id}
                onPress={() => {
                  setAgentIdx(i);
                  setModel(agents[i].model);
                  setAgentMenuOpen(false);
                }}
                style={[styles.sheetItem, styles.sheetItemRow, active && styles.sheetItemActive]}
              >
                <View style={styles.agentMeta}>
                  <RNText style={styles.agentName}>{a.id}</RNText>
                  <RNText style={styles.agentModel} numberOfLines={1}>
                    {a.model.providerID}: {a.model.modelID}
                  </RNText>
                </View>
                {active ? <Check color={lightChatColors.greenCheck} size={16} strokeWidth={2.5} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </LightSheet>

      {pendingQuestion ? (
        <LightSheet visible onClose={rejectQuestion} testID="question-sheet">
          <View style={styles.sheetHeader}>
            <Text variant="lightBodyStrong" color="lightInk">
              {pendingQuestion.questions[pendingQuestion.index].header ||
                `问题 ${pendingQuestion.index + 1}/${pendingQuestion.questions.length}`}
            </Text>
          </View>
          <View style={styles.sheetBody}>
            <Text variant="lightBody" color="lightInk">
              {pendingQuestion.questions[pendingQuestion.index].question}
            </Text>
            {pendingQuestion.questions[pendingQuestion.index].options?.map((opt) => {
              const active = questionSelections.includes(opt.label);
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => toggleQuestionOption(opt.label)}
                  accessibilityRole="button"
                  style={[styles.sheetOption, active && styles.sheetOptionActive]}
                >
                  <Text variant="lightBody" color={active ? "lightInk" : "lightSubtle"}>
                    {opt.label}
                  </Text>
                  {opt.description ? (
                    <Text variant="lightCaption" color="lightGray">{opt.description}</Text>
                  ) : null}
                </Pressable>
              );
            })}
            {pendingQuestion.questions[pendingQuestion.index].custom !== false ? (
              <TextInput
                style={styles.sheetInput}
                value={questionCustom}
                onChangeText={setQuestionCustom}
                placeholder="输入自定义答案（可选）"
                placeholderTextColor={lightChatColors.inputPlaceholder}
              />
            ) : null}
            <View style={styles.sheetActions}>
              <Pressable
                onPress={answerCurrentQuestion}
                accessibilityRole="button"
                style={styles.peachPill}
              >
                <Text variant="lightBodyStrong" color="lightInk">
                  {pendingQuestion.index < pendingQuestion.questions.length - 1 ? "下一步" : "提交"}
                </Text>
              </Pressable>
              <Pressable
                onPress={rejectQuestion}
                accessibilityRole="button"
                style={styles.quietPillFull}
              >
                <Text variant="lightBodyStrong" color="lightSubtle">跳过此问题</Text>
              </Pressable>
            </View>
          </View>
        </LightSheet>
      ) : null}

      {pendingPermission ? (
        <LightSheet visible onClose={() => replyPermission("reject")} testID="permission-sheet">
          <View style={styles.sheetHeader}>
            <Text variant="lightBodyStrong" color="lightInk">权限请求</Text>
          </View>
          <View style={styles.sheetBody}>
            <Text variant="lightBody" color="lightInk">
              Agent 请求{pendingPermission.permission === "external_directory" ? "访问外部目录" : `执行 ${pendingPermission.permission}`}
            </Text>
            {pendingPermission.patterns?.length ? (
              <Text variant="lightCaption" color="lightGray">
                {pendingPermission.patterns.join(", ")}
              </Text>
            ) : null}
            {typeof pendingPermission.metadata?.filepath === "string" ? (
              <Text variant="lightCaption" color="lightGray">
                {pendingPermission.metadata.filepath}
              </Text>
            ) : null}
            <View style={styles.sheetActions}>
              <Pressable
                onPress={() => replyPermission("once")}
                accessibilityRole="button"
                style={styles.peachPill}
              >
                <Text variant="lightBodyStrong" color="lightInk">允许一次</Text>
              </Pressable>
              <Pressable
                onPress={() => replyPermission("always")}
                accessibilityRole="button"
                style={styles.peachPill}
              >
                <Text variant="lightBodyStrong" color="lightInk">始终允许</Text>
              </Pressable>
              <Pressable
                onPress={() => replyPermission("reject")}
                accessibilityRole="button"
                style={styles.quietPillFull}
              >
                <Text variant="lightBodyStrong" color="lightSubtle">拒绝</Text>
              </Pressable>
            </View>
          </View>
        </LightSheet>
      ) : null}

      {/* #32 工具输出 sheet：LightSheet 放最后渲染（压层），mono 全文可滚动可复制 */}
      <LightSheet
        visible={!!outputViewer}
        onClose={() => setOutputViewer(null)}
        testID="tool-output-sheet"
      >
        <View style={styles.sheetHeader}>
          <Text variant="lightBodyStrong" color="lightInk" numberOfLines={1}>
            工具输出{outputViewer ? ` · ${outputViewer.tool}` : ""}
          </Text>
        </View>
        <ScrollView style={styles.outputScroll} nestedScrollEnabled>
          {outputViewer?.output ? (
            <RNText style={styles.outputMono} selectable>
              {outputViewer.output}
            </RNText>
          ) : (
            <Text variant="lightCaption" color="lightGray">（无输出）</Text>
          )}
        </ScrollView>
      </LightSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  // 白色聊天区面板（chat.html .chat-area：白底 radius 30，占 header 与输入区之间）
  chatArea: {
    flex: 1,
    backgroundColor: lightChatColors.chatArea,
    borderRadius: lightChatSizes.chatAreaRadius,
    overflow: "hidden",
  },
  list: { flex: 1 },
  // chat.html .chat-area padding 18px 18px 12px
  listContent: {
    paddingHorizontal: lightChatSizes.chatAreaPadX,
    paddingTop: lightChatSizes.chatAreaPadTop,
    paddingBottom: lightChatSizes.chatAreaPadBottom,
  },
  errorBanner: {
    marginHorizontal: lightChatSizes.chatAreaPadX,
    marginTop: lightChatSizes.chatAreaPadTop,
    padding: 10,
    borderRadius: 8,
    backgroundColor: lightColors.rowGray,
  },
  attentionCard: {
    marginHorizontal: lightChatSizes.chatAreaPadX,
    marginTop: lightChatSizes.chatAreaPadTop,
    marginBottom: lightChatSizes.msgGap,
    padding: 10,
    borderRadius: 12,
    backgroundColor: lightColors.rowGray,
    gap: 2,
  },
  quietPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: lightColors.hairline,
    backgroundColor: lightColors.white,
  },
  /* ---- #31 弹层机械换肤（LightSheet + light token；逻辑不变） ---- */
  sheetHeader: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: lightColors.divider,
  },
  sheetScroll: {
    maxHeight: 400,
  },
  sheetBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  sheetItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sheetItemActive: {
    backgroundColor: lightChatColors.peachSubtle,
  },
  sheetOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: lightColors.hairline,
    gap: 2,
  },
  sheetOptionActive: {
    borderColor: lightColors.peach,
    backgroundColor: lightChatColors.peachSubtle,
  },
  sheetInput: {
    backgroundColor: lightColors.rowGray,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: lightColors.fieldText,
    fontSize: 15,
  },
  sheetActions: {
    gap: 8,
    marginTop: 2,
  },
  /* ---- #32 工具输出 sheet ---- */
  outputScroll: {
    maxHeight: 420,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  outputMono: {
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    fontSize: 11.5,
    lineHeight: 18,
    color: lightColors.fieldText,
    paddingBottom: 10,
  },
  // mock .perm-btn.allow：peach 实心 40px 圆角（主行动作）
  peachPill: {
    height: 40,
    borderRadius: 20,
    backgroundColor: lightColors.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  // mock .perm-btn.deny：透明 + 细边（弱化动作）
  quietPillFull: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: lightChatColors.roundBtnBorder,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  /* ---- #33 交互层：composer 两态 + 排队 chip ---- */
  // mock .composer-slot：底部输入区容器（收起/展开两态共用）
  composerSlot: {
    paddingHorizontal: lightChatSizes.inputBarPadX,
    paddingTop: lightChatSizes.inputBarPadTop,
    paddingBottom: lightChatSizes.inputBarPadBottom,
  },
  flexSpacer: { flex: 1 },
  // mock .float-panel / .q-chip：排队 chip 浮层
  floatPanel: { gap: 6 },
  qChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,253,.95)",
    borderWidth: 1,
    borderColor: "rgba(13,13,13,.16)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  qTextWrap: { flex: 1, minWidth: 0 },
  qText: { fontSize: 12.5, lineHeight: 18, color: lightChatColors.bubbleInk },
  qBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: lightChatColors.chipWarmBg,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  // mock .input-pill（收起态，纵向两行）：cream 底 + 3px ink 描边 + radius 29
  inputPillCol: {
    backgroundColor: lightColors.cream,
    borderRadius: lightChatSizes.inputPillRadius,
    borderWidth: lightChatSizes.inputPillBorder,
    borderColor: lightChatColors.inputBorder,
    paddingHorizontal: 8,
  },
  pillMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 52,
  },
  roundBtn: {
    width: lightChatSizes.roundBtn,
    height: lightChatSizes.roundBtn,
    borderRadius: lightChatSizes.roundBtn / 2,
    borderWidth: 1.5,
    borderColor: lightChatColors.roundBtnBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pillPreview: { flex: 1, minWidth: 0, justifyContent: "center" },
  pillPreviewText: {
    fontSize: 15,
    lineHeight: 21,
    color: lightChatColors.inputPlaceholder,
  },
  pillPreviewDraft: { color: lightColors.fieldText },
  // mock 内嵌发送（有草稿才出现）与 stop 形态
  pillSend: {
    backgroundColor: lightColors.peach,
    borderColor: "transparent",
  },
  pillStop: {
    borderColor: "rgba(196,87,74,.5)",
    backgroundColor: "rgba(196,87,74,.1)",
  },
  // mock .pill-sub：model/agent ma-btn 行（pill 内底部）
  pillSub: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 6,
    paddingBottom: 7,
  },
  maBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 26,
    borderRadius: 999,
    paddingHorizontal: 10,
    backgroundColor: "rgba(13,13,13,.06)",
    maxWidth: 150,
  },
  maDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: lightColors.peach,
    flexShrink: 0,
  },
  maText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    color: lightChatColors.bubbleInk,
  },
  // mock .composer-box（展开态）
  composerBox: {
    backgroundColor: lightColors.cream,
    borderWidth: 3,
    borderColor: lightChatColors.inputBorder,
    borderRadius: 24,
    padding: 10,
    paddingBottom: 8,
  },
  composerInput: {
    fontSize: 15,
    lineHeight: 21,
    minHeight: 72,
    maxHeight: 200,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: lightColors.fieldText,
  },
  composerFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: 2,
    paddingHorizontal: 4,
  },
  composerMiniBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: lightChatColors.roundBtnBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  charCount: {
    fontSize: 11,
    lineHeight: 15,
    color: lightColors.grayText,
    marginLeft: 4,
  },
  composerSend: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: lightColors.peach,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  composerSendStop: { backgroundColor: lightChatColors.stopBg },
  // agent 面板行（name + model 副标题 + 选中勾）
  sheetItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  agentMeta: { flex: 1, minWidth: 0, gap: 2 },
  agentName: {
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 19,
    color: lightColors.ink,
  },
  agentModel: {
    fontSize: 11.5,
    lineHeight: 16,
    color: lightColors.grayText,
  },
  markHandledRow: {
    paddingHorizontal: lightChatSizes.chatAreaPadX,
    paddingTop: 4,
    paddingBottom: lightChatSizes.chatAreaPadBottom,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: lightChatSizes.chatAreaPadX,
    paddingVertical: spacing.sm,
  },
});
