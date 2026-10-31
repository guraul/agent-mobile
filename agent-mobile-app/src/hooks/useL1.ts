import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchL1,
  subscribeL1,
  toMarketEstimate,
  type L1Statement,
  type L1MarketEstimateData,
} from "@/services/l1";
import { tokenHeader, loadToken } from "@/services/auth";

export interface UseL1Result {
  /** 当前生效 L1 statements（无 lifecycle；L1 ≠ Attention） */
  statements: L1Statement[];
  /** 行情跑马灯投影（market-estimate 类） */
  funds: L1MarketEstimateData[];
  /** Phase 12：Noticed 投影的 L1 statements（observation + retry-report + calendar + backlog-nudge） */
  noticed: L1Statement[];
  connected: boolean;
  loading: boolean;
  refresh: () => void;
}

/**
 * L1 hook（Phase 10）：snapshot + SSE + reconnect reconciliation。
 * 数据源 = /api/product/l1 + /api/product/l1/stream。
 * L1 是 informational presentation：不产生 Attention、无 badge、无 lifecycle。
 */
export function useL1(): UseL1Result {
  const [statements, setStatements] = useState<L1Statement[]>([]);
  // 订阅在挂载 effect 里同步建立，因此初始即视为已连接（错误回调再置 false），
  // 避免 effect 同步段 setConnected(true) 造成级联渲染。
  const [connected, setConnected] = useState(true);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  // SSE 每帧是全量替换，但帧里只有内存态 L1（/stream 不含 agent_reports 持久报告）。
  // 因此把上一状态里未过期的持久报告（retry-report / backlog-nudge）并回去，
  // 否则 snapshot 拿到的报告会被下一帧冲掉。
  const apply = useCallback((items: L1Statement[]) => {
    if (!mountedRef.current) return;
    setStatements((prev) => {
      const now = Date.now();
      const carried = prev.filter(
        (s) =>
          (s.kind === "retry-report" || s.kind === "backlog-nudge") &&
          (s.expiresAt === null || s.expiresAt > now),
      );
      if (carried.length === 0) return items;
      const ids = new Set(items.map((i) => i.id));
      return [...items, ...carried.filter((r) => !ids.has(r.id))];
    });
    setLoading(false);
  }, []);

  // 无凭据时不发请求，直接走同一条异步收尾（null 快照）——effect 同步段不碰 setter。
  // 冷启动：子组件 effect 早于父组件的 loadToken()，这里先补一次（幂等），
  // 否则 snapshot 会被跳过，只在 snapshot 里出现的 retry-report 永远拿不到。
  const refresh = useCallback(() => {
    return Promise.resolve()
      .then(async () => {
        if (!tokenHeader().Authorization) await loadToken();
        return tokenHeader().Authorization ? fetchL1() : null;
      })
      .then((items) => {
        if (!mountedRef.current || items === null) return;
        setStatements(items);
      })
      .catch(() => { /* stream 会覆盖 */ })
      .finally(() => {
        if (mountedRef.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const unsub = subscribeL1(
      (items) => apply(items),
      () => {
        if (mountedRef.current) setConnected(false);
      },
    );
    return () => {
      mountedRef.current = false;
      unsub();
    };
  }, [apply, refresh]);

  const funds = statements
    .map(toMarketEstimate)
    .filter((f): f is L1MarketEstimateData => f !== null);

  // Phase 12：Noticed 投影。retry-report 是持久化的夜间补跑报告（agent_reports），
  // calendar 是外部 ICS 日历的今日陈述（外部域切片 2，agent-mobile#153），
  // backlog-nudge 是未处理事项积压提醒（homebase 33a5d49，同走 agent_reports），
  // 与 observation 同属 informational，文案由服务端 L1 rule 生成，原样透传。
  const noticed = statements.filter(
    (s) =>
      s.kind === "observation" ||
      s.kind === "retry-report" ||
      s.kind === "calendar" ||
      s.kind === "backlog-nudge",
  );

  return { statements, funds, noticed, connected, loading, refresh };
}
