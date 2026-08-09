import React from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import { typography, colors } from "../../theme";

type TypographyTokenKey =
  | "display"
  | "headline"
  | "title"
  | "body"
  | "bodyStrong"
  | "caption"
  | "captionStrong"
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

export interface TextProps extends Omit<RNTextProps, "style"> {
  variant?: TypographyTokenKey;
  color?: ColorToken;
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
  const typeStyle = typography[variant];
  const textColor = colorMap[color];

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
