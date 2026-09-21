import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
} from "react-native";
import { Settings } from "lucide-react-native";
import { useRouter } from "expo-router";
import { BottomSheet, Button, Text } from "@/components";
import { LinearGradient } from "expo-linear-gradient";
import { AIOrb } from "@/components/pulse/AIOrb";
import { AIStatus } from "@/components/pulse/AIStatus";
import { FeaturedItem } from "@/components/pulse/FeaturedItem";
import { SupportingList } from "@/components/pulse/SupportingList";
import { PulseNoticed } from "@/components/pulse/PulseNoticed";
import { ConversationEntry } from "@/components/pulse/ConversationEntry";
import { DetailSheet } from "@/components/pulse/DetailSheet";
import { AnimatedEntry } from "@/components/pulse/AnimatedEntry";
import { TextAction as ChipTextAction } from "@/components/pulse/ActionChips";
import type {
  NeedsYouItem,
  SuggestionItem,
  NoticedItem,
  PresenceState,
} from "@/components/pulse/showcase-types";
import { backgroundGradient, colors as c2colors } from "@/theme/companion";
import { ListSheet } from "@/components/pulse/ListSheet";
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
import { loadToken, login, onUnauthorized, getUsername } from "@/services/auth";
import { classifyRuntimeFailure, runtimeFailureMessage } from "@/services/runtime-presence";
import { colors, iconStroke, radius, spacing } from "@/theme";

const SUPPORTING_BUDGET = 4;
const NOTICED_BUDGET = 5;

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

// ── real data → companion view models (showcase2 component shapes) ─────────
const toNeedsYou = (a: PulseAttentionItem): NeedsYouItem => ({
  id: a.id,
  kind: "needs-you",
  title: a.title,
  why: a.summary ?? "",
  source: a.domain === "market" ? "Market" : a.domain === "coding" ? "Coding" : "Pulse",
  time: formatRelative(a.createdAt),
  reviewTarget: `/attention/${a.id}`,
  status: "open",
});

const toSuggestion = (sg: PulseSuggestion): SuggestionItem => ({
  id: sg.id,
  kind: "suggestion",
  proposal: sg.responsibility,
  status: "proposed",
  assignment: "idle",
  context: sg.responsibility,
  confirmLabel: "Confirm",
});

const toNoticed = (st: L1Statement): NoticedItem => ({
  id: st.id,
  kind: "noticed",
  fact: st.text,
  time: formatRelative(st.occurredAt),
  context: "Market",
});

interface SupportingBuckets {
  needsYou: NeedsYouItem[];
  suggestions: SuggestionItem[];
  running: { id: string; name: string; status: "running" | "idle" }[];
  market: { id: string; name: string; changePct: number | null }[];
}

function bucketize(items: SupportingItem[], funds: { code: string; name: string; changePct: number }[]): SupportingBuckets {
  const needsYou: NeedsYouItem[] = [];
  const suggestions: SuggestionItem[] = [];
  const running: SupportingBuckets["running"] = [];
  let market: SupportingBuckets["market"] = [];
  for (const item of items) {
    if (item.kind === "needs-you") needsYou.push(toNeedsYou(item.attention));
    else if (item.kind === "suggested") suggestions.push(toSuggestion(item.suggestion));
    else if (item.kind === "running") {
      running.push({ id: item.event.id, name: item.event.name, status: item.event.status === "running" ? "running" : "idle" });
    } else if (item.kind === "market" && funds[0]) {
      const f = funds[0];
      market = [{ id: f.code, name: funds.length > 1 ? `${f.name} +${funds.length - 1}` : f.name, changePct: f.changePct }];
    }
  }
  return { needsYou, suggestions, running, market };
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
    (async () => {
      const g = getGreeting();
      let name = "";
      try {
        name = (await getUsername())?.trim() ?? "";
      } catch {
        /* greeting stays anonymous */
      }
      setGreeting(name ? `${g.replace(/\.$/, "")}, ${name}.` : g);
    })();
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
  const presence: PresenceState = offline ? "offline" : openAttentions.length > 0 ? "needs-you" : "attentive";
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

  const visibleBuckets = useMemo(() => bucketize(visibleSupporting, funds), [visibleSupporting, funds]);
  const allBuckets = useMemo(() => bucketize(supporting, funds), [supporting, funds]);

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
  const renderNoticedItem = (st: L1Statement) => (
    <PulseNoticed
      key={st.id}
      item={toNoticed(st)}
      testID={`noticed-${st.id}`}
      onPress={() => setDetailStatement(st)}
    />
  );

  const comma = greeting.indexOf(",");
  const heroLine1 = comma > 0 ? greeting.slice(0, comma + 1) : greeting;
  const heroLine2 = comma > 0 ? greeting.slice(comma + 1).trim() : "";

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={backgroundGradient.colors}
        locations={backgroundGradient.locations}
        start={backgroundGradient.start}
        end={backgroundGradient.end}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(139,92,246,0.12)", "transparent"]}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: 130 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View testID="pulse-orb">
            <AIOrb state={presence} size="header" />
          </View>
          <View style={styles.headerStack}>
            <View testID="pulse-status">
              <AIStatus state={presence} />
            </View>
            <RNText style={styles.appName} testID="pulse-title">Pulse</RNText>
          </View>
          <View style={styles.headerSpacer} />
          <Pressable
            onPress={() => setSettingsOpen(true)}
            accessibilityLabel="Settings"
            accessibilityRole="button"
            testID="pulse-settings"
            hitSlop={10}
          >
            <Settings color={c2colors.textMuted} size={20} strokeWidth={iconStroke} />
          </Pressable>
        </View>

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

        <AnimatedEntry index={0}>
          <View style={styles.hero}>
            <RNText style={styles.heroLine}>{heroLine1}</RNText>
            {heroLine2 !== "" && <RNText style={styles.heroLine}>{heroLine2}</RNText>}
            <RNText style={styles.aiVoice}>{aiLine}</RNText>
            {watchingCount > 0 ? (
              <Pressable onPress={() => router.push("/assignments")} testID="watching-line" hitSlop={6}>
                <RNText style={styles.watchingLine}>
                  Watching {watchingCount} thing{watchingCount === 1 ? "" : "s"} for you ›
                </RNText>
              </Pressable>
            ) : null}
          </View>
        </AnimatedEntry>

        {featured ? (
          <AnimatedEntry index={1}>
            <FeaturedItem
              item={toNeedsYou(featured)}
              testID="featured-attention"
              onReview={() => router.push(`/attention/${featured.id}`)}
              onDiscuss={() => openTalkForAttention(featured)}
            />
          </AnimatedEntry>
        ) : null}

        <AnimatedEntry index={2}>
          <SupportingList
            needsYou={visibleBuckets.needsYou}
            suggestions={visibleBuckets.suggestions}
            running={visibleBuckets.running}
            market={visibleBuckets.market}
            onReview={(it) => router.push(`/attention/${it.id}`)}
            onDiscussNeedsYou={(it) => {
              const a = openAttentions.find((x) => x.id === it.id);
              if (a) openTalkForAttention(a);
            }}
            onDiscussSuggestion={(it) => {
              const sg = suggestions.find((x) => x.id === it.id);
              if (sg) talkAboutSuggestion(sg);
            }}
            onConfirm={(it) => onSuggestionAction(it.id, "confirm")}
            onDismiss={(it) => onSuggestionAction(it.id, "reject")}
            onOpenRunning={(row) => {
              const e = events.find((x) => x.id === row.id);
              if (e) router.push({ pathname: "/talk", params: { projectPath: e.projectPath } });
            }}
            onOpenMarket={() => setFundsOpen(true)}
          />
        </AnimatedEntry>

        {supportingOverflow > 0 ? (
          <View style={styles.overflowRow}>
            <ChipTextAction
              label={`More (${supportingOverflow})`}
              onPress={() => setOverflowOpen(true)}
              testID="supporting-more"
            />
          </View>
        ) : null}

        {otherProjects.length > 0 ? (
          <View style={styles.overflowRow}>
            <ChipTextAction
              label={`More projects (${otherProjects.length})`}
              onPress={() => setProjectsOpen(true)}
              testID="supporting-more-projects"
            />
          </View>
        ) : null}

        {visibleNoticed.length > 0 ? (
          <AnimatedEntry index={3}>
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <RNText style={styles.sectionLabel}>Noticed</RNText>
                {noticedOverflow > 0 ? (
                  <ChipTextAction
                    label="See All"
                    onPress={() => setNoticedListOpen(true)}
                    testID="noticed-see-all"
                  />
                ) : null}
              </View>
              <View>{visibleNoticed.map(renderNoticedItem)}</View>
            </View>
          </AnimatedEntry>
        ) : null}

        {!offline && !featured && supporting.length === 0 && visibleNoticed.length === 0 ? (
          <RNText style={styles.emptyLine} testID="pulse-empty">
            Nothing needs you right now.
          </RNText>
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
        <ConversationEntry onEnter={() => router.push("/talk")} testID="conversation-entry" />
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

      {/* Noticed read-only detail — Discuss is the only way into Talk */}
      {detailStatement ? (
        <DetailSheet
          label="Noticed"
          body={detailStatement.text}
          meta={formatRelative(detailStatement.occurredAt)}
          onDiscuss={() => {
            const st = detailStatement;
            setDetailStatement(null);
            if (st) talkAboutNoticed(st);
          }}
          onClose={() => setDetailStatement(null)}
        />
      ) : null}

      {/* Supporting overflow: full list, same rows, canonical order, no state change */}
      <ListSheet
        visible={overflowOpen}
        title="More"
        onClose={() => setOverflowOpen(false)}
        testID="supporting-overflow-sheet"
      >
        <SupportingList
          needsYou={allBuckets.needsYou}
          suggestions={allBuckets.suggestions}
          running={allBuckets.running}
          market={allBuckets.market}
          onReview={(it) => router.push(`/attention/${it.id}`)}
          onDiscussNeedsYou={(it) => {
            const a = openAttentions.find((x) => x.id === it.id);
            if (a) openTalkForAttention(a);
          }}
          onDiscussSuggestion={(it) => {
            const sg = suggestions.find((x) => x.id === it.id);
            if (sg) talkAboutSuggestion(sg);
          }}
          onConfirm={(it) => onSuggestionAction(it.id, "confirm")}
          onDismiss={(it) => onSuggestionAction(it.id, "reject")}
          onOpenRunning={(row) => {
            const e = events.find((x) => x.id === row.id);
            if (e) router.push({ pathname: "/talk", params: { projectPath: e.projectPath } });
          }}
          onOpenMarket={() => setFundsOpen(true)}
        />
      </ListSheet>

      {/* All projects (running + idle) — idle projects stay reachable */}
      <ListSheet
        visible={projectsOpen}
        title="Projects"
        onClose={() => setProjectsOpen(false)}
        testID="projects-sheet"
      >
        <SupportingList
          needsYou={[]}
          suggestions={[]}
          running={[
            ...events.map((e) => ({ id: e.id, name: e.name, status: (e.status === "running" ? "running" : "idle") as "running" | "idle" })),
            ...otherProjects.map((e) => ({ id: e.id, name: e.name, status: "idle" as const })),
          ]}
          onReview={() => {}}
          onDiscussNeedsYou={() => {}}
          onDiscussSuggestion={() => {}}
          onConfirm={() => {}}
          onDismiss={() => {}}
          onOpenRunning={(row) => {
            setProjectsOpen(false);
            const e = [...events, ...otherProjects].find((x) => x.id === row.id);
            if (e) router.push({ pathname: "/talk", params: { projectPath: e.projectPath } });
          }}
        />
      </ListSheet>

      {/* See All — Noticed list */}
      <ListSheet
        visible={noticedListOpen}
        title="Noticed"
        onClose={() => setNoticedListOpen(false)}
        testID="noticed-list-sheet"
      >
        {noticedSorted.map(renderNoticedItem)}
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
  root: { flex: 1, backgroundColor: "#0B0A12" },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  headerStack: { gap: 2 },
  headerSpacer: { flex: 1 },
  appName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "700",
    letterSpacing: -0.2,
    color: "#F5F3FA",
  },
  hero: { marginBottom: 28 },
  heroLine: {
    fontSize: 33,
    lineHeight: 39,
    fontWeight: "700",
    letterSpacing: -0.5,
    color: "#F5F3FA",
  },
  aiVoice: {
    fontSize: 15,
    lineHeight: 23,
    fontWeight: "400",
    color: "#B4AECB",
    marginTop: 8,
  },
  watchingLine: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "400",
    letterSpacing: 0.2,
    color: "#A78BFA",
    marginTop: 10,
  },
  section: { marginBottom: 36 },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#857FA3",
  },
  overflowRow: { marginBottom: 20 },
  emptyLine: {
    fontSize: 13,
    lineHeight: 18,
    color: "#7A7494",
    marginBottom: 20,
  },
  loginBanner: {
    marginBottom: 16,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(167,139,250,0.12)",
    backgroundColor: "#171428",
  },
  entryDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11,10,18,0.9)",
  },
  loginInput: {
    backgroundColor: "#1B1830",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#F5F3FA",
    fontSize: 15,
  },
});
