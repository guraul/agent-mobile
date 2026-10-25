import { describe, expect, it } from "vitest";
import {
  handoffControls,
  handoffNote,
  phaseFromHandoffError,
  supersedeHandoffPhase,
  type HandoffCardPhase,
} from "./card-phase";

describe("#61 移交卡状态机", () => {
  it("draft：目标合法才能点主按钮；「先不要」始终可点", () => {
    expect(handoffControls({ kind: "draft" }, true)).toEqual({ submit: true, dismiss: true, retry: false, busy: false });
    expect(handoffControls({ kind: "draft" }, false)).toEqual({ submit: false, dismiss: true, retry: false, busy: false });
  });

  it("submitting：全部按钮禁用 + busy", () => {
    expect(handoffControls({ kind: "submitting" }, true)).toEqual({ submit: false, dismiss: false, retry: false, busy: true });
  });

  it("error：带原因、可重试，且目标仍非法时重试也禁用（不静默失败）", () => {
    const phase = phaseFromHandoffError(new Error("handoff failed: 404"));
    expect(phase).toMatchObject({ kind: "error", message: "handoff failed: 404" });
    expect(handoffControls(phase, true)).toMatchObject({ retry: true, submit: false, busy: false });
    expect(handoffControls(phase, false)).toMatchObject({ retry: false });
  });

  it("error 空异常 → 兜底文案不为空", () => {
    const phase = phaseFromHandoffError(undefined);
    expect(phase.kind).toBe("error");
    if (phase.kind === "error") expect(phase.message).toBeTruthy();
  });

  it("新块到来 → 未落地的旧卡转 superseded；已 done/dismissed 保持原样", () => {
    expect(supersedeHandoffPhase({ kind: "draft" }, true)).toEqual({ kind: "superseded" });
    expect(supersedeHandoffPhase({ kind: "error", message: "x" }, true)).toEqual({ kind: "superseded" });
    const done: HandoffCardPhase = { kind: "done", sessionId: "ses_1" };
    expect(supersedeHandoffPhase(done, true)).toBe(done);
    expect(supersedeHandoffPhase({ kind: "dismissed" }, true)).toEqual({ kind: "dismissed" });
    expect(supersedeHandoffPhase({ kind: "draft" }, false)).toEqual({ kind: "draft" });
  });

  it("终态不再有可点动作；注文案齐全", () => {
    for (const phase of [
      { kind: "done", sessionId: "ses_1" },
      { kind: "dismissed" },
      { kind: "superseded" },
    ] as HandoffCardPhase[]) {
      expect(handoffControls(phase, true)).toEqual({ submit: false, dismiss: false, retry: false, busy: false });
      expect(handoffNote(phase)).toBeTruthy();
    }
  });
});
