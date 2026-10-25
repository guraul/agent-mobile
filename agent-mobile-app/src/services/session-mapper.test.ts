import { describe, expect, it } from "vitest";
import { toSession } from "./session-mapper";
import { pickBareEntrySession, resolveConversationKind } from "./conversation-kind";

// #115：v2 session 没有顶层 directory（目录在 location.directory），
// 客户端一律读 s.directory → 不归一就恒判 chat 壳（移交后仍停在伴侣壳）。

describe("toSession（v2 session 形状归一）", () => {
  it("v2 形状：只有 location.directory → directory 取到它", () => {
    const raw = {
      id: "ses_abc",
      projectID: "prj_1",
      agent: "companion",
      model: { id: "deepseek-v4.1-flash-free", providerID: "opencode" },
      cost: 0,
      tokens: { input: 1, output: 2 },
      outcome: "success",
      time: { created: 1, updated: 2 },
      title: "移交测试",
      location: { directory: "/root/project/e2e-handoff-scratch" },
    };

    const s = toSession(raw);

    expect(s.directory).toBe("/root/project/e2e-handoff-scratch");
    // 其余字段透传（v2 形状不丢）
    expect(s.id).toBe("ses_abc");
    expect(s.title).toBe("移交测试");
    expect(s.agent).toBe("companion");
    expect(s.model).toEqual({ id: "deepseek-v4.1-flash-free", providerID: "opencode" });
    expect(s.time).toEqual({ created: 1, updated: 2 });
    expect(s.cost).toBe(0);
    expect(s.tokens).toEqual({ input: 1, output: 2 });
  });

  it("兼容旧形状：顶层 directory 存在且无 location → 仍取顶层", () => {
    const s = toSession({ id: "ses_old", directory: "/root/project/agent-mobile", title: "旧" });

    expect(s.directory).toBe("/root/project/agent-mobile");
  });

  it("两者都在且冲突 → 以 location.directory 为准（v2 是权威）", () => {
    const s = toSession({
      id: "ses_conflict",
      directory: "/stale/top-level",
      location: { directory: "/root/project/authoritative" },
    });

    expect(s.directory).toBe("/root/project/authoritative");
  });

  it("两者都缺 → directory 为 undefined（不塞 \"/\"，兜底留给调用方）", () => {
    const s = toSession({ id: "ses_empty", title: "无目录" });

    expect(s.directory).toBeUndefined();
    expect("directory" in s).toBe(true);
  });

  it("location 存在但无 directory → 回落顶层 directory", () => {
    const s = toSession({ id: "ses_half", directory: "/root/project/x", location: {} });

    expect(s.directory).toBe("/root/project/x");
  });
});

describe("归一后的 session 喂给分流判据（#115 S4 回归）", () => {
  it("v2 工程会话 → chatcode（此前恒 chat，因为读到 undefined）", () => {
    const s = toSession({
      id: "ses_handoff",
      agent: "companion",
      location: { directory: "/root/project/e2e-handoff-scratch" },
    });

    expect(resolveConversationKind(s.directory)).toBe("chatcode");
  });

  it("裸进入挑选：v2 工程会话不再被当成 chat 侧", () => {
    const list = [
      toSession({ id: "ses_code", location: { directory: "/root/project/agent-mobile" }, time: { created: 1, updated: 9 } }),
      toSession({ id: "ses_market", location: { directory: "/root/project/homebase" }, time: { created: 1, updated: 8 } }),
    ];

    expect(pickBareEntrySession(list)?.id).toBe("ses_market");
  });
});
