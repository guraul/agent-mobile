import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { typography, colors } from "../../theme";
import {
  lightTypography,
  lightColors,
  type LightTextStyle,
} from "../../theme/light";

type TypographyTokenKey =
  | "display"
  | "hero"
  | "headline"
  | "title"
  | "body"
  | "bodyStrong"
  | "caption"
  | "captionStrong"
  | "label"
  | "button"
  | "monoBody"
  | "monoCaption";

type ColorToken =
  | "ink"
  | "body"
  | "muted"
  | "disabled"
  | "onAccent"
  | "onInverse"
  | "accent"
  | "accentBright"
  | "accentPressed"
  | "success"
  | "error"
  | "warning"
  | "running"
  | "idle";

const colorMap: Record<ColorToken, string> = {
  ink: colors.ink,
  body: colors.body,
  muted: colors.muted,
  disabled: colors.disabled,
  onAccent: colors.onAccent,
  onInverse: colors.onInverse,
  accent: colors.accent.default,
  accentBright: colors.accent.bright,
  accentPressed: colors.accent.pressed,
  success: colors.status.success,
  error: colors.status.error,
  warning: colors.status.warning,
  running: colors.status.running,
  idle: colors.status.idle,
};

/* 浅色字阶（RN 迁移 #8）：light 前缀键 → light token，与旧字阶并存（D1） */
const lightVariantMap = {
  lightDisplay: lightTypography.display,
  lightPageTitle: lightTypography.pageTitle,
  lightTitle: lightTypography.title,
  lightBody: lightTypography.body,
  lightBodyStrong: lightTypography.bodyStrong,
  lightCaption: lightTypography.caption,
  lightLabel: lightTypography.label,
  lightScheduleLabel: lightTypography.scheduleLabel,
  lightScheduleTitle: lightTypography.scheduleTitle,
  lightScheduleMeta: lightTypography.scheduleMeta,
} as const;

type LightVariantKey = keyof typeof lightVariantMap;

/* 浅色色板（文字用色子集）：light 前缀键，与旧 ColorToken 无冲突 */
const lightColorMap = {
  lightInk: lightColors.ink,
  lightBlack: lightColors.black,
  lightBodyText: lightColors.bodyText,
  lightSubtle: lightColors.subtleText,
  lightGray: lightColors.grayText,
  lightChipText: lightColors.chipText,
  lightField: lightColors.fieldText,
  lightGroupLabel: lightColors.groupLabel,
  lightDockDismiss: lightColors.dockDismiss,
  lightAccent: lightColors.accent,
  lightAccentDeep: lightColors.accentDeep,
  lightAmber: lightColors.amber,
  lightAmberDeep: lightColors.amberDeep,
  lightGreen: lightColors.green,
  lightGreenDeep: lightColors.greenDeep,
  lightUpRed: lightColors.upRed,
  lightScheduleInk: lightColors.scheduleInk,
  lightRowInk: lightColors.rowInk,
  lightScheduleMeta: lightColors.scheduleMeta,
  lightPeach: lightColors.peach,
  lightWhite: lightColors.white,
} as const;

type LightColorKey = keyof typeof lightColorMap;

export interface TextProps extends Omit<RNTextProps, "style"> {
  variant?: TypographyTokenKey | LightVariantKey;
  color?: ColorToken | LightColorKey;
  align?: "auto" | "left" | "center" | "right" | "justify";
  numberOfLines?: number;
  ellipsizeMode?: "head" | "middle" | "tail" | "clip";
  accessibilityLabel?: string;
  testID?: string;
  children?: React.ReactNode;
}

export function Text({
  variant = "body",
  color = "body",
  align,
  numberOfLines,
  ellipsizeMode,
  accessibilityLabel,
  testID,
  children,
  ...rest
}: TextProps) {
  const isLightVariant = variant in lightVariantMap;
  const typeStyle: LightTextStyle = isLightVariant
    ? lightVariantMap[variant as LightVariantKey]
    : typography[variant as TypographyTokenKey];

  const isLightColor = color in lightColorMap;
  const textColor = isLightColor
    ? lightColorMap[color as LightColorKey]
    : colorMap[color as ColorToken];

  return (
    <RNText
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      allowFontScaling={true}
      maxFontSizeMultiplier={1.5}
      style={{
        fontFamily: typeStyle.fontFamily,
        fontSize: typeStyle.fontSize,
        fontWeight: typeStyle.fontWeight,
        lineHeight: typeStyle.lineHeight,
        letterSpacing: typeStyle.letterSpacing,
        color: textColor,
        ...(align && { textAlign: align }),
      }}
      {...rest}
    >
      {children}
    </RNText>
  );
}
