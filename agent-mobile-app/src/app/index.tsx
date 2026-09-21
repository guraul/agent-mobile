import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Settings } from "lucide-react-native";
import { useRouter } from "expo-router";
import { BottomSheet, Button, IconButton, Text } from "@/components";
import { AIOrb, type OrbState } from "@/components/pulse/AIOrb";
import { AIStatus } from "@/components/pulse/AIStatus";
import { PulseHero } from "@/components/pulse/PulseHero";
import { FeaturedAttention } from "@/components/pulse/FeaturedAttention";
import { SupportingRow, type SupportingKind } from "@/components/pulse/SupportingRow";
import { NoticedRow } from "@/components/pulse/NoticedRow";
import { ConversationEntry } from "@/components/pulse/ConversationEntry";
import { ListSheet } from "@/components/pulse/ListSheet";
import { NoticedDetailSheet } from "@/components/pulse/NoticedDetailSheet";
import { FundSheet } from "@/components/pulse/FundSheet";
import { SettingsSheet } from "@/components/pulse/SettingsSheet";
import { MemorySheet } from "@/components/pulse/MemorySheet";
import { KnowledgeSheet } from "@/components/pulse/KnowledgeSheet";
import { useProjectEvents, type ProjectEvent } from "@/hooks/useProjectEvents";
import { useL1 } from "@/hooks/useL1";
import { type L1Statement } from "@/services/l1";
import { useAttentions } from "@/hooks/useAttentions";
import { type AttentionItem, type PulseAttentionItem } from "@/services/attention/store";
import { useSuggestions } from "@/hooks/useSuggestions";
import { type PulseSuggestion } from "@/services/proposal/store";
import { fetchAttentions } from "@/services/attention/client";
import { resolveAttentionConversation, MARKET_TALK_DIRECTORY } from "@/services/attention/talk";
import { fetchAssignments } from "@/services/assignment/client";
import { buildAssignmentGroups, formatRelative } from "@/services/assignment/projection";
import { KbHit } from "@/services/memory/client";
import { opencodeClient } from "@/services/opencode-client";
import { getRuntimeBaseUrl } from "@/services/bff-config";
import { opencodeConfig } from "@/config/opencode";
import { loadToken, login, onUnauthorized } from "@/services/auth";
import { classifyRuntimeFailure, runtimeFailureMessage } from "@/services/runtime-presence";
import { colors, radius, spacing } from "@/theme";

const SUPPORTING_BUDGET = 4;
const NOTICED_BUDGET = 5;

const KIND_LABEL: Record<SupportingKind, string> = {
  "needs-you": "NEEDS YOU",
  suggested: "SUGGESTED",
  running: "RUNNING",
  market: "MARKET",
};

type SupportingItem =
  | { kind: "needs-you"; attention: PulseAttentionItem }
  | { kind: "suggested"; suggestion: PulseSuggestion }
  | { kind: "running"; event: ProjectEvent }
  | { kind: "market" };

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning.";
  if (h < 18) return "Good afternoon.";
  return "Good evening.";
}

// Quiet text action ("See All", "More (n)") — accent-bright, no container.
function TextAction({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Text variant="captionStrong" color="accentBright">{label}</Text>
    </Pressable>
  );
}

export default function PulseScreen() {
  const router = useRouter();

  // ── real data sources (unchanged services) ──────────────────────────────
  const { events, otherProjects, error: projectError, refresh: refreshProjects } = useProjectEvents();
  const { funds, noticed } = useL1();
  const { open: openAttentions, dismiss, error: attentionError } = useAttentions();
  const {
    suggestions,
    confirm: confirmSuggestion,
    reject: rejectSuggestion,
    error: suggestionError,
  } = useSuggestions();

  // ── local ui state ──────────────────────────────────────────────────────
  const [greeting, setGreeting] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [suggestionBusyId, setSuggestionBusyId] = useState<string | null>(null);
  const [watchingCount, setWatchingCount] = useState(0);
  const [assignmentsKey, setAssignmentsKey] = useState(0);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [fundsOpen, setFundsOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [noticedListOpen, setNoticedListOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [detailStatement, setDetailStatement] = useState<L1Statement | null>(null);

  // Greeting depends on the client's local time; SSR (server UTC) and client
  // disagree → render only after mount (React #418 guard, unchanged).
  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    getRuntimeBaseUrl().then((override) => {
      if (override) opencodeConfig.runtimeBaseUrl = override;
      loadToken().then((tok) => {
        setNeedLogin(!tok);
        if (tok) refreshProjects();
      });
    });
    return onUnauthorized(() => setNeedLogin(true));
  }, [refreshProjects]);

  // Watching count = active assignments (Hero presence line). Failure is
  // non-fatal: the line simply does not render.
  const refreshWatching = useCallback(async () => {
    try {
      await loadToken();
      const [assignments, attentions] = await Promise.all([fetchAssignments(), fetchAttentions()]);
      const groups = buildAssignmentGroups(assignments, attentions as AttentionItem[]);
      setWatchingCount(groups.find((g) => g.key === "active")?.items.length ?? 0);
    } catch {
      setWatchingCount(0);
    }
  }, []);

  useEffect(() => {
    refreshWatching();
  }, [refreshWatching, suggestions.length, openAttentions.length, assignmentsKey]);

  // ── runtime presence (companion voice, never raw transport errors) ──────
  const failureKind = useMemo(() => {
    const err = attentionError ?? projectError;
    if (!err) return null;
    const kind = classifyRuntimeFailure(err);
    return kind === "opencode-offline" || kind === "bff-offline" ? kind : null;
  }, [attentionError, projectError]);
  const offline = failureKind !== null;
  const presence: OrbState = offline ? "offline" : openAttentions.length > 0 ? "needs-you" : "attentive";
  const aiLine = offline
    ? "I'm having trouble reaching my runtime."
    : "I've been keeping an eye on things for you.";

  // ── composition ─────────────────────────────────────────────────────────
  const featured = openAttentions[0] ?? null;

  const supporting: SupportingItem[] = useMemo(() => {
    const list: SupportingItem[] = [];
    for (const attention of openAttentions.slice(1)) list.push({ kind: "needs-you", attention });
    for (const suggestion of suggestions) list.push({ kind: "suggested", suggestion });
    for (const event of events) list.push({ kind: "running", event });
    if (funds.length > 0) list.push({ kind: "market" });
    return list;
  }, [openAttentions, suggestions, events, funds.length]);

  const visibleSupporting = supporting.slice(0, SUPPORTING_BUDGET);
  const supportingOverflow = Math.max(0, supporting.length - visibleSupporting.length);

  const noticedSorted = useMemo(
    () => [...noticed].sort((a, b) => b.occurredAt - a.occurredAt),
    [noticed],
  );
  const visibleNoticed = noticedSorted.slice(0, NOTICED_BUDGET);
  const noticedOverflow = Math.max(0, noticedSorted.length - visibleNoticed.length);

  // ── actions (semantics unchanged; services stay authoritative) ──────────
  const alertRuntimeFailure = (e: unknown) => {
    const kind = classifyRuntimeFailure(e);
    const m = runtimeFailureMessage(kind);
    Alert.alert(m.title, m.body);
  };

  const openTalkForAttention = async (a: PulseAttentionItem) => {
    try {
      const r = await resolveAttentionConversation({
        id: a.id,
        title: a.title,
        summary: a.summary,
        subjectId: a.subjectId,
        state: a.state,
        sessionId: a.sessionId,
        domain: a.domain,
      });
      router.push({
        pathname: "/talk",
        params: {
          sessionId: r.sessionId,
          projectPath: r.projectPath,
          attId: a.id,
          attTitle: a.title,
          attSummary: a.summary,
          attSubjectId: a.subjectId,
          attState: a.state,
          ...(r.created ? { autoSendContext: "1" } : {}),
        },
      });
    } catch (e) {
      const kind = classifyRuntimeFailure(e);
      const msg = e instanceof Error ? e.message : String(e);
      if (kind === "opencode-offline" || kind === "bff-offline" || kind === "auth") {
        const m = runtimeFailureMessage(kind);
        Alert.alert(m.title, m.body);
      } else if (/会话已不可用|404|not found/i.test(msg)) {
        Alert.alert("原会话已不存在", "该事项引用的会话已丢失（agent runtime 可能重启过）。", [
          { text: "取消", style: "cancel" },
          { text: "去 Talk 默认会话", onPress: () => router.push({ pathname: "/talk" }) },
        ]);
      } else {
        Alert.alert("无法进入 Talk", msg);
      }
    }
  };

  // Suggested → Talk: discussion only, never an authorization step.
  const talkAboutSuggestion = async (sg: PulseSuggestion) => {
    try {
      const dir = sg.domain === "market" ? MARKET_TALK_DIRECTORY : "/";
      const created = await opencodeClient.createSession({ directory: dir });
      router.push({
        pathname: "/talk",
        params: {
          sessionId: created.id,
          projectPath: dir,
          autoContextText: `我们来讨论一个你提出的建议：「${sg.responsibility}」${sg.reasonLabel ? `（${sg.reasonLabel}）` : ""}。先只讨论，不要确认。`,
        },
      });
    } catch (e) {
      alertRuntimeFailure(e);
    }
  };

  // Noticed → Talk (L1: no lifecycle, marks nothing).
  const talkAboutNoticed = async (st: L1Statement) => {
    try {
      const created = await opencodeClient.createSession({ directory: MARKET_TALK_DIRECTORY });
      router.push({
        pathname: "/talk",
        params: {
          sessionId: created.id,
          projectPath: MARKET_TALK_DIRECTORY,
          autoContextText: `关于你刚才注意到的：「${st.text}」我们聊聊。`,
        },
      });
    } catch (e) {
      alertRuntimeFailure(e);
    }
  };

  // Confirm / Reject are the only paths that advance a proposal.
  const onSuggestionAction = async (id: string, action: "confirm" | "reject") => {
    if (suggestionBusyId) return;
    setSuggestionBusyId(id);
    try {
      if (action === "confirm") {
        await confirmSuggestion(id);
        setAssignmentsKey((k) => k + 1);
      } else {
        await rejectSuggestion(id);
      }
    } finally {
      setSuggestionBusyId(null);
    }
  };

  const doLogin = async () => {
    try {
      setLoginError(null);
      await login(loginUser, loginPass);
      setNeedLogin(false);
      setLoginOpen(false);
      refreshProjects();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : String(e));
    }
  };

  const openDoc = (hit: KbHit) => {
    setKnowledgeOpen(false);
    router.push({ pathname: "/kb/doc", params: { ref: hit.ref, title: hit.title } });
  };

  const askAboutSource = (hit: KbHit) => {
    setKnowledgeOpen(false);
    router.push({
      pathname: "/talk",
      params: { autoContextText: `我想了解这份资料：「${hit.title}」（${hit.ref}）。` },
    });
  };

  // ── render helpers ──────────────────────────────────────────────────────
  const renderSupportingRow = (item: SupportingItem, index: number, list: SupportingItem[]) => {
    const firstOfKind = list.findIndex((r) => r.kind === item.kind) === index;
    const label = firstOfKind ? KIND_LABEL[item.kind] : undefined;
    const key =
      item.kind === "needs-you"
        ? `ny-${item.attention.id}`
        : item.kind === "suggested"
          ? `sg-${item.suggestion.id}`
          : item.kind === "running"
            ? `run-${item.event.id}`
            : "market";

    if (item.kind === "needs-you") {
      const a = item.attention;
      return (
        <SupportingRow
          key={key}
          kind="needs-you"
          label={label}
          statement={a.title}
          meta={`${a.domain === "market" ? "Market" : "Coding"} · ${formatRelative(a.createdAt)}`}
          actionLabel="REVIEW"
          onAction={() => router.push(`/attention/${a.id}`)}
          quietActionLabel="Dismiss"
          onQuietAction={() => dismiss(a.id)}
          testID={`supporting-${key}`}
        />
      );
    }
    if (item.kind === "suggested") {
      const sg = item.suggestion;
      return (
        <SupportingRow
          key={key}
          kind="suggested"
          label={label}
          statement={sg.responsibility}
          meta={[
            ...(sg.reasonLabel ? [`为什么：${sg.reasonLabel}`] : []),
            sg.effectLabel,
          ]}
          actionLabel="CONFIRM"
          onAction={() => onSuggestionAction(sg.id, "confirm")}
          quietActionLabel="Dismiss"
          onQuietAction={() => onSuggestionAction(sg.id, "reject")}
          onPress={() => talkAboutSuggestion(sg)}
          testID={`supporting-${key}`}
        />
      );
    }
    if (item.kind === "running") {
      const e = item.event;
      return (
        <SupportingRow
          key={key}
          kind="running"
          label={label}
          statement={e.name}
          meta={e.statusLabel}
          onPress={() => router.push({ pathname: "/talk", params: { projectPath: e.projectPath } })}
          testID={`supporting-${key}`}
        />
      );
    }
    const first = funds[0];
    return (
      <SupportingRow
        key={key}
        kind="market"
        label={label}
        statement={`${first.name}  ${first.estimatedNav.toFixed(4)}  ${first.changePct >= 0 ? "+" : ""}${first.changePct.toFixed(2)}%`}
        meta={funds.length > 1 ? `${first.code} · +${funds.length - 1} more` : first.code}
        onPress={() => setFundsOpen(true)}
        testID="supporting-market"
      />
    );
  };

  const renderNoticedRow = (st: L1Statement) => (
    <NoticedRow
      key={st.id}
      text={st.text}
      time={formatRelative(st.occurredAt)}
      onPress={() => setDetailStatement(st)}
      testID={`noticed-${st.id}`}
    />
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <AIOrb size={40} state={presence} testID="pulse-orb" />
        <View style={styles.headerText}>
          <AIStatus state={presence} testID="pulse-status" />
          <Text variant="title" color="ink" testID="pulse-title">Pulse</Text>
        </View>
        <IconButton
          icon={Settings}
          onPress={() => setSettingsOpen(true)}
          accessibilityLabel="Settings"
          testID="pulse-settings"
        />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {needLogin ? (
          <Pressable
            onPress={() => setLoginOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="未登录，点击登录"
            testID="pulse-login-banner"
            style={styles.loginBanner}
          >
            <Text variant="caption" color="accentBright">未登录 — 点击登录</Text>
          </Pressable>
        ) : null}

        <PulseHero
          greeting={greeting}
          aiLine={aiLine}
          watchingCount={watchingCount}
          onWatchingPress={() => router.push("/assignments")}
        />

        {!offline && !featured && supporting.length === 0 && visibleNoticed.length === 0 ? (
          <View style={{ paddingHorizontal: spacing.lg }}>
            <Text variant="caption" color="muted" testID="pulse-empty">
              Nothing needs you right now.
            </Text>
          </View>
        ) : null}

        {featured ? (
          <FeaturedAttention
            title={featured.title}
            summary={featured.summary}
            meta={`${featured.creationReasonRef || (featured.domain === "market" ? "Market" : "Coding")} · ${formatRelative(featured.createdAt)}`}
            onReview={() => router.push(`/attention/${featured.id}`)}
            onDiscuss={() => openTalkForAttention(featured)}
          />
        ) : null}

        {visibleSupporting.length > 0 || supportingOverflow > 0 || otherProjects.length > 0 ? (
          <View style={styles.supporting}>
            {visibleSupporting.map((item, i, list) => renderSupportingRow(item, i, list))}
            {supportingOverflow > 0 ? (
              <View style={styles.supportingMore}>
                <TextAction
                  label={`More (${supportingOverflow})`}
                  onPress={() => setOverflowOpen(true)}
                  testID="supporting-more"
                />
              </View>
            ) : null}
            {otherProjects.length > 0 ? (
              <View style={styles.supportingMore}>
                <TextAction
                  label={`More projects (${otherProjects.length})`}
                  onPress={() => setProjectsOpen(true)}
                  testID="supporting-more-projects"
                />
              </View>
            ) : null}
          </View>
        ) : null}

        {visibleNoticed.length > 0 ? (
          <View style={styles.noticed}>
            <View style={styles.noticedHeader}>
              <Text variant="label" color="muted">NOTICED</Text>
              {noticedOverflow > 0 ? (
                <TextAction
                  label="See All"
                  onPress={() => setNoticedListOpen(true)}
                  testID="noticed-see-all"
                />
              ) : null}
            </View>
            <View style={styles.noticedRows}>{visibleNoticed.map(renderNoticedRow)}</View>
          </View>
        ) : null}

        {suggestionError ? (
          <Text variant="caption" color="error" testID="pulse-suggestion-error">
            {suggestionError}
          </Text>
        ) : null}

        {projectError && !offline ? (
          <Text variant="caption" color="muted" testID="pulse-error">
            {projectError}
          </Text>
        ) : null}
      </ScrollView>

      <View style={styles.entryDock}>
        <ConversationEntry onPress={() => router.push("/talk")} />
      </View>

      {/* ── contextual sheets ── */}
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenMemory={() => setMemoryOpen(true)}
        onOpenKnowledge={() => setKnowledgeOpen(true)}
        onLogin={() => {
          setSettingsOpen(false);
          setLoginOpen(true);
        }}
      />
      <MemorySheet visible={memoryOpen} onClose={() => setMemoryOpen(false)} />
      <KnowledgeSheet
        visible={knowledgeOpen}
        onClose={() => setKnowledgeOpen(false)}
        onOpenDoc={openDoc}
        onAskAboutThis={askAboutSource}
      />
      <FundSheet visible={fundsOpen} funds={funds} onClose={() => setFundsOpen(false)} />
      <NoticedDetailSheet
        statement={detailStatement}
        onClose={() => setDetailStatement(null)}
        onDiscuss={() => {
          const st = detailStatement;
          setDetailStatement(null);
          if (st) talkAboutNoticed(st);
        }}
      />

      {/* Supporting overflow: full list, same rows, canonical order, no state change */}
      <ListSheet
        visible={overflowOpen}
        title="More"
        onClose={() => setOverflowOpen(false)}
        testID="supporting-overflow-sheet"
      >
        {supporting.map((item, i, list) => renderSupportingRow(item, i, list))}
      </ListSheet>

      {/* All projects (running + idle) — idle projects stay reachable */}
      <ListSheet
        visible={projectsOpen}
        title="Projects"
        onClose={() => setProjectsOpen(false)}
        testID="projects-sheet"
      >
        {events.map((e) => (
          <SupportingRow
            key={`p-all-${e.id}`}
            kind="running"
            statement={e.name}
            meta={e.statusLabel}
            onPress={() => {
              setProjectsOpen(false);
              router.push({ pathname: "/talk", params: { projectPath: e.projectPath } });
            }}
            testID={`p-all-${e.id}`}
          />
        ))}
        {otherProjects.map((e) => (
          <SupportingRow
            key={`p-idle-${e.id}`}
            kind="market"
            statement={e.name}
            meta={e.statusLabel}
            onPress={() => {
              setProjectsOpen(false);
              router.push({ pathname: "/talk", params: { projectPath: e.projectPath } });
            }}
            testID={`p-idle-${e.id}`}
          />
        ))}
      </ListSheet>

      {/* See All — Noticed list */}
      <ListSheet
        visible={noticedListOpen}
        title="Noticed"
        onClose={() => setNoticedListOpen(false)}
        testID="noticed-list-sheet"
      >
        {noticedSorted.map(renderNoticedRow)}
      </ListSheet>

      {/* Login (contextual, unchanged semantics) */}
      <BottomSheet visible={loginOpen} onClose={() => setLoginOpen(false)} testID="login-sheet">
        <View style={{ gap: spacing.sm }}>
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
          <Button variant="primary" label="登录" onPress={doLogin} testID="login-submit" />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerText: { flex: 1, gap: 2 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
    gap: spacing.xxl,
  },
  loginBanner: {
    marginHorizontal: spacing.lg,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface[1],
  },
  supporting: { gap: spacing.sm },
  supportingMore: { paddingHorizontal: spacing.lg },
  noticed: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  noticedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noticedRows: { gap: 0 },
  entryDock: { paddingBottom: spacing.lg },
  loginInput: {
    backgroundColor: colors.surface[2],
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    color: colors.ink,
    fontSize: 15,
  },
});
