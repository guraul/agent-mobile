import { describe, it, expect } from "vitest";
import { determineProjectStatus, type ProjectStatusInput } from "./project-status";

const project = { id: "p1", projectPath: "/root/project/agent-mobile", updated: 1000 };
const sessions = [{ id: "s1", updated: 900 }];

const base: ProjectStatusInput = {
  sessionStatus: {},
};

describe("determineProjectStatus（Phase 3：中性项目呈现态）", () => {
  it("idle（runtime 状态）→ 中性 idle，绝不产生 needs-you", () => {
    const out = determineProjectStatus(
      project,
      sessions,
      { ...base, sessionStatus: { s1: "idle" } },
    );
    expect(out.status).toBe("idle");
    expect(out.statusLabel).toBe("Idle");
    expect(out.status).not.toBe("needs-you");
  });

  it("busy → running", () => {
    const out = determineProjectStatus(
      project,
      sessions,
      { ...base, sessionStatus: { s1: "busy" } },
    );
    expect(out.status).toBe("running");
    expect(out.statusLabel).toBe("Running");
  });

  it("retry → running with Retrying label", () => {
    const out = determineProjectStatus(
      project,
      sessions,
      { ...base, sessionStatus: { s1: "retry" } },
    );
    expect(out.status).toBe("running");
    expect(out.statusLabel).toBe("Retrying");
  });

  it("无 session 状态 → idle", () => {
    const out = determineProjectStatus(project, sessions, base);
    expect(out.status).toBe("idle");
  });

  it("running 优先于 idle", () => {
    const out = determineProjectStatus(
      project,
      [{ id: "s1", updated: 5000 }, { id: "s2", updated: 4000 }],
      { ...base, sessionStatus: { s1: "busy", s2: "idle" } },
    );
    expect(out.status).toBe("running");
  });

  it("regression：任何 runtime 状态组合都不产生 needs-you", () => {
    for (const st of ["busy", "retry", "idle"] as const) {
      const out = determineProjectStatus(project, sessions, { ...base, sessionStatus: { s1: st } });
      expect(out.status).not.toBe("needs-you");
      expect(["running", "idle"]).toContain(out.status);
    }
  });

  it("derives project name from path", () => {
    const out = determineProjectStatus(project, sessions, base);
    expect(out.name).toBe("agent-mobile");
  });

  it("computes updated as max of sessions", () => {
    const out = determineProjectStatus(
      project,
      [{ id: "s1", updated: 5000 }],
      base,
    );
    expect(out.updated).toBe(5000);
  });
});
