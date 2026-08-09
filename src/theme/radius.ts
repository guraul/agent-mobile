export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
