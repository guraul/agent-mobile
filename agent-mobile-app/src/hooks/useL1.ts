import { useEffect, useState, useCallback, useRef } from "react";
import {
  fetchL1,
  subscribeL1,
  toMarketEstimate,
  PERSISTENT_L1_KINDS,
  NOTICED_ONLY_L1_KINDS,
  type L1Statement,
  type L1MarketEstimateData,
} from "@/services/l1";

/** kind 是否属于持久报告（从单一集合派生，新增 kind 只改 `services/l1.ts`）。 */
const PERSISTENT = new Set<string>(PERSISTENT_L1_KINDS);
/** 「提醒」列表接受的 kind = 持久报告 ∪ observation/calendar。 */
const NOTICED = new Set<string>([...PERSISTENT_L1_KINDS, ...NOTICED_ONLY_L1_KINDS]);
import { tokenHeader, loadToken } from "@/services/auth";

export interface UseL1Result {
  /** 当前生效 L1 statements（无 lifecycle；L1 ≠ Attention） */
  statements: L1Statement[];
  /** 行情跑马灯投影（market-estimate 类） */
  funds: L1MarketEstimateData[];
  /** Phase 12：Noticed 投影的 L1 statements（kind 清单见 `services/l1.ts` 的两个集合） */
  noticed: L1Statement[];
  connected: boolean;
  loading: boolean;
  refresh: () => void;
}

/**
 * SSE 帧全量替换时的并回：帧里只有内存态 L1（/stream 不含 agent_reports 持久报告），
 * 因此把上一状态里未过期的持久报告并进新帧，否则 snapshot 拿到的报告会被下一帧冲掉。
 * 「哪些 kind 算持久报告」只在 `services/l1.ts` 的 `PERSISTENT_L1_KINDS` 定义一次。
 */
export function carryPersistents(
  prev: L1Statement[],
  items: L1Statement[],
  now: number = Date.now(),
): L1Statement[] {
  const carried = prev.filter(
    (s) => PERSISTENT.has(s.kind) && (s.expiresAt === null || s.expiresAt > now),
  );
  if (carried.length === 0) return items;
  const ids = new Set(items.map((i) => i.id));
  return [...items, ...carried.filter((r) => !ids.has(r.id))];
}

/**
 * Noticed 投影：哪些 kind 进「提醒」列表。清单来自 `services/l1.ts` 的两个集合
 * （持久报告 + observation/calendar），文案由服务端生成，原样透传。
 * 持久报告（含 deploy-failed，homebase #183/#184）缺 carried 会「闪一下就被下一帧冲掉」，
 * 缺本投影就完全不显示——两处都从同一集合派生，新增 kind 不需要再改这里。
 */
export function projectNoticed(statements: L1Statement[]): L1Statement[] {
  return statements.filter((s) => NOTICED.has(s.kind));
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

  // SSE 每帧是全量替换，但帧里只有内存态 L1（/stream 不含 agent_reports 持久报告），
  // 因此用 carryPersistents 把上一状态里未过期的持久报告并回去（含 deploy-failed，见该函数注释）。
  const apply = useCallback((items: L1Statement[]) => {
    if (!mountedRef.current) return;
    setStatements((prev) => carryPersistents(prev, items));
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

  // Phase 12：Noticed 投影，见 projectNoticed（各 kind 出处与 deploy-failed 注释都在那里）。
  const noticed = projectNoticed(statements);

  return { statements, funds, noticed, connected, loading, refresh };
}
