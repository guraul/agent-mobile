export { colors } from "./colors";
export type { Colors } from "./colors";

export { typography } from "./typography";
export type { TypographyToken, TextStyleToken, TypographyStyle } from "./typography";

export { spacing } from "./spacing";
export type { SpacingToken } from "./spacing";

export { radius } from "./radius";
export type { RadiusToken } from "./radius";

export { motion } from "./motion";
export type { Motion } from "./motion";

export { iconSizes, iconStroke } from "./icons";
export type { IconSizeToken } from "./icons";

export { shadows } from "./shadows";
export type { ShadowToken } from "./shadows";

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  motion,
  iconSizes,
  iconStroke,
  shadows,
} as const;

export type Theme = typeof theme;
