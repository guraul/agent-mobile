import { describe, expect, it } from "vitest";
import {
  MARKET_TALK_DIRECTORY,
  resolveConversationKind,
} from "./conversation-kind";

// 双 chat 页分流判据（epic #35 / #29）：
// 绑项目 → chatcode；market 工作区 / 无项目 → chat

describe("resolveConversationKind", () => {
  it("market 工作区目录 → chat（market 会话统一挂 MARKET_TALK_DIRECTORY）", () => {
    expect(resolveConversationKind(MARKET_TALK_DIRECTORY)).toBe("chat");
  });

  it("无 directory / 根目录 / 空白 → chat（裸进入 & Direct Talk 默认）", () => {
    expect(resolveConversationKind(undefined)).toBe("chat");
    expect(resolveConversationKind(null)).toBe("chat");
    expect(resolveConversationKind("")).toBe("chat");
    expect(resolveConversationKind("/")).toBe("chat");
    expect(resolveConversationKind("   ")).toBe("chat");
  });

  it("绑项目的会话 → chatcode（运行时判据：directory 是 session 属性）", () => {
    expect(resolveConversationKind("/root/project/agent-mobile")).toBe("chatcode");
    expect(resolveConversationKind("/Users/gubin/workspace/agent-mobile")).toBe("chatcode");
    expect(resolveConversationKind("/home/u/repo")).toBe("chatcode");
  });

  it("前后空白不改变判据", () => {
    expect(resolveConversationKind(" /root/project/agent-mobile ")).toBe("chatcode");
    expect(resolveConversationKind(" / ")).toBe("chat");
  });
});

describe("MARKET_TALK_DIRECTORY", () => {
  it("与 attention/talk.ts 的既有值一致（re-export 收编，调用方无感）", () => {
    expect(MARKET_TALK_DIRECTORY).toBe("/root/project/family-finance");
  });
});
