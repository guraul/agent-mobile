// Fork of src/components/chat/ChatPanel.tsx —— ZCode 风格渲染层改造（#32 工具折叠组/工具输出 sheet /
// 气泡复制/时间戳 / 状态行 / 圆角输入栏）。数据逻辑（SSE 订阅 / reducer / typewriter /
// pagination / agents+model prefs）与上游保持一致，上游修复需手动同步；
// Companion migration：/talk stack route 的唯一聊天渲染层（ProjectChatZ 内嵌）。
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { View, TextInput, Pressable, Text as RNText, FlatList, ScrollView, KeyboardAvoidingView, Platform, RefreshControl, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
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
  type FormRequest,
  type PermissionRequest,
} from "../../../services/opencode-client";
import { subscribeToOpenCodeEvents, type OpenCodeEvent } from "../../../services/opencode-events";
import {
  BUSY_TICK_MS,
  IDLE_BUSY_STATE,
  classifyBusyEvent,
  reduceBusyEvent,
  reduceBusyTick,
  seedBusy,
  type BusyState,
} from "../../../services/busy-signal";
import {
  applyMessageUpdated,
  applyPartUpdated,
  applyMessageRemoved,
  applyPartDelta,
  nextRevealChars,
} from "../../../services/message-reducer";
import { mergeMessages, groupToolSteps, type DisplayStep, type ToolStep } from "../../../services/message-merging";
import { loadModelPrefs } from "../../../services/model-prefs";
import { DEFAULT_MODEL, selectModels } from "../../../services/model-registry";
import { buildAttentionContext } from "../../../services/attention/context";
import { handleAttention } from "../../../services/attention/client";
import { parseAssignmentCommand, executeAssignmentCommand } from "../../../services/assignment/client";
import { appendReceipt, makeReceiptStep } from "../../../services/command-receipt";
import {
  dequeueFirst,
  enqueueMessage,
  moveQueuedUp,
  removeQueued,
  type QueuedMessage,
} from "../../../services/message-queue";
import type { EngagedAttentionRef } from "../../../services/attention/store";
import { CHAT_AGENT_ID, CHAT_MODEL, type ConversationKind } from "../../../services/conversation-kind";
import { MessageBubbleZ } from "./MessageBubbleZ";
import { BusyDots } from "./BusyDots";
import { showAlert } from "../../../services/alert";

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
  { id: "build", model: DEFAULT_MODEL },
  { id: "plan", model: DEFAULT_MODEL },
  { id: "design", model: DEFAULT_MODEL },
] as const;


// #53（E1 v2）：回合结束事件 → 静默 refetch 消息列表（tool/step 中途事件不触发，防打字机弹出）
const REFETCH_EVENT_TYPES = new Set([
  "session.execution.succeeded",
  "session.execution.failed",
  "session.execution.interrupted",
]);

interface ChatPanelProps {
  sessionID: string;
  /** #29 双页分流判据（talk.tsx 运行时判定）：chat=伴侣页（强制 companion + 无 agent 选择器 + 思考卡收敛），其余=chatcode 工作台（现状不动） */
  kind?: ConversationKind;
  /** Phase 4：从 Attention 进入时携带——上下文卡 + 显式 Mark handled 入口 */
  attention?: EngagedAttentionRef;
  /** market 类 Create 流程：挂载后自动发送一条 Attention 上下文消息（用户显式 engage 的结果） */
  autoSendContext?: boolean;
  /** v0.1.1 通用上下文首消息（Suggested/Noticed → Talk）：挂载后发送一次；仅是对话开场，无 lifecycle/授权语义 */
  autoContextText?: string;
}

export function ChatPanelZ({ sessionID, kind, attention, autoSendContext = false, autoContextText }: ChatPanelProps) {
  // #57 chat 伴侣页判据（kind 缺省按 chatcode 处理，行为与改造前一致）
  const isChat = kind === "chat";
  const [messages, setMessages] = useState<OpenCodeMessage[]>([]);
  const [display, setDisplay] = useState<DisplayStep[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  // #58 agent 真实 busy：SSE 事件驱动（sending 只是 HTTP 请求在途，不是 busy——
  // prompt_async 204 立即返回，#44 根因）。ref 持有纯函数状态机，state 供渲染。
  const [eventBusy, setEventBusy] = useState(false);
  const busyRef = useRef<BusyState>(IDLE_BUSY_STATE);
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
  // #59 本地回执步（命令族反馈 chip；session 切换由 key remount 重置）
  const [localSteps, setLocalSteps] = useState<DisplayStep[]>([]);
  // #33 交互层：composer 两态（pill 收起 ↔ 展开全高输入）、agent 面板、客户端排队队列
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [agentMenuOpen, setAgentMenuOpen] = useState(false);
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  // 发送失败后阻塞自动 flush（防无限重试）；用户对 chip 的任何操作解除阻塞
  const [queueBlocked, setQueueBlocked] = useState(false);
  // question tool: agent asks a clarifying question and blocks until answered.
  // We queue the request and show one question at a time in a BottomSheet, then
  // POST the reply so the agent can continue.
  // #53（E1 v2）：question 机制改 form——一个 form 的每个 field 映射为既有 sheet 的
  // 一个"问题"（复用 options/custom/多步流程），提交时按 key 组装 form Answer 记录。
  const [pendingQuestion, setPendingQuestion] = useState<{
    formID: string;
    fieldKeys: string[];
    fieldTypes: string[];
    questions: { header?: string; question?: string; options?: { label: string; description?: string }[]; multiple?: boolean; custom?: boolean }[];
    index: number;
  } | null>(null);
  const [questionSelections, setQuestionSelections] = useState<string[]>([]);
  const [questionCustom, setQuestionCustom] = useState("");
  // accumulated answers for questions already stepped past (answer[0..index-1])
  const questionAnswersRef = useRef<string[][]>([]);

  const formToPending = (
    form: FormRequest,
  ): { formID: string; fieldKeys: string[]; fieldTypes: string[]; questions: { header?: string; question?: string; options?: { label: string; description?: string }[]; multiple?: boolean; custom?: boolean }[]; index: number } | null => {
    const fields = (form.fields ?? []).filter((f) => !f.hidden);
    if (!fields.length) return null;
    return {
      formID: form.id,
      fieldKeys: fields.map((f) => f.key),
      fieldTypes: fields.map((f) => f.type ?? "string"),
      questions: fields.map((f) => ({
        header: f.title ?? f.key,
        question: f.description,
        options: f.options?.map((o) => (typeof o === "string" ? { label: o } : { label: o.label ?? String(o) })),
        multiple: f.type === "multiselect",
        custom: f.type === "string",
      })),
      index: 0,
    };
  };
  // permission request: agent wants to run a tool / access a file and blocks
  // until the user allows or rejects.
  const [pendingPermission, setPendingPermission] = useState<{
    id: string;
    sessionID: string;
    permission?: string;
    patterns?: string[];
    metadata?: Record<string, unknown>;
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
  // #57：chat 伴侣页不渲染 reasoning step（BRIEF §3.7 追加拍板——思考卡是过程类 UI，
  // 多步推理会密集刷出多张 {> 思考} 卡）。「她在动」的等待信号由 #58 的 busy 状态行
  // 承载，故选「直接不渲染」而非折叠状态行（零新增过程 UI）。chatcode 侧维持 ThinkCard。
  const recomputeDisplay = useCallback((raw: OpenCodeMessage[]) => {
    const chronological = [...raw].sort(
      (a, b) => (a.info.time?.created ?? 0) - (b.info.time?.created ?? 0),
    );
    const steps = groupToolSteps(mergeMessages(chronological));
    setDisplay(isChat ? steps.filter((s) => s.kind !== "reasoning") : steps);
  }, [isChat]);

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
        const pending = await opencodeClient.listForms(sessionID);
        const mine = (pending ?? []).find((f) => f.sessionID === sessionID);
        if (mine) {
          const pendingForm = formToPending(mine);
          if (pendingForm) {
            questionAnswersRef.current = [];
            setPendingQuestion(pendingForm);
            setQuestionSelections([]);
            setQuestionCustom("");
          }
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
            permission: (mine as PermissionRequest).action ?? mine.permission,
            patterns: (mine as PermissionRequest).resources ?? mine.patterns,
            metadata: mine.metadata,
            sessionID: mine.sessionID,
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

  // #53（E1 v2）：回合结束（execution.*）或重连（stream.resync）时静默 refetch 消息列表。
  // 不挂在 tool.*/step.* 上：中途 refetch 会用真 parts 换掉流式占位（合成 partID），
  // 打字机 reveal 目标失配导致整块弹出。工具卡由此在回合结束才出现（chatcode 侧可接受）。
  const silentReload = useCallback(async () => {
    try {
      const list = await opencodeClient.listMessages(sessionID, { limit: PAGE_SIZE });
      setMessages(list);
      recomputeDisplay(list);
    } catch {
      // 下一次事件/重连会再试
    }
  }, [sessionID, recomputeDisplay]);
  const lastReloadRef = useRef(0);
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSilentReload = useCallback(() => {
    const now = Date.now();
    if (now - lastReloadRef.current < 2000) {
      if (!reloadTimerRef.current) {
        reloadTimerRef.current = setTimeout(() => {
          reloadTimerRef.current = null;
          void silentReload();
        }, 2000);
      }
      return;
    }
    lastReloadRef.current = now;
    void silentReload();
  }, [silentReload]);

  // #58 busy 真实信号：把每条流事件折进纯函数状态机（事件流入 = busy）。
  // 只判定 busy，绝不碰 messages / part——与打字机（revealChars）零耦合。
  const feedBusy = useCallback((event: OpenCodeEvent) => {
    const props = event.properties as { sessionID?: string; status?: string };
    const kind = classifyBusyEvent(
      { type: event.type, sessionID: props.sessionID, status: props.status },
      sessionID,
    );
    if (kind === "ignored") return;
    const next = reduceBusyEvent(busyRef.current, kind, Date.now());
    busyRef.current = next;
    setEventBusy(next.busy);
  }, [sessionID]);

  // #58 静默超时兜底：服务端没有显式结束信号时，N 秒无事件也判定跑完。
  // 心跳只唤醒纯函数重算，判定语义全在 services/busy-signal.ts（可单测）。
  useEffect(() => {
    if (!eventBusy) return;
    const timer = setInterval(() => {
      const next = reduceBusyTick(busyRef.current, Date.now());
      busyRef.current = next;
      setEventBusy(next.busy);
    }, BUSY_TICK_MS);
    return () => clearInterval(timer);
  }, [eventBusy]);

  // #58 重开进行中的会话：/session/status 一次性读数播种 busy（只读状态、不覆盖 part，
  // 与打字机无冲突）——SSE 不补发历史事件，不播种则要等下一个事件才显示「运行中…」。
  useEffect(() => {
    let cancelled = false;
    opencodeClient
      .getSessionStatus()
      .then((map) => {
        if (cancelled) return;
        const next = seedBusy(busyRef.current, map[sessionID], Date.now());
        busyRef.current = next;
        setEventBusy(next.busy);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionID]);

  // 发送中（请求在途）同样算 busy：覆盖 prompt_async 204 → 首个事件之间的 ~1.4s 空窗，
  // 不然点完发送到 agent 开口之间状态行是空的。
  // **#44（2026-10-13 重启）起，busy 是「agent 是否在跑」的唯一判据**：状态行、入队分流、
  // 队列自动发送、composer 主键（Stop/Send）全部看它。旧版这三处盯的是 sending（HTTP 在途
  // ~1.4s），导致入队分支与"busy 显示 Stop"永不同时成立 → 排队是死代码（#33 根因）。
  const busy = sending || eventBusy;

  useEffect(() => {
    loadMessages();
    const unsub = subscribeToOpenCodeEvents((event) => {
      // #58 busy 真实信号：任何本 session 的事件流入都算 agent 在跑（先于下面的
      // 分支处理，未知事件类型也不会漏掉）。
      feedBusy(event);
      // #53（E1 v2）：事件流无 message.updated（实测）——占位由 text.started 建、
      // delta 追加（下方原打字机分支不动）、text.ended 用完整 text 落定；
      // 结构变化（tool.*/step.ended/execution.*/synthetic）与 stream.resync → 节流 refetch。
      if (event.type === "session.text.started") {
        const d = event.properties as { sessionID?: string; assistantMessageID?: string; ordinal?: number };
        if (d.sessionID === sessionID && d.assistantMessageID) {
          const assistantMessageID = d.assistantMessageID;
          const partID = `t${d.ordinal ?? 0}`;
          setMessages((prev) => {
            if (prev.some((m) => m.info.id === assistantMessageID)) return prev;
            const next: OpenCodeMessage[] = [
              ...prev,
              {
                info: { id: assistantMessageID, role: "assistant", sessionID, time: { created: Date.now() } },
                parts: [{ id: partID, type: "text", text: "" } as OpenCodePart],
              },
            ];
            recomputeDisplay(next);
            return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
          });
        }
      } else if (event.type === "session.text.ended") {
        const d = event.properties as { sessionID?: string; assistantMessageID?: string; ordinal?: number; text?: string };
        if (d.sessionID === sessionID && d.assistantMessageID && typeof d.text === "string") {
          const partID = `t${d.ordinal ?? 0}`;
          setMessages((prev) => {
            const next = applyPartUpdated(prev, { id: partID, type: "text", text: d.text } as unknown as OpenCodePart);
            // 完整 text 到达：扩展打字机 target 收尾（不整块弹出）
            if (typingPartsRef.current.has(partID)) {
              revealTargets.current[partID] = Math.max(revealTargets.current[partID] ?? 0, (d.text ?? "").length);
            }
            recomputeDisplay(next);
            requestAnimationFrame(autoScroll);
            return next;
          });
        }
      } else if (REFETCH_EVENT_TYPES.has(event.type)) {
        scheduleSilentReload();
      } else if (event.type === "stream.resync") {
        // v2 重连不重放（实测）——上游每次连接建立都发 resync，下游 refetch 自愈
        scheduleSilentReload();
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
            requestAnimationFrame(autoScroll);
            return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
          });
        }
      } else if (event.type === "form.created") {
        const props = event.properties as { form?: FormRequest };
        const form = props.form;
        if (form?.sessionID === sessionID) {
          const pendingForm = formToPending(form);
          if (pendingForm) {
            questionAnswersRef.current = [];
            setPendingQuestion(pendingForm);
            setQuestionSelections([]);
            setQuestionCustom("");
          }
        }
      } else if (event.type === "form.replied" || event.type === "form.cancelled") {
        const props = event.properties as { sessionID?: string; id?: string };
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
            sessionID: req.sessionID,
            permission: req.action ?? req.permission,
            patterns: req.resources ?? req.patterns,
            metadata: req.metadata,
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
  }, [sessionID, loadMessages, recomputeDisplay, feedBusy]);

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

  // 2026-09-29（用户拍板）：**不采纳 server 端 agent.model**。opencode.json 里
  // primary agent 仍配着已下线的 deepseek/deepseek-v4-flash，沿用它会让每条消息在
  // loop 层抛 ProviderModelNotFoundError——assistant 消息根本不生成，用户既无回复
  // 也无 error 气泡（最隐蔽的失败形态）。统一用 DEFAULT_MODEL 覆盖；用户手动在
  // model 面板改过的偏好仍优先（那是显式选择，不是 server 默认）。
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
              // Me 偏好优先，否则统一 DEFAULT_MODEL（忽略 server agent.model）
              const p = prefs[a.name];
              return {
                id: a.name,
                model: p
                  ? { providerID: p.providerID, modelID: p.modelID }
                  : { providerID: DEFAULT_MODEL.providerID, modelID: DEFAULT_MODEL.modelID },
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
        // 白名单/排除规则集中在 services/model-registry.ts（纯函数 + 单测）：
        // 只露 mimo 系列，排除 siliconflow-cn 与 DeepSeek Pro 系。
        const flat = selectModels(data.providers);
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
        agent: isChat ? CHAT_AGENT_ID : agents[agentIdx].id,
        model: isChat ? CHAT_MODEL : model,
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
        agent: isChat ? CHAT_AGENT_ID : agents[agentIdx].id,
        model: isChat ? CHAT_MODEL : model,
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
      if (!transitioned) showAlert("已处理过", "该 Attention 已不在 OPEN 状态。");
    } catch (e) {
      showAlert("标记失败", e instanceof Error ? e.message : String(e));
    } finally {
      setMarkingHandled(false);
    }
  };

  /* ---- #59 命令族反馈：回执 chip（追加在消息流尾部，复用 localSteps） ---- */
  // 纯逻辑（✓ 剥离 + 上界裁剪）在 services/command-receipt.ts；此处只做状态回写。
  const pushReceipt = useCallback((text: string) => {
    setLocalSteps((prev) => appendReceipt(prev, makeReceiptStep(text)));
  }, []);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
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
        pushReceipt(feedback);
      } catch (e) {
        showAlert("命令失败", e instanceof Error ? e.message : String(e));
      } finally {
        setSending(false);
      }
      return;
    }
    // #33 排队分支（#44 重启）：真实 busy 时发送的消息进客户端队列，chip 可删除/上移/
    // 回填，busy 结束由 flush effect 依次发出。入口是 composer 的 Send（busy + 有草稿）。
    if (busy) {
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
      // #69：v2 无 message.updated 回传——用 prompt 响应里的用户消息立即渲染右侧气泡
      const userMessage = await opencodeClient.sendMessageAsync(sessionID, {
        parts: [{ type: "text", text }],
        // #57：chat 伴侣页固定 companion，不随 session.agent / 用户选择变化；chatcode 侧照旧
        agent: isChat ? CHAT_AGENT_ID : agents[agentIdx].id,
        model: isChat ? CHAT_MODEL : model,
      });
      if (userMessage?.info) {
        setMessages((prev) => {
          if (prev.some((m) => m.info.id === userMessage.info.id)) return prev;
          const next = [...prev, userMessage];
          recomputeDisplay(next);
          return next.length > MAX_MESSAGES ? next.slice(next.length - MAX_MESSAGES) : next;
        });
      }
      stickToBottom.current = true;
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSending(false);
    }
  }, [sessionID, isChat, agents, agentIdx, model]);

  // #33 排队队列操作统一入口：任何 chip 动作（删除/上移/回填）都解除发送阻塞
  const mutateQueue = useCallback((next: QueuedMessage[]) => {
    setQueueBlocked(false);
    setQueue(next);
  }, []);

  // #33 队列自动发送：真实 busy 翻转 false 且队列非空 → 取队首发出（agent/model 取发送
  // 时刻的当前值）。发送失败：条目放回队首 + 阻塞自动 flush（防无限重试），chip 上的
  // 删除/上移/回填操作会解除阻塞。用户主动 abort 也阻塞（见 abort()）——"停"不应紧接着
  // 自动发下一条。不碰 messages 数组（轮询冲突教训）。
  useEffect(() => {
    if (busy || queueBlocked || queue.length === 0) return;
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
  }, [busy, queueBlocked, queue, doSend]);

  const abort = async () => {
    // #44：用户主动"停"不应紧接着自动发出下一条排队消息 → 阻塞自动 flush，
    // 队列 chip 仍在（用户可删/移/回填），任何 chip 操作解除阻塞。
    setQueueBlocked(true);
    try {
      await opencodeClient.abort(sessionID);
      // #58 本地中止是最权威的结束信号：立即结束 busy，状态行交回「已停止」
      busyRef.current = IDLE_BUSY_STATE;
      setEventBusy(false);
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
      // #53（E1 v2）：form Answer = {fieldKey: value}；multiselect → string[]，其余 string
      const answer: Record<string, string | string[]> = {};
      q.fieldKeys.forEach((key, i) => {
        const val = allAnswers[i] ?? [];
        if (q.fieldTypes[i] === "multiselect") answer[key] = val;
        else if (val.length) answer[key] = val[0];
      });
      await opencodeClient.replyForm(sessionID, q.formID, answer);
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
      await opencodeClient.cancelForm(sessionID, q.formID);
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
      await opencodeClient.replyPermission(p.sessionID, p.id, reply);
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

  // #80：程序滚动后短窗忽略自身 scroll 回波——v2 突发 delta 让内容高度大步增长，
  // scrollToEnd 落定过程中的中间 onScroll（距底 >80px）会把 stickToBottom 翻 false，
  // 自动跟随从此停止（实测距底一路涨到 1300px+）。
  const autoScroll = useCallback(() => {
    if (!stickToBottom.current) return;
    ignoreScrollUntil.current = Date.now() + 250;
    listRef.current?.scrollToEnd({ animated: false });
  }, []);
  const handleContentSizeChange = () => {
    // while a reply is actively typing, always chase the latest text so the
    // newest characters are never stranded behind the agent/model row.
    if (stickToBottom.current) {
      autoScroll();
    }
  };

  // #59 本地回执步追加在消息流尾部（display 身份随 localSteps 变化，FlatList 自动重渲染）
  // useMemo 必须在条件 return（loading 分支）之前——hooks 顺序红线
  const listData = useMemo(() => [...display, ...localSteps], [display, localSteps]);

  if (loading) {
    return (
      <Box padding="lg">
        <Text variant="lightBody" color="lightGray">Loading messages…</Text>
      </Box>
    );
  }

  // #58 状态行只认 busy（真实信号）：agent 在跑才显示「运行中…」，prompt_async 204
  // 提前返回不再让它消失（#44 根因）；「已停止」与 abortedAt 语义不变。
  const listFooter = busy ? (
    <View style={styles.statusRow}>
      <Bot color={lightColors.amber} size={12} strokeWidth={2} />
      <Text variant="lightCaption" color="lightGray">运行中…</Text>
      <BusyDots testID="busy-dots" />
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
            // index 来自 listData（display + localSteps），prev 也必须取 listData——
            // 取 display[index-1] 在 localSteps 段恒为 undefined，回执会多吃一份上边距
            const prev = listData[index - 1];
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
                <MessageBubbleZ step={step} onOpenOutput={openToolOutput} />
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
                onPress={() => showAlert("附件", "附件功能即将上线")}
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
                onPress={() => showAlert("语音", "语音输入即将上线")}
                accessibilityLabel="Voice input"
                accessibilityRole="button"
                style={styles.composerMiniBtn}
                hitSlop={4}
              >
                <Mic color={lightColors.ink} size={16} strokeWidth={2} />
              </Pressable>
              {busy && !input.trim() ? (
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
                onPress={() => showAlert("附件", "附件功能即将上线")}
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
                onPress={() => showAlert("语音", "语音输入即将上线")}
                accessibilityLabel="Voice input"
                accessibilityRole="button"
                style={styles.roundBtn}
                hitSlop={4}
              >
                <Mic color={lightColors.ink} size={18} strokeWidth={2} />
              </Pressable>
              {busy && !input.trim() ? (
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
              {/* #57：chat 伴侣页 model 写死 space-bunny-free（不可修改）→ 只读标签，无选择入口；chatcode 侧保留选择器 */}
              {isChat ? (
                <View style={styles.maBtn}>
                  <View style={styles.maDot} />
                  <RNText style={styles.maText} numberOfLines={1}>{CHAT_MODEL.modelID}</RNText>
                </View>
              ) : (
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
              )}
              <View style={styles.flexSpacer} />
              {/* #57：chat 伴侣页无 agent 选择器（固定 companion）——agent pill 循环 + 长按面板仅 chatcode 侧渲染 */}
              {!isChat && (
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
              )}
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
                  void opencodeClient.switchModel(sessionID, m).catch(() => {});
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

      {/* #33 agent 面板（agent ma-btn 长按唤起；轻点仍是循环切换）：LightSheet 载体。
          #57：chat 伴侣页固定 companion、无选择器 → 面板仅 chatcode 侧渲染 */}
      {!isChat && (
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
                  void opencodeClient.switchAgent(sessionID, agents[i].id).catch(() => {});
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
      )}

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
