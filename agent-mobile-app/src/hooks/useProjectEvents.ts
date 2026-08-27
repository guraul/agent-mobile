import { useEffect, useRef, useState, useCallback } from "react";
import { opencodeClient, type OpenCodeSession } from "@/services/opencode-client";
import { subscribeToOpenCodeEvents, type OpenCodeEvent } from "@/services/opencode-events";
import { tokenHeader } from "@/services/auth";
import {
  determineProjectStatus,
  type ProjectEvent,
} from "@/services/project-status";

export type { ProjectEvent } from "@/services/project-status";

export interface ProjectSource {
  id: string;
  worktree: string;
  updated: number;
}

export interface UseProjectEventsResult {
  events: ProjectEvent[];
  otherProjects: ProjectEvent[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Aggregate opencode projects into Pulse "project events", each carrying a
 * live status (running / needs-you / idle) driven by /session/status plus the
 * SSE event stream (session.status, permission.updated, permission.replied).
 *
 * Note: opencode's /session/status only reports sessions that are currently
 * active (busy / retry). A session that exists but is not in that map is idle —
 * i.e. the agent has stopped and is waiting for your input.
 */
export function useProjectEvents(): UseProjectEventsResult {
  const [events, setEvents] = useState<ProjectEvent[]>([]);
  const [otherProjects, setOtherProjects] = useState<ProjectEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const projectsRef = useRef<ProjectSource[]>([]);
  const sessionsRef = useRef<OpenCodeSession[]>([]);
  const sessionStatusRef = useRef<Record<string, "busy" | "retry" | "idle">>({});
  const pendingRef = useRef<Set<string>>(new Set());

  const recompute = useCallback(() => {
    const projects = projectsRef.current;
    const sessions = sessionsRef.current;
    const sessionStatus = sessionStatusRef.current;
    const pending = pendingRef.current;

    const sessionsByProject = new Map<string, OpenCodeSession[]>();
    for (const s of sessions) {
      const key = s.directory ?? "";
      if (!sessionsByProject.has(key)) sessionsByProject.set(key, []);
      sessionsByProject.get(key)!.push(s);
    }

    const now = Date.now();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const globalSessionUpdated: Record<string, number> = {};
    for (const s of sessions) {
      globalSessionUpdated[s.id] = s.time?.updated ?? 0;
    }

    const next = projects.map((proj) => {
      const projSessions = sessionsByProject.get(proj.worktree) ?? [];

      const statusForProject = { ...sessionStatus };
      for (const s of projSessions) {
        if (!(s.id in statusForProject)) {
          statusForProject[s.id] = "idle";
        }
      }

      return determineProjectStatus(
        { id: proj.id, projectPath: proj.worktree, updated: proj.updated },
        projSessions.map((s) => ({ id: s.id, updated: s.time?.updated ?? 0 })),
        {
          sessionStatus: statusForProject,
          pendingPermissions: pending,
          sessionUpdated: Object.fromEntries(
            projSessions.map((s) => [s.id, s.time?.updated ?? 0]),
          ),
          projectUpdated: proj.updated,
        },
        now,
      );
    });

    // A project is shown only when it has a session that updated today.
    // This both hides stale pure-idle projects and guards against stale
    // "busy" entries in /session/status (opencode leaves a session marked
    // busy long after it finished; requiring today's activity filters those
    // out so they don't show up as "running" forever).
    const active = next.filter((e) =>
      e.sessionIDs.some((id) => {
        const upd = globalSessionUpdated[id];
        return upd > 0 && upd >= startOfDay.getTime();
      }),
    );
    active.sort((a, b) => b.updated - a.updated);
    setEvents(active);

    // Projects without any session activity today are still reachable — expose
    // them separately (sorted by most-recently-updated) so Pulse can show a
    // collapsible "other projects" entry instead of hiding them entirely.
    const other = next.filter(
      (e) => !active.some((a) => a.id === e.id),
    );
    other.sort((a, b) => b.updated - a.updated);
    setOtherProjects(other);
  }, []);

  const refresh = useCallback(async () => {
    // Without a login token the BFF would answer 401 — skip silently and
    // avoid spamming failed requests; pulse.tsx re-invokes refresh() once
    // the token is loaded or the user logs in.
    if (!tokenHeader().Authorization) {
      setLoading(false);
      return;
    }
    try {
      const projects = await opencodeClient.getProject();
      const sources: ProjectSource[] = projects
        .filter((p) => p.id !== "global")
        .map((p) => ({
          id: p.id,
          worktree: p.worktree,
          updated: (p as { time?: { updated?: number } }).time?.updated ?? 0,
        }));
      projectsRef.current = sources;

      const allSessions = await Promise.all(
        sources.map((p) =>
          opencodeClient.listSessions(p.worktree).catch(() => []),
        ),
      );
      const sessions = allSessions.flat();
      sessionsRef.current = sessions;

      const status = await opencodeClient.getSessionStatus();
      sessionStatusRef.current = status;

      recompute();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [recompute]);

  function handleEvent(event: OpenCodeEvent) {
    switch (event.type) {
      case "session.status": {
        const p = event.properties as { sessionID: string; status: string };
        const st = p.status === "busy" || p.status === "retry" ? p.status : "idle";
        sessionStatusRef.current = { ...sessionStatusRef.current, [p.sessionID]: st };
        recompute();
        break;
      }
      case "permission.updated": {
        const p = event.properties as { sessionID: string; permissionID?: string };
        if (p.sessionID) {
          const next = new Set(pendingRef.current);
          next.add(p.sessionID);
          pendingRef.current = next;
          recompute();
        }
        break;
      }
      case "permission.replied": {
        const p = event.properties as { sessionID: string; permissionID?: string };
        if (p.sessionID) {
          const next = new Set(pendingRef.current);
          next.delete(p.sessionID);
          pendingRef.current = next;
          recompute();
        }
        break;
      }
      case "session.updated": {
        const p = event.properties as { info?: OpenCodeSession };
        if (p.info) {
          sessionsRef.current = sessionsRef.current
            .filter((s) => s.id !== p.info!.id)
            .concat(p.info!);
          recompute();
        }
        break;
      }
      case "session.created": {
        const p = event.properties as { info?: OpenCodeSession };
        if (p.info) {
          sessionsRef.current = sessionsRef.current.concat(p.info!);
          recompute();
        }
        break;
      }
      case "session.deleted": {
        const p = event.properties as { info?: OpenCodeSession };
        if (p.info) {
          sessionsRef.current = sessionsRef.current.filter((s) => s.id !== p.info!.id);
          recompute();
        }
        break;
      }
      case "server.connected": {
        refresh();
        break;
      }
    }
  }

  useEffect(() => {
    refresh();
    const unsub = subscribeToOpenCodeEvents((event: OpenCodeEvent) => {
      handleEvent(event);
    });
    const poll = setInterval(() => refresh(), 30_000);
    return () => {
      unsub();
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { events, otherProjects, loading, error, refresh };
}
