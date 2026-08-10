import React, { useState, useRef } from "react";
import {
  View,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { colors, spacing, radius, typography } from "../../theme";

export interface InputProps extends Omit<RNTextInputProps, "style"> {
  error?: boolean;
  testID?: string;
}

export function Input({
  error = false,
  editable = true,
  onFocus,
  onBlur,
  placeholderTextColor,
  testID,
  ...rest
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<RNTextInput>(null);

  const borderColor = (() => {
    if (!editable) return colors.border.disabled;
    if (error) return colors.border.error;
    if (isFocused) return colors.border.focused;
    return colors.border.default;
  })();

  const containerStyle: ViewStyle = {
    backgroundColor: colors.surface[1],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor,
    minHeight: 44,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    justifyContent: "center",
  };

  const textInputStyle: TextStyle = {
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    fontWeight: typography.body.fontWeight,
    lineHeight: typography.body.lineHeight,
    letterSpacing: typography.body.letterSpacing,
    color: editable ? colors.ink : colors.disabled,
    padding: 0,
  };

  return (
    <View style={containerStyle}>
      <RNTextInput
        ref={inputRef}
        testID={testID}
        editable={editable}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        placeholderTextColor={placeholderTextColor ?? colors.disabled}
        allowFontScaling={true}
        maxFontSizeMultiplier={1.5}
        style={textInputStyle}
        {...rest}
      />
    </View>
  );
}
