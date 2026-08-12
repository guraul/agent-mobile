import type { OpenCodeMessage, OpenCodePart } from "./opencode-client";

export type DisplayStep =
  | { kind: "user";        id: string; text: string; createdAt: number }
  | { kind: "step-start";  id: string; createdAt: number }
  | { kind: "reasoning";   id: string; createdAt: number }
  | { kind: "tool";        id: string; tool: string; status?: string; createdAt: number }
  | { kind: "text";        id: string; text: string; createdAt: number }
  | { kind: "step-finish"; id: string; createdAt: number };

function isTextPart(part: OpenCodePart): part is OpenCodePart & { type: "text"; text?: string } {
  return part.type === "text";
}
function isToolPart(part: OpenCodePart): part is OpenCodePart & { type: "tool"; tool?: string; state?: { status?: string } } {
  return part.type === "tool";
}
function isProcessPart(part: OpenCodePart): part is OpenCodePart & { type: "step-start" | "reasoning" | "step-finish" } {
  return part.type === "step-start" || part.type === "reasoning" || part.type === "step-finish";
}

export function mergeMessages(
  raw: OpenCodeMessage[],
  _mergeGapMs = 2 * 60 * 1000,
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
          createdAt,
        });
      } else if (isProcessPart(part)) {
        out.push({ kind: part.type, id: partId, createdAt });
      }
    }
  }

  return out;
}
