import type { OpenCodeMessage, OpenCodePart } from "./opencode-client";

export type DisplayStep =
  | { kind: "user";      id: string; text: string; createdAt: number }
  | { kind: "reasoning"; id: string; text?: string; createdAt: number }
  | { kind: "tool";      id: string; tool: string; status?: string; inputSummary?: string; createdAt: number }
  | { kind: "text";      id: string; text: string; createdAt: number }
  | { kind: "error";     id: string; text: string; createdAt: number };

function isTextPart(part: OpenCodePart): part is OpenCodePart & { type: "text"; text?: string } {
  return part.type === "text";
}
function isToolPart(part: OpenCodePart): part is OpenCodePart & { type: "tool"; tool?: string; state?: { status?: string }; input?: unknown } {
  return part.type === "tool";
}
function isReasoningPart(part: OpenCodePart): part is OpenCodePart & { type: "reasoning"; text?: string } {
  return part.type === "reasoning";
}

// tool.input is unknown (a command string or an args object); collapse it to a
// single-line summary for the collapsible step row / expanded detail view.
function summarizeInput(input: unknown): string | undefined {
  if (input == null) return undefined;
  let s: string;
  if (typeof input === "string") s = input;
  else {
    try { s = JSON.stringify(input); } catch { s = String(input); }
  }
  const line = s.replace(/\s+/g, " ").trim();
  if (!line) return undefined;
  return line.length > 200 ? line.slice(0, 200) + "…" : line;
}

// The model call error on an assistant message is a NamedError object
// ({ name: "ProviderAuthError", data: { message, ... } }), never a plain
// string. Coerce it to a readable single-line string so it can be rendered
// safely as a React child.
function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const obj = err as { name?: unknown; data?: { message?: unknown } };
    if (typeof obj.name === "string" && obj.data && typeof obj.data.message === "string") {
      return `${obj.name}: ${obj.data.message}`;
    }
    if (typeof obj.name === "string") return obj.name;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  }
  return String(err);
}

export function mergeMessages(
  raw: OpenCodeMessage[],
): DisplayStep[] {
  const out: DisplayStep[] = [];

  for (const msg of raw) {
    const createdAt = msg.info.time?.created ?? 0;
    if (msg.info.role === "user") {
      const text = msg.parts
        .filter(isTextPart)
        .map((p) => p.text ?? "")
        .join("\n");
      out.push({ kind: "user", id: msg.info.id, text, createdAt });
      continue;
    }

    // An assistant message carrying info.error means the model call failed
    // (e.g. an invalid/expired provider API key). The raw error text lives
    // only on the message envelope, not in any part, so surface it as its
    // own step instead of silently dropping the message.
    if (msg.info.error) {
      out.push({ kind: "error", id: msg.info.id, text: errorText(msg.info.error), createdAt });
      continue;
    }

    for (const part of msg.parts) {
      const partId = (part as { id?: string }).id ?? `${msg.info.id}-${out.length}`;
      if (isTextPart(part)) {
        const text = part.text ?? "";
        if (!text) continue;
        out.push({ kind: "text", id: partId, text, createdAt });
      } else if (isToolPart(part)) {
        out.push({
          kind: "tool",
          id: partId,
          tool: part.tool ?? "tool",
          status: part.state?.status,
          inputSummary: summarizeInput(part.input),
          createdAt,
        });
      } else if (isReasoningPart(part)) {
        out.push({ kind: "reasoning", id: partId, text: part.text ?? "", createdAt });
      }
    }
  }

  return out;
}
