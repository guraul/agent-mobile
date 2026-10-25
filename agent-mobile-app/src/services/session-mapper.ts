import type { OpenCodeSession } from "./opencode-client";

// #115：session 形状归一（v2 → App 契约）。
// 生产 v2 的 session **没有顶层 directory**，目录只在 location.directory：
//   {"id":"ses_…","agent":"companion","model":{…},"location":{"directory":"/root/project/x"}}
// 客户端一律读 s.directory（talk.tsx 分流判据 / pickBareEntrySession / useProjectEvents 分组），
// 不做归一就会恒读 undefined → 判据恒 chat。归一只在这一处做，v2 形状不泄漏给调用方。

export interface RawSession {
  id: string;
  directory?: string;
  location?: { directory?: string };
  [key: string]: unknown;
}

/**
 * v2 session → OpenCodeSession。
 * - directory 取 `location.directory`（v2 权威），回落顶层 `directory`（旧形状）；
 * - 两者都缺 → undefined（**不塞 "/"**，兜底语义留给调用方）；
 * - 其余字段（title/agent/model/time/cost/tokens/summary/location…）原样透传。
 */
export function toSession(raw: RawSession | null | undefined): OpenCodeSession {
  return {
    ...raw,
    directory: raw?.location?.directory ?? raw?.directory,
  } as unknown as OpenCodeSession;
}
