import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { ArrowLeft, FileText } from "lucide-react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { searchKb, type KbHit } from "../../services/memory/client";
import { loadToken } from "../../services/auth";
import { colors, radius, spacing } from "../../theme";

/**
 * KnowledgeSheet — Sources / Knowledge, contextual only.
 * Search → preview (filename + excerpt) → OPEN (full document) or
 * ASK ABOUT THIS (Talk with the source as opening context).
 * No "KB" terminology, no Raw Ideas UI.
 */
export function KnowledgeSheet({
  visible,
  onClose,
  onOpenDoc,
  onAskAboutThis,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenDoc: (hit: KbHit) => void;
  onAskAboutThis: (hit: KbHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<KbHit[] | null>(null);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<KbHit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      setHits(null);
      setSelected(null);
      setError(null);
    }
  }, [visible]);

  const runSearch = useCallback(async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    try {
      await loadToken();
      const res = await searchKb(q);
      setConfigured(res.configured);
      setHits(res.hits);
      setError(null);
    } catch (e) {
      setHits([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [query]);

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="knowledge-sheet">
      <View style={{ gap: spacing.xxs, marginBottom: spacing.sm }}>
        <Text variant="title" color="ink">Knowledge</Text>
        <Text variant="caption" color="muted">
          Sources I can draw on. Search, read, or bring one into a conversation.
        </Text>
      </View>

      {selected ? (
        <View style={{ gap: spacing.xs }} testID="knowledge-preview">
          <Pressable
            onPress={() => setSelected(null)}
            accessibilityRole="button"
            accessibilityLabel="Back to search"
            testID="knowledge-preview-back"
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.xxs }}
          >
            <Icon icon={ArrowLeft} size="xs" color="muted" />
            <Text variant="caption" color="muted">Back to search</Text>
          </Pressable>
          <Text variant="title" color="ink" numberOfLines={2}>{selected.title}</Text>
          <Text variant="monoCaption" color="muted">{selected.ref}</Text>
          <Text variant="body" color="body" numberOfLines={3}>{selected.snippet}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
            <Button
              variant="secondary"
              label="Open"
              onPress={() => onOpenDoc(selected)}
              testID="knowledge-open"
            />
            <Button
              variant="primary"
              label="Ask about this"
              onPress={() => onAskAboutThis(selected)}
              testID="knowledge-ask"
            />
          </View>
        </View>
      ) : (
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: "row", gap: spacing.xs, alignItems: "center" }}>
            <View style={{ flex: 1 }}>
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Search sources…"
                testID="knowledge-input"
              />
            </View>
            <Button
              label={loading ? "…" : "Search"}
              variant="secondary"
              onPress={runSearch}
              testID="knowledge-search"
            />
          </View>

          {error ? <Text variant="caption" color="error">{error}</Text> : null}
          {hits !== null && !configured ? (
            <Text variant="caption" color="muted" testID="knowledge-unconfigured">
              知识库 vault 未配置（LLM_WIKI_VAULT）
            </Text>
          ) : null}
          {hits !== null && configured && hits.length === 0 && !error ? (
            <Text variant="caption" color="muted" testID="knowledge-empty">无匹配结果</Text>
          ) : null}

          {hits && hits.length > 0 ? (
            <ScrollView style={{ maxHeight: 360 }}>
              {hits.map((h) => (
                <Pressable
                  key={h.ref}
                  onPress={() => setSelected(h)}
                  accessibilityRole="button"
                  accessibilityLabel={h.title}
                  testID={`knowledge-hit-${h.ref.replace(/[^a-zA-Z0-9]/g, "_")}`}
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
                  <View
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: radius.sm,
                      backgroundColor: colors.surface[1],
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon icon={FileText} size="sm" color="accentBright" />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text variant="bodyStrong" color="ink" numberOfLines={1}>{h.title}</Text>
                    <Text variant="caption" color="body" numberOfLines={2}>{h.snippet}</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
        </View>
      )}
    </BottomSheet>
  );
}
