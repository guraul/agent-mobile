import { colors, type Colors } from "./colors";
import {
  typography,
  type TypographyToken,
  type TextStyleToken,
  type TypographyStyle,
} from "./typography";
import { spacing, type SpacingToken } from "./spacing";
import { radius, type RadiusToken } from "./radius";
import { motion, type Motion } from "./motion";
import { iconSizes, iconStroke, type IconSizeToken } from "./icons";
import { shadows, type ShadowToken } from "./shadows";

export { colors };
export type { Colors };

export { typography };
export type { TypographyToken, TextStyleToken, TypographyStyle };

export { spacing };
export type { SpacingToken };

export { radius };
export type { RadiusToken };

export { motion };
export type { Motion };

export { iconSizes, iconStroke };
export type { IconSizeToken };

export { shadows };
export type { ShadowToken };

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
