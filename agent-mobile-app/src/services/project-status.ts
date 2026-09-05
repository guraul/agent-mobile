export type SessionBusyState = "busy" | "retry" | "idle";

export type ProjectStatus = "running" | "needs-you" | "idle";

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
  /** session id -> live busy state from /session/status */
  sessionStatus: Record<string, SessionBusyState>;
  /** session ids with a pending permission awaiting authorization */
  pendingPermissions: Set<string>;
  /** session id -> last updated ms (most recent activity) */
  sessionUpdated: Record<string, number>;
  /** project updated ms */
  projectUpdated: number;
}

/**
 * Determine the aggregate status of a project from its sessions.
 *
 * Priority (simplified model driven by /session/status):
 *  1. needs-you — any session has a pending permission, OR any session is idle
 *                 (agent stopped working and is waiting for your input)
 *  2. running   — any session is busy or retrying (agent actively working)
 *  3. idle      — otherwise (no known session activity)
 */
export function determineProjectStatus(
  project: { id: string; projectPath: string; updated: number },
  sessions: { id: string; updated: number }[],
  input: ProjectStatusInput,
  now: number,
): ProjectEvent {
  const {
    sessionStatus,
    pendingPermissions,
    sessionUpdated,
    projectUpdated,
  } = input;

  const sessionIDs = sessions.map((s) => s.id);

  const hasPendingAuth = sessionIDs.some((id) => pendingPermissions.has(id));
  const hasBusy = sessionIDs.some((id) => sessionStatus[id] === "busy");
  const hasRetry = sessionIDs.some((id) => sessionStatus[id] === "retry");
  const knownIdle = sessionIDs.some((id) => sessionStatus[id] === "idle");

  const lastActivity = sessions.length > 0
    ? Math.max(...sessions.map((s) => s.updated))
    : project.updated;
  void now;

  let status: ProjectStatus;
  let statusLabel: string;
  let summary: string;

  if (hasPendingAuth) {
    status = "needs-you";
    statusLabel = "Needs authorization";
    summary = "An action is waiting for your approval.";
  } else if (hasBusy || hasRetry) {
    status = "running";
    statusLabel = hasRetry ? "Retrying" : "Running";
    summary = "Agent is working on this project.";
  } else if (knownIdle) {
    // TODO(Phase 3): knownIdle → needs-you 是 idle 误判为 Attention 的残留路径
    //（PM §16.1：interactive session idle 只是 runtime 状态，永不成为 Attention）。
    // Phase 1 已在 BFF 侧关闭其新增路径（opencode tap 白名单不含 session.idle，
    // 不产生任何 Event/Attention）；本派生分支随 Phase 3 Pulse 读 attention store 一并删除。
    status = "needs-you";
    statusLabel = "Needs you";
    summary = "Agent is waiting for your input.";
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
