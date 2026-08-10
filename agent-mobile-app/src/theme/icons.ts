export const iconSizes = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export const iconStroke = 2;

export type IconSizeToken = keyof typeof iconSizes;
