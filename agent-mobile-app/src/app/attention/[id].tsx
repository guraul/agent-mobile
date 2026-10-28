import React, { useEffect, useState, useCallback } from "react";
import { Pressable, Text, View, ScrollView, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { iconStroke } from "@/theme";
import { loadToken } from "@/services/auth";
import { fetchAttentionDetail, dismissAttention, renewAttention, type AttentionDetail } from "@/services/attention/client";
import { repairAssignment } from "@/services/assignment/client";
import { formatRelative } from "@/services/assignment/projection";
import { resolveAttentionConversation } from "@/services/attention/talk";
import { attentionActionFlags } from "@/services/attention/store";
import { classifyRuntimeFailure, runtimeFailureMessage } from "@/services/runtime-presence";
import { LightDock, LightStatusPill, LightTextAction } from "@/components/pulse/LightAtoms";
import { lightColors, lightTypography, lightRadius, lightSpacing } from "@/theme/light";
import { showAlert } from "../../services/alert";
import { t, useLocale } from "@/i18n";

// Attention 详情屏（RN 迁移 #H 重做，基准 pulseB-review.html）。
// 结构：Related responsibility → Evidence → 页脚注；底部紫渐变 dock（Open Talk），
// Dismiss 弱化态压 pill 左侧（D9：破坏性动作弱化 + Alert 二次确认）。
// 主卡已删（2026-09-27 设计定稿：title/summary/meta 与首页 Featured 重复）。
// Viewing ≠ Handling：打开本页不改 state；Open Talk 不自动 handle。
// Retry（repair 场景）保留，弱化态置于 dock 左侧 Dismiss 旁。
// #96（ref agent-mobile#91）：凭据到期事项（subjectKind=credential）动作区换成
// 「重发二维码」（dock 主按钮），并隐藏 Open Talk（该事项 sessionId=null，Open Talk
// 必然抛「该事项的会话已不可用」）；成功后本地视为已关闭 + 一行反馈。

export default function AttentionDetailScreen() {
  const router = useRouter();
  // 订阅语言：切换时本屏重渲染，渲染期 t() 取到新文案。
  useLocale();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<AttentionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [renewed, setRenewed] = useState(false);
  const [busy, setBusy] = useState<"retry" | "dismiss" | "renew" | null>(null);

  // 取数后用 promise 回调落地 state（effect 同步段不碰 setter）；loading 初始值即 true。
  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    return loadToken()
      .then(() => fetchAttentionDetail(id))
      .then((d) => {
        setDetail(d);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const reload = useCallback(() => {
    setLoading(true);
    return load();
  }, [load]);

  useEffect(() => { load(); }, [load]);

  const att = detail?.attention;
  const isRepair = att?.provenance?.repairRequest === true;
  // 动作可见性（纯函数判据，见 services/attention/store.ts）
  const actions = att ? attentionActionFlags(att) : { renew: false, openTalk: true };

  const doRetry = async () => {
    const asgId = detail?.relatedAssignment?.id;
    if (!asgId) { setError(t("attention.detail.retryNoAssignment")); return; }
    setBusy("retry");
    try {
      const r = await repairAssignment(asgId);
      if (r.failed) {
        setError(
          t("attention.detail.retryFailed", { n: r.attempt ?? 0, error: r.error ?? "" }),
        );
      }
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  // #96：凭据到期 → 重发二维码（服务端关闭当前 Attention + 推二维码到企业微信）。
  // 失败不静默：错误行 + 按钮保持可点（可重试）。
  const doRenew = async () => {
    if (!att) return;
    setBusy("renew");
    setError(null);
    setNotice(null);
    try {
      await renewAttention(att.id);
      setRenewed(true); // 本地视为已关闭（权威关闭由 BFF 完成，10 分钟未扫会新建一张）
      setNotice(t("attention.detail.renewSent"));
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
        const m = runtimeFailureMessage(kind); showAlert(m.title, m.body);
      } else if (/会话已不可用|no longer available|404|not found/i.test(msg)) {
        // 会话已丢失（runtime 重启等）→ 提供去 Talk 默认会话的逃生口，而不是死胡同
        showAlert(t("app.common.sessionGoneTitle"), t("app.common.sessionGoneBody"), [
          { text: t("app.common.cancel"), style: "cancel" },
          { text: t("app.common.sessionGoneAction"), onPress: () => router.push({ pathname: "/talk" }) },
        ]);
      } else {
        showAlert(t("app.common.cannotOpenTalk"), msg);
      }
    }
  };

  // D9：Dismiss 破坏性动作 → Alert 二次确认（弱化视觉 + 强确认，双保险）
  const doDismiss = () => {
    showAlert(t("attention.detail.dismissTitle"), t("attention.detail.dismissBody"), [
      { text: t("app.common.cancel"), style: "cancel" },
      {
        text: t("attention.detail.dismiss"), style: "destructive",
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
      {/* 桌面端手机壳：>480 视口居中 480（移动端 width:100% 零变化） */}
      <View style={s.shell}>
      {/* Header：back + refresh（mock 无标题栏，保留既有导航语义） */}
      <View style={s.header}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel={t("attention.detail.back")}
          accessibilityRole="button"
          testID="attention-back"
          hitSlop={10}
        >
          <ArrowLeft size={20} color={lightColors.ink} strokeWidth={iconStroke} />
        </Pressable>
        <Pressable
          onPress={reload}
          accessibilityLabel={t("attention.detail.refresh")}
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
          <Text style={s.loadingText} testID="attention-detail-loading">
            {t("attention.detail.loading")}
          </Text>
        ) : null}

        {att && detail ? (
          <>
            {/* Related responsibility（只读投影；Attention 仍 canonical） */}
            {detail.relatedAssignment ? (
              <View style={s.card} testID="attention-related">
                <Text style={s.groupLabel}>{t("attention.detail.relatedResponsibility")}</Text>
                <Text style={s.respBody}>{detail.relatedAssignment.responsibility}</Text>
                <View style={s.kv}>
                  <Text style={s.kvLabel}>{t("attention.detail.state")}</Text>
                  <LightStatusPill label={detail.relatedAssignment.state.toUpperCase()} />
                </View>
              </View>
            ) : null}

            {/* Evidence 投影（canonical = attention_evidence + product_events） */}
            <View style={s.card} testID="attention-evidence">
              <Text style={s.groupLabel}>{t("attention.detail.evidence")}</Text>
              {detail.evidence.length === 0 ? (
                <Text style={s.emptyEvidence}>{t("attention.detail.noEvidence")}</Text>
              ) : (
                <View style={s.evList}>
                  {detail.evidence.map((e) => (
                    <View key={e.id} style={s.evRow}>
                      <Text style={s.evCap}>
                        {e.type}
                        {e.attempt ? ` · ${t("attention.detail.attempt", { n: e.attempt })}` : ""} ·{" "}
                        {formatRelative(e.occurredAt)}
                      </Text>
                      {e.error ? <Text style={s.evBody}>{e.error}</Text> : null}
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* 页脚注：只读语义（mock .note） */}
            <Text style={s.note}>{t("attention.detail.note")}</Text>

            {/* #96：重发二维码成功 → 一行反馈 */}
            {notice ? <Text style={s.notice} testID="attention-renew-notice">{notice}</Text> : null}
          </>
        ) : null}
      </ScrollView>

      {/* 紫渐变 dock：整颗 → Open Talk；Dismiss/Retry 弱化态压左侧（D9）。
          #96：凭据到期事项主按钮换「重发二维码」，Open Talk 隐藏（判据见 store.ts）。 */}
      <View style={s.dock}>
        <LightDock
          label={
            actions.renew
              ? renewed
                ? t("attention.detail.renewed")
                : busy === "renew"
                  ? t("attention.detail.renewing")
                  : t("attention.detail.renew")
              : t("attention.detail.openTalk")
          }
          variant="gradient"
          onPress={actions.renew ? (renewed ? undefined : doRenew) : openTalk}
          testID={actions.renew ? "attention-renew" : "attention-open-talk"}
          leading={
            <>
              {isRepair ? (
                <Pressable onPress={doRetry} hitSlop={8} testID="attention-retry" disabled={busy !== null}>
                  <Text style={s.dockWeak}>
                    {busy === "retry" ? t("attention.detail.retrying") : t("attention.detail.retry")}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable onPress={doDismiss} hitSlop={8} testID="attention-dismiss" disabled={busy !== null}>
                <Text style={s.dockWeak}>
                  {busy === "dismiss" ? t("attention.detail.dismissing") : t("attention.detail.dismiss")}
                </Text>
              </Pressable>
            </>
          }
        />
      </View>
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
  screen: { flex: 1, backgroundColor: lightColors.cream, alignItems: "center" },
  shell: {
    width: "100%",
    maxWidth: 480,
    flex: 1,
    position: "relative",
    backgroundColor: lightColors.cream,
  },
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
  notice: {
    // #96 重发二维码成功反馈（语义色 green 系，token 取 theme/light）
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.greenDeep,
    textAlign: "center",
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
