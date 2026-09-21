import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { loadToken } from "../../services/auth";
import {
  fetchMemories,
  forgetMemory,
  buildMemoryGroups,
  type MemoryGroup,
} from "../../services/memory/client";
import { colors, spacing } from "../../theme";

/**
 * MemorySheet — "What I remember" (canonical = memx projection, read-only +
 * Forget). Memory is a capability, not a destination: no tab, no page.
 */
export function MemorySheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<MemoryGroup[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await loadToken();
      const projection = await fetchMemories();
      setGroups(buildMemoryGroups(projection));
      setSource(projection.source);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

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

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="memory-sheet">
      <View style={{ gap: spacing.xxs, marginBottom: spacing.sm }}>
        <Text variant="title" color="ink">What I remember</Text>
        <Text variant="caption" color="muted">
          Durable understanding about you and your projects. Forgetting acts on the canonical store.
        </Text>
      </View>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.sm }}>
        {loading ? (
          <Text variant="caption" color="muted" testID="memory-loading">加载中…</Text>
        ) : null}
        {!loading && error ? (
          <Text variant="caption" color="error" testID="memory-error">{error}</Text>
        ) : null}
        {!loading && !error && groups.length === 0 ? (
          <Text variant="caption" color="muted" testID="memory-empty">
            还没有 Memory——memx 会在会话中提炼持久理解。
          </Text>
        ) : null}
        {groups.map((g) => (
          <View key={g.key} style={{ gap: spacing.xxs }}>
            <Text variant="label" color="muted">{g.label.toUpperCase()}</Text>
            {g.items.map((item) => (
              <View
                key={item.id}
                testID={`memory-item-${item.id}`}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: spacing.xs,
                  paddingVertical: spacing.xs,
                  borderTopWidth: 1,
                  borderTopColor: colors.border.subtle,
                }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="bodyStrong" color="ink">{item.title}</Text>
                  <Text variant="caption" color="body">{item.detail}</Text>
                  <Text variant="monoCaption" color="muted">
                    {item.updatedAtLabel} · {item.source}
                  </Text>
                </View>
                <Pressable
                  onPress={() => doForget(item)}
                  hitSlop={8}
                  testID={`memory-forget-${item.id}`}
                  accessibilityLabel={`Forget ${item.title}`}
                >
                  <Icon icon={Trash2} size="sm" color="error" />
                </Pressable>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      {source ? (
        <Text variant="monoCaption" color="muted">Source: {source}</Text>
      ) : null}
    </BottomSheet>
  );
}
