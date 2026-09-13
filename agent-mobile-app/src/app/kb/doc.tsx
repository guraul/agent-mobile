import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { colors, spacing } from "@/theme";
import { ScreenHeader, Text, Box, Button } from "@/components";
import { loadToken } from "@/services/auth";
import { fetchKbDoc } from "@/services/memory/client";

// KB Document Reader（v0.1.1）：Memory → Knows → Search → Result → Document 的最后一环。
// 只读（canonical = llm-wiki vault）；BFF /api/product/kb/doc/[...path] 受限读取（vault 内 + .md + 防 traversal）。

interface KbDoc {
  title: string;
  content: string;
  updatedAt: number;
  ref: string;
}

export default function KbDocScreen() {
  const router = useRouter();
  const { ref, title } = useLocalSearchParams<{ ref: string; title?: string }>();
  const [doc, setDoc] = useState<KbDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!ref) return;
    setLoading(true);
    try {
      await loadToken();
      setDoc(await fetchKbDoc(ref));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [ref]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Document"
        leftIcon={ArrowLeft}
        onLeftPress={() => router.back()}
        leftAccessibilityLabel="Back"
        rightIcon={RefreshCw}
        onRightPress={load}
        rightAccessibilityLabel="Refresh"
        testID="kb-doc-header"
      />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {error ? (
          <Box padding="sm" backgroundColor="surface.1" rounded="md" testID="kb-doc-error">
            <Text variant="caption" color="error">{error}</Text>
          </Box>
        ) : null}

        {loading && !doc ? (
          <Box padding="lg"><Text variant="body" color="muted" testID="kb-doc-loading">Loading…</Text></Box>
        ) : null}

        {doc ? (
          <>
            <Text variant="title" color="ink" testID="kb-doc-title">{doc.title || title || doc.ref}</Text>
            <Text variant="caption" color="muted" testID="kb-doc-ref">{doc.ref}</Text>
            <View style={s.body} testID="kb-doc-content">
              {doc.content.split("\n").map((line, i) =>
                line.trim() ? (
                  <Text key={i} variant="body" color="body">{line}</Text>
                ) : (
                  <View key={i} style={s.blank} />
                ),
              )}
            </View>
            <Box marginTop="sm">
              <Button variant="ghost" label="Back to search" onPress={() => router.back()} testID="kb-doc-back" />
            </Box>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.xs, paddingBottom: spacing.xl },
  body: { gap: spacing.xxs, marginTop: spacing.sm },
  blank: { height: spacing.sm },
});
