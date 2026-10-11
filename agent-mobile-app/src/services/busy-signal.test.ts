import { describe, it, expect } from "vitest";
import {
  BUSY_SILENCE_MS,
  IDLE_BUSY_STATE,
  classifyBusyEvent,
  reduceBusyEvent,
  reduceBusyTick,
  seedBusy,
  type BusyState,
} from "./busy-signal";

// #58 busy 真实信号纯函数单测。
// 红线：判定只依赖"事件类型 + 时间戳"，绝不覆盖 messages / part（打字机冲突教训）。

const ACTIVITY: BusyState = { busy: true, lastEventAt: 10_000, suppressed: false };

describe("classifyBusyEvent", () => {
  it("本 session 的产出/增量事件 → activity", () => {
    for (const type of [
      "message.updated",
      "message.part.updated",
      "delta",
      "message.removed",
      "question.asked",
      "question.v2.asked",
      "question.replied",
      "permission.asked",
      "permission.replied",
      "session.updated",
      "session.created",
    ]) {
      expect(classifyBusyEvent({ type, sessionID: "s1" }, "s1")).toBe("activity");
    }
  });

  it("服务端结束信号 → ended", () => {
    expect(classifyBusyEvent({ type: "session.idle", sessionID: "s1" }, "s1")).toBe("ended");
    expect(classifyBusyEvent({ type: "session.error", sessionID: "s1" }, "s1")).toBe("ended");
  });

  it("session.status 按状态值判：busy/retry = activity，idle = ended", () => {
    expect(classifyBusyEvent({ type: "session.status", sessionID: "s1", status: "busy" }, "s1")).toBe("activity");
    expect(classifyBusyEvent({ type: "session.status", sessionID: "s1", status: "retry" }, "s1")).toBe("activity");
    expect(classifyBusyEvent({ type: "session.status", sessionID: "s1", status: "idle" }, "s1")).toBe("ended");
    // status 缺失（未知 shape）时保守判 ended，不能把状态缺失当在跑
    expect(classifyBusyEvent({ type: "session.status", sessionID: "s1" }, "s1")).toBe("ended");
  });

  it("连接级事件 → ignored（不是 agent 活动；heartbeat 每 10s 一发，当 activity 会让 busy 永久卡住）", () => {
    expect(classifyBusyEvent({ type: "server.connected" }, "s1")).toBe("ignored");
    expect(classifyBusyEvent({ type: "stream.error" }, "s1")).toBe("ignored");
    expect(classifyBusyEvent({ type: "server.heartbeat" }, "s1")).toBe("ignored");
  });

  it("别 session 的事件 → ignored", () => {
    expect(classifyBusyEvent({ type: "delta", sessionID: "other" }, "s1")).toBe("ignored");
    expect(classifyBusyEvent({ type: "session.idle", sessionID: "other" }, "s1")).toBe("ignored");
  });

  // 反转自"未知类型算 activity"：显式白名单语义下未列举的类型一律 ignored。
  // 漏判一个未知活动事件的代价只是「运行中…」晚 BUSY_SILENCE_MS(20s) 才消失，
  // 而把周期性心跳当 activity 的代价是 busy 永久为真（#58 回归）——后者更糟。
  it("#69 v2 回合启动链路 → activity（inbox/execution.started/text.started/reasoning.started）", () => {
    for (const type of [
      "session.text.started",
      "session.reasoning.started",
    ]) {
      expect(classifyBusyEvent({ type, sessionID: "s" }, "s")).toBe("activity");
    }
  });

  it("未知新事件类型 → ignored（未进白名单就不刷新时间戳，交给静默超时兜底）", () => {
    expect(classifyBusyEvent({ type: "message.part.added", sessionID: "s1" }, "s1")).toBe("ignored");
    expect(classifyBusyEvent({ type: "storage.write", sessionID: "s1" }, "s1")).toBe("ignored");
    expect(classifyBusyEvent({ type: "file.edited", sessionID: "s1" }, "s1")).toBe("ignored");
    expect(classifyBusyEvent({ type: "storage.write" }, "s1")).toBe("ignored");
  });
});

describe("reduceBusyEvent", () => {
  it("activity → busy=true 并记录时间戳", () => {
    expect(reduceBusyEvent(IDLE_BUSY_STATE, "activity", 1_000)).toEqual({ busy: true, lastEventAt: 1_000, suppressed: false });
  });

  it("ignored → 原样返回（不翻 busy、不推进时间戳）", () => {
    expect(reduceBusyEvent(ACTIVITY, "ignored", 99_000)).toBe(ACTIVITY);
    expect(reduceBusyEvent(IDLE_BUSY_STATE, "ignored", 1_000)).toBe(IDLE_BUSY_STATE);
  });

  it("已见过活动事件后 ended → 立即结束并置闩锁（#77）", () => {
    expect(reduceBusyEvent(ACTIVITY, "ended", 20_000)).toEqual({ ...IDLE_BUSY_STATE, suppressed: true });
  });

  it("还没见过活动事件时 ended 不可信 → 保持 busy（防 #44 提前判结束）", () => {
    const seeded = seedBusy(IDLE_BUSY_STATE, "busy", 5_000);
    expect(seeded).toEqual({ busy: true, lastEventAt: 5_000, suppressed: false });
    // 播种本身带时间戳，所以这里构造"无活动记录"的 busy 态更贴近受理期空窗：
    const inflight: BusyState = { busy: true, lastEventAt: null, suppressed: false };
    expect(reduceBusyEvent(inflight, "ended", 6_000)).toBe(inflight);
  });

  it("连续 activity 只更新时间戳， busy 保持 true", () => {
    let s = reduceBusyEvent(IDLE_BUSY_STATE, "activity", 1_000);
    s = reduceBusyEvent(s, "activity", 1_400);
    s = reduceBusyEvent(s, "activity", 1_800);
    expect(s).toEqual({ busy: true, lastEventAt: 1_800, suppressed: false });
  });
});

describe("reduceBusyTick", () => {
  it("未 busy → 原样", () => {
    expect(reduceBusyTick(IDLE_BUSY_STATE, 10_000_000)).toBe(IDLE_BUSY_STATE);
  });

  it("距最近事件未超过静默超时 → 保持 busy", () => {
    expect(reduceBusyTick(ACTIVITY, 10_000 + BUSY_SILENCE_MS - 1)).toBe(ACTIVITY);
  });

  it("超过静默超时 → 结束", () => {
    expect(reduceBusyTick(ACTIVITY, 10_000 + BUSY_SILENCE_MS)).toEqual(IDLE_BUSY_STATE);
    expect(reduceBusyTick(ACTIVITY, 10_000 + BUSY_SILENCE_MS + 5_000)).toEqual(IDLE_BUSY_STATE);
  });

  it("自定义 silenceMs 生效", () => {
    expect(reduceBusyTick(ACTIVITY, 10_500, 400)).toEqual(IDLE_BUSY_STATE);
    expect(reduceBusyTick(ACTIVITY, 10_300, 400)).toBe(ACTIVITY);
  });

  it("busy 但无活动记录（受理期空窗）→ 不误判结束", () => {
    const inflight: BusyState = { busy: true, lastEventAt: null, suppressed: false };
    expect(reduceBusyTick(inflight, 10_000_000)).toBe(inflight);
  });
});

describe("#77 回合结束闩锁", () => {
  it("execution.succeeded → ended 且置 suppressed；随后的 activity（title delta）被吞", () => {
    const afterEnd = reduceBusyEvent(ACTIVITY, "ended", 11_000);
    expect(afterEnd.busy).toBe(false);
    expect(afterEnd.suppressed).toBe(true);
    const afterTitleDelta = reduceBusyEvent(afterEnd, "activity", 12_000);
    expect(afterTitleDelta).toBe(afterEnd); // 被吞，状态原样
  });

  it("下一回合启动链（inbox/execution.started）解除闩锁并点亮 busy", () => {
    const afterEnd = reduceBusyEvent(ACTIVITY, "ended", 11_000);
    const rearm = reduceBusyEvent(afterEnd, "turnStart", 60_000);
    expect(rearm.busy).toBe(true);
    expect(rearm.suppressed).toBe(false);
    const delta = reduceBusyEvent(rearm, "activity", 61_000);
    expect(delta.busy).toBe(true);
  });

  it("classify：inbox.*/execution.started → turnStart", () => {
    for (const type of ["session.inbox.enqueued", "session.inbox.delivered", "session.execution.started"]) {
      expect(classifyBusyEvent({ type, sessionID: "s" }, "s")).toBe("turnStart");
    }
  });
});

describe("seedBusy", () => {
  it("读数为 busy / retry → 置 busy", () => {
    expect(seedBusy(IDLE_BUSY_STATE, "busy", 7_000)).toEqual({ busy: true, lastEventAt: 7_000, suppressed: false });
    expect(seedBusy(IDLE_BUSY_STATE, "retry", 7_000)).toEqual({ busy: true, lastEventAt: 7_000, suppressed: false });
  });

  it("读数不是 busy → 原样返回（只播种、绝不清洗已在跑的 busy）", () => {
    expect(seedBusy(IDLE_BUSY_STATE, "idle", 7_000)).toBe(IDLE_BUSY_STATE);
    expect(seedBusy(IDLE_BUSY_STATE, undefined, 7_000)).toBe(IDLE_BUSY_STATE);
    expect(seedBusy(ACTIVITY, "idle", 7_000)).toBe(ACTIVITY);
  });
});
