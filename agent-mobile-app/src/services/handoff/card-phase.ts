// #61（S3+S2）：移交卡的状态机（纯函数，卡片组件按此渲染，可单测）。
//
// draft → submitting → done / error / dismissed / superseded
// - error 必须带原因且可重试（失败不得静默）
// - superseded = 对话里又来了一张新移交卡，旧卡标「已更新」并失效

export type HandoffCardPhase =
  | { kind: "draft" }
  | { kind: "submitting" }
  | { kind: "done"; sessionId: string }
  | { kind: "error"; message: string }
  | { kind: "dismissed" }
  | { kind: "superseded" };

export interface HandoffCardControls {
  /** 主按钮「移交到工作台」可点（目标非法时禁用） */
  submit: boolean;
  /** 次按钮「先不要」可点 */
  dismiss: boolean;
  /** error 态可重试 */
  retry: boolean;
  /** 请求在途（按钮显示「移交中…」） */
  busy: boolean;
}

export function handoffControls(phase: HandoffCardPhase, targetValid: boolean): HandoffCardControls {
  switch (phase.kind) {
    case "draft":
      return { submit: targetValid, dismiss: true, retry: false, busy: false };
    case "submitting":
      return { submit: false, dismiss: false, retry: false, busy: true };
    case "error":
      return { submit: false, dismiss: true, retry: targetValid, busy: false };
    default:
      return { submit: false, dismiss: false, retry: false, busy: false };
  }
}

/** 新块到来 → 尚未落地的旧卡失效（已 done/dismissed 的保持原样，如实留痕） */
export function supersedeHandoffPhase(phase: HandoffCardPhase, superseded: boolean): HandoffCardPhase {
  if (!superseded) return phase;
  if (phase.kind === "draft" || phase.kind === "error" || phase.kind === "submitting") return { kind: "superseded" };
  return phase;
}

/** 异常 → 失败相位（不得静默：卡片转错误态 + 原因 + 重试） */
export function phaseFromHandoffError(err: unknown): HandoffCardPhase {
  const message = err instanceof Error ? err.message : String(err);
  return { kind: "error", message: message || "移交失败" };
}

/** 相位 → 卡上的一行注（无注返回 null） */
export function handoffNote(phase: HandoffCardPhase): string | null {
  switch (phase.kind) {
    case "done":
      return "已移交，正在打开工作台";
    case "dismissed":
      return "已取消，聊天的内容都还在";
    case "superseded":
      return "已更新，请看下面新的卡片";
    default:
      return null;
  }
}
