import { useEffect, useRef, useState, useCallback } from "react";
import {
  subscribeToFundEvents,
  type FundEstimateItem,
  type FundTradeAlertItem,
} from "@/services/fund-events";

export interface UseFundEventsResult {
  funds: FundEstimateItem[];
  alert: FundTradeAlertItem[] | null;
  connected: boolean;
  /** 确认处理交易提醒——清空 alert，needs-you 消失（跑马灯回落 MARKET 分组） */
  dismissAlert: () => void;
}

/**
 * 订阅 BFF 通用事件流，维护基金实时估值 + 14:50 交易提醒。
 * - funds：最新 fund.estimate 列表（驱动 Pulse 跑马灯）
 * - alert：收到 fund.trade-alert 后的提醒（升级 needs-you）
 */
export function useFundEvents(): UseFundEventsResult {
  const [funds, setFunds] = useState<FundEstimateItem[]>([]);
  const [alert, setAlert] = useState<FundTradeAlertItem[] | null>(null);
  const [connected, setConnected] = useState(false);

  const fundsRef = useRef<FundEstimateItem[]>([]);
  const alertRef = useRef<FundTradeAlertItem[] | null>(null);

  const handleEstimate = useCallback((list: FundEstimateItem[]) => {
    if (list.length === 0) return;
    fundsRef.current = list;
    setFunds(list);
  }, []);

  const handleAlert = useCallback((list: FundTradeAlertItem[]) => {
    if (list.length === 0) return;
    alertRef.current = list;
    setAlert(list);
  }, []);

  const dismissAlert = useCallback(() => {
    alertRef.current = null;
    setAlert(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const unsub = subscribeToFundEvents(
      (event) => {
        if (!mounted) return;
        if (event.type === "fund.estimate") handleEstimate(event.data.funds as FundEstimateItem[]);
        else if (event.type === "fund.trade-alert") handleAlert(event.data.funds as FundTradeAlertItem[]);
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
  }, [handleEstimate, handleAlert]);

  return { funds, alert, connected, dismissAlert };
}
