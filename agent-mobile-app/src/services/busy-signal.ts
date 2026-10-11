// #58 busy 真实信号（数据层）——把「agent 是否在跑」从 sending 换成真实信号。
//
// 背景（#44 根因）：doSend() 的 finally 在 prompt_async 204 返回时就 setSending(false)
// （约 1.4s），而 204 只代表"消息已被受理"、不等 agent 跑完——agent 还在生成时
// 「运行中…」已经消失。sending 描述的是"HTTP 请求在途"，不是 busy。
//
// 方案（issue #58 选定的优先方案）：SSE 事件流入 = busy。收到本 session 的活动事件
// （message.part.updated / delta / message.updated / question / permission …）即 busy；
// 静默 BUSY_SILENCE_MS 没有任何事件 → 判定已跑完；session.idle / session.error /
// session.status(idle) 是服务端的明确结束信号，提前结束。
//
// 判定方向：**显式白名单**——只有 ACTIVITY_TYPES / ACTIVITY_PREFIXES 里列举的事件
// 算 activity，其余一律 ignored（连接级噪音 server.heartbeat / server.connected /
// stream.error 等全走兜底）。之所以把"保守默认"从 activity 反转成 ignored：
//   - server.heartbeat 是**周期性**的（BFF 每 10s 一发）。10s < BUSY_SILENCE_MS(20s)，
//     判成 activity 就会永远刷新 lastEventAt → chat 页不发消息时「运行中…」永久卡住。
//   - 20s 静默兜底本来就足以覆盖真实的长工具调用，漏判活动事件最多是「运行中…」
//     晚 20s 消失。
//   - 两者代价不对称 → 偏"忽略未知"：漏判一个未知活动事件的代价只是晚 20s 收工，
//     而把噪音当活动的代价是永久卡住。
//
// 红线：零 RN 依赖、纯函数可单测；只判定 busy，绝不覆盖 messages / part
// （历史上轮询整条替换 part 会破坏打字机逐字揭示——本模块不碰消息数据）。

/** 静默超时：这么久没有本 session 的事件流入 → 判定 agent 已跑完 */
export const BUSY_SILENCE_MS = 20_000;

/** 组件侧心跳间隔（只负责唤醒纯函数重算，不参与判定语义） */
export const BUSY_TICK_MS = 1_000;

export type BusyEventKind = "activity" | "ended" | "ignored";

export interface BusyEventInput {
  /** OpenCodeEvent.type */
  type: string;
  /** 事件隶属的 session；连接级事件（server.connected / stream.error / server.heartbeat）没有 */
  sessionID?: string;
  /** `session.status` 的状态值（busy / retry / idle） */
  status?: string;
}

/** 显式活动事件（精确类型）：只有这些才刷新 busy 时间戳 */
const ACTIVITY_TYPES = new Set([
  // —— v1（BFF 兼容期保留）——
  "delta",
  "message.part.updated",
  "message.updated",
  "message.removed",
  "session.updated",
  // —— #53（E1 v2）实测事件名 ——
  "session.text.delta",
  "session.reasoning.delta",
  "session.tool.called",
  "session.tool.success",
  "session.tool.failed",
  "session.tool.progress",
  "session.step.started",
  "session.step.streamed",
  "session.step.ended",
  // 会话生命周期上"本轮开始"的一次性事件，判 activity 合理且无害
  "session.created",
  "form.created",
]);

/** 显式活动事件前缀（question.* / permission.* 的问法会随版本变，只匹配前缀） */
const ACTIVITY_PREFIXES = ["question.", "permission."];

/**
 * Classify a raw stream event for the busy signal.
 *
 * 方向：**显式列举**活动事件，其余（未知类型 + 连接级事件 server.heartbeat /
 * server.connected / stream.error …）一律 ignored。见文件头"判定方向"注释——周期性
 * 心跳当 activity 会让 busy 永久为真，而 20s 静默兜底足以覆盖真实的长工具调用。
 */
export function classifyBusyEvent(
  { type, sessionID, status }: BusyEventInput,
  activeSessionID: string,
): BusyEventKind {
  // 别的 session 的事件与本会话无关（订阅已按 sessionID 过滤，这里是二道闸）
  if (sessionID !== undefined && sessionID !== activeSessionID) return "ignored";
  // 服务端显式状态机：busy / retry = 在跑，其余（idle）= 结束
  if (type === "session.status") {
    return status === "busy" || status === "retry" ? "activity" : "ended";
  }
  // 服务端明确结束信号（v2：execution.* 为回合终态；v1 的 session.idle/error 兼容保留）
  if (type === "session.idle" || type === "session.error") return "ended";
  if (type === "session.execution.succeeded" || type === "session.execution.failed" || type === "session.execution.interrupted") return "ended";
  // 活动事件白名单（session.status 的 activity 分支已在上面判过，这里不再重复）
  if (ACTIVITY_TYPES.has(type)) return "activity";
  if (ACTIVITY_PREFIXES.some((prefix) => type.startsWith(prefix))) return "activity";
  // 兜底：连接级噪音（server.heartbeat / server.connected / stream.error）与未知类型
  return "ignored";
}

export interface BusyState {
  busy: boolean;
  /** 最近一次活动事件的时间戳（ms）；null = 本轮 busy 还没见过任何活动事件 */
  lastEventAt: number | null;
}

export const IDLE_BUSY_STATE: BusyState = { busy: false, lastEventAt: null };

/**
 * Fold one classified event into the busy state.
 *
 * ended 事件只在"本轮已经见过活动事件"时才可信：消息刚发出、agent 还没吐出任何
 * 内容时抵达的 idle，可能是受理期的状态残余。此时忽略它，交给静默超时兜底——
 * 提前判结束正是 #44 的 bug 形态。
 */
export function reduceBusyEvent(
  state: BusyState,
  kind: BusyEventKind,
  at: number,
): BusyState {
  if (kind === "ignored") return state;
  if (kind === "ended") return state.lastEventAt === null ? state : IDLE_BUSY_STATE;
  return { busy: true, lastEventAt: at };
}

/** 静默超时判定：距最近一次活动事件已超过 silenceMs → 结束；否则原样返回 */
export function reduceBusyTick(
  state: BusyState,
  now: number,
  silenceMs: number = BUSY_SILENCE_MS,
): BusyState {
  if (!state.busy || state.lastEventAt === null) return state;
  return now - state.lastEventAt >= silenceMs ? IDLE_BUSY_STATE : state;
}

/**
 * Seed busy from a one-shot `/session/status` read (reopening a chat that is
 * still running — SSE does not replay history, so without the seed the status
 * row would stay quiet until the next event).
 *
 * 只播种、绝不清洗：读数不是 busy/retry 时原样返回，不会把已在跑的 busy 抹掉。
 * 只读状态字段、不碰 messages / part，与打字机无冲突。
 */
export function seedBusy(
  state: BusyState,
  status: string | undefined,
  at: number,
): BusyState {
  if (status !== "busy" && status !== "retry") return state;
  return { busy: true, lastEventAt: at };
}
