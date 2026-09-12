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
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const apply = useCallback((items: L1Statement[]) => {
    if (!mountedRef.current) return;
    setStatements(items);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    if (!tokenHeader().Authorization) {
      setLoading(false);
      return;
    }
    try {
      const items = await fetchL1();
      if (mountedRef.current) setStatements(items);
    } catch { /* stream 会覆盖 */ }
    finally {
      if (mountedRef.current) setLoading(false);
    }
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
    setConnected(true);
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
