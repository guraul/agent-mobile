import { getBaseUrl } from "../../config/opencode";
import { tokenHeader, handleUnauthorized } from "../auth";

// Assignment client（Phase 5 最小接入）：Talk 内的 structured creation path。
// 产品语义：Conversation → proposal → activation（PM §10/§13）。
// /assign 只是"用户显式指令"的结构化形态——market 域提案仍需 /confirm 激活，
// Agent 提案（或本命令）本身不等于授权；激活只会发生在 matrix 允许或用户确认之后。

export interface TriggerDefinitionLike {
  kind: "schedule-rule";
  schedule: string;
  timezone: string;
  condition: Record<string, unknown>;
  enabled: boolean;
}

export interface AssignmentRecord {
  id: string;
  mode: "one-shot" | "ongoing";
  responsibility: string;
  domain: "market" | "personal";
  state: "active" | "revoked" | "completed";
  createdAt: number;
  activatedAt: number;
  completedAt: number | null;
  revokedAt: number | null;
  authorizationRef: string;
  triggerDefinition: TriggerDefinitionLike;
  provenance: Record<string, unknown>;
}

export interface ProposalRecord {
  id: string;
  mode: "one-shot" | "ongoing";
  responsibility: string;
  domain: "market" | "personal";
  status: "proposed" | "confirmed" | "rejected" | "cancelled" | "expired";
  resolution: { assignmentId?: string; via?: string; reason?: string } | null;
}

export interface ProposeResponse {
  proposal: ProposalRecord;
  confirmation: { required: boolean; reason?: string };
  assignment: AssignmentRecord | null;
  duplicateOf: string | null;
}

function authHeaders(): Record<string, string> {
  return { ...tokenHeader(), Accept: "application/json" };
}

async function throwIfUnauth(res: Response): Promise<void> {
  if (res.status === 401) {
    await handleUnauthorized();
    throw new Error("unauthorized");
  }
}

export async function createProposal(body: {
  mode: "one-shot" | "ongoing";
  responsibility: string;
  domain: "market" | "personal";
  trigger: unknown;
  sessionId?: string;
  instructionRef?: string;
}): Promise<ProposeResponse> {
  const res = await fetch(`${getBaseUrl()}/api/product/assignment-proposals`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  await throwIfUnauth(res);
  if (!res.ok) throw new Error(`proposal failed: ${res.status}`);
  return (await res.json()) as ProposeResponse;
}

export async function confirmProposal(proposalId: string): Promise<{ assignment: AssignmentRecord | null; proposal: ProposalRecord }> {
  const res = await fetch(`${getBaseUrl()}/api/product/assignment-proposals/${proposalId}/confirm`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  await throwIfUnauth(res);
  const body = (await res.json()) as { assignment?: AssignmentRecord; proposal?: ProposalRecord; error?: string };
  if (!res.ok) throw new Error(body.error ?? `confirm failed: ${res.status}`);
  return { assignment: body.assignment ?? null, proposal: body.proposal! };
}

export async function rejectProposal(proposalId: string): Promise<ProposalRecord> {
  const res = await fetch(`${getBaseUrl()}/api/product/assignment-proposals/${proposalId}/reject`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  await throwIfUnauth(res);
  const body = (await res.json()) as { proposal?: ProposalRecord; error?: string };
  if (!res.ok) throw new Error(body.error ?? `reject failed: ${res.status}`);
  return body.proposal!;
}

export async function revokeAssignment(id: string): Promise<{ transitioned: boolean; item: AssignmentRecord }> {
  const res = await fetch(`${getBaseUrl()}/api/product/assignments/${id}/revoke`, {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  await throwIfUnauth(res);
  const body = (await res.json()) as { transitioned?: boolean; item?: AssignmentRecord; error?: string };
  if (!res.ok) throw new Error(body.error ?? `revoke failed: ${res.status}`);
  return { transitioned: body.transitioned ?? false, item: body.item! };
}

export async function fetchAssignments(state?: "active" | "revoked" | "completed"): Promise<AssignmentRecord[]> {
  const qs = state ? `?state=${state}` : "";
  const res = await fetch(`${getBaseUrl()}/api/product/assignments${qs}`, { headers: authHeaders() });
  await throwIfUnauth(res);
  if (!res.ok) throw new Error(`assignments failed: ${res.status}`);
  const body = (await res.json()) as { items: AssignmentRecord[] };
  return body.items ?? [];
}

// ── 命令解析（纯函数，无副作用；ChatPanelZ 在 send 前调用）──

export type AssignmentCommand =
  | { kind: "fund"; fundCode: string; op: "above-target" | "above" | "below"; value?: number; at: string }
  | { kind: "remind"; text: string; at: string }
  | { kind: "confirm"; id: string }
  | { kind: "reject"; id: string }
  | { kind: "revoke"; id: string }
  | { kind: "list" };

const TIME_RE = /^(?:at\s+)?(\d{1,2}):(\d{2})$/;

/** '14:50' → cron '50 14 * * 1-5'（基金：交易日）；'18:00' → '0 18 * * *'（提醒：每日，one-shot fire 一次即完成） */
export function timeToCron(hhmm: string, weekdayOnly: boolean): string | null {
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${min} ${h} * * ${weekdayOnly ? "1-5" : "*"}`;
}

export function parseAssignmentCommand(raw: string): AssignmentCommand | null {
  const text = raw.trim();
  if (!text.startsWith("/")) return null;
  const [cmd, ...rest] = text.split(/\s+/);
  const args = rest.join(" ");

  if (cmd === "/assignments" && !args) return { kind: "list" };
  if ((cmd === "/confirm" || cmd === "/reject" || cmd === "/revoke") && args) {
    const id = args.trim();
    if (!/^(prp|asg)_[0-9A-HJKMNP-TV-Z]+$/i.test(id)) return null;
    return { kind: cmd.slice(1) as "confirm" | "reject" | "revoke", id };
  }
  if (cmd !== "/assign" || !args) return null;

  if (args.startsWith("remind ")) {
    // /assign remind <text> at HH:MM
    const m = args.slice("remind ".length).match(/^(.+?)\s+(?:at\s+)?(\d{1,2}:\d{2})$/);
    if (!m) return null;
    return { kind: "remind", text: m[1].trim(), at: m[2] };
  }
  if (args.startsWith("fund ")) {
    // /assign fund <code> above-target|above <v>|below <v> [at HH:MM]
    const m = args.slice("fund ".length).match(/^(\w{6})\s+(above-target|above|below)(?:\s+([\d.]+))?(?:\s+at\s+(\d{1,2}:\d{2}))?$/);
    if (!m) return null;
    const op = m[2] as "above-target" | "above" | "below";
    if (op !== "above-target" && !m[3]) return null;
    return {
      kind: "fund",
      fundCode: m[1],
      op,
      value: m[3] !== undefined ? Number(m[3]) : undefined,
      at: m[4] ?? "14:50",
    };
  }
  return null;
}

function describeCondition(cmd: Extract<AssignmentCommand, { kind: "fund" }>): Record<string, unknown> {
  if (cmd.op === "above-target") return { kind: "fund-nav-above-target", fundCode: cmd.fundCode };
  if (cmd.op === "above") return { kind: "fund-nav-above", fundCode: cmd.fundCode, value: cmd.value };
  return { kind: "fund-nav-below", fundCode: cmd.fundCode, value: cmd.value };
}

/** 执行命令（副作用入口）：返回给用户的可读反馈文本。 */
export async function executeAssignmentCommand(command: AssignmentCommand, sessionId: string): Promise<string> {
  switch (command.kind) {
    case "fund": {
      const schedule = timeToCron(command.at, true);
      if (!schedule) return `无效时间 ${command.at}`;
      const result = await createProposal({
        mode: "ongoing",
        responsibility: `每个交易日 ${command.at} 监控基金 ${command.fundCode}${command.op === "above-target" ? " 估净是否达到目标净值" : command.op === "above" ? ` 是否高于 ${command.value}` : ` 是否低于 ${command.value}` }；命中时提醒我`,
        domain: "market",
        trigger: { kind: "schedule-rule", schedule, timezone: "Asia/Shanghai", condition: describeCondition(command), enabled: true },
        sessionId,
        instructionRef: `talk-command:${sessionId}`,
      });
      if (result.duplicateOf) {
        return `已有正在生效的同类监控（${result.duplicateOf}）。如需更换，请先 /revoke ${result.duplicateOf}。本次提案未创建：${result.proposal.id}`;
      }
      if (result.assignment) {
        return `✓ 已激活（低风险直接激活）\nAssignment: ${result.assignment.id}\n${result.assignment.responsibility}`;
      }
      return `已创建提案（等待你的确认——市场监控是持续责任）\nProposal: ${result.proposal.id}\n${result.proposal.responsibility}\n\n回复 /confirm ${result.proposal.id} 激活，或 /reject ${result.proposal.id} 放弃。`;
    }
    case "remind": {
      const schedule = timeToCron(command.at, false);
      if (!schedule) return `无效时间 ${command.at}`;
      const result = await createProposal({
        mode: "one-shot",
        responsibility: `${command.at} 提醒我：${command.text}`,
        domain: "personal",
        trigger: { kind: "schedule-rule", schedule, timezone: "Asia/Shanghai", condition: { kind: "always" }, enabled: true },
        sessionId,
        instructionRef: `talk-command:${sessionId}`,
      });
      if (result.assignment) {
        return `✓ 提醒已设定（低风险直接激活）\n${result.assignment.responsibility}`;
      }
      return `已创建提醒提案：${result.proposal.id}\n回复 /confirm ${result.proposal.id} 激活。`;
    }
    case "confirm": {
      const { assignment } = await confirmProposal(command.id);
      return assignment
        ? `✓ 提案已确认，Assignment 激活：${assignment.id}\n${assignment.responsibility}`
        : `提案 ${command.id} 已确认（激活结果未返回）。`;
    }
    case "reject": {
      const p = await rejectProposal(command.id);
      return `提案已拒绝：${p.id}。未创建任何 Assignment，不会产生触发。`;
    }
    case "revoke": {
      const { transitioned, item } = await revokeAssignment(command.id);
      return transitioned
        ? `✓ 已撤销：${item.id}\n未来触发已停止；已有提醒保持不变。`
        : `该 Assignment 已不在 active 状态（当前：${item.state}），无需重复撤销。`;
    }
    case "list": {
      const items = await fetchAssignments("active");
      if (items.length === 0) return "当前没有生效中的 Assignment。";
      return `生效中的 Assignment（${items.length}）：\n` + items
        .map((a) => `· ${a.id} [${a.domain}/${a.mode}] ${a.responsibility}`)
        .join("\n");
    }
  }
}
