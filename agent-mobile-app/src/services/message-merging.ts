import type { OpenCodeMessage, OpenCodePart } from "./opencode-client";
import { extractDiffText } from "./tool-diff";
import type { DutyRow, ProjectRow } from "./chat-cards";

export type ToolStep = {
  kind: "tool";
  id: string;
  tool: string;
  status?: string;
  inputSummary?: string;
  /** state.title：opencode 工具自带的目标摘要（如文件路径），比 inputSummary 干净 */
  title?: string;
  /** state.output：完整工具输出（工具输出 LightSheet 用） */
  output?: string;
  /** patch 类工具的 diff 原文（extractDiffText 提取；渲染时再 parseDiff） */
  diffText?: string;
  createdAt: number;
};

/** #30 本地卡片步：斜杠命令（/assignments、/projects）客户端拦截产生，不来自 opencode 消息 */
export type LocalCardStep =
  | { kind: "dutiesCard"; id: string; createdAt: number; rows: DutyRow[]; caption: string }
  | { kind: "projectsCard"; id: string; createdAt: number; rows: ProjectRow[] };

export type DisplayStep =
  | { kind: "user";      id: string; text: string; createdAt: number }
  | { kind: "reasoning"; id: string; text?: string; createdAt: number }
  | ToolStep
  | { kind: "text";      id: string; text: string; createdAt: number }
  | { kind: "error";     id: string; text: string; createdAt: number }
  /** 连续工具调用的呈现分组（groupToolSteps 产出；数据层 step 原样挂 tools 上） */
  | { kind: "toolGroup"; id: string; tools: ToolStep[]; createdAt: number }
  | LocalCardStep;

function isTextPart(part: OpenCodePart): part is OpenCodePart & { type: "text"; text?: string } {
  return part.type === "text";
}
function isToolPart(part: OpenCodePart): part is OpenCodePart & {
  type: "tool"; tool?: string;
  state?: { status?: string; title?: string; output?: string; metadata?: unknown; input?: unknown };
  input?: unknown;
} {
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
        const output = typeof part.state?.output === "string" ? part.state.output : undefined;
        out.push({
          kind: "tool",
          id: partId,
          tool: part.tool ?? "tool",
          status: part.state?.status,
          inputSummary: summarizeInput(part.input),
          title: typeof part.state?.title === "string" ? part.state.title : undefined,
          output,
          diffText: extractDiffText({ tool: part.tool, output, metadata: part.state?.metadata }),
          createdAt,
        });
      } else if (isReasoningPart(part)) {
        out.push({ kind: "reasoning", id: partId, text: part.text ?? "", createdAt });
      }
    }
  }

  return out;
}

/**
 * 把连续的 tool step 合并为一个 toolGroup 呈现组（#32 工具折叠组；mock chatcode.html
 * 的 tech-card：多此调用同卡，头部带计数）。非 tool step 打断分组。
 * 纯函数：不修改入参之外的对象；在 recomputeDisplay 里 mergeMessages 之后调用。
 */
export function groupToolSteps(steps: DisplayStep[]): DisplayStep[] {
  const out: DisplayStep[] = [];
  for (const s of steps) {
    const last = out[out.length - 1];
    if (s.kind === "tool") {
      if (last?.kind === "toolGroup") last.tools.push(s);
      else out.push({ kind: "toolGroup", id: s.id, tools: [s], createdAt: s.createdAt });
    } else {
      out.push(s);
    }
  }
  return out;
}
