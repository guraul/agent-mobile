import React, { useState } from "react";
import { View, type ViewStyle } from "react-native";
import { Search, X } from "lucide-react-native";
import { colors, spacing } from "../../theme";
import { Input, type InputProps } from "./Input";
import { IconButton } from "./IconButton";
import { Icon } from "./Icon";

export interface SearchInputProps extends Omit<InputProps, "error"> {
  onClear?: () => void;
  value?: string;
}

export function SearchInput({
  onClear,
  value,
  testID,
  ...rest
}: SearchInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasText = typeof value === "string" ? value.length > 0 : false;

  const containerStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  };

  return (
    <View style={containerStyle}>
      <Icon icon={Search} size="md" color="muted" />
      <View style={{ flex: 1 }}>
        <Input
          testID={testID}
          value={value}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={colors.disabled}
          {...rest}
        />
      </View>
      {hasText && (
        <IconButton
          icon={X}
          onPress={onClear}
          color="muted"
          accessibilityLabel="Clear search"
          testID={testID ? `${testID}-clear` : undefined}
        />
      )}
    </View>
  );
}
