import React from "react";
import { ScrollView } from "react-native";
import { ChevronLeft, MoreHorizontal, GitBranch, Folder, Send, Play, Square } from "lucide-react-native";
import { spacing } from "../theme";
import {
  Box,
  Text,
  Card,
  Button,
  Icon,
  StatusDot,
  StatusPill,
  StatusCallout,
  ScreenHeader,
} from "../components";
import { mockAgents } from "./mockData";

const agent = mockAgents[0];

const mockDetailLogs = [
  { id: "l1", timestamp: "14:32:03", message: "Analyzing dependencies in auth module" },
  { id: "l2", timestamp: "14:32:01", message: "Reading file: src/auth/session.ts" },
  { id: "l3", timestamp: "14:31:58", message: "Reading file: src/auth/middleware.ts" },
  { id: "l4", timestamp: "14:31:55", message: "Starting task: refactoring auth module" },
  { id: "l5", timestamp: "14:31:52", message: "Connected to workspace: ~/projects/webapp" },
];

export function AgentDetailScreen() {
  return (
    <Box backgroundColor="canvas" style={{ flex: 1 }}>
      <ScreenHeader
        title={agent.name}
        leftIcon={ChevronLeft}
        leftAccessibilityLabel="Back to agents"
        rightIcon={MoreHorizontal}
        rightAccessibilityLabel="More options"
        testID="agent-detail-header"
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Card padding="lg">
          <Box style={{ gap: spacing.sm }}>
            <Box style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Box style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                <StatusDot
                  status={agent.status}
                  size={12}
                  accessibilityLabel={`Status: ${agent.statusLabel}`}
                />
                <Text variant="headline" color="ink">
                  {agent.name}
                </Text>
              </Box>
              <StatusPill status={agent.status} label={agent.statusLabel} />
            </Box>

            <Text variant="body" color="body">
              {agent.currentTask}
            </Text>

            <Box style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Icon icon={Folder} size="sm" color="muted" />
              <Text variant="monoCaption" color="muted">
                {agent.workingDirectory}
              </Text>
            </Box>

            <Box style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <Icon icon={GitBranch} size="sm" color="muted" />
              <Text variant="monoCaption" color="muted">
                {agent.branch}
              </Text>
            </Box>

            <Text variant="caption" color="muted">
              Last activity: {agent.lastActivity}
            </Text>
          </Box>
        </Card>

        {agent.status === "warning" && (
          <StatusCallout
            status="warning"
            title="Approval Required"
            body="This agent is requesting approval to modify src/api/users.ts. Review the changes before proceeding."
            testID="agent-detail-callout"
          />
        )}

        <Box style={{ flexDirection: "row", gap: spacing.xs }}>
          <Button
            variant="primary"
            label="Send Prompt"
            icon={Send}
            onPress={() => {}}
            fullWidth
            testID="agent-detail-send"
          />
        </Box>

        {agent.status === "running" && (
          <Box style={{ flexDirection: "row", gap: spacing.xs }}>
            <Button
              variant="secondary"
              label="Pause"
              icon={Play}
              onPress={() => {}}
              testID="agent-detail-pause"
            />
            <Button
              variant="destructive"
              label="Stop"
              icon={Square}
              onPress={() => {}}
              testID="agent-detail-stop"
            />
          </Box>
        )}

        <Card>
          <Box style={{ gap: spacing.xs }}>
            <Text variant="captionStrong" color="muted">
              ACTIVITY LOG
            </Text>
            {mockDetailLogs.map((log) => (
              <Box key={log.id} style={{ flexDirection: "row", gap: spacing.sm }}>
                <Text variant="monoCaption" color="muted" style={{ minWidth: 64 }}>
                  {log.timestamp}
                </Text>
                <Text variant="monoBody" color="body" style={{ flex: 1 }}>
                  {log.message}
                </Text>
              </Box>
            ))}
          </Box>
        </Card>
      </ScrollView>
    </Box>
  );
}
