import React, { useState } from "react";
import {
  View,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Bell, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ScreenHeader,
  StatusDot,
  EventItem,
  BottomSheet,
  Button,
  Text,
} from "@/components";
import { SessionPanel } from "@/components/session/SessionPanel";
import { colors, spacing, radius, iconStroke } from "@/theme";
import { PULSE_EVENTS, PULSE_SECTIONS, type PulseEvent } from "@/screens/events";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

export default function PulseScreen() {
  const insets = useSafeAreaInsets();
  const [selectedEvent, setSelectedEvent] = useState<PulseEvent | null>(null);

  const openSheet = (event: PulseEvent) => setSelectedEvent(event);
  const closeSheet = () => {
    setSelectedEvent(null);
  };

  const eventMap = new Map(PULSE_EVENTS.map((e) => [e.id, e]));

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

      {/* Greeting + presence */}
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
            I'm here.
          </Text>
          <Text variant="caption" color="muted">
            Watching 3 projects and your day.
          </Text>
        </View>
      </View>

      {/* Event stream */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {PULSE_SECTIONS.map((section) => (
          <View key={section.label} style={styles.section}>
            <View style={sectionLabelStyle}>
              <Text variant="caption" color="muted">
                {section.label.toUpperCase()}
              </Text>
            </View>
            <View style={styles.list}>
              {section.eventIds.map((id, index, arr) => {
                const event = eventMap.get(id)!;
                return (
                  <View
                    key={event.id}
                    style={
                      index === arr.length - 1
                        ? styles.lastItemWrap
                        : undefined
                    }
                  >
                    <EventItem
                      type={event.type}
                      title={event.title}
                      summary={event.summary}
                      status={event.status}
                      statusLabel={event.statusLabel}
                      onPress={() => openSheet(event)}
                      testID={`event-${event.id}`}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Full-screen event sheet */}
      <BottomSheet
        visible={selectedEvent !== null}
        onClose={closeSheet}
        fullScreen
        testID="event-sheet"
      >
        {selectedEvent && (
          <View style={styles.sheetBody}>
            <View style={styles.sheetHeader}>
              <Text variant="captionStrong" color="muted">
                {selectedEvent.type}
              </Text>
              <View style={styles.sheetHeaderRight}>
                <StatusDot
                  status={selectedEvent.status}
                  size={6}
                  pulse={false}
                  accessibilityLabel="Event status"
                />
                <Text
                  variant="captionStrong"
                  color={selectedEvent.status}
                >
                  {selectedEvent.statusLabel}
                </Text>
                <Pressable
                  onPress={closeSheet}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                  style={styles.closeButton}
                >
                  <X color={colors.muted} size={20} strokeWidth={iconStroke} />
                </Pressable>
              </View>
            </View>

            <View style={styles.sheetTitleWrap}>
              <Text variant="headline" color="ink">
                {selectedEvent.title}
              </Text>
            </View>
            <Text variant="body" color="body">
              {selectedEvent.detail}
            </Text>

            <View style={styles.sheetDivider} />

            {selectedEvent.projectPath ? (
              <SessionPanel projectPath={selectedEvent.projectPath} />
            ) : (
              <>
                <View style={styles.sheetActions}>
                  {selectedEvent.actions.map((action) => (
                    <Button
                      key={action.label}
                      variant={action.variant}
                      label={action.label}
                      onPress={() => alert(action.alert)}
                      fullWidth
                    />
                  ))}
                </View>
              </>
            )}
          </View>
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
  sheetBody: {
    flex: 1,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  sheetHeaderRight: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xxs,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.xs,
  },
  sheetTitleWrap: {
    marginBottom: spacing.sm,
  },
  sheetActions: {
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: colors.border.default,
    opacity: 0.5,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
});
