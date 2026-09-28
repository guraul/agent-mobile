import React, { useEffect, useState, useCallback } from "react";
import { Pressable, Text, View, ScrollView, StyleSheet, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { iconStroke } from "@/theme";
import { loadToken } from "@/services/auth";
import { fetchAttentionDetail, dismissAttention, type AttentionDetail } from "@/services/attention/client";
import { repairAssignment } from "@/services/assignment/client";
import { formatRelative } from "@/services/assignment/projection";
import { resolveAttentionConversation } from "@/services/attention/talk";
import { classifyRuntimeFailure, runtimeFailureMessage } from "@/services/runtime-presence";
import { LightDock, LightStatusPill, LightTextAction } from "@/components/pulse/LightAtoms";
import { lightColors, lightTypography, lightRadius, lightSpacing } from "@/theme/light";

// Attention 详情屏（RN 迁移 #H 重做，基准 pulseB-review.html）。
// 结构：Related responsibility → Evidence → 页脚注；底部紫渐变 dock（Open Talk），
// Dismiss 弱化态压 pill 左侧（D9：破坏性动作弱化 + Alert 二次确认）。
// 主卡已删（2026-09-27 设计定稿：title/summary/meta 与首页 Featured 重复）。
// Viewing ≠ Handling：打开本页不改 state；Open Talk 不自动 handle。
// Retry（repair 场景）保留，弱化态置于 dock 左侧 Dismiss 旁。

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

  const openTalk = async () => {
    if (!att) return;
    try {
      const r = await resolveAttentionConversation({
        id: att.id, title: att.title, summary: att.summary, subjectId: att.subjectId,
        state: att.state, sessionId: att.sessionId, domain: att.domain,
      });
      router.push({
        pathname: "/talk",
        params: {
          sessionId: r.sessionId, projectPath: r.projectPath,
          attId: att.id, attTitle: att.title, attSummary: att.summary,
          attSubjectId: att.subjectId, attState: att.state,
          ...(r.created ? { autoSendContext: "1" } : {}),
        },
      });
    } catch (e) {
      const kind = classifyRuntimeFailure(e);
      const msg = e instanceof Error ? e.message : String(e);
      if (kind === "opencode-offline" || kind === "bff-offline" || kind === "auth") {
        const m = runtimeFailureMessage(kind); Alert.alert(m.title, m.body);
      } else if (/会话已不可用|404|not found/i.test(msg)) {
        // 会话已丢失（runtime 重启等）→ 提供去 Talk 默认会话的逃生口，而不是死胡同
        Alert.alert("原会话已不存在", "该事项引用的会话已丢失（agent runtime 可能重启过）。", [
          { text: "取消", style: "cancel" },
          { text: "去 Talk 默认会话", onPress: () => router.push({ pathname: "/talk" }) },
        ]);
      } else {
        Alert.alert("无法进入 Talk", msg);
      }
    }
  };

  // D9：Dismiss 破坏性动作 → Alert 二次确认（弱化视觉 + 强确认，双保险）
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
      <StatusBar style="dark" />

      {/* Header：back + refresh（mock 无标题栏，保留既有导航语义） */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          accessibilityRole="button"
          testID="attention-back"
          hitSlop={10}
        >
          <ArrowLeft size={20} color={lightColors.ink} strokeWidth={iconStroke} />
        </Pressable>
        <Pressable
          onPress={reload}
          accessibilityLabel="Refresh"
          accessibilityRole="button"
          testID="attention-refresh"
          hitSlop={10}
        >
          <RefreshCw size={18} color={lightColors.ink} strokeWidth={iconStroke} />
        </Pressable>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content}>
        {error ? (
          <RNTextError testID="attention-detail-error">{error}</RNTextError>
        ) : null}
        {loading && !att ? (
          <Text style={s.loadingText} testID="attention-detail-loading">Loading…</Text>
        ) : null}

        {att && detail ? (
          <>
            {/* Related responsibility（只读投影；Attention 仍 canonical） */}
            {detail.relatedAssignment ? (
              <View style={s.card} testID="attention-related">
                <Text style={s.groupLabel}>Related responsibility</Text>
                <Text style={s.respBody}>{detail.relatedAssignment.responsibility}</Text>
                <View style={s.kv}>
                  <Text style={s.kvLabel}>State</Text>
                  <LightStatusPill label={detail.relatedAssignment.state.toUpperCase()} />
                </View>
              </View>
            ) : null}

            {/* Evidence 投影（canonical = attention_evidence + product_events） */}
            <View style={s.card} testID="attention-evidence">
              <Text style={s.groupLabel}>Evidence</Text>
              {detail.evidence.length === 0 ? (
                <Text style={s.emptyEvidence}>No supporting events.</Text>
              ) : (
                <View style={s.evList}>
                  {detail.evidence.map((e) => (
                    <View key={e.id} style={s.evRow}>
                      <Text style={s.evCap}>
                        {e.type}{e.attempt ? ` · attempt ${e.attempt}` : ""} · {formatRelative(e.occurredAt)}
                      </Text>
                      {e.error ? <Text style={s.evBody}>{e.error}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 页脚注：只读语义（mock .note） */}
            <Text style={s.note}>Viewing never changes state.</Text>
          </>
        ) : null}
      </ScrollView>

      {/* 紫渐变 dock：整颗 → Open Talk；Dismiss/Retry 弱化态压左侧（D9） */}
      <View style={s.dock}>
        <LightDock
          label="Open Talk"
          variant="gradient"
          onPress={openTalk}
          testID="attention-open-talk"
          leading={
            <>
              {isRepair ? (
                <Pressable onPress={doRetry} hitSlop={8} testID="attention-retry" disabled={busy !== null}>
                  <Text style={s.dockWeak}>{busy === "retry" ? "Retrying…" : "Retry"}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={doDismiss} hitSlop={8} testID="attention-dismiss" disabled={busy !== null}>
                <Text style={s.dockWeak}>{busy === "dismiss" ? "Dismissing…" : "Dismiss"}</Text>
              </Pressable>
            </>
          }
        />
      </View>
    </View>
  );
}

/** 详情错误行（testID 容器内联，样式同 mock .error-line） */
function RNTextError({ children, testID }: { children: React.ReactNode; testID?: string }) {
  return (
    <Text style={s.errorLine} testID={testID}>{children}</Text>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: lightColors.cream },
  header: {
    height: 44,
    marginTop: 10,
    paddingHorizontal: lightSpacing.pageX,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: lightSpacing.pageX,
    paddingTop: 16,
    paddingBottom: 132, // dock 让位（mock .content padding 16px 0 132px）
    gap: 14, // mock .stack gap
  },
  card: {
    backgroundColor: lightColors.white,
    borderRadius: lightRadius.card,
    padding: lightSpacing.cardPad,
  },
  groupLabel: {
    fontSize: lightTypography.label.fontSize,
    fontWeight: lightTypography.label.fontWeight,
    lineHeight: lightTypography.label.lineHeight,
    color: lightColors.groupLabel,
    marginBottom: 6, // mock .group-label mb 6
  },
  respBody: {
    fontSize: lightTypography.body.fontSize,
    fontWeight: lightTypography.body.fontWeight,
    lineHeight: lightTypography.body.lineHeight,
    color: lightColors.fieldText, // mock .resp-body #1A1A1A
    marginBottom: 8,
  },
  kv: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  kvLabel: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
  },
  evList: { gap: 8 },
  evRow: {
    backgroundColor: lightColors.rowGray,
    borderRadius: lightRadius.row,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  evCap: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
    marginBottom: 2,
  },
  evBody: {
    fontSize: lightTypography.body.fontSize,
    fontWeight: lightTypography.body.fontWeight,
    lineHeight: lightTypography.body.lineHeight,
    color: lightColors.fieldText,
  },
  emptyEvidence: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
  },
  note: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
    textAlign: "center", // mock .note 居中
  },
  loadingText: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
  },
  errorLine: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.upRed,
  },
  dockWeak: {
    // mock .dock-dismiss：15/600 rgba(255,255,255,.65) 弱化态
    fontSize: lightTypography.bodyStrong.fontSize,
    fontWeight: lightTypography.bodyStrong.fontWeight,
    lineHeight: lightTypography.bodyStrong.lineHeight,
    color: lightColors.dockDismiss,
  },
  dock: {
    position: "absolute",
    left: lightSpacing.pageX,
    right: lightSpacing.pageX,
    bottom: 50, // mock .dock bottom 50
  },
});
