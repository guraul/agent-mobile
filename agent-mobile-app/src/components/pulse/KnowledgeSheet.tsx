import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { ArrowLeft, FileText } from "lucide-react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { listKbDecisions, searchKb, type KbDecisionItem, type KbHit } from "../../services/memory/client";
import { loadToken } from "../../services/auth";
import { colors, radius, spacing } from "../../theme";
import { t, useLocale } from "../../i18n";

/** 最近的决定最多显示几条（D2：列表先只做「看得到」） */
const MAX_DECISIONS = 5;

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
  // 订阅语言：切换时 sheet 重渲染，渲染期 t() 取到新文案。
  useLocale();
  const [hits, setHits] = useState<KbHit[] | null>(null);
  // 最近的决定（A2）：查询为空时的列表形态，只读，最多 5 条。
  const [decisions, setDecisions] = useState<KbDecisionItem[] | null>(null);
  const [decisionsConfigured, setDecisionsConfigured] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<KbHit | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setQuery("");
    setHits(null);
    setDecisions(null);
    setSelected(null);
    setError(null);
  }, []);

  useEffect(() => {
    // 关闭即清场：改到 onClose/onOpenDoc 回调里 reset 会让退场动画期间闪空内容，
    // 改到渲染期 reset 会触发 set-state-in-render，故保留关闭后的一次同步清场。
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 退场清场，无可挂的异步来源
    if (!visible) reset();
  }, [visible, reset]);

  const loadDecisions = useCallback(() => {
    loadToken()
      .then(() => listKbDecisions())
      .then((res) => {
        setDecisionsConfigured(res.configured);
        setDecisions(res.items.slice(0, MAX_DECISIONS));
      })
      .catch(() => {
        // 静默：拿不到就不显示这一块（知识库是辅助入口，不阻塞搜索）
        setDecisions(null);
      });
  }, []);

  useEffect(() => {
    if (!visible) return;
    loadDecisions();
  }, [visible, loadDecisions]);

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
        <Text variant="title" color="ink">{t("pulse.knowledge.title")}</Text>
        <Text variant="caption" color="muted">{t("pulse.knowledge.caption")}</Text>
      </View>

      {selected ? (
        <View style={{ gap: spacing.xs }} testID="knowledge-preview">
          <Pressable
            onPress={() => setSelected(null)}
            accessibilityRole="button"
            accessibilityLabel={t("pulse.knowledge.backToSearch")}
            testID="knowledge-preview-back"
            style={{ flexDirection: "row", alignItems: "center", gap: spacing.xxs }}
          >
            <Icon icon={ArrowLeft} size="xs" color="muted" />
            <Text variant="caption" color="muted">{t("pulse.knowledge.backToSearch")}</Text>
          </Pressable>
          <Text variant="title" color="ink" numberOfLines={2}>{selected.title}</Text>
          <Text variant="monoCaption" color="muted">{selected.ref}</Text>
          <Text variant="body" color="body" numberOfLines={3}>{selected.snippet}</Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs }}>
            <Button
              variant="secondary"
              label={t("pulse.knowledge.open")}
              onPress={() => onOpenDoc(selected)}
              testID="knowledge-open"
            />
            <Button
              variant="primary"
              label={t("pulse.knowledge.askAboutThis")}
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
                placeholder={t("pulse.knowledge.searchPlaceholder")}
                testID="knowledge-input"
              />
            </View>
            <Button
              label={loading ? "…" : t("pulse.knowledge.search")}
              variant="secondary"
              onPress={runSearch}
              testID="knowledge-search"
            />
          </View>

          {error ? <Text variant="caption" color="error">{error}</Text> : null}

          {/* 查询为空 → 最近的决定（A2，只读门面）；有查询时让位给搜索结果 */}
          {!query.trim() && decisions !== null && decisionsConfigured ? (
            <View style={{ gap: spacing.xs }} testID="knowledge-decisions">
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <Text variant="caption" color="muted">{t("kb.decisions.title")}</Text>
                <Text variant="monoCaption" color="muted">
                  {t("kb.decisions.count", { count: decisions.length })}
                </Text>
              </View>
              {decisions.length === 0 ? (
                <Text variant="caption" color="muted" testID="knowledge-decisions-empty">
                  {t("kb.decisions.empty")}
                </Text>
              ) : (
                decisions.map((d) => {
                  // 副行 = 日期 + 领域标签（tags 的首项固定是 decision，不作为领域展示）
                  const meta = [d.created ?? "", ...d.tags.filter((tag) => tag !== "decision")]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <Pressable
                      key={d.ref}
                      onPress={() =>
                        onOpenDoc({ ref: d.ref, title: d.title, snippet: "", updatedAt: d.updatedAt, scope: "wiki" })
                      }
                      accessibilityRole="button"
                      accessibilityLabel={d.title}
                      testID={`knowledge-decision-${d.ref.replace(/[^a-zA-Z0-9]/g, "_")}`}
                      style={({ pressed }) => ({
                        flexDirection: "row",
                        alignItems: "center",
                        gap: spacing.xs,
                        paddingVertical: spacing.xs,
                        borderTopWidth: 1,
                        borderTopColor: colors.border.subtle,
                        opacity: pressed ? 0.6 : 1,
                      })}
                    >
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text variant="bodyStrong" color="ink" numberOfLines={1}>{d.title}</Text>
                        {meta ? (
                          <Text variant="caption" color="muted" numberOfLines={1}>{meta}</Text>
                        ) : null}
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : null}
          {hits !== null && !configured ? (
            <Text variant="caption" color="muted" testID="knowledge-unconfigured">
              {t("pulse.knowledge.unconfigured")}
            </Text>
          ) : null}
          {hits !== null && configured && hits.length === 0 && !error ? (
            <Text variant="caption" color="muted" testID="knowledge-empty">
              {t("pulse.knowledge.empty")}
            </Text>
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
