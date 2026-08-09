import React from "react";
import { ScrollView } from "react-native";
import { Home, Terminal, Settings } from "lucide-react-native";
import { spacing } from "../theme";
import {
  Box,
  Text,
  StatusDot,
  ScreenHeader,
  BottomTabBar,
  type TabConfig,
} from "../components";
import { mockLogs, type LogEntryMock } from "./mockData";

const tabs: TabConfig[] = [
  { key: "agents", label: "Agents", icon: Home },
  { key: "activity", label: "Activity", icon: Terminal },
  { key: "settings", label: "Settings", icon: Settings },
];

function LogRow({ log }: { log: LogEntryMock }) {
  const contentColor = log.level === "error" ? "error" : log.level === "success" ? "success" : "body";

  const statusType = log.level === "error" ? "error" : log.level === "success" ? "success" : "idle";

  return (
    <Box
      paddingVertical="xs"
      paddingHorizontal="md"
      testID={`log-row-${log.id}`}
    >
      <Box style={{ flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" }}>
        <StatusDot
          status={statusType}
          size={6}
          pulse={false}
          accessibilityLabel={`Log level: ${log.level}`}
        />
        <Text variant="monoCaption" color="muted" style={{ minWidth: 60 }}>
          {log.timestamp}
        </Text>
        <Text variant="monoCaption" color="muted" style={{ minWidth: 80 }} numberOfLines={1}>
          {log.agentName}
        </Text>
        <Text variant="monoBody" color={contentColor} style={{ flex: 1 }}>
          {log.message}
        </Text>
      </Box>
    </Box>
  );
}

export function ActivityScreen() {
  return (
    <Box backgroundColor="canvas" style={{ flex: 1 }}>
      <ScreenHeader
        title="Activity"
        testID="activity-header"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: spacing.sm,
        }}
      >
        {mockLogs.map((log) => (
          <LogRow key={log.id} log={log} />
        ))}
      </ScrollView>

      <BottomTabBar
        tabs={tabs}
        activeTabKey="activity"
        onTabPress={() => {}}
        testID="activity-tabbar"
      />
    </Box>
  );
}
