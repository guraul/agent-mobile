export const motion = {
  duration: {
    instant: 100,
    quick: 150,
    standard: 200,
    deliberate: 300,
    ambient: 2000,
  },
  easing: {
    out: { duration: 1, type: "bezier" as const, bezier: [0.2, 0, 0, 1] as [number, number, number, number] },
    in: { duration: 1, type: "bezier" as const, bezier: [0.4, 0, 1, 1] as [number, number, number, number] },
    inOut: { duration: 1, type: "bezier" as const, bezier: [0.4, 0, 0.2, 1] as [number, number, number, number] },
    ambient: { duration: 1, type: "ease-in-out" as const },
  },
  scale: {
    pressed: 0.96,
  },
} as const;

export type Motion = typeof motion;
