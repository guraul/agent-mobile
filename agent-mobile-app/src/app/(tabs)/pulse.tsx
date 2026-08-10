import React, { useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { Bell, Mic, Send, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ScreenHeader,
  StatusDot,
  EventItem,
  BottomSheet,
  Button,
  Text,
} from "@/components";
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
  const [prompt, setPrompt] = useState("");

  const openSheet = (event: PulseEvent) => setSelectedEvent(event);
  const closeSheet = () => {
    setSelectedEvent(null);
    setPrompt("");
  };

  const eventMap = new Map(PULSE_EVENTS.map((e) => [e.id, e]));

  const promptRowStyle: ViewStyle = {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: "auto",
    paddingTop: spacing.md,
  };

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

            <View style={styles.sheetDivider} />

            {/* Prompt entry */}
            <View style={promptRowStyle}>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.input}
                  value={prompt}
                  onChangeText={setPrompt}
                  placeholder="Ask about this…"
                  placeholderTextColor={colors.disabled}
                />
              </View>
              <Pressable
                onPress={() => alert("Voice input")}
                accessibilityLabel="Voice input"
                accessibilityRole="button"
                style={styles.voiceButton}
              >
                <Mic color={colors.body} size={20} strokeWidth={iconStroke} />
              </Pressable>
              <Pressable
                onPress={() => alert("Sent to Talk")}
                accessibilityLabel="Send"
                accessibilityRole="button"
                style={styles.sendButton}
              >
                <Send color={colors.onAccent} size={20} strokeWidth={iconStroke} />
              </Pressable>
            </View>
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
  inputWrap: {
    flex: 1,
    backgroundColor: colors.surface[1],
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  input: {
    padding: 0,
    color: colors.ink,
    fontSize: 16,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.accent.default,
    alignItems: "center",
    justifyContent: "center",
  },
});
