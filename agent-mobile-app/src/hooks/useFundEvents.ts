import { useEffect, useState, useCallback } from "react";
import {
  subscribeToFundEvents,
  type FundEstimateItem,
} from "@/services/fund-events";

export interface UseFundEventsResult {
  /** 最新 fund.estimate 列表（L1 行情数据面，跑马灯呈现；不是 Attention） */
  funds: FundEstimateItem[];
  connected: boolean;
}

/**
 * 订阅 BFF /api/events/stream 维护基金实时估值。
 * Phase 3 起 trade-alert 不再由此 hook 消费——actionable 内容
 * 唯一来自 Attention store（useAttentions）。
 */
export function useFundEvents(): UseFundEventsResult {
  const [funds, setFunds] = useState<FundEstimateItem[]>([]);
  const [connected, setConnected] = useState(false);

  const handleEstimate = useCallback((list: FundEstimateItem[]) => {
    if (list.length === 0) return;
    setFunds(list);
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsub = subscribeToFundEvents(
      (event) => {
        if (!mounted) return;
        if (event.type === "fund.estimate") handleEstimate(event.data.funds);
      },
      () => {
        if (mounted) setConnected(false);
      },
    );
    setConnected(true);
    return () => {
      mounted = false;
      unsub();
    };
  }, [handleEstimate]);

  return { funds, connected };
}
