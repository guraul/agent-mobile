import { useEffect, useRef, useState, useCallback } from "react";
import {
  applyAttentionChange,
  openPulseItems,
  reconcileFromSnapshot,
  type PulseAttentionItem,
} from "@/services/attention/store";
import {
  fetchAttentions,
  dismissAttention as dismissAttentionApi,
  engageAttention as engageAttentionApi,
  subscribeToAttentionEvents,
} from "@/services/attention/client";
import { tokenHeader } from "@/services/auth";

export interface UseAttentionsResult {
  /** Pulse actionable：state==='open' 的 Attention（视图模型） */
  open: PulseAttentionItem[];
  connected: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** 用户显式退出（PM §17 DISMISSED）；item 随 attention.updated SSE 消失 */
  dismiss: (id: string) => void;
  /** 显式 engage（记录交互 + 回填 session 引用）；engage ≠ handled */
  engage: (id: string, sessionId: string) => void;
}

/**
 * Attention store hook：REST snapshot + product SSE 增量 + 重连对账。
 * Pulse screen 不直接处理 API/SSE 细节；本 hook 不拥有 lifecycle——
 * dismiss 只是转达用户显式动作，状态迁移由 BFF 权威完成并经 SSE 回流。
 */
export function useAttentions(): UseAttentionsResult {
  const [items, setItems] = useState<PulseAttentionItem[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    if (!tokenHeader().Authorization) {
      setLoading(false);
      return;
    }
    try {
      const snapshot = await fetchAttentions();
      if (!mountedRef.current) return;
      setItems(reconcileFromSnapshot(snapshot));
      setError(null);
    } catch (e) {
      if (mountedRef.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    const unsub = subscribeToAttentionEvents({
      onChange: (change) => {
        if (!mountedRef.current) return;
        setItems((prev) => applyAttentionChange(prev, change));
      },
      onStatus: (up) => {
        if (!mountedRef.current) return;
        setConnected(up);
        if (up) setLoading(false);
      },
      onReconnect: () => {
        // SSE 重连后重新 reconcile snapshot（补偿断线期间错过的变更）
        refresh();
      },
    });
    return () => {
      mountedRef.current = false;
      unsub.unsubscribe();
    };
  }, [refresh]);

  const engage = useCallback((id: string, sessionId: string) => {
    engageAttentionApi(id, sessionId).catch((e) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  }, []);

  const dismiss = useCallback((id: string) => {
    // 乐观不移除：等 BFF 权威迁移后的 attention.updated SSE 自然移除
    dismissAttentionApi(id).catch((e) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  }, []);

  return { open: openPulseItems(items), connected, loading, error, refresh, dismiss, engage };
}
