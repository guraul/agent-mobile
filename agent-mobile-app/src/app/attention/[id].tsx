import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { colors, spacing } from "@/theme";
import { ScreenHeader, Text, Card, Button, StatusPill } from "@/components";
import { loadToken } from "@/services/auth";
import { fetchAttentionDetail, dismissAttention, type AttentionDetail } from "@/services/attention/client";
import { repairAssignment } from "@/services/assignment/client";
import { formatRelative } from "@/services/assignment/projection";

// Attention 详情屏（Phase 9，Part 5）：Attention 行 + evidence 投影 + 关联 responsibility。
// Viewing ≠ Handling：打开本页不改 state；Open Talk 不自动 handle（engage 也只在用户点击时发生）。
// Retry/Dismiss 是显式用户动作（走既有 API）。

export default function AttentionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AttentionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"retry" | "dismiss" | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      await loadToken();
      setDetail(await fetchAttentionDetail(id));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  const att = detail?.attention;
  const isRepair = att?.provenance?.repairRequest === true;

  const doRetry = async () => {
    const asgId = detail?.relatedAssignment?.id;
    if (!asgId) { setError("该 Attention 未关联可重试的 responsibility"); return; }
    setBusy("retry");
    try {
      const r = await repairAssignment(asgId);
      if (r.failed) setError(`Retry failed (attempt ${r.attempt}): ${r.error}`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doDismiss = () => {
    Alert.alert("Dismiss this item?", "仅代表显式退出，不影响 responsibility。", [
      { text: "取消", style: "cancel" },
      {
        text: "Dismiss", style: "destructive",
        onPress: async () => {
          setBusy("dismiss");
          try { await dismissAttention(id!); router.back(); }
          catch (e) { setError(e instanceof Error ? e.message : String(e)); }
          finally { setBusy(null); }
        },
      },
    ]);
  };

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Attention"
        leftIcon={ArrowLeft}
        onLeftPress={() => router.back()}
        leftAccessibilityLabel="Back"
        rightIcon={RefreshCw}
        onRightPress={reload}
        rightAccessibilityLabel="Refresh"
        testID="attention-detail-header"
      />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {error ? <Text variant="caption" color="error" testID="attention-detail-error">{error}</Text> : null}
        {loading && !att ? <Text variant="caption" color="muted" testID="attention-detail-loading">Loading…</Text> : null}

        {att ? (
          <>
            <Card testID="attention-detail-main" style={s.card}>
              <Text variant="bodyStrong" color="ink">{att.title}</Text>
              <Text variant="body" color="body">{att.summary}</Text>
              <Text variant="caption" color="muted">Created: {formatRelative(att.createdAt)}</Text>
              <Text variant="caption" color="muted">State: {att.state}</Text>
              <Text variant="caption" color="muted">Reason: {att.creationReasonKind}</Text>
            </Card>

            {/* 关联 responsibility（Attention 仍 canonical；此处只读投影） */}
            {detail?.relatedAssignment ? (
              <Card testID="attention-related" style={s.card}>
                <Text variant="title" color="ink">Related responsibility</Text>
                <Text variant="body" color="body">{detail.relatedAssignment.responsibility}</Text>
                <View style={s.kv}>
                  <Text variant="caption" color="muted">State</Text>
                  <StatusPill
                    status={detail.relatedAssignment.state === "active" ? "success" : "idle"}
                    label={detail.relatedAssignment.state.toUpperCase()}
                  />
                </View>
              </Card>
            ) : null}

            {/* Evidence 投影（canonical = attention_evidence + product_events） */}
            <Card testID="attention-evidence" style={s.card}>
              <Text variant="title" color="ink">Evidence</Text>
              {detail!.evidence.length === 0 ? <Text variant="caption" color="muted">No supporting events.</Text> : null}
              {detail!.evidence.map((e) => (
                <View key={e.id} style={s.evidenceRow}>
                  <Text variant="caption" color="body">{formatRelative(e.occurredAt)}</Text>
                  <Text variant="caption" color="muted">{e.type}{e.attempt ? ` · attempt ${e.attempt}` : ""}</Text>
                  {e.error ? <Text variant="caption" color="error">{e.error}</Text> : null}
                </View>
              ))}
            </Card>

            {/* Actions：显式用户动作；不自动 handle */}
            <Card testID="attention-actions" style={s.card}>
              <Text variant="caption" color="muted">Actions</Text>
              <View style={s.actions}>
                {isRepair ? <Button label="Retry" onPress={doRetry} variant="secondary" loading={busy === "retry"} testID="attention-retry" /> : null}
                <Button label="Dismiss" onPress={doDismiss} variant="ghost" loading={busy === "dismiss"} testID="attention-dismiss" />
                <Button label="Open Talk" onPress={() => router.back()} variant="secondary" testID="attention-open-talk" />
              </View>
            </Card>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  card: { gap: spacing.xxs },
  kv: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  evidenceRow: { gap: spacing.xxs, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border.default },
});
