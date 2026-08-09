import React from "react";
import { ScrollView } from "react-native";
import { Home, Terminal, Settings, ChevronRight, Bell } from "lucide-react-native";
import { spacing, colors, radius } from "../theme";
import {
  Box,
  Text,
  Card,
  Icon,
  ScreenHeader,
  BottomTabBar,
  type TabConfig,
} from "../components";
import { mockSettings, type SettingItemMock } from "./mockData";

const tabs: TabConfig[] = [
  { key: "agents", label: "Agents", icon: Home },
  { key: "activity", label: "Activity", icon: Terminal },
  { key: "settings", label: "Settings", icon: Settings },
];

function SettingRow({ setting }: { setting: SettingItemMock }) {
  return (
    <Box
      paddingVertical="sm"
      paddingHorizontal="md"
      testID={`setting-row-${setting.id}`}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 48,
      }}
    >
      <Text variant="bodyStrong" color="ink">
        {setting.label}
      </Text>
      <Box style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
        {setting.hasToggle ? (
          <Box
            style={{
              width: 44,
              height: 24,
              borderRadius: radius.pill,
              backgroundColor: setting.toggleValue ? colors.accent.default : colors.surface[2],
              justifyContent: "center",
              alignItems: setting.toggleValue ? "flex-end" : "flex-start",
              paddingRight: setting.toggleValue ? 2 : 0,
              paddingLeft: setting.toggleValue ? 0 : 2,
            }}
          >
            <Box
              style={{
                width: 20,
                height: 20,
                borderRadius: radius.full,
                backgroundColor: colors.ink,
              }}
            />
          </Box>
        ) : (
          <>
            {setting.value && (
              <Text variant="body" color="muted">
                {setting.value}
              </Text>
            )}
            <Icon icon={ChevronRight} size="sm" color="disabled" />
          </>
        )}
      </Box>
    </Box>
  );
}

export function SettingsScreen() {
  return (
    <Box backgroundColor="canvas" style={{ flex: 1 }}>
      <ScreenHeader
        title="Settings"
        rightIcon={Bell}
        rightAccessibilityLabel="Notifications"
        testID="settings-header"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          gap: spacing.xs,
        }}
      >
        <Card>
          <Box style={{ gap: 0 }}>
            {mockSettings.slice(0, 4).map((setting, index) => (
              <Box key={setting.id}>
                <SettingRow setting={setting} />
                {index < 3 && (
                  <Box
                    style={{
                      height: 1,
                      backgroundColor: colors.border.default,
                      marginLeft: 0,
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        </Card>

        <Card>
          <Box style={{ gap: 0 }}>
            {mockSettings.slice(4).map((setting, index) => (
              <Box key={setting.id}>
                <SettingRow setting={setting} />
                {index < mockSettings.slice(4).length - 1 && (
                  <Box
                    style={{
                      height: 1,
                      backgroundColor: colors.border.default,
                      marginLeft: 0,
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        </Card>
      </ScrollView>

      <BottomTabBar
        tabs={tabs}
        activeTabKey="settings"
        onTabPress={() => {}}
        testID="settings-tabbar"
      />
    </Box>
  );
}
