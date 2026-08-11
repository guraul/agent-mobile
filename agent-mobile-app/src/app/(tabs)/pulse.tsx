import React, { useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Bell } from "lucide-react-native";
import { ScreenHeader, StatusDot, EventItem, BottomSheet, Text, Box } from "@/components";
import { ProjectChat } from "@/components/chat/ProjectChat";
import { useProjectEvents, type ProjectEvent } from "@/hooks/useProjectEvents";
import { colors, spacing, radius } from "@/theme";
import type { StatusType } from "@/components/feedback/StatusDot";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

function statusTypeFor(status: ProjectEvent["status"]): StatusType {
  switch (status) {
    case "running":
      return "running";
    case "needs-you":
      return "warning";
    default:
      return "idle";
  }
}

interface GroupedEvent extends ProjectEvent {
  section: "needs-you" | "today";
}

export default function PulseScreen() {
  const { events, loading, error } = useProjectEvents();
  const [activeProject, setActiveProject] = useState<{
    id: string;
    projectPath: string;
  } | null>(null);

  const needsYou: GroupedEvent[] = events
    .filter((e) => e.status === "needs-you")
    .map((e) => ({ ...e, section: "needs-you" as const }));
  const today: GroupedEvent[] = events
    .filter((e) => e.status === "running")
    .map((e) => ({ ...e, section: "today" as const }));

  const groups: { label: string; items: GroupedEvent[] }[] = [
    { label: "Needs you", items: needsYou },
    { label: "Today", items: today },
  ].filter((g) => g.items.length > 0);

  const sectionLabelStyle: ViewStyle = {
    paddingHorizontal: spacing.xxs,
    marginBottom: spacing.xs,
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScreenHeader
        title="Pulse"
        rightIcon={Bell}
        onRightPress={() => alert("Notifications")}
        rightAccessibilityLabel="Notifications"
      />

      <View style={styles.greetingWrap}>
        <Text variant="headline" color="ink">
          {getGreeting()}
        </Text>
        <View style={styles.presenceRow}>
          <StatusDot
            status="running"
            size={8}
            pulse
            accessibilityLabel="Pulse is here"
          />
          <Text variant="captionStrong" color="body">
            I&apos;m here.
          </Text>
          <Text variant="caption" color="muted">
            Watching your projects.
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Box padding="sm" backgroundColor="surface.1" rounded="md">
            <Text variant="caption" color="error">{error}</Text>
          </Box>
        ) : null}

        {loading && groups.length === 0 ? (
          <Box padding="lg">
            <Text variant="body" color="muted">Loading projects…</Text>
          </Box>
        ) : null}

        {!loading && groups.length === 0 && !error ? (
          <Box padding="lg" style={styles.center}>
            <Text variant="body" color="muted">No active projects right now.</Text>
          </Box>
        ) : null}

        {groups.map((group) => (
          <View key={group.label} style={styles.section}>
            <View style={sectionLabelStyle}>
              <Text variant="caption" color="muted">
                {group.label.toUpperCase()}
              </Text>
            </View>
            <View style={styles.list}>
              {group.items.map((event, index, arr) => (
                <View
                  key={event.id}
                  style={
                    index === arr.length - 1 ? styles.lastItemWrap : undefined
                  }
                >
                  <EventItem
                    type={event.status === "needs-you" ? "ACTION" : "PROJECT"}
                    title={event.name}
                    summary={event.summary}
                    status={statusTypeFor(event.status)}
                    statusLabel={event.statusLabel}
                    onPress={() =>
                      setActiveProject({ id: event.id, projectPath: event.projectPath })
                    }
                    testID={`project-${event.id}`}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <BottomSheet
        visible={activeProject !== null}
        onClose={() => setActiveProject(null)}
        fullScreen
        testID="project-chat-sheet"
      >
        {activeProject && (
          <ProjectChat
            projectPath={activeProject.projectPath}
            onBack={() => setActiveProject(null)}
          />
        )}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  greetingWrap: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  presenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingTop: spacing.xs,
    gap: spacing.md,
  },
  section: {
    gap: spacing.xxs,
  },
  list: {
    backgroundColor: colors.surface[1],
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  lastItemWrap: {
    overflow: "hidden",
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
  },
  center: { alignItems: "center" },
});
