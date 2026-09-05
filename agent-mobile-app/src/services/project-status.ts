export type SessionBusyState = "busy" | "retry" | "idle";

/**
 * Phase 3 起 project status 只是**中性/信息性**的项目呈现态：
 *   running = agent 正在工作（runtime busy/retry）
 *   idle    = 没有可报告的活动
 * 「需要用户处理」不再来自 runtime/session 状态（PM §16.1：session.idle 是
 * runtime 技术状态，永不成为 Attention），而唯一来自 Attention store
 * （state='open'，经 /api/product/attention + /api/product/stream）。
 * 旧的 knownIdle/pendingPermissions → needs-you 派生路径已删除（PM §16.1）。
 */
export type ProjectStatus = "running" | "idle";

export interface ProjectEvent {
  id: string;
  projectPath: string;
  name: string;
  status: ProjectStatus;
  statusLabel: string;
  summary: string;
  updated: number;
  sessionIDs: string[];
}

export interface ProjectStatusInput {
  /** session id -> live busy state from /session/status（信息性，不产生 actionable） */
  sessionStatus: Record<string, SessionBusyState>;
}

/**
 * Determine the aggregate status of a project from its sessions.
 *
 * Priority:
 *  1. running — any session is busy or retrying (agent actively working)
 *  2. idle    — otherwise（中性呈现；绝不产生 needs-you / Attention / badge）
 */
export function determineProjectStatus(
  project: { id: string; projectPath: string; updated: number },
  sessions: { id: string; updated: number }[],
  input: ProjectStatusInput,
): ProjectEvent {
  const { sessionStatus } = input;

  const sessionIDs = sessions.map((s) => s.id);

  const hasBusy = sessionIDs.some((id) => sessionStatus[id] === "busy");
  const hasRetry = sessionIDs.some((id) => sessionStatus[id] === "retry");

  const lastActivity = sessions.length > 0
    ? Math.max(...sessions.map((s) => s.updated))
    : project.updated;

  let status: ProjectStatus;
  let statusLabel: string;
  let summary: string;

  if (hasBusy || hasRetry) {
    status = "running";
    statusLabel = hasRetry ? "Retrying" : "Running";
    summary = "Agent is working on this project.";
  } else {
    status = "idle";
    statusLabel = "Idle";
    summary = "No recent activity.";
  }

  return {
    id: project.id,
    projectPath: project.projectPath,
    name: project.projectPath.split("/").filter(Boolean).pop() ?? project.projectPath,
    status,
    statusLabel,
    summary,
    updated: lastActivity,
    sessionIDs,
  };
}
