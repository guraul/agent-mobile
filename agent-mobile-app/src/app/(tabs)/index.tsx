import React, { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  type ViewStyle,
} from "react-native";
import { Bell, ChevronDown, ChevronRight } from "lucide-react-native";
import { ScreenHeader, StatusDot, EventItem, BottomSheet, Text, Box, Button, FundMarqueeItem } from "@/components";
import { ProjectChat } from "@/components/chat/ProjectChat";
import { useProjectEvents, type ProjectEvent } from "@/hooks/useProjectEvents";
import { useFundEvents } from "@/hooks/useFundEvents";
import { loadToken, login, onUnauthorized } from "@/services/auth";
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
  const { events, otherProjects, loading, error, refresh } = useProjectEvents();
  const { funds, alert } = useFundEvents();
  const [activeProject, setActiveProject] = useState<{
    id: string;
    projectPath: string;
  } | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [needLogin, setNeedLogin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  // Greeting depends on the client's local time; SSR (server UTC) and client
  // (phone timezone) disagree, causing a hydration text mismatch (React #418)
  // and a blank screen. Render it only after mount.
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    loadToken().then((tok) => {
      setNeedLogin(!tok);
      // token became available — retry the project list immediately instead
      // of waiting for the 30s poll (the mount-time fetch ran before the
      // token was loaded and 401'd).
      if (tok) refresh();
    });
    return onUnauthorized(() => setNeedLogin(true));
  }, [refresh]);

  const doLogin = async () => {
    try {
      setLoginError(null);
      await login(loginUser, loginPass);
      setNeedLogin(false);
      setLoginOpen(false);
      refresh();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : String(e));
    }
  };

  const needsYou: GroupedEvent[] = events
    .filter((e) => e.status === "needs-you")
    .map((e) => ({ ...e, section: "needs-you" as const }));
  const today: GroupedEvent[] = events
    .filter((e) => e.status === "running")
    .map((e) => ({ ...e, section: "today" as const }));

  type GroupItem =
    | { kind: "project"; event: GroupedEvent }
    | { kind: "market"; hasAlert: boolean };

  // 跑马灯：有 trade-alert 时升级到 Needs you（第一项）；否则作为独立 MARKET 分组放 Today 之后
  const hasTradeAlert = alert !== null && alert.length > 0;
  const needsYouItems: GroupItem[] = hasTradeAlert
    ? [{ kind: "market", hasAlert: true }, ...needsYou.map((event): GroupItem => ({ kind: "project", event }))]
    : needsYou.map((event): GroupItem => ({ kind: "project", event }));
  const todayItems: GroupItem[] = today.map((event): GroupItem => ({ kind: "project", event }));

  const groups: { label: string; items: GroupItem[] }[] = [
    { label: "Needs you", items: needsYouItems },
    { label: "Today", items: todayItems },
    ...(funds.length > 0 && !hasTradeAlert
      ? [{ label: "Market", items: [{ kind: "market" as const, hasAlert: false }] }]
      : []),
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
        onRightPress={() => Alert.alert("Notifications", "Coming soon.")}
        rightAccessibilityLabel="Notifications"
      />

      {needLogin ? (
        <Pressable onPress={() => setLoginOpen(true)} accessibilityRole="button">
          <Box padding="sm" backgroundColor="surface.1" rounded="md" margin="sm">
            <Text variant="caption" color="accent">未登录 — 点击登录</Text>
          </Box>
        </Pressable>
      ) : null}

      <View style={styles.greetingWrap}>
        <Text variant="headline" color="ink">
          {greeting}
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
              {group.items.map((item, index, arr) => (
                <View
                  key={item.kind === "market" ? "market" : `project-${item.event.id}`}
                  style={
                    index === arr.length - 1 ? styles.lastItemWrap : undefined
                  }
                >
                  {item.kind === "market" ? (
                    <FundMarqueeItem funds={funds} hasAlert={item.hasAlert} />
                  ) : (
                    <EventItem
                      type={item.event.status === "needs-you" ? "ACTION" : "PROJECT"}
                      title={item.event.name}
                      summary={item.event.summary}
                      status={statusTypeFor(item.event.status)}
                      statusLabel={item.event.statusLabel}
                      onPress={() =>
                        setActiveProject({ id: item.event.id, projectPath: item.event.projectPath })
                      }
                      testID={`project-${item.event.id}`}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {otherProjects.length > 0 ? (
          <View style={styles.section}>
            <Pressable
              onPress={() => setOtherOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityLabel="Other projects"
              style={sectionLabelStyle}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xxs }}>
                {otherOpen ? (
                  <ChevronDown size={14} color={colors.muted} strokeWidth={2} />
                ) : (
                  <ChevronRight size={14} color={colors.muted} strokeWidth={2} />
                )}
                <Text variant="caption" color="muted">
                  OTHER PROJECTS ({otherProjects.length})
                </Text>
              </View>
            </Pressable>
            {otherOpen ? (
              <View style={styles.list}>
                {otherProjects.map((event, index, arr) => (
                  <View
                    key={event.id}
                    style={
                      index === arr.length - 1 ? styles.lastItemWrap : undefined
                    }
                  >
                    <EventItem
                      type="PROJECT"
                      title={event.name}
                      summary={event.summary}
                      status="idle"
                      statusLabel={event.statusLabel}
                      onPress={() =>
                        setActiveProject({ id: event.id, projectPath: event.projectPath })
                      }
                      testID={`project-${event.id}`}
                    />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={loginOpen}
        onClose={() => setLoginOpen(false)}
        testID="login-sheet"
      >
        <Box padding="md" gap="sm">
          <Text variant="body" color="ink">登录 Pulse</Text>
          <TextInput
            placeholder="账号"
            value={loginUser}
            onChangeText={setLoginUser}
            autoCapitalize="none"
            style={styles.loginInput}
            placeholderTextColor={colors.disabled}
          />
          <TextInput
            placeholder="密码"
            value={loginPass}
            onChangeText={setLoginPass}
            secureTextEntry
            style={styles.loginInput}
            placeholderTextColor={colors.disabled}
          />
          {loginError ? <Text variant="caption" color="error">{loginError}</Text> : null}
          <Button variant="primary" label="登录" onPress={doLogin} />
        </Box>
      </BottomSheet>

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
  loginInput: {
    backgroundColor: colors.surface[2],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: 15,
  },
});
