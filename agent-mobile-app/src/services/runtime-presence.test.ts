import { describe, it, expect } from "vitest";
import { classifyRuntimeFailure, runtimeFailureMessage } from "./runtime-presence";

// v0.1.1 Runtime Presence：错误分类纯函数测试。
// 关键红线：不得把一切错误都归为 opcode offline——只有可确认 opencode runtime 不可达才算。

describe("classifyRuntimeFailure", () => {
  it("opencode 代理 502/503/504 → opencode-offline", () => {
    expect(classifyRuntimeFailure(new Error("opencode /project failed: 502 Bad Gateway {\"error\":\"opencode server unreachable at http://127.0.0.1:4096/project\",\"detail\":\"TypeError: fetch failed cause=Error: connect ECONNREFUSED 127.0.0.1:4096\"}"))).toBe("opencode-offline");
    expect(classifyRuntimeFailure(new Error("opencode /session failed: 503"))).toBe("opencode-offline");
  });

  it("BFF error body 直传的 unreachable 文案 → opencode-offline", () => {
    expect(classifyRuntimeFailure(new Error("opencode server unreachable at http://127.0.0.1:4096/project"))).toBe("opencode-offline");
  });

  it("直连 ECONNREFUSED 4096 → opencode-offline", () => {
    expect(classifyRuntimeFailure(new Error("connect ECONNREFUSED 127.0.0.1:4096"))).toBe("opencode-offline");
  });

  it("网络层失败（BFF 不可达）→ bff-offline，不得误判为 opencode-offline", () => {
    expect(classifyRuntimeFailure(new Error("TypeError: Failed to fetch"))).toBe("bff-offline");
    expect(classifyRuntimeFailure(new Error("Network request failed"))).toBe("bff-offline");
  });

  it("认证问题 → auth", () => {
    expect(classifyRuntimeFailure(new Error("opencode /session unauthorized"))).toBe("auth");
    expect(classifyRuntimeFailure(new Error("request failed: 401"))).toBe("auth");
  });

  it("其他业务错误 → other（绝不上报 offline）", () => {
    expect(classifyRuntimeFailure(new Error("attention list failed: 500"))).toBe("other");
    expect(classifyRuntimeFailure(new Error("proposal prp_x is rejected, not proposed"))).toBe("other");
    expect(classifyRuntimeFailure("random string")).toBe("other");
  });
});

describe("runtimeFailureMessage", () => {
  it("offline 文案是 companion 的声音（含记忆仍在的安抚），不含状态码", () => {
    const m = runtimeFailureMessage("opencode-offline");
    expect(m.title).toBe("AI is offline");
    expect(m.body).toContain("still available");
    expect(m.body).not.toMatch(/502|ECONNREFUSED/);
  });
});
