// 抽屉手势判定（epic #35 / #34F，issue #46）：
// RN Web 无原生 drawer——自实现 transform + PanResponder。本模块把手势的
// 「松手去留」决策抽成纯函数（DoD：手势状态机抽纯函数补单测），拖拽跟手
// 的 clamp 逻辑同样收编，组件层只做动画与事件接线。
// 红线：纯函数、零 RN 依赖、可单测。

export type DrawerSnap = "open" | "close";

/**
 * 拖拽位移 → 抽屉跟手位置（px，0=全开，-width=全关）。
 * base = 拖拽起点位置（closed=-width / open=0），dx = 手指水平位移。
 */
export function clampDrawerTranslate(base: number, dx: number, width: number): number {
  if (width <= 0) return base;
  return Math.max(-width, Math.min(0, base + dx));
}

/**
 * 松手去留：快甩（|vx|>0.5 px/ms）看方向，否则看位移是否过宽度 35% 阈值。
 * dx 约定：从关到开为正（边缘右滑）；从开到关为负（抽屉左滑收回）。
 */
export function decideDrawerSnap(dx: number, width: number, vx: number): DrawerSnap {
  if (Math.abs(vx) > 0.5) return vx > 0 ? "open" : "close";
  const threshold = width > 0 ? width * 0.35 : 80;
  return dx > threshold ? "open" : "close";
}

/** 边缘手势意图判定：水平位移够且明显强于垂直（避免吃掉列表纵向滚动） */
export function isHorizontalDrag(dx: number, dy: number): boolean {
  return Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5;
}
