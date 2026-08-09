import React from "react";
import { View, type ViewProps, type ViewStyle } from "react-native";
import { colors, spacing, radius } from "../../theme";

type SpaceToken = keyof typeof spacing;
type ColorToken = "canvas" | "surface.1" | "surface.2" | "surface.3" | "inverse" | "transparent";
type RadiusToken = keyof typeof radius;

export interface BoxProps extends ViewProps {
  backgroundColor?: ColorToken;
  padding?: SpaceToken;
  paddingHorizontal?: SpaceToken;
  paddingVertical?: SpaceToken;
  paddingTop?: SpaceToken;
  paddingBottom?: SpaceToken;
  paddingLeft?: SpaceToken;
  paddingRight?: SpaceToken;
  margin?: SpaceToken;
  marginHorizontal?: SpaceToken;
  marginVertical?: SpaceToken;
  marginTop?: SpaceToken;
  marginBottom?: SpaceToken;
  marginLeft?: SpaceToken;
  marginRight?: SpaceToken;
  gap?: SpaceToken;
  rounded?: RadiusToken;
  borderTopLeftRadius?: RadiusToken;
  borderTopRightRadius?: RadiusToken;
  borderBottomLeftRadius?: RadiusToken;
  borderBottomRightRadius?: RadiusToken;
  testID?: string;
}

const colorMap: Record<ColorToken, string> = {
  canvas: colors.canvas,
  "surface.1": colors.surface[1],
  "surface.2": colors.surface[2],
  "surface.3": colors.surface[3],
  inverse: colors.inverse,
  transparent: "transparent",
};

export function Box({
  backgroundColor,
  padding,
  paddingHorizontal,
  paddingVertical,
  paddingTop,
  paddingBottom,
  paddingLeft,
  paddingRight,
  margin,
  marginHorizontal,
  marginVertical,
  marginTop,
  marginBottom,
  marginLeft,
  marginRight,
  gap,
  rounded,
  borderTopLeftRadius,
  borderTopRightRadius,
  borderBottomLeftRadius,
  borderBottomRightRadius,
  style,
  testID,
  ...rest
}: BoxProps) {
  const viewStyle: ViewStyle = {
    ...(backgroundColor && { backgroundColor: colorMap[backgroundColor] }),
    ...(padding !== undefined && { padding: spacing[padding] }),
    ...(paddingHorizontal !== undefined && { paddingHorizontal: spacing[paddingHorizontal] }),
    ...(paddingVertical !== undefined && { paddingVertical: spacing[paddingVertical] }),
    ...(paddingTop !== undefined && { paddingTop: spacing[paddingTop] }),
    ...(paddingBottom !== undefined && { paddingBottom: spacing[paddingBottom] }),
    ...(paddingLeft !== undefined && { paddingLeft: spacing[paddingLeft] }),
    ...(paddingRight !== undefined && { paddingRight: spacing[paddingRight] }),
    ...(margin !== undefined && { margin: spacing[margin] }),
    ...(marginHorizontal !== undefined && { marginHorizontal: spacing[marginHorizontal] }),
    ...(marginVertical !== undefined && { marginVertical: spacing[marginVertical] }),
    ...(marginTop !== undefined && { marginTop: spacing[marginTop] }),
    ...(marginBottom !== undefined && { marginBottom: spacing[marginBottom] }),
    ...(marginLeft !== undefined && { marginLeft: spacing[marginLeft] }),
    ...(marginRight !== undefined && { marginRight: spacing[marginRight] }),
    ...(gap !== undefined && { gap: spacing[gap] }),
    ...(rounded && { borderRadius: radius[rounded] }),
    ...(borderTopLeftRadius && { borderTopLeftRadius: radius[borderTopLeftRadius] }),
    ...(borderTopRightRadius && { borderTopRightRadius: radius[borderTopRightRadius] }),
    ...(borderBottomLeftRadius && { borderBottomLeftRadius: radius[borderBottomLeftRadius] }),
    ...(borderBottomRightRadius && { borderBottomRightRadius: radius[borderBottomRightRadius] }),
  };

  return <View testID={testID} style={[viewStyle, style]} {...rest} />;
}
