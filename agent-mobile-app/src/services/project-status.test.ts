import { describe, it, expect } from "vitest";
import { determineProjectStatus } from "./project-status";

const project = { id: "p1", projectPath: "/root/project/agent-mobile", updated: 1000 };
const now = 1_000_000;
const sessions = [{ id: "s1", updated: 900 }];

const base = {
  sessionStatus: {},
  pendingPermissions: new Set<string>(),
  sessionUpdated: { s1: 900 },
  projectUpdated: 1000,
};

describe("determineProjectStatus", () => {
  it("marks needs-you when a session awaits authorization", () => {
    const out = determineProjectStatus(
      project,
      sessions,
      { ...base, pendingPermissions: new Set(["s1"]) },
      now,
    );
    expect(out.status).toBe("needs-you");
    expect(out.statusLabel).toBe("Needs authorization");
  });

  it("marks needs-you when a session is idle (waiting for you)", () => {
    const out = determineProjectStatus(
      project,
      sessions,
      { ...base, sessionStatus: { s1: "idle" } },
      now,
    );
    expect(out.status).toBe("needs-you");
    expect(out.statusLabel).toBe("Needs you");
  });

  it("marks running when a session is busy", () => {
    const out = determineProjectStatus(
      project,
      sessions,
      { ...base, sessionStatus: { s1: "busy" } },
      now,
    );
    expect(out.status).toBe("running");
    expect(out.statusLabel).toBe("Running");
  });

  it("marks running with Retrying label on retry", () => {
    const out = determineProjectStatus(
      project,
      sessions,
      { ...base, sessionStatus: { s1: "retry" } },
      now,
    );
    expect(out.status).toBe("running");
    expect(out.statusLabel).toBe("Retrying");
  });

  it("marks idle when no session status known", () => {
    const out = determineProjectStatus(project, sessions, base, now);
    expect(out.status).toBe("idle");
  });

  it("needs-you (pending auth) takes priority over running", () => {
    const out = determineProjectStatus(
      project,
      sessions,
      { ...base, sessionStatus: { s1: "busy" }, pendingPermissions: new Set(["s1"]) },
      now,
    );
    expect(out.status).toBe("needs-you");
  });

  it("running takes priority over idle", () => {
    const out = determineProjectStatus(
      project,
      sessions,
      { ...base, sessionStatus: { s1: "busy" } },
      now,
    );
    expect(out.status).toBe("running");
  });

  it("derives project name from path", () => {
    const out = determineProjectStatus(project, sessions, base, now);
    expect(out.name).toBe("agent-mobile");
  });

  it("computes updated as max of project and sessions", () => {
    const out = determineProjectStatus(
      project,
      [{ id: "s1", updated: 5000 }],
      { ...base, sessionUpdated: { s1: 5000 } },
      now,
    );
    expect(out.updated).toBe(5000);
  });
});
