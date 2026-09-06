import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, Pressable, StyleSheet, Alert } from "react-native";
import { Trash2 } from "lucide-react-native";
import { colors, spacing, radius, typography } from "@/theme";
import { Card, Text, Input, Button } from "@/components";
import { loadToken } from "@/services/auth";
import { fetchMemories, forgetMemory, searchKb, buildMemoryGroups, type MemoryProjection, type MemoryGroup, type KbHit } from "@/services/memory/client";

// Memory tab（Phase 6，PM §6）：memx canonical storage 的产品投影。
// User（preferences / working style）+ Projects（durable project understanding）。
// 不是会话记录；Forget 作用于 canonical（.trash / 弃用标记），非 UI 隐藏。
// KB 搜索入口（PM §5）：canonical = llm-wiki vault，只读检索。

export default function MemoryScreen() {
  const [projection, setProjection] = useState<MemoryProjection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [kbHits, setKbHits] = useState<KbHit[] | null>(null);
  const [kbConfigured, setKbConfigured] = useState(true);
  const [kbLoading, setKbLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      // 直开/刷新 /memory 时先恢复 token（tokenHeader 依赖 AsyncStorage 恢复，同 Me tab）
      await loadToken();
      setProjection(await fetchMemories());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const runSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setKbLoading(true);
    try {
      const { configured, hits } = await searchKb(q);
      setKbConfigured(configured);
      setKbHits(hits);
    } catch (e) {
      setKbHits([]);
      setKbConfigured(true);
      Alert.alert("KB 搜索失败", e instanceof Error ? e.message : String(e));
    } finally {
      setKbLoading(false);
    }
  };

  const doForget = (item: { id: string; title: string }) => {
    Alert.alert(
      "忘记这条记忆？",
      `${item.title}\n\nproject 记忆将移入 .trash 并从索引移除；user 记忆将被标记弃用。`,
      [
        { text: "取消", style: "cancel" },
        {
          text: "忘记",
          style: "destructive",
          onPress: () => {
            forgetMemory(item.id)
              .then(() => reload())
              .catch((e) => Alert.alert("Forget 失败", e instanceof Error ? e.message : String(e)));
          },
        },
      ],
    );
  };

  const groups: MemoryGroup[] = projection ? buildMemoryGroups(projection) : [];

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      {/* KB search（Knowledge Base 检索入口） */}
      <Card testID="memory-kb-card" style={s.card}>
        <Text variant="title" color="ink">Knowledge Base</Text>
        <Text variant="caption" color="muted">搜索 llm-wiki vault（项目知识 / 原始想法）</Text>
        <View style={s.searchRow}>
          <View style={{ flex: 1 }}>
            <Input value={query} onChangeText={setQuery} placeholder="搜索知识库…" testID="memory-kb-input" />
          </View>
          <Button label={kbLoading ? "搜索中" : "搜索"} onPress={runSearch} variant="secondary" testID="memory-kb-search" />
        </View>
        {kbHits !== null && !kbConfigured && (
          <Text variant="caption" color="muted" testID="memory-kb-unconfigured">KB vault 未配置（LLM_WIKI_VAULT）</Text>
        )}
        {kbHits !== null && kbConfigured && kbHits.length === 0 && (
          <Text variant="caption" color="muted" testID="memory-kb-empty">无匹配结果</Text>
        )}
        {kbHits?.map((h) => (
          <View key={h.ref} style={s.item} testID={`memory-kb-hit-${h.ref.replace(/[^a-zA-Z0-9]/g, "_")}`}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong" color="ink">{h.title}</Text>
              <Text variant="body" color="body" numberOfLines={2}>{h.snippet}</Text>
              <Text variant="caption" color="muted">{h.ref}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Memory 投影 */}
      {loading && <Text variant="caption" color="muted" testID="memory-loading">加载中…</Text>}
      {!loading && error && <Text variant="caption" color="error" testID="memory-error">{error}</Text>}
      {!loading && !error && groups.length === 0 && (
        <Text variant="caption" color="muted" testID="memory-empty">还没有 Memory——memx 会在会话中提炼持久理解。</Text>
      )}
      {!loading && groups.map((g) => (
        <Card key={g.key} testID={`memory-group-${g.key}`} style={s.card}>
          <Text variant="title" color="ink">{g.label}</Text>
          {g.items.map((item) => (
            <View key={item.id} style={s.item} testID={`memory-item-${item.id}`}>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" color="ink">{item.title}</Text>
                <Text variant="body" color="body">{item.detail}</Text>
                <Text variant="caption" color="muted">{item.updatedAtLabel} · {item.source}</Text>
              </View>
              <Pressable
                onPress={() => doForget(item)}
                style={s.forgetBtn}
                hitSlop={8}
                testID={`memory-forget-${item.id}`}
              >
                <Trash2 size={16} color={colors.status.error} />
              </Pressable>
            </View>
          ))}
        </Card>
      ))}
      {projection && (
        <Text variant="caption" color="muted">来源：{projection.source}（canonical runtime storage，产品层零复制）</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: { padding: spacing.md, gap: spacing.xs },
  searchRow: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
  item: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border.default },
  forgetBtn: { padding: spacing.xs, borderRadius: radius.sm },
});
