import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ChevronDown, ChevronRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import { BottomSheet } from "../navigation/BottomSheet";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";
import { SearchInput } from "../primitives/SearchInput";
import { StatusDot } from "../feedback/StatusDot";
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
import { colors, radius, spacing } from "../../theme";
import { t, useLocale } from "../../i18n";

interface AgentRow {
  id: string;
  model: ModelPref;
}

function SettingsRow({
  label,
  detail,
  onPress,
  testID,
}: {
  label: string;
  detail?: string;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: spacing.xs,
        paddingVertical: spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="body" color="ink">{label}</Text>
        {detail ? <Text variant="caption" color="muted">{detail}</Text> : null}
      </View>
      <Icon icon={ChevronRight} size="sm" color="muted" />
    </Pressable>
  );
}

/**
 * SettingsSheet — contextual settings (replaces the Me tab and the dead Bell).
 * Sections: Responsibilities / Connection (+Advanced) / Preferences /
 * What I remember / Knowledge / Logout. Not an application area.
 */
export function SettingsSheet({
  visible,
  onClose,
  onOpenMemory,
  onOpenKnowledge,
  onOpenActivity,
  onLogin,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenMemory: () => void;
  onOpenKnowledge: () => void;
  onOpenActivity: () => void;
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

  const reload = useCallback(async () => {
    await loadToken();
    setUsername(await getUsername());
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
        <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ gap: spacing.md }}>
          <Text variant="title" color="ink">{t("pulse.header.settings")}</Text>

          {/* Responsibilities */}
          <View style={{ gap: spacing.xxs }}>
            <Text variant="label" color="muted">{t("pulse.settings.responsibilities")}</Text>
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
          </View>

          {/* Connection */}
          <View style={{ gap: spacing.xxs }}>
            <Text variant="label" color="muted">{t("pulse.settings.connection")}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs }}>
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
            <View style={{ gap: 2 }}>
              <Text variant="caption" color="muted">{t("pulse.settings.account")}</Text>
              <Text variant="body" color="ink">{username ?? t("pulse.settings.notSignedIn")}</Text>
            </View>
            {!username ? (
              <View style={{ marginTop: spacing.xs }}>
                <Button
                  variant="secondary"
                  label={t("pulse.settings.signIn")}
                  onPress={onLogin}
                  testID="settings-login"
                />
              </View>
            ) : (
              <View style={{ marginTop: spacing.xs }}>
                <Button
                  variant="ghost"
                  label={t("pulse.settings.signOut")}
                  onPress={doLogout}
                  testID="settings-logout"
                />
              </View>
            )}
            <Pressable
              onPress={() => setAdvancedOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityLabel={t("pulse.settings.advancedA11y")}
              testID="settings-advanced-toggle"
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.xxs, paddingVertical: spacing.xs }}
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
          </View>

          {/* Preferences */}
          <View style={{ gap: spacing.xxs }}>
            <Text variant="label" color="muted">{t("pulse.settings.preferences")}</Text>
            {agents.map((a) => (
              <Pressable
                key={a.id}
                testID={`settings-agent-${a.id}`}
                onPress={() => {
                  setPickAgent(a.id);
                  setQuery("");
                }}
                accessibilityRole="button"
                accessibilityLabel={t("pulse.settings.modelPreferenceFor", { agent: a.id })}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing.xs,
                  paddingVertical: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: colors.border.subtle,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="body" color="ink">{a.id}</Text>
                  <Text variant="monoCaption" color="muted" numberOfLines={1}>
                    {a.model.providerID}:{a.model.modelID}
                  </Text>
                </View>
                <Icon icon={ChevronRight} size="sm" color="muted" />
              </Pressable>
            ))}
          </View>

          {/* What I know */}
          <View style={{ gap: spacing.xxs }}>
            <Text variant="label" color="muted">{t("pulse.settings.whatIKnow")}</Text>
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
          </View>
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
