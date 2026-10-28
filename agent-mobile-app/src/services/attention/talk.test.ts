import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveAttentionConversation } from "./talk";
import { setLocale } from "../../i18n";

const mocks = vi.hoisted(() => ({
  createSession: vi.fn(),
  getSession: vi.fn(),
  engage: vi.fn(),
}));

vi.mock("../opencode-client", () => ({
  opencodeClient: {
    createSession: mocks.createSession,
    getSession: mocks.getSession,
  },
}));

vi.mock("./client", () => ({
  engageAttention: mocks.engage,
}));

const item = {
  id: "att_1",
  domain: "market" as const,
  title: "Fund 012323 above target",
  summary: "summary",
  subjectId: "012323",
  state: "open" as const,
  sessionId: null,
};

describe("resolveAttentionConversation", () => {
  beforeEach(() => {
    mocks.createSession.mockResolvedValue({ id: "ses_new" });
    mocks.engage.mockResolvedValue(undefined);
  });

  afterEach(() => {
    setLocale("en");
    vi.clearAllMocks();
  });

  it("market 无 session → 建会话，标题前缀走字典（en）", async () => {
    const r = await resolveAttentionConversation(item);
    expect(r).toEqual({ sessionId: "ses_new", projectPath: expect.any(String), created: true });
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Handling: Fund 012323 above target" }),
    );
  });

  it("zh：标题前缀走字典", async () => {
    setLocale("zh");
    await resolveAttentionConversation(item);
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ title: "处理：Fund 012323 above target" }),
    );
  });

  it("非 market 且无 session → 抛不可用提示（en）", async () => {
    await expect(resolveAttentionConversation({ ...item, domain: "personal" })).rejects.toThrow(
      "The conversation for this item is no longer available",
    );
  });

  it("zh：不可用提示走字典", async () => {
    setLocale("zh");
    await expect(resolveAttentionConversation({ ...item, domain: "personal" })).rejects.toThrow(
      "该事项的会话已不可用",
    );
  });
});
