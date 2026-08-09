import React from "react";
import { View, Pressable, type ViewStyle } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { colors, spacing } from "../../theme";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";

export interface TabConfig {
  key: string;
  label: string;
  icon: LucideIcon;
}

export interface BottomTabBarProps {
  tabs: TabConfig[];
  activeTabKey: string;
  onTabPress: (key: string) => void;
  testID?: string;
}

export function BottomTabBar({
  tabs,
  activeTabKey,
  onTabPress,
  testID,
}: BottomTabBarProps) {
  if (tabs.length > 3) {
    console.warn("BottomTabBar: maximum 3 tabs allowed per DESIGN.md §7.6");
  }

  const containerStyle: ViewStyle = {
    flexDirection: "row",
    height: 49,
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  };

  const tabStyle: ViewStyle = {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  };

  const labelStyle: ViewStyle = {
    marginTop: spacing.xxs,
  };

  return (
    <View testID={testID} style={containerStyle}>
      {tabs.slice(0, 3).map((tab) => {
        const isActive = tab.key === activeTabKey;
        const iconColor = (isActive ? "accent" : "muted") as const;

        return (
          <Pressable
            key={tab.key}
            testID={`${testID ?? "tabbar"}-${tab.key}`}
            accessibilityLabel={`${tab.label} tab`}
            accessibilityRole="tab"
            onPress={() => onTabPress(tab.key)}
            style={tabStyle}
          >
            <Icon icon={tab.icon} size="md" color={iconColor} />
            <View style={labelStyle}>
              <Text
                variant="captionStrong"
                color={isActive ? "accent" : "muted"}
                align="center"
              >
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
