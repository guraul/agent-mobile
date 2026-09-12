import React, { useEffect, useState, useCallback } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronRight, RefreshCw } from "lucide-react-native";
import { colors, spacing, radius } from "@/theme";
import { ScreenHeader, Text, Card, Button, StatusPill, IconButton } from "@/components";
import { loadToken } from "@/services/auth";
import { fetchAssignments, revokeAssignment, repairAssignment, compensateAssignment, type AssignmentRecord } from "@/services/assignment/client";
import { fetchAttentions } from "@/services/attention/client";
import { buildAssignmentGroups, type AssignmentGroup } from "@/services/assignment/projection";
import type { AttentionItem } from "@/services/attention/store";

// Assignments 列表屏（Phase 9，Part 1）：Assignment/Attention canonical 的只读投影。
// 分组：Needs attention / Active / Completed / Revoked（纯客户端分组）。
// mutation（revoke/repair/compensate）走既有后端 API；查看不改 state。

export default function AssignmentsScreen() {
  const router = useRouter();
  const [groups, setGroups] = useState<AssignmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      await loadToken();
      const [assignments, attentions] = await Promise.all([
        fetchAssignments(),
        fetchAttentions(),
      ]);
      setGroups(buildAssignmentGroups(assignments, attentions as AttentionItem[]));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const doRevoke = async (a: AssignmentRecord) => {
    setBusyId(a.id);
    try {
      await revokeAssignment(a.id);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const doRepair = async (a: AssignmentRecord) => {
    setBusyId(a.id);
    try {
      const r = await repairAssignment(a.id);
      if (r.failed) setError(`Retry failed (attempt ${r.attempt}): ${r.error}`);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const doCompensate = async (a: AssignmentRecord, action: "run-now" | "skip") => {
    setBusyId(a.id);
    try {
      await compensateAssignment(a.id, action);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  };

  const needsAttention = groups.find((g) => g.key === "needs-attention");
  const attentionAction = (a: AssignmentRecord) => {
    // needs-attention 分组内的项：repair（修复失败）或 compensation（run-now/skip）
    const pending = a.provenance.pendingCompensation;
    if (pending) {
      return (
        <View style={s.actions}>
          <Button label="Run now" onPress={() => doCompensate(a, "run-now")} variant="secondary" testID={`assign-run-now-${a.id}`} />
          <Button label="Skip" onPress={() => doCompensate(a, "skip")} variant="ghost" testID={`assign-skip-${a.id}`} />
        </View>
      );
    }
    return (
      <View style={s.actions}>
        <Button label="Retry" onPress={() => doRepair(a)} variant="secondary" loading={busyId === a.id} testID={`assign-retry-${a.id}`} />
      </View>
    );
  };

  return (
    <View style={s.screen}>
      <ScreenHeader
        title="Responsibilities"
        leftIcon={ArrowLeft}
        onLeftPress={() => router.back()}
        leftAccessibilityLabel="Back"
        rightIcon={RefreshCw}
        onRightPress={reload}
        rightAccessibilityLabel="Refresh"
        testID="assignments-header"
      />
      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {error ? (
          <Text variant="caption" color="error" testID="assignments-error">{error}</Text>
        ) : null}
        {loading && groups.length === 0 ? (
          <Text variant="caption" color="muted" testID="assignments-loading">Loading…</Text>
        ) : null}
        {!loading && groups.length === 0 && !error ? (
          <Text variant="caption" color="muted" testID="assignments-empty">No assignments yet.</Text>
        ) : null}

        {groups.map((group) => (
          <View key={group.key} style={s.section}>
            <View style={s.sectionHeader}>
              <Text variant="caption" color="muted">{group.label.toUpperCase()}</Text>
            </View>
            {group.items.map((item) => (
              <Card
                key={item.assignment.id}
                testID={`assign-${item.assignment.id}`}
                style={s.card}
                onPress={() => router.push(`/assignments/${item.assignment.id}`)}
              >
                <View style={s.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" color="ink">{item.assignment.responsibility}</Text>
                  </View>
                  <StatusPill status={item.statusTone} label={item.statusPill} testID={`assign-pill-${item.assignment.id}`} />
                </View>
                <Text variant="caption" color="muted">{item.triggerLabel}</Text>
                <Text variant="caption" color="muted">Authorization: {item.authorizationLabel}</Text>
                {item.nextExecutionLabel ? (
                  <Text variant="caption" color="muted">Next: {item.nextExecutionLabel}</Text>
                ) : null}

                {group.key === "needs-attention" ? (
                  attentionAction(item.assignment)
                ) : group.key === "active" ? (
                  <View style={s.actions}>
                    <Button label="Revoke" onPress={() => doRevoke(item.assignment)} variant="destructive" loading={busyId === item.assignment.id} testID={`assign-revoke-${item.assignment.id}`} />
                  </View>
                ) : null}

                <View style={s.viewRow}>
                  <Text variant="caption" color="accent">View history</Text>
                  <ChevronRight size={14} color={colors.muted} />
                </View>
              </Card>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  scroll: { flex: 1 },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  section: { gap: spacing.xs },
  sectionHeader: { paddingHorizontal: spacing.xxs, marginBottom: spacing.xxs },
  card: { gap: spacing.xxs },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  actions: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.xs, flexWrap: "wrap" },
  viewRow: { flexDirection: "row", alignItems: "center", gap: spacing.xxs, marginTop: spacing.xs },
});
