import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { BottomSheet } from "../navigation/BottomSheet";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";
import { SearchInput } from "../primitives/SearchInput";
import { StatusDot } from "../feedback/StatusDot";
import { StatusPill } from "../feedback/StatusPill";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { opencodeConfig, getBaseUrl } from "../../config/opencode";
import { getUsername, logout, loadToken } from "../../services/auth";
import { getRuntimeBaseUrl, setRuntimeBaseUrl, clearRuntimeBaseUrl } from "../../services/bff-config";
import { probeBffHealth } from "../../services/bff-health";
import { loadModelPrefs, setModelPref } from "../../services/model-prefs";
import { DEFAULT_MODEL, selectModels } from "../../services/model-registry";
import { filterModels, type ModelPref } from "../../services/filter-models";
import { opencodeClient } from "../../services/opencode-client";
import {
  fetchAssignments,
  fetchProposals,
  fetchAssignmentHistory,
  type AssignmentHistoryItem,
  type AssignmentRecord,
  type ProposalRow,
} from "../../services/assignment/client";
import {
  buildResponsibilities,
  lastRunOf,
  type ResponsibilityRow,
} from "../../services/assignment/responsibilities";
import { colors, radius, spacing } from "../../theme";
import { t, useLocale } from "../../i18n";

interface AgentRow {
  id: string;
  model: ModelPref;
}

// 一套行样式：Settings 里所有"一行一条信息"的地方（导航行 / 账号行 / 模型行 /
// 职责行）共用，保证行距、分隔线、字阶与 MemorySheet 一致（paddingVertical xs +
// 1px border.subtle）。
const rowStyle = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: spacing.xs,
  paddingVertical: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.border.subtle,
};

const rowBodyStyle = { flex: 1, gap: 2 };

/**
 * 上次执行的相对时间：走 t()（与 SessionsDrawer 同一套词），超过一天用
 * MM-DD HH:mm（纯数字，中英一致）。不复用 projection.formatRelative 是因为
 * 它硬编码英文（"today 14:50"），会让中文界面中英混排。
 */
function lastRunLabel(epoch: number): string {
  const mins = Math.round((Date.now() - epoch) / 60_000);
  if (mins < 1) return t("pulse.settings.lastRunJustNow");
  if (mins < 60) return t("pulse.settings.lastRunMinutes", { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("pulse.settings.lastRunHours", { n: hours });
  const d = new Date(epoch);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 分组：label（12/600 字距 0.6，muted）+ 紧贴的行列表，节奏对齐 MemorySheet。 */
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xxs }}>
      <Text variant="label" color="muted">{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function SettingsRow({
  label,
  detail,
  onPress,
  testID,
  monoDetail = false,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  testID?: string;
  /** 模型名这类标识用 mono；普通说明用 caption */
  monoDetail?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => ({ ...rowStyle, opacity: pressed ? 0.6 : 1 })}
    >
      <View style={rowBodyStyle}>
        <Text variant="bodyStrong" color="ink">{label}</Text>
        {detail ? (
          monoDetail ? (
            <Text variant="monoCaption" color="muted" numberOfLines={1}>{detail}</Text>
          ) : (
            <Text variant="caption" color="body">{detail}</Text>
          )
        ) : null}
      </View>
      <Icon icon={ChevronRight} size="sm" color="muted" />
    </Pressable>
  );
}

/**
 * SettingsSheet — contextual settings (replaces the Me tab and the dead Bell).
 * Sections: Responsibilities (live list + management) / Connection (+Advanced) /
 * Preferences / What I remember / Knowledge. Not an application area.
 */
export function SettingsSheet({
  visible,
  onClose,
  onOpenMemory,
  onOpenKnowledge,
  onOpenActivity,
  onOpenBoundaries,
  onLogin,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenMemory: () => void;
  onOpenKnowledge: () => void;
  onOpenActivity: () => void;
  onOpenBoundaries: () => void;
  onLogin: () => void;
}) {
  const router = useRouter();
  // 订阅语言：切换时 sheet 重渲染，渲染期 t() 取到新文案。
  useLocale();
  const [username, setUsername] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [addr, setAddr] = useState("");
  const [custom, setCustom] = useState(false);
  const [saved, setSaved] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [modelList, setModelList] = useState<ModelPref[]>([]);
  const [pickAgent, setPickAgent] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // 职责区块：只读投影（active assignment + proposed proposal），无写操作。
  const [responsibilities, setResponsibilities] = useState<ResponsibilityRow[]>([]);
  // idle = 未登录（不作为、也不声称"没有在跑的事"）；ready 且空才显示空态句。
  const [respState, setRespState] = useState<"idle" | "loading" | "error" | "ready">("idle");

  const reload = useCallback(async () => {
    await loadToken();
    const name = await getUsername();
    setUsername(name);
    setOnline(await probeBffHealth(getBaseUrl()));
    const runtime = await getRuntimeBaseUrl();
    setCustom(Boolean(runtime));
    setAddr(runtime ?? opencodeConfig.baseUrl);
    const prefs = await loadModelPrefs();
    const list = await opencodeClient.listAgents().catch(() => []);
    const primary = list.filter((a) => a.mode === "primary");
    setAgents(
      primary.map((a) => ({
        id: a.name,
        // 2026-10-01（issue #43 顺带修，#41 遗漏）：与 ChatPanelZ 同一根因——
        // server opencode.json 里 primary agent 仍配着已下线的 deepseek-v4-flash。
        // 用户偏好优先，否则统一 DEFAULT_MODEL，**不采纳 server 的 a.model**。
        model: prefs[a.name] ?? {
          providerID: DEFAULT_MODEL.providerID,
          modelID: DEFAULT_MODEL.modelID,
        },
      })),
    );
    const prov = await opencodeClient.listProviders().catch(() => ({ providers: [], default: {} }));
    // 白名单/排除规则集中在 services/model-registry.ts（与 chat 侧共用同一套）
    const flat: ModelPref[] = selectModels(prov.providers);
    if (flat.length > 0) setModelList(flat);

    // 职责区块：现有两个只读端点（GET /api/product/assignments?state=active、
    // GET /api/product/assignment-proposals?status=proposed）+ 逐条 history 取上次执行。
    // 写操作（撤销/确认）一律不在这里做；未登录时不发请求（不冒充空态）。
    if (!name) {
      setResponsibilities([]);
      setRespState("idle");
      return;
    }
    setRespState("loading");
    try {
      const [assignments, proposals] = await Promise.all([
        fetchAssignments("active"),
        fetchProposals("proposed").catch(() => [] as ProposalRow[]),
      ]);
      const histories: AssignmentHistoryItem[][] = await Promise.all(
        assignments.map((a: AssignmentRecord) =>
          fetchAssignmentHistory(a.id).catch(() => [] as AssignmentHistoryItem[]),
        ),
      );
      const lastRunByAssignment: Record<string, number | null> = {};
      assignments.forEach((a, i) => {
        lastRunByAssignment[a.id] = lastRunOf(histories[i] ?? []);
      });
      setResponsibilities(buildResponsibilities(assignments, proposals, lastRunByAssignment));
      setRespState("ready");
    } catch {
      // 读不到就不假装"没有在跑的事"——用一行 error 文案说明（同 MemorySheet），不阻断其它区块。
      setResponsibilities([]);
      setRespState("error");
    }
  }, []);

  useEffect(() => {
    // reload 没有任何同步 setState（每一步都在 await 之后），规则的静态分析跨不过
    // await 边界，属误报。
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 全异步加载：setState 均在 await 之后
    if (visible) reload();
  }, [visible, reload]);

  const doLogout = async () => {
    await logout();
    setUsername(null);
    // 职责列表属于账号数据：登出后清空（否则会把上一个账号"她在盯什么"留在屏上）。
    setResponsibilities([]);
    setRespState("idle");
  };

  const saveAddr = async () => {
    await setRuntimeBaseUrl(addr);
    setCustom(true);
    setSaved(true);
  };

  const resetAddr = async () => {
    await clearRuntimeBaseUrl();
    setAddr(opencodeConfig.baseUrl);
    setCustom(false);
    setSaved(false);
  };

  const confirmModel = async (pref: ModelPref) => {
    if (!pickAgent) return;
    await setModelPref(pickAgent, pref);
    setAgents((prev) => prev.map((a) => (a.id === pickAgent ? { ...a, model: pref } : a)));
    setPickAgent(null);
    setQuery("");
  };

  const filtered = filterModels(modelList, query);
  const current = agents.find((a) => a.id === pickAgent)?.model;

  return (
    <>
      <BottomSheet visible={visible} onClose={onClose} testID="settings-sheet">
        {/* header：title + caption，与 MemorySheet / KnowledgeSheet 同一套（xxs 间距、
            sm 底部留白）。放 ScrollView 外，滚动时不跟着走。 */}
        <View style={{ gap: spacing.xxs, marginBottom: spacing.sm }}>
          <Text variant="title" color="ink">{t("pulse.header.settings")}</Text>
          <Text variant="caption" color="muted">{t("pulse.settings.caption")}</Text>
        </View>

        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.sm }}>
          {/* Responsibilities — 实时列表（只读）+ 管理入口 */}
          <Section label={t("pulse.settings.responsibilities")}>
            {respState === "loading" ? (
              <Text variant="caption" color="muted" testID="settings-resp-loading">
                {t("pulse.settings.responsibilitiesLoading")}
              </Text>
            ) : null}
            {respState === "error" ? (
              <Text variant="caption" color="error" testID="settings-resp-error">
                {t("pulse.settings.responsibilitiesError")}
              </Text>
            ) : null}
            {respState === "ready" && responsibilities.length === 0 ? (
              <Text variant="caption" color="muted" testID="settings-resp-empty">
                {t("pulse.settings.responsibilitiesEmpty")}
              </Text>
            ) : null}
            {responsibilities.map((r) => {
              const pillLabel =
                r.kind === "proposal"
                  ? t("pulse.settings.responsibilityProposed")
                  : t("pulse.settings.responsibilityActive");
              const body = (
                <>
                  <View style={rowBodyStyle}>
                    {/* 标题行：责任原文（flex:1，可换行）+ 状态 chip，与 /assignments 卡片同构 */}
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.xs }}>
                      <View style={{ flex: 1 }}>
                        <Text variant="bodyStrong" color="ink">{r.responsibility}</Text>
                      </View>
                      <StatusPill
                        status={r.tone}
                        label={pillLabel}
                        testID={`settings-resp-pill-${r.id}`}
                      />
                    </View>
                    {r.lastRunAt !== null ? (
                      <Text variant="monoCaption" color="muted">
                        {t("pulse.settings.responsibilityLastRun", { time: lastRunLabel(r.lastRunAt) })}
                      </Text>
                    ) : null}
                  </View>
                  {r.kind === "assignment" ? <Icon icon={ChevronRight} size="sm" color="muted" /> : null}
                </>
              );
              // 提案没有详情页（/assignments/[id] 只认 asg_），本区块也不做确认/撤销，
              // 故提案行只展示、不可点；写操作在详情页与 Pulse 建议卡上。
              return r.kind === "assignment" ? (
                <Pressable
                  key={r.id}
                  testID={`settings-resp-${r.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={t("pulse.settings.responsibilityOpen", { responsibility: r.responsibility })}
                  onPress={() => {
                    onClose();
                    router.push(`/assignments/${r.id}`);
                  }}
                  style={({ pressed }) => ({ ...rowStyle, opacity: pressed ? 0.6 : 1 })}
                >
                  {body}
                </Pressable>
              ) : (
                <View key={r.id} testID={`settings-resp-${r.id}`} style={rowStyle}>
                  {body}
                </View>
              );
            })}

            <SettingsRow
              label={t("pulse.settings.responsibilitiesRow")}
              detail={t("pulse.settings.responsibilitiesDetail")}
              testID="settings-responsibilities"
              onPress={() => {
                onClose();
                router.push("/assignments");
              }}
            />
            {/* 只读审计：她替你做过什么（PM §14 可见化第一步；无授权/撤销入口） */}
            <SettingsRow
              label={t("pulse.settings.activityRow")}
              detail={t("pulse.settings.activityDetail")}
              testID="settings-activity"
              onPress={() => {
                onClose();
                onOpenActivity();
              }}
            />
            {/* 她现在的自主边界（只读）：先做后报 / 先问再做 / 绝不做 */}
            <SettingsRow
              label={t("pulse.settings.boundariesRow")}
              detail={t("pulse.settings.boundariesDetail")}
              testID="settings-boundaries"
              onPress={() => {
                onClose();
                onOpenBoundaries();
              }}
            />
          </Section>

          {/* Connection */}
          <Section label={t("pulse.settings.connection")}>
            <View style={rowStyle}>
              <StatusDot
                status={online ? "success" : "idle"}
                size={8}
                pulse={false}
                accessibilityLabel={online ? t("pulse.settings.online") : t("pulse.settings.offline")}
              />
              <Text variant="body" color="body">
                {online ? t("pulse.settings.online") : t("pulse.settings.offline")}
              </Text>
            </View>
            <View style={rowStyle}>
              <View style={rowBodyStyle}>
                <Text variant="caption" color="muted">{t("pulse.settings.account")}</Text>
                <Text variant="bodyStrong" color="ink">{username ?? t("pulse.settings.notSignedIn")}</Text>
              </View>
            </View>
            <View style={{ marginTop: spacing.xs }}>
              {!username ? (
                <Button
                  variant="secondary"
                  label={t("pulse.settings.signIn")}
                  onPress={onLogin}
                  testID="settings-login"
                />
              ) : (
                <Button
                  variant="ghost"
                  label={t("pulse.settings.signOut")}
                  onPress={doLogout}
                  testID="settings-logout"
                />
              )}
            </View>
            <Pressable
              onPress={() => setAdvancedOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityLabel={t("pulse.settings.advancedA11y")}
              testID="settings-advanced-toggle"
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xxs,
                paddingVertical: spacing.xs,
              }}
            >
              {advancedOpen ? (
                <Icon icon={ChevronDown} size="xs" color="muted" />
              ) : (
                <Icon icon={ChevronRight} size="xs" color="muted" />
              )}
              <Text variant="caption" color="muted">{t("pulse.settings.advanced")}</Text>
            </Pressable>
            {advancedOpen ? (
              <View style={{ gap: spacing.xs }} testID="settings-advanced">
                <Text variant="monoCaption" color="muted">
                  {addr}
                  {custom ? "" : t("pulse.settings.defaultSuffix")}
                </Text>
                <Input
                  value={addr}
                  onChangeText={setAddr}
                  placeholder="http://IP:port"
                  testID="settings-bff-input"
                />
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Button label={t("pulse.settings.save")} onPress={saveAddr} testID="settings-bff-save" />
                  <Button
                    variant="ghost"
                    label={t("pulse.settings.reset")}
                    onPress={resetAddr}
                    testID="settings-bff-reset"
                  />
                </View>
                {saved ? (
                  <Text variant="caption" color="accentBright">{t("pulse.settings.savedHint")}</Text>
                ) : null}
              </View>
            ) : null}
          </Section>

          {/* Preferences */}
          <Section label={t("pulse.settings.preferences")}>
            {agents.map((a) => (
              <SettingsRow
                key={a.id}
                testID={`settings-agent-${a.id}`}
                label={a.id}
                detail={`${a.model.providerID}:${a.model.modelID}`}
                monoDetail
                onPress={() => {
                  setPickAgent(a.id);
                  setQuery("");
                }}
              />
            ))}
          </Section>

          {/* What I know */}
          <Section label={t("pulse.settings.whatIKnow")}>
            <SettingsRow
              label={t("pulse.memory.title")}
              detail={t("pulse.settings.memoryDetail")}
              testID="settings-memory"
              onPress={() => {
                onClose();
                onOpenMemory();
              }}
            />
            <SettingsRow
              label={t("pulse.settings.knowledgeRow")}
              detail={t("pulse.settings.knowledgeDetail")}
              testID="settings-knowledge"
              onPress={() => {
                onClose();
                onOpenKnowledge();
              }}
            />
          </Section>
        </ScrollView>
      </BottomSheet>

      <BottomSheet
        visible={pickAgent !== null}
        onClose={() => setPickAgent(null)}
        testID="settings-model-sheet"
      >
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" color="ink">
            {t("pulse.settings.modelPickerTitle", { agent: pickAgent ?? "" })}
          </Text>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery("")}
            placeholder={t("pulse.settings.modelSearchPlaceholder")}
            testID="settings-model-search"
          />
          <ScrollView style={{ maxHeight: 320 }}>
            {filtered.map((m) => {
              const active = current?.providerID === m.providerID && current?.modelID === m.modelID;
              return (
                <Pressable
                  key={`${m.providerID}:${m.modelID}`}
                  testID={`settings-model-${m.modelID}`}
                  onPress={() => confirmModel(m)}
                  style={({ pressed }) => ({
                    paddingHorizontal: spacing.sm,
                    paddingVertical: spacing.sm,
                    borderRadius: radius.xs,
                    backgroundColor: active ? colors.accent.subtle : pressed ? colors.surface[1] : "transparent",
                  })}
                >
                  <Text color={active ? "accent" : "ink"}>
                    {m.providerID}: {m.modelID}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Button
            label={t("pulse.settings.confirm")}
            onPress={() => setPickAgent(null)}
            testID="settings-model-confirm"
          />
        </View>
      </BottomSheet>
    </>
  );
}
