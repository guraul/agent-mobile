import { describe, it, expect, vi } from "vitest";
import {
  ATTENTION_LOAD_ATTEMPTS,
  loadAttentionSnapshot,
  shouldFetchAttentions,
  type AttentionLoadDeps,
} from "./cold-start";
import type { AttentionItem } from "./store";

const item = (id: string): AttentionItem => ({
  id,
  dedupKey: `dedup:${id}`,
  subjectKind: "alert",
  subjectId: id,
  domain: "market",
  creationReasonKind: "rule",
  creationReasonRef: "rule:1",
  sessionId: null,
  state: "open",
  createdAt: 1,
  expiresAt: null,
  handledAt: null,
  dismissedAt: null,
  expiredAt: null,
  handlingRef: null,
  title: "t",
  summary: "s",
  provenance: {},
});

/** 可变的“内存 token”：ensureToken 会把它从 null 变成凭据 */
function harness(opts: {
  initialToken: string | null;
  tokenAfterEnsure?: string | null;
  fetchImpl: () => Promise<AttentionItem[]>;
}) {
  let token = opts.initialToken;
  const ensureToken = vi.fn(async () => {
    token = opts.tokenAfterEnsure ?? null;
  });
  const fetchSnapshot = vi.fn(opts.fetchImpl);
  const deps: AttentionLoadDeps = {
    readToken: () => token,
    ensureToken,
    fetchSnapshot,
  };
  return { deps, ensureToken, fetchSnapshot };
}

describe("shouldFetchAttentions", () => {
  it("有 token 才拉", () => {
    expect(shouldFetchAttentions("Bearer abc")).toBe(true);
  });

  it("空 token / 缺失 → 不拉", () => {
    expect(shouldFetchAttentions(null)).toBe(false);
    expect(shouldFetchAttentions(undefined)).toBe(false);
    expect(shouldFetchAttentions("")).toBe(false);
  });
});

describe("loadAttentionSnapshot 冷启动时序", () => {
  it("无 token 且补加载后仍无 token → 不发请求，返回 null", async () => {
    const { deps, ensureToken, fetchSnapshot } = harness({
      initialToken: null,
      tokenAfterEnsure: null,
      fetchImpl: async () => [item("a")],
    });

    expect(await loadAttentionSnapshot(deps)).toBeNull();
    expect(ensureToken).toHaveBeenCalledTimes(1);
    expect(fetchSnapshot).not.toHaveBeenCalled();
  });

  it("挂载时 token 未就绪 → 等 token 就绪后再拉一次", async () => {
    const snapshot = [item("a"), item("b")];
    const { deps, ensureToken, fetchSnapshot } = harness({
      initialToken: null,
      tokenAfterEnsure: "Bearer late",
      fetchImpl: async () => snapshot,
    });

    expect(await loadAttentionSnapshot(deps)).toEqual(snapshot);
    expect(ensureToken).toHaveBeenCalledTimes(1);
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
  });

  it("token 已就绪 → 不补加载，直接拉", async () => {
    const snapshot = [item("a")];
    const { deps, ensureToken, fetchSnapshot } = harness({
      initialToken: "Bearer ready",
      fetchImpl: async () => snapshot,
    });

    expect(await loadAttentionSnapshot(deps)).toEqual(snapshot);
    expect(ensureToken).not.toHaveBeenCalled();
    expect(fetchSnapshot).toHaveBeenCalledTimes(1);
  });
});

describe("loadAttentionSnapshot 重试", () => {
  it("首次失败 → 重试一次成功", async () => {
    const snapshot = [item("a")];
    let calls = 0;
    const { deps, fetchSnapshot } = harness({
      initialToken: "Bearer ready",
      fetchImpl: async () => {
        calls++;
        if (calls === 1) throw new Error("network down");
        return snapshot;
      },
    });

    expect(await loadAttentionSnapshot(deps)).toEqual(snapshot);
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
  });

  it("连续失败 → 只重试一次后抛错，不无限循环", async () => {
    const { deps, fetchSnapshot } = harness({
      initialToken: "Bearer ready",
      fetchImpl: async () => {
        throw new Error("still down");
      },
    });

    await expect(loadAttentionSnapshot(deps)).rejects.toThrow("still down");
    expect(fetchSnapshot).toHaveBeenCalledTimes(ATTENTION_LOAD_ATTEMPTS);
    expect(fetchSnapshot).toHaveBeenCalledTimes(2);
  });
});
