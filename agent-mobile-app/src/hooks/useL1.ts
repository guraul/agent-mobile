import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchL1,
  subscribeL1,
  toMarketEstimate,
  type L1Statement,
  type L1MarketEstimateData,
} from "@/services/l1";
import { tokenHeader } from "@/services/auth";

export interface UseL1Result {
  /** 当前生效 L1 statements（无 lifecycle；L1 ≠ Attention） */
  statements: L1Statement[];
  /** 行情跑马灯投影（market-estimate 类） */
  funds: L1MarketEstimateData[];
  /** Phase 12：observation L1 statements（Noticed 投影） */
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

  const apply = useCallback((items: L1Statement[]) => {
    if (!mountedRef.current) return;
    setStatements(items);
    setLoading(false);
  }, []);

  // 无凭据时不发请求，直接走同一条异步收尾（null 快照）——effect 同步段不碰 setter。
  const refresh = useCallback(() => {
    const authed = Boolean(tokenHeader().Authorization);
    return (authed ? fetchL1() : Promise.resolve(null))
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

  // Phase 12：observation L1 statements（Noticed 投影）
  const noticed = statements.filter((s) => s.kind === "observation");

  return { statements, funds, noticed, connected, loading, refresh };
}
