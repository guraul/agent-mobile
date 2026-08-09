import React from "react";
import { ScrollView } from "react-native";
import { Home, Terminal, Settings, Plus } from "lucide-react-native";
import { spacing } from "../theme";
import {
  Box,
  Text,
  Card,
  StatusDot,
  StatusPill,
  ScreenHeader,
  BottomTabBar,
  type TabConfig,
} from "../components";
import { mockAgents, type AgentMock } from "./mockData";

const tabs: TabConfig[] = [
  { key: "agents", label: "Agents", icon: Home },
  { key: "activity", label: "Activity", icon: Terminal },
  { key: "settings", label: "Settings", icon: Settings },
];

function AgentCard({ agent }: { agent: AgentMock }) {
  return (
    <Card testID={`agent-card-${agent.id}`} onPress={() => {}}>
      <Box style={{ gap: spacing.xs }}>
        <Box style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Box style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <StatusDot
              status={agent.status}
              accessibilityLabel={`Agent ${agent.name} status: ${agent.statusLabel}`}
            />
            <Text variant="title" color="ink">
              {agent.name}
            </Text>
          </Box>
          <StatusPill status={agent.status} label={agent.statusLabel} />
        </Box>

        <Text variant="body" color="body" numberOfLines={1}>
          {agent.currentTask}
        </Text>

        <Box style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text variant="monoCaption" color="muted">
            {agent.workingDirectory}
          </Text>
          <Text variant="caption" color="muted">
            {agent.lastActivity}
          </Text>
        </Box>
      </Box>
    </Card>
  );
}

export function AgentsScreen() {
  return (
    <Box backgroundColor="canvas" style={{ flex: 1 }}>
      <ScreenHeader
        title="Agents"
        rightIcon={Plus}
        rightAccessibilityLabel="Add new agent"
        testID="agents-header"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          gap: spacing.xs,
        }}
      >
        {mockAgents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </ScrollView>

      <BottomTabBar
        tabs={tabs}
        activeTabKey="agents"
        onTabPress={() => {}}
        testID="agents-tabbar"
      />
    </Box>
  );
}
