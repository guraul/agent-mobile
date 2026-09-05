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
import { Bell, ChevronDown, ChevronRight, X } from "lucide-react-native";
import { ScreenHeader, StatusDot, EventItem, BottomSheet, Text, Box, Button, FundMarqueeItem } from "@/components";
import { ProjectChat } from "@/components/chat/ProjectChat";
import { ProjectChatZ } from "@/components/chat/zcode/ProjectChatZ";
import { useProjectEvents, type ProjectEvent } from "@/hooks/useProjectEvents";
import { useFundEvents } from "@/hooks/useFundEvents";
import { loadToken, login, onUnauthorized } from "@/services/auth";
import { useAttentions } from "@/hooks/useAttentions";
import type { PulseAttentionItem } from "@/services/attention/store";
import { opencodeClient } from "@/services/opencode-client";
import { getRuntimeBaseUrl } from "@/services/bff-config";
import { opencodeConfig } from "@/config/opencode";
import { colors, spacing, radius } from "@/theme";
import type { StatusType } from "@/components/feedback/StatusDot";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

function statusTypeFor(status: ProjectEvent["status"]): StatusType {
  return status === "running" ? "running" : "idle";
}

// Attention 域 → 呈现状态色（presentation only，不代表新的 lifecycle）
function statusTypeForAttention(domain: PulseAttentionItem["domain"]): StatusType {
  return domain === "market" ? "warning" : "running";
}

interface GroupedEvent extends ProjectEvent {
  section: "today";
}

// ZCode 风格聊天弹框开关（src/components/chat/zcode/）：false 一行回退旧弹框
// （旧弹框 src/components/chat/ProjectChat.tsx 零改动保留）。详见
// docs/superpowers/plans/2026-08-30-zcode-chat-sheet.md
const USE_ZCODE_CHAT_SHEET = true;

export default function PulseScreen() {
  const { events, otherProjects, loading, error, refresh } = useProjectEvents();
  const { funds } = useFundEvents();
  const { open: openAttentions, dismiss: dismissAttention } = useAttentions();
  const [activeProject, setActiveProject] = useState<{
    id: string;
    projectPath: string;
  } | null>(null);
  const [otherOpen, setOtherOpen] = useState(false);
  const [fundSheetOpen, setFundSheetOpen] = useState(false);
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
    getRuntimeBaseUrl().then((override) => {
      if (override) opencodeConfig.runtimeBaseUrl = override;
      loadToken().then((tok) => {
        setNeedLogin(!tok);
        // token became available — retry the project list immediately instead
        // of waiting for the 30s poll (the mount-time fetch ran before the
        // token was loaded and 401'd).
        if (tok) refresh();
      });
    });
    return onUnauthorized(() => setNeedLogin(true));
  }, [refresh]);

  // Attention 点击路由（PM §16.4）：permission 类有 session → 进既有项目会话
  //（现有 Talk path）；market 类 → 行情信息面。查看本身绝不改变 Attention state。
  const onAttentionPress = async (a: PulseAttentionItem) => {
    if (a.domain === "market") {
      setFundSheetOpen(true);
      return;
    }
    if (a.sessionId) {
      try {
        const session = await opencodeClient.getSession(a.sessionId);
        const dir = session.directory || "";
        if (dir) {
          setActiveProject({ id: a.id, projectPath: dir });
          return;
        }
      } catch { /* session 已删 → 落到提示 */ }
    }
    Alert.alert("该事项的会话已不可用", "Handling routing will arrive in a later phase.");
  };

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

  const today: GroupedEvent[] = events
    .filter((e) => e.status === "running")
    .map((e) => ({ ...e, section: "today" as const }));

  type GroupItem =
    | { kind: "project"; event: GroupedEvent }
    | { kind: "attention"; attention: PulseAttentionItem }
    | { kind: "market" };

  // Needs you 分组 = Attention store 的 open items（authoritative，PM §16/§17）。
  // 项目 running/idle 是中性信息性呈现；fund.estimate 是 L1 行情（MARKET 分组）。
  const needsYouItems: GroupItem[] = openAttentions.map(
    (attention): GroupItem => ({ kind: "attention", attention }),
  );
  const todayItems: GroupItem[] = today.map((event): GroupItem => ({ kind: "project", event }));

  const groups: { label: string; items: GroupItem[] }[] = [
    ...(needsYouItems.length > 0 ? [{ label: "Needs you", items: needsYouItems }] : []),
    { label: "Today", items: todayItems },
    ...(funds.length > 0
      ? [{ label: "Market", items: [{ kind: "market" as const }] }]
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
                  key={
                    item.kind === "market"
                      ? "market"
                      : item.kind === "attention"
                        ? `attention-${item.attention.id}`
                        : `project-${item.event.id}`
                  }
                  style={
                    index === arr.length - 1 ? styles.lastItemWrap : undefined
                  }
                >
                  {item.kind === "market" ? (
                    <FundMarqueeItem
                      funds={funds}
                      onPress={() => setFundSheetOpen(true)}
                    />
                  ) : item.kind === "attention" ? (
                    <View style={styles.attentionRow}>
                      <View style={styles.attentionMain}>
                        <EventItem
                          type="ACTION"
                          title={item.attention.title}
                          summary={item.attention.summary}
                          status={statusTypeForAttention(item.attention.domain)}
                          statusLabel={item.attention.domain === "market" ? "Market" : "Needs you"}
                          onPress={() => onAttentionPress(item.attention)}
                          testID={`attention-${item.attention.id}`}
                        />
                      </View>
                      {item.attention.domain === "market" ? (
                        // L2 [Ignore]：显式 dismiss（PM §17）；permission 类进入 Talk 处理
                        <Pressable
                          onPress={() => dismissAttention(item.attention.id)}
                          accessibilityRole="button"
                          accessibilityLabel="Ignore attention item"
                          style={styles.attentionDismiss}
                          testID={`attention-dismiss-${item.attention.id}`}
                        >
                          <X size={16} color={colors.muted} strokeWidth={2} />
                        </Pressable>
                      ) : null}
                    </View>
                  ) : (
                    <EventItem
                      type="PROJECT"
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

      <BottomSheet visible={fundSheetOpen} onClose={() => setFundSheetOpen(false)} testID="fund-sheet">
        <Box padding="md" gap="sm">
          <Text variant="body" color="ink">基金行情</Text>
          {funds.map((f) => (
                <View
                  key={f.code}
                  style={styles.fundRow}
                >
                  <Text variant="captionStrong" color="ink">{f.name}</Text>
                  <Text variant="caption" color="muted">{f.code}</Text>
                  <Text
                    variant="captionStrong"
                    color={f.changePct >= 0 ? "success" : "error"}
                  >
                    {f.estimatedNav.toFixed(4)} 昨 {f.prevNav.toFixed(4)} {f.changePct >= 0 ? "+" : ""}
                    {f.changePct.toFixed(2)}%
                  </Text>
                </View>
              ))}
        </Box>
      </BottomSheet>

      <BottomSheet
        visible={activeProject !== null}
        onClose={() => setActiveProject(null)}
        fullScreen
        testID="project-chat-sheet"
      >
        {activeProject && (USE_ZCODE_CHAT_SHEET ? (
          <ProjectChatZ
            projectPath={activeProject.projectPath}
            onBack={() => setActiveProject(null)}
          />
        ) : (
          <ProjectChat
            projectPath={activeProject.projectPath}
            onBack={() => setActiveProject(null)}
          />
        ))}
      </BottomSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  attentionRow: { flexDirection: "row", alignItems: "stretch", gap: spacing.xs },
  attentionMain: { flex: 1 },
  attentionDismiss: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: colors.surface[1],
  },
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
  fundRow: {
    backgroundColor: colors.surface[2],
    borderRadius: radius.sm,
    padding: spacing.sm,
    gap: spacing.xxs,
  },
});
