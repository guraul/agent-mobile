import type { OpenCodeMessage, OpenCodePart } from "./opencode-client";
import { extractDiffText } from "./tool-diff";
import { stripLeadingCheck } from "./command-receipt";

/** 出口①（#82 §B）显式记忆写入的工具名（memx 插件注册；命名与 memx 工具契约一致，勿改） */
export const MEMORY_WRITE_TOOL = "memory_write";

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

/** #59 命令族回执步：客户端本地步（ChatPanelZ 的 localSteps 追加在消息流尾部，不来自 opencode 消息） */
export type ReceiptStep = { kind: "receipt"; id: string; text: string; createdAt: number };

export type DisplayStep =
  | { kind: "user";      id: string; text: string; createdAt: number }
  | { kind: "reasoning"; id: string; text?: string; createdAt: number }
  | ToolStep
  | { kind: "text";      id: string; text: string; createdAt: number }
  | { kind: "error";     id: string; text: string; createdAt: number }
  /** 连续工具调用的呈现分组（groupToolSteps 产出；数据层 step 原样挂 tools 上） */
  | { kind: "toolGroup"; id: string; tools: ToolStep[]; createdAt: number }
  | ReceiptStep;

function isTextPart(part: OpenCodePart): part is OpenCodePart & { type: "text"; text?: string } {
  return part.type === "text";
}
function isToolPart(part: OpenCodePart): part is OpenCodePart & {
  type: "tool"; tool?: string;
  state?: {
    status?: string; title?: string; output?: string; metadata?: unknown; input?: unknown;
    /** v2 真机形状（2026-10-12 实测）：工具结果在 state.content[] 的 text part 里，不是 state.output */
    content?: Array<{ type?: string; text?: string }>;
  };
  input?: unknown;
} {
  return part.type === "tool";
}
function isReasoningPart(part: OpenCodePart): part is OpenCodePart & { type: "reasoning"; text?: string } {
  return part.type === "reasoning";
}

/**
 * 工具结果文本。v2 真机的 part 形状是 `state.content: [{type:"text",text}]`，**没有** `state.output`。
 * memory_write 的回执必须走这里，否则 chip 拿不到内容。
 * ⚠️ 范围注记：其余工具步仍只读 `state.output`——v2 下普遍为空（工具结果面板/ diff 面板可能看不到输出），
 * 那是既有的 E1 遗留问题，已记入报告，未在此顺手扩大改动面。
 */
function toolResultText(state?: { output?: string; content?: Array<{ type?: string; text?: string }> }): string | undefined {
  if (typeof state?.output === "string" && state.output.trim()) return state.output;
  const parts = state?.content;
  if (!Array.isArray(parts)) return undefined;
  const text = parts
    .filter((p) => p?.type === "text" || p?.type === undefined)
    .map((p) => p?.text ?? "")
    .join("\n")
    .trim();
  return text || undefined;
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
        const toolName = part.tool ?? "tool";
        // 出口①（#82 §B）：显式记忆写入用"一行回执"呈现，**不进工具折叠组**——
        // "约束用户的结果必须可见"是单元 1 的留痕原则，塞进可折叠的工具组等于没留痕。
        // 仍在执行（无输出）时保持 tool step，用户能看到进行中的状态。
        // 文本取 toolResultText：v2 真机把结果放在 state.content，不是 state.output。
        const receiptText = toolName === MEMORY_WRITE_TOOL ? toolResultText(part.state) : undefined;
        if (receiptText) {
          out.push({ kind: "receipt", id: partId, text: stripLeadingCheck(receiptText), createdAt });
          continue;
        }
        out.push({
          kind: "tool",
          id: partId,
          tool: toolName,
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
