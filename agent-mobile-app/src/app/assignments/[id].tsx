import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { colors, spacing } from "@/theme";
import { ScreenHeader, Text, Card, Button, StatusPill } from "@/components";
import { loadToken } from "@/services/auth";
import {
  fetchAssignmentDetail,
  fetchAssignmentHistory,
  revokeAssignment,
  repairAssignment,
  compensateAssignment,
  type AssignmentDetail,
  type AssignmentHistoryItem,
} from "@/services/assignment/client";
import { describeTrigger, authorizationLabel, formatRelative } from "@/services/assignment/projection";

// Assignment 详情屏（Phase 9，Part 2/3）：responsibility 状态 + trigger + authorization 投影 + execution history 投影。
// 只读显示；mutation（revoke/repair/compensate）走既有后端 API，由用户显式触发。

export default function AssignmentDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AssignmentDetail | null>(null);
  const [history, setHistory] = useState<AssignmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"revoke" | "repair" | "run-now" | "skip" | null>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      await loadToken();
      const [d, h] = await Promise.all([
        fetchAssignmentDetail(id),
        fetchAssignmentHistory(id),
      ]);
      setDetail(d);
      setHistory(h);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { reload(); }, [reload]);

  if (!id) return null;
  const a = detail?.item;

  const run = async (kind: "revoke" | "repair" | "run-now" | "skip") => {
    setBusy(kind);
    try {
      if (kind === "revoke") { await revokeAssignment(id); }
      else if (kind === "repair") {
        const r = await repairAssignment(id);
        if (r.failed) { setError(`Retry failed (attempt ${r.attempt}): ${r.error}`); return; }
      }
      else if (kind === "run-now") { await compensateAssignment(id, "run-now"); }
      else { await compensateAssignment(id, "skip"); }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const confirmRevoke = () => {
    Alert.alert("Revoke responsibility?", `停止未来执行；已有提醒保留（PM §11）。\n\n${a?.responsibility ?? ""}`, [
      { text: "取消", style: "cancel" },
      { text: "撤销", style: "destructive", onPress: () => run("revoke") },
    ]);
  };

  const pendingComp = a?.provenance.pendingCompensation;
  const needsAttention = a?.state === "active" && (pendingComp || undefined);

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Assignment"
        leftIcon={ArrowLeft}
        onLeftPress={() => router.back()}
        leftAccessibilityLabel="Back"
        rightIcon={RefreshCw}
        onRightPress={reload}
        rightAccessibilityLabel="Refresh"
        testID="assignment-detail-header"
      />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {error ? <Text variant="caption" color="error" testID="assignment-detail-error">{error}</Text> : null}
        {loading && !detail ? <Text variant="caption" color="muted" testID="assignment-detail-loading">Loading…</Text> : null}

        {a ? (
          <>
            <Card testID="assignment-detail-main" style={s.card}>
              <View style={s.rowBetween}>
                <Text variant="bodyStrong" color="ink">{a.responsibility}</Text>
                <StatusPill status={a.state === "active" ? (needsAttention ? "warning" : "success") : "idle"} label={needsAttention ? "NEEDS ATTENTION" : a.state.toUpperCase()} testID="assignment-detail-state" />
              </View>
              <Text variant="caption" color="muted">Mode: {a.mode} · Domain: {a.domain}</Text>
              <Text variant="caption" color="muted">Trigger: {describeTrigger(a.triggerDefinition.schedule)}</Text>
              {a.completedAt ? <Text variant="caption" color="muted">Completed: {formatRelative(a.completedAt)}</Text> : null}
              {a.revokedAt ? <Text variant="caption" color="muted">Revoked: {formatRelative(a.revokedAt)}</Text> : null}
            </Card>

            {/* Actions（仅显式用户动作；走既有 API） */}
            {a.state === "active" ? (
              <Card testID="assignment-detail-actions" style={s.card}>
                <Text variant="caption" color="muted">Actions</Text>
                {pendingComp ? (
                  <View style={s.actions}>
                    <Button label="Run now" onPress={() => run("run-now")} variant="secondary" loading={busy === "run-now"} testID="assignment-run-now" />
                    <Button label="Skip" onPress={() => run("skip")} variant="ghost" loading={busy === "skip"} testID="assignment-skip" />
                  </View>
                ) : null}
                {!pendingComp ? (
                  <View style={s.actions}>
                    <Button label="Retry" onPress={() => run("repair")} variant="secondary" loading={busy === "repair"} testID="assignment-retry" />
                  </View>
                ) : null}
                <Button label="Revoke" onPress={confirmRevoke} variant="destructive" loading={busy === "revoke"} testID="assignment-revoke" />
              </Card>
            ) : null}

            {/* Authorization 投影（只读；来源 authorizationRef + provenance + proposal） */}
            {detail?.authorization ? (
              <Card testID="assignment-authorization" style={s.card}>
                <Text variant="title" color="ink">Authorization</Text>
                <View style={s.kv}>
                  <Text variant="caption" color="muted">Source</Text>
                  <Text variant="body" color="body">{authorizationLabel(a)}</Text>
                </View>
                <View style={s.kv}>
                  <Text variant="caption" color="muted">Instruction</Text>
                  <Text variant="body" color="body">{detail.authorization.instructionRef ?? "—"}</Text>
                </View>
                <View style={s.kv}>
                  <Text variant="caption" color="muted">Proposal</Text>
                  <Text variant="body" color="body">{detail.authorization.proposalId ?? "—"}</Text>
                </View>
                <View style={s.kv}>
                  <Text variant="caption" color="muted">Created by</Text>
                  <Text variant="body" color="body">{detail.authorization.createdBy ?? "—"}</Text>
                </View>
                <View style={s.kv}>
                  <Text variant="caption" color="muted">Via</Text>
                  <Text variant="body" color="body">{detail.authorization.via ?? "—"}</Text>
                </View>
              </Card>
            ) : null}

            {/* Execution history 投影（只读；canonical = product_events） */}
            <Card testID="assignment-history" style={s.card}>
              <Text variant="title" color="ink">Execution history</Text>
              {history.length === 0 ? <Text variant="caption" color="muted">No executions yet.</Text> : null}
              {history.map((h) => (
                <View key={h.id} style={s.historyRow} testID={`history-${h.id}`}>
                  <StatusPill status={h.status === "success" ? "success" : h.status === "failed" ? "error" : h.status === "missed" ? "warning" : "idle"} label={h.label} />
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color="body">{formatRelative(h.occurredAt)}</Text>
                    {h.retried ? <Text variant="caption" color="muted">Retried (attempt {h.attempt})</Text> : h.attempt ? <Text variant="caption" color="muted">Attempt {h.attempt}</Text> : null}
                    {h.reason ? <Text variant="caption" color="error">{h.reason}</Text> : null}
                  </View>
                </View>
              ))}
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
  rowBetween: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs, justifyContent: "space-between" },
  actions: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: spacing.sm },
  historyRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, paddingVertical: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border.default },
});
