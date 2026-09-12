import { useEffect, useRef, useState, useCallback } from "react";
import {
  applyProposalChange,
  proposedSuggestions,
  reconcileSuggestionsFromSnapshot,
  type PulseSuggestion,
} from "@/services/proposal/store";
import {
  fetchProposals,
  confirmProposal as confirmProposalApi,
  rejectProposal as rejectProposalApi,
} from "@/services/assignment/client";
import { subscribeProposalEvents } from "@/services/proposal/client";
import { tokenHeader } from "@/services/auth";

export interface UseSuggestionsResult {
  /** Pulse Suggested：status==='proposed' 的 proposal 投影（视图模型） */
  suggestions: PulseSuggestion[];
  connected: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /**
   * 用户显式确认（PM §10 activation moment）：调用现有 confirm API。
   * 409（已在别处处理）→ 静默重拉 snapshot 对账；网络错误 → 卡片保留 + 错误提示。
   * 状态迁移由 BFF 权威完成并经 SSE 回流——本地不做乐观迁移。
   */
  confirm: (id: string) => Promise<boolean>;
  /** 用户显式拒绝（PM §10 四种结局之一）；语义同 confirm。 */
  reject: (id: string) => Promise<boolean>;
}

export function useSuggestions(): UseSuggestionsResult {
  const [items, setItems] = useState<PulseSuggestion[]>([]);
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
      const snapshot = await fetchProposals("proposed");
      if (!mountedRef.current) return;
      setItems(reconcileSuggestionsFromSnapshot(snapshot));
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
    const unsub = subscribeProposalEvents({
      onChange: (change) => {
        if (!mountedRef.current) return;
        setItems((prev) => applyProposalChange(prev, change));
      },
      onStatus: (up) => {
        if (!mountedRef.current) return;
        setConnected(up);
        if (up) setLoading(false);
      },
      onReconnect: () => {
        // SSE 重连后重新 reconcile snapshot（补偿断线期间错过的创建/迁移）
        refresh();
      },
    });
    return () => {
      mountedRef.current = false;
      unsub.unsubscribe();
    };
  }, [refresh]);

  /** 409 = proposal 已在别处处理（并发/重复动作）→ 视为"已在别处处理"，重拉对账。
   * confirm/reject 封装抛出的是 BFF error 文案（ProposalError），按其消息特征识别 409：
   * "…is <status>, not proposed…"（已终态）/ "was resolved concurrently"（并发占坑）。 */
  const act = useCallback(
    async (id: string, action: "confirm" | "reject"): Promise<boolean> => {
      try {
        if (action === "confirm") await confirmProposalApi(id);
        else await rejectProposalApi(id);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/409|not proposed|resolved concurrently/.test(msg)) {
          refresh(); // 静默对账（§8.3 失败处理）
          return false;
        }
        if (mountedRef.current) setError(msg); // 网络错误：卡片保留 + 错误提示，不乐观移除
        return false;
      }
    },
    [refresh],
  );

  const confirm = useCallback((id: string) => act(id, "confirm"), [act]);
  const reject = useCallback((id: string) => act(id, "reject"), [act]);

  return { suggestions: proposedSuggestions(items), connected, loading, error, refresh, confirm, reject };
}
