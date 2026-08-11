import type { OpenCodeMessage, OpenCodePart } from "./opencode-client";

/**
 * Pure reducer helpers to incrementally patch a message list from SSE events,
 * avoiding full reloads on every streamed frame.
 */

type PartWithIds = OpenCodePart & {
  id?: string;
  messageID?: string;
  sessionID?: string;
};

function findIndex(messages: OpenCodeMessage[], id: string): number {
  return messages.findIndex((m) => m.info.id === id);
}

/** Replace or append a part within a message by part id, preserving order. */
function upsertPart(parts: OpenCodePart[], part: OpenCodePart): OpenCodePart[] {
  const id = (part as PartWithIds).id;
  if (!id) return parts;
  const idx = parts.findIndex((p) => (p as PartWithIds).id === id);
  const next = [...parts];
  if (idx === -1) next.push(part);
  else next[idx] = part;
  return next;
}

/**
 * Apply a `message.updated` event: refresh that message's info only.
 * `message.updated` carries the full message `info` (role/status), while text/tool content
 * arrives via separate `message.part.updated` events, so parts are left untouched here.
 * If the message isn't in the list yet (new streaming reply), insert a placeholder so
 * subsequent `message.part.updated` events have a target to fill.
 *
 * The list is kept chronological (oldest first, matching `listMessages`), so a
 * brand-new message is inserted by creation time, typically at the end.
 */
export function applyMessageUpdated(
  messages: OpenCodeMessage[],
  info: { id: string; role: "user" | "assistant"; sessionID?: string; time?: { created?: number } },
): OpenCodeMessage[] {
  const idx = findIndex(messages, info.id);
  const nextInfo = {
    id: info.id,
    role: info.role,
    sessionID: info.sessionID ?? (idx >= 0 ? messages[idx].info.sessionID : ""),
    time: info.time?.created != null
      ? { created: info.time.created }
      : idx >= 0
        ? messages[idx].info.time
        : { created: Date.now() },
  };
  if (idx === -1) {
    const created = nextInfo.time?.created ?? Date.now();
    const insertAt = messages.findIndex((m) => (m.info.time?.created ?? 0) > created);
    const placeholder: OpenCodeMessage = { info: nextInfo, parts: [] };
    if (insertAt === -1) return [...messages, placeholder];
    const next = [...messages];
    next.splice(insertAt, 0, placeholder);
    return next;
  }
  const next = [...messages];
  next[idx] = { ...next[idx], info: nextInfo };
  return next;
}

/** Apply a `message.part.updated` event: upsert a single part into the target message. */
export function applyPartUpdated(
  messages: OpenCodeMessage[],
  part: OpenCodePart,
): OpenCodeMessage[] {
  const p = part as PartWithIds;
  if (!p.id || !p.messageID) return messages;
  const idx = findIndex(messages, p.messageID);
  if (idx === -1) return messages;
  const next = [...messages];
  const current = next[idx];
  next[idx] = {
    ...current,
    parts: upsertPart(current.parts, part),
  };
  return next;
}

/** Apply a `message.removed` event: drop the target message. */
export function applyMessageRemoved(
  messages: OpenCodeMessage[],
  messageID: string,
): OpenCodeMessage[] {
  return messages.filter((m) => m.info.id !== messageID);
}
