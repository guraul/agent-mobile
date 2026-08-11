import type { OpenCodeMessage, OpenCodePart } from "./opencode-client";

/**
 * Merge opencode's granular messages into display-friendly chat bubbles.
 *
 * opencode models a single assistant turn as a series of "step" messages, each
 * containing step-start / reasoning / tool / text / step-finish parts. To keep
 * the chat readable we fold consecutive assistant steps (belonging to the same
 * turn, i.e. not separated by a user message) into one bubble, keeping only the
 * meaningful content: the final text plus a compact list of tool calls.
 */

export interface ToolCallSummary {
  tool: string;
  status: string;
  input?: string;
}

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  tools: ToolCallSummary[];
  createdAt: number;
}

function trimToolInput(input: unknown): string | undefined {
  if (input == null) return undefined;
  const s = typeof input === "string" ? input : JSON.stringify(input);
  return s.length > 120 ? s.slice(0, 120) + "…" : s;
}

function extractToolParts(parts: OpenCodePart[]): ToolCallSummary[] {
  const out: ToolCallSummary[] = [];
  for (const p of parts) {
    if (p.type === "tool") {
      out.push({
        tool: p.tool ?? "tool",
        status: p.state?.status ?? "running",
        input: trimToolInput(p.input),
      });
    }
  }
  return out;
}

/**
 * Merge a raw message list into display messages.
 * - user messages become their own bubble (their text)
 * - consecutive assistant messages (steps of one turn) are merged into one
 *   bubble: text parts concatenated, tool calls collected across all steps
 *
 * Assistant steps are only merged when they belong to the same turn: two
 * consecutive assistant messages with a gap larger than `mergeGapMs` are
 * treated as separate turns (e.g. the agent answering a later question or a
 * fresh streamed reply arriving while the initial page loaded), so they render
 * as separate bubbles instead of being folded together.
 */
export function mergeMessages(
  raw: OpenCodeMessage[],
  mergeGapMs = 2 * 60 * 1000,
): DisplayMessage[] {
  const out: DisplayMessage[] = [];
  let pending: DisplayMessage | null = null;

  for (const msg of raw) {
    const role = msg.info.role;
    const createdAt = msg.info.time?.created ?? 0;
    const text = msg.parts
      .filter((p): p is Extract<OpenCodePart, { type: "text" }> => p.type === "text")
      .map((p) => p.text ?? "")
      .join("\n");
    const tools = extractToolParts(msg.parts);

    if (role === "user") {
      if (pending) {
        out.push(pending);
        pending = null;
      }
      out.push({
        id: msg.info.id,
        role: "user",
        text,
        tools: [],
        createdAt,
      });
      continue;
    }

    // assistant
    if (pending) {
      const sameTurn =
        pending.createdAt > 0 &&
        createdAt > 0 &&
        createdAt - pending.createdAt <= mergeGapMs;
      if (sameTurn) {
        pending.text = pending.text ? (pending.text + "\n\n" + text).trim() : text;
        pending.tools.push(...tools);
        pending.createdAt = createdAt;
        continue;
      }
      out.push(pending);
      pending = null;
    }

    pending = {
      id: msg.info.id,
      role: "assistant",
      text,
      tools,
      createdAt,
    };
  }
  if (pending) out.push(pending);

  // drop assistant bubbles that have neither text nor tools
  return out.filter((m) => m.text.length > 0 || m.tools.length > 0);
}
