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
import { filterModels, type ModelPref } from "../../services/filter-models";
import { opencodeClient } from "../../services/opencode-client";
import { colors, radius, spacing } from "../../theme";

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
  onLogin,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenMemory: () => void;
  onOpenKnowledge: () => void;
  onLogin: () => void;
}) {
  const router = useRouter();
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
        model: prefs[a.name] ?? {
          providerID: a.model?.providerID ?? "deepseek",
          modelID: a.model?.modelID ?? "",
        },
      })),
    );
    const prov = await opencodeClient.listProviders().catch(() => ({ providers: [], default: {} }));
    const flat: ModelPref[] = [];
    for (const p of prov.providers) {
      if (p.id === "openrouter" || p.id === "siliconflow-cn") continue;
      for (const mid of Object.keys(p.models ?? {})) {
        if (!mid.toLowerCase().includes("deepseek")) continue;
        flat.push({ providerID: p.id, modelID: mid });
      }
    }
    if (flat.length > 0) setModelList(flat);
  }, []);

  useEffect(() => {
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
          <Text variant="title" color="ink">Settings</Text>

          {/* Responsibilities */}
          <View style={{ gap: spacing.xxs }}>
            <Text variant="label" color="muted">RESPONSIBILITIES</Text>
            <SettingsRow
              label="What I am responsible for"
              detail="Active / completed / revoked"
              testID="settings-responsibilities"
              onPress={() => {
                onClose();
                router.push("/assignments");
              }}
            />
          </View>

          {/* Connection */}
          <View style={{ gap: spacing.xxs }}>
            <Text variant="label" color="muted">CONNECTION</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs }}>
              <StatusDot
                status={online ? "success" : "idle"}
                size={8}
                pulse={false}
                accessibilityLabel={online ? "在线" : "离线"}
              />
              <Text variant="body" color="body">{online ? "在线" : "离线"}</Text>
            </View>
            <View style={{ gap: 2 }}>
              <Text variant="caption" color="muted">账号</Text>
              <Text variant="body" color="ink">{username ?? "未登录"}</Text>
            </View>
            {!username ? (
              <View style={{ marginTop: spacing.xs }}>
                <Button variant="secondary" label="去登录" onPress={onLogin} testID="settings-login" />
              </View>
            ) : (
              <View style={{ marginTop: spacing.xs }}>
                <Button variant="ghost" label="登出" onPress={doLogout} testID="settings-logout" />
              </View>
            )}
            <Pressable
              onPress={() => setAdvancedOpen((o) => !o)}
              accessibilityRole="button"
              accessibilityLabel="Advanced connection settings"
              testID="settings-advanced-toggle"
              style={{ flexDirection: "row", alignItems: "center", gap: spacing.xxs, paddingVertical: spacing.xs }}
            >
              {advancedOpen ? (
                <Icon icon={ChevronDown} size="xs" color="muted" />
              ) : (
                <Icon icon={ChevronRight} size="xs" color="muted" />
              )}
              <Text variant="caption" color="muted">Advanced · BFF 地址</Text>
            </Pressable>
            {advancedOpen ? (
              <View style={{ gap: spacing.xs }} testID="settings-advanced">
                <Text variant="monoCaption" color="muted">
                  {addr}
                  {custom ? "" : " (默认)"}
                </Text>
                <Input
                  value={addr}
                  onChangeText={setAddr}
                  placeholder="http://IP:port"
                  testID="settings-bff-input"
                />
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  <Button label="保存" onPress={saveAddr} testID="settings-bff-save" />
                  <Button variant="ghost" label="恢复默认" onPress={resetAddr} testID="settings-bff-reset" />
                </View>
                {saved ? (
                  <Text variant="caption" color="accentBright">ⓘ 保存后重启生效(web 刷新即可)</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {/* Preferences */}
          <View style={{ gap: spacing.xxs }}>
            <Text variant="label" color="muted">PREFERENCES</Text>
            {agents.map((a) => (
              <Pressable
                key={a.id}
                testID={`settings-agent-${a.id}`}
                onPress={() => {
                  setPickAgent(a.id);
                  setQuery("");
                }}
                accessibilityRole="button"
                accessibilityLabel={`Model preference for ${a.id}`}
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
            <Text variant="label" color="muted">WHAT I KNOW</Text>
            <SettingsRow
              label="What I remember"
              detail="Memory about you and your projects"
              testID="settings-memory"
              onPress={() => {
                onClose();
                onOpenMemory();
              }}
            />
            <SettingsRow
              label="Knowledge sources"
              detail="Search what I can draw on"
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
          <Text variant="title" color="ink">为 {pickAgent} 选择 model</Text>
          <SearchInput
            value={query}
            onChangeText={setQuery}
            onClear={() => setQuery("")}
            placeholder="搜索 model…"
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
          <Button label="确认" onPress={() => setPickAgent(null)} testID="settings-model-confirm" />
        </View>
      </BottomSheet>
    </>
  );
}
