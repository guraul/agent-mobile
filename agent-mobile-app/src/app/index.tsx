import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text as RNText, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Settings } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Text } from "@/components";
import { LightPresenceDot } from "@/components/pulse/LightAtoms";
import { LightDock } from "@/components/pulse/LightAtoms";
import { LightTextAction } from "@/components/pulse/LightAtoms";
import { FeaturedItem } from "@/components/pulse/FeaturedItem";
import { SupportingList } from "@/components/pulse/SupportingList";
import { PulseNoticed } from "@/components/pulse/PulseNoticed";
import { DetailSheet } from "@/components/pulse/DetailSheet";
import { AnimatedEntry } from "@/components/pulse/AnimatedEntry";
import type {
  NeedsYouItem,
  SuggestionItem,
  NoticedItem,
  PresenceState,
} from "@/components/pulse/showcase-types";
import { ListSheet } from "@/components/pulse/ListSheet";
import { FundSheet } from "@/components/pulse/FundSheet";
import { SettingsSheet } from "@/components/pulse/SettingsSheet";
import { MemorySheet } from "@/components/pulse/MemorySheet";
import { KnowledgeSheet } from "@/components/pulse/KnowledgeSheet";
import { useProjectEvents, type ProjectEvent } from "@/hooks/useProjectEvents";
import { useL1 } from "@/hooks/useL1";
import { type L1Statement } from "@/services/l1";
import { useAttentions } from "@/hooks/useAttentions";
import { type PulseAttentionItem } from "@/services/attention/store";
import { useSuggestions } from "@/hooks/useSuggestions";
import { type PulseSuggestion } from "@/services/proposal/store";
import { resolveAttentionConversation, MARKET_TALK_DIRECTORY } from "@/services/attention/talk";
import { formatRelative } from "@/services/assignment/projection";
import { KbHit } from "@/services/memory/client";
import { opencodeClient } from "@/services/opencode-client";
import { getRuntimeBaseUrl } from "@/services/bff-config";
import { opencodeConfig } from "@/config/opencode";
import { loadToken, onUnauthorized, getUsername } from "@/services/auth";
import { classifyRuntimeFailure, runtimeFailureMessage } from "@/services/runtime-presence";
import { iconStroke } from "@/theme";
import { lightColors, lightTypography, lightSpacing, lightSizes, lightRadius } from "@/theme/light";
import { showAlert } from "../services/alert";

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
  const [suggestionBusyId, setSuggestionBusyId] = useState<string | null>(null);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [knowledgeOpen, setKnowledgeOpen] = useState(false);
  const [fundsOpen, setFundsOpen] = useState(false);
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
        if (!tok) {
          // D4：未登录 gate 进独立登录页（replace 防 back 回未登录首页）
          router.replace("/login");
        } else {
          refreshProjects();
        }
      });
    });
    // D4：token 失效（401）同样 gate 回登录页
    return onUnauthorized(() => router.replace("/login"));
  }, [refreshProjects, router]);

  // ── runtime presence (companion voice, never raw transport errors) ──────
  const failureKind = useMemo(() => {
    const err = attentionError ?? projectError;
    if (!err) return null;
    const kind = classifyRuntimeFailure(err);
    return kind === "opencode-offline" || kind === "bff-offline" ? kind : null;
  }, [attentionError, projectError]);
  const offline = failureKind !== null;
  const presence: PresenceState = offline ? "offline" : openAttentions.length > 0 ? "needs-you" : "attentive";
  // Header presence 文字（mock .presence：label 12/600；offline 灰点灰字）
  const presenceLabel = offline ? "Offline" : presence === "needs-you" ? "Needs you" : "Attentive";

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

  // 全空 = 在线且 Featured/Supporting/Noticed 均无（D7：aiVoice 仅离线/全空渲染）
  const isEmptyScreen = !offline && !featured && supporting.length === 0 && visibleNoticed.length === 0;

  // ── actions (semantics unchanged; services stay authoritative) ──────────
  const alertRuntimeFailure = (e: unknown) => {
    const kind = classifyRuntimeFailure(e);
    const m = runtimeFailureMessage(kind);
    showAlert(m.title, m.body);
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
        showAlert(m.title, m.body);
      } else if (/会话已不可用|404|not found/i.test(msg)) {
        showAlert("原会话已不存在", "该事项引用的会话已丢失（agent runtime 可能重启过）。", [
          { text: "取消", style: "cancel" },
          { text: "去 Talk 默认会话", onPress: () => router.push({ pathname: "/talk" }) },
        ]);
      } else {
        showAlert("无法进入 Talk", msg);
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
      } else {
        await rejectSuggestion(id);
      }
    } finally {
      setSuggestionBusyId(null);
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
  const renderNoticedItem = (st: L1Statement, index?: number) => (
    <PulseNoticed
      key={st.id}
      item={toNoticed(st)}
      testID={`noticed-${st.id}`}
      onPress={() => setDetailStatement(st)}
      style={index !== undefined && index > 0 ? styles.noticedDivider : undefined}
    />
  );

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      {/* 桌面端手机壳：>480 视口居中 480（移动端 width:100% 零变化） */}
      <View style={styles.shell}>
      {/* Pinned 顶区（mock .top-fixed）：Header + Hero 不随内容滚动 */}
      <View style={styles.topFixed}>
        {/* Header：左 presence 呼吸点 + 状态文字，中居中标题，右齿轮（D5 过渡期保留） */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View testID="pulse-orb">
              <LightPresenceDot online={!offline} />
            </View>
            <View testID="pulse-status">
              <RNText style={[styles.presenceLabel, offline && styles.presenceLabelOffline]}>
                {presenceLabel}
              </RNText>
            </View>
          </View>
          <RNText style={styles.appTitle} testID="pulse-title">
            Pulse
          </RNText>
          <Pressable
            onPress={() => setSettingsOpen(true)}
            accessibilityLabel="Settings"
            accessibilityRole="button"
            testID="pulse-settings"
            hitSlop={10}
            style={styles.headerGear}
          >
            <Settings color={lightColors.ink} size={18} strokeWidth={iconStroke} />
          </Pressable>
        </View>

        {/* Hero：单行问候（mock .greeting display 26/400）；aiVoice 仅离线渲染（D7） */}
        <AnimatedEntry index={0}>
          <View style={styles.hero} testID="pulse-hero">
            <RNText style={styles.heroLine}>{greeting}</RNText>
            {offline ? (
              <RNText style={styles.aiVoice} testID="pulse-offline-voice">
                I'm having trouble reaching my runtime.
              </RNText>
            ) : null}
          </View>
        </AnimatedEntry>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: lightSpacing.contentBottom }]}
        showsVerticalScrollIndicator={false}
      >
        {featured ? (
          <AnimatedEntry index={1}>
            <FeaturedItem
              item={toNeedsYou(featured)}
              testID="featured-attention"
              onReview={() => router.push(`/attention/${featured.id}`)}
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
            <LightTextAction
              label={`More (${supportingOverflow})`}
              onPress={() => setOverflowOpen(true)}
              testID="supporting-more"
            />
          </View>
        ) : null}

        {visibleNoticed.length > 0 ? (
          <AnimatedEntry index={3}>
            {/* Noticed ghost 卡（mock .card.ghost）：透明底 + 1.5px dashed 绿边 */}
            <View style={styles.section}>
              <View style={styles.sectionHead}>
                <RNText style={styles.sectionLabel}>Noticed</RNText>
                {noticedOverflow > 0 ? (
                  <LightTextAction
                    label="See All"
                    onPress={() => setNoticedListOpen(true)}
                    testID="noticed-see-all"
                  />
                ) : null}
              </View>
              <View>{visibleNoticed.map((st, i) => renderNoticedItem(st, i))}</View>
            </View>
          </AnimatedEntry>
        ) : null}

        {/* 空态（D7）：aiVoice 全空回归 + 安静提示；离线时整屏 aiVoice 已在 Hero 渲染 */}
        {isEmptyScreen ? (
          <View testID="pulse-empty">
            <RNText style={styles.aiVoice}>All's been calm while you were away.</RNText>
            <RNText style={styles.emptyLine}>Nothing needs you right now.</RNText>
          </View>
        ) : null}

        {suggestionError ? (
          <RNText style={styles.errorLine} testID="pulse-suggestion-error">
            {suggestionError}
          </RNText>
        ) : null}

        {projectError && !offline ? (
          <RNText style={styles.errorLine} testID="pulse-error">
            {projectError}
          </RNText>
        ) : null}
      </ScrollView>

      {/* Dock（mock .dock）：整颗 pill → /talk，非 TextInput（Pulse 唯一输入 affordance） */}
      <View style={styles.entryDock}>
        <LightDock
          label="Start New Chat"
          onPress={() => router.push("/talk")}
          testID="conversation-entry"
        />
      </View>

      {/* ── contextual sheets ── */}
      <SettingsSheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenMemory={() => setMemoryOpen(true)}
        onOpenKnowledge={() => setKnowledgeOpen(true)}
        onLogin={() => {
          // D4：登录走独立页
          setSettingsOpen(false);
          router.push("/login");
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

      {/* See All — Noticed list */}
      <ListSheet
        visible={noticedListOpen}
        title="Noticed"
        onClose={() => setNoticedListOpen(false)}
        testID="noticed-list-sheet"
      >
        {noticedSorted.map((st) => renderNoticedItem(st))}
      </ListSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: lightColors.cream, alignItems: "center" },
  shell: {
    width: "100%",
    maxWidth: 480,
    flex: 1,
    position: "relative",
    backgroundColor: lightColors.cream,
  },
  topFixed: {
    paddingHorizontal: lightSpacing.pageX,
    paddingTop: 10, // mock .app-header margin-top 10
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: lightSpacing.pageX, paddingTop: lightSpacing.contentTop },
  header: {
    height: 44, // mock .app-header
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  presenceLabel: {
    fontSize: lightTypography.label.fontSize,
    fontWeight: lightTypography.label.fontWeight,
    lineHeight: lightTypography.label.lineHeight,
    color: lightColors.accentDeep,
  },
  presenceLabelOffline: { color: lightColors.grayText },
  appTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: lightTypography.pageTitle.fontSize,
    fontWeight: lightTypography.pageTitle.fontWeight,
    lineHeight: lightTypography.pageTitle.lineHeight,
    color: lightColors.ink,
  },
  headerGear: { position: "absolute", right: 0 },
  hero: { marginTop: 8 }, // mock .greeting margin-top 8
  heroLine: {
    fontSize: lightTypography.display.fontSize,
    fontWeight: lightTypography.display.fontWeight,
    lineHeight: lightTypography.display.lineHeight,
    color: lightColors.ink,
  },
  aiVoice: {
    fontSize: lightTypography.body.fontSize,
    fontWeight: lightTypography.body.fontWeight,
    lineHeight: lightTypography.body.lineHeight,
    color: lightColors.subtleText,
    marginTop: 7, // mock .ai-voice
  },
  section: {
    // mock .card.ghost：透明底 + 1.5px dashed 绿边，圆角 24 padding 13
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: lightColors.greenCard,
    borderRadius: lightRadius.card,
    padding: lightSpacing.cardPad,
    marginBottom: 24,
  },
  noticedDivider: {
    borderTopWidth: 1,
    borderTopColor: lightColors.divider, // mock rgba(0,0,0,.05)
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2, // mock .section-head
  },
  sectionLabel: {
    fontSize: lightTypography.label.fontSize,
    fontWeight: lightTypography.label.fontWeight,
    lineHeight: lightTypography.label.lineHeight,
    color: lightColors.groupLabel,
  },
  overflowRow: { marginBottom: 20 },
  emptyLine: {
    fontSize: 13,
    lineHeight: 19, // round(13 × 1.45)
    color: lightColors.subtleText,
    marginTop: 18, // mock .empty-line
  },
  errorLine: {
    // mock .error-line：12 #E5484D 内联错误行
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.upRed,
    marginHorizontal: 2,
    marginTop: 2,
  },
  entryDock: {
    position: "absolute",
    left: lightSpacing.pageX,
    right: lightSpacing.pageX,
    bottom: lightSizes.dockBottom, // mock .dock bottom 50
  },
});
