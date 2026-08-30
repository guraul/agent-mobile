import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { colors, spacing, radius } from "@/theme";
import { Card, Text, Button, Input, SearchInput, BottomSheet, StatusDot, Icon } from "@/components";
import { opencodeConfig, getBaseUrl } from "@/config/opencode";
import { getUsername, logout } from "@/services/auth";
import { getRuntimeBaseUrl, setRuntimeBaseUrl, clearRuntimeBaseUrl } from "@/services/bff-config";
import { probeBffHealth } from "@/services/bff-health";
import { loadModelPrefs, setModelPref } from "@/services/model-prefs";
import { filterModels, type ModelPref } from "@/services/filter-models";
import { opencodeClient } from "@/services/opencode-client";

interface AgentRow { id: string; model: ModelPref }

export default function MeScreen() {
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [addr, setAddr] = useState("");
  const [custom, setCustom] = useState(false);
  const [saved, setSaved] = useState(false);
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [modelList, setModelList] = useState<ModelPref[]>([]);
  const [pickAgent, setPickAgent] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const reload = useCallback(async () => {
    setUsername(await getUsername());
    setOnline(await probeBffHealth(getBaseUrl()));
    const runtime = await getRuntimeBaseUrl();
    setCustom(Boolean(runtime));
    setAddr(runtime ?? opencodeConfig.baseUrl);
    const prefs = await loadModelPrefs();
    const list = await opencodeClient.listAgents().catch(() => []);
    const primary = list.filter((a) => a.mode === "primary");
    setAgents(primary.map((a) => ({
      id: a.name,
      model: prefs[a.name] ?? { providerID: a.model?.providerID ?? "deepseek", modelID: a.model?.modelID ?? "" },
    })));
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

  useEffect(() => { reload(); }, [reload]);

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
    setAgents((prev) => prev.map((a) => a.id === pickAgent ? { ...a, model: pref } : a));
    setPickAgent(null);
    setQuery("");
  };

  const filtered = filterModels(modelList, query);
  const current = agents.find((a) => a.id === pickAgent)?.model;

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {/* Card 1 连接与账号 */}
      <Card testID="me-card-account" style={s.card}>
        <View style={s.row}>
          <StatusDot status={online ? "success" : "idle"} size={10} accessibilityLabel={online ? "在线" : "离线"} />
          <Text variant="bodyStrong">{online ? "在线" : "离线"}</Text>
        </View>
        <View style={s.mt}>
          <Text variant="caption" color="muted">账号</Text>
        </View>
        <Text variant="body">{username ?? "未登录"}</Text>
        <View style={s.mt}>
          <Text variant="caption" color="muted">BFF</Text>
        </View>
        <Text variant="body" numberOfLines={1}>{getBaseUrl()}</Text>
        {username ? (
          <View style={s.btnRow}><Button variant="secondary" label="登出" onPress={doLogout} testID="me-logout" /></View>
        ) : (
          <View style={s.btnRow}><Button variant="secondary" label="去 Pulse 登录" onPress={() => router.replace("/")} testID="me-goto-login" /></View>
        )}
      </Card>

      {/* Card 2 BFF 地址 */}
      <Card testID="me-card-bff" style={s.card}>
        <Text variant="title">BFF 地址</Text>
        <View style={s.mt}>
          <Text variant="caption" color="muted">当前生效</Text>
        </View>
        <Text variant="body">{addr}{custom ? "" : " (默认)"}</Text>
        <View style={s.mt}>
          <Text variant="caption" color="muted">新地址</Text>
        </View>
        <Input value={addr} onChangeText={setAddr} placeholder="http://IP:port" testID="me-bff-input" />
        <View style={s.btnRow}>
          <Button label="保存" onPress={saveAddr} testID="me-bff-save" />
          <Button variant="ghost" label="恢复默认" onPress={resetAddr} testID="me-bff-reset" />
        </View>
        {saved && <Text variant="caption" color="accent">ⓘ 保存后重启生效(web 刷新即可)</Text>}
      </Card>

      {/* Card 3 model 偏好 */}
      <Card testID="me-card-model" style={s.card}>
        <Text variant="title">model 偏好</Text>
        {agents.map((a) => (
          <Pressable key={a.id} testID={`me-agent-${a.id}`} onPress={() => { setPickAgent(a.id); setQuery(""); }} style={s.agentRow}>
            <View style={s.agentId}>
              <Text variant="body">{a.id}</Text>
            </View>
            <View style={s.flex}>
              <Text variant="caption" color="muted" numberOfLines={1}>{a.model.providerID}:{a.model.modelID}</Text>
            </View>
            <Icon icon={ChevronRight} size="sm" color="muted" />
          </Pressable>
        ))}
      </Card>

      {/* model 选择 BottomSheet */}
      <BottomSheet visible={pickAgent !== null} onClose={() => setPickAgent(null)} testID="me-model-sheet">
        <View style={s.sheetHeader}>
          <Text variant="title">为 {pickAgent} 选择 model</Text>
        </View>
        <SearchInput value={query} onChangeText={setQuery} onClear={() => setQuery("")} placeholder="搜索 model…" testID="me-model-search" />
        <ScrollView style={s.sheetScroll}>
          {filtered.map((m) => {
            const active = current?.providerID === m.providerID && current?.modelID === m.modelID;
            return (
              <Pressable key={`${m.providerID}:${m.modelID}`} testID={`me-model-${m.modelID}`} onPress={() => confirmModel(m)} style={[s.modelItem, active && s.modelItemActive]}>
                <Text color={active ? "accent" : "ink"}>{m.providerID}: {m.modelID}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Button label="确认" onPress={() => setPickAgent(null)} testID="me-model-confirm" />
      </BottomSheet>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: { gap: spacing.xs },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  mt: { marginTop: spacing.sm },
  btnRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  agentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  agentId: { width: 72 },
  flex: { flex: 1 },
  sheetHeader: { marginBottom: spacing.md },
  sheetScroll: { maxHeight: 300, marginVertical: spacing.md },
  modelItem: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.sm },
  modelItemActive: { backgroundColor: colors.accent.subtle },
});
