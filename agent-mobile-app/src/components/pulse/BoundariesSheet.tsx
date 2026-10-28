import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { StatusPill } from "../feedback/StatusPill";
import { Text } from "../primitives/Text";
import { BOUNDARY_TIERS } from "../../services/agency/boundaries";
import {
  NIGHTLY_RETRY_JOB,
  fetchNightlyRetryEnabled,
  toggleNightlyRetry,
} from "../../services/agency/scheduler-toggle";
import { loadToken } from "../../services/auth";
import { showAlert } from "../../services/alert";
import { colors, spacing } from "../../theme";
import { t, useLocale } from "../../i18n";

/**
 * BoundariesSheet — "How we work together"：她现在的自主边界。
 *
 * 内容全部来自 `services/agency/boundaries.ts`（唯一事实源），这里只做渲染。
 * 唯一可调项 = 「Acts, then tells you」里的 Nightly retry：开关读写
 * `nightly-retry` 这个调度 job（service 在 `services/agency/scheduler-toggle.ts`）。
 * 其它两层与同层其它条目保持只读——想改只能去 Talk 说，或在代码里改那份数据。
 */
export function BoundariesSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  // 订阅语言：切换时 sheet 重渲染，渲染期 t() 取到新文案。
  useLocale();

  const [nightlyRetryEnabled, setNightlyRetryEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // 打开面板时读一次调度状态；状态落地都放在 promise 回调里（effect 同步段不碰 setter）。
  const reload = useCallback(() => {
    return loadToken()
      .then(() => {
        setLoading(true);
        return fetchNightlyRetryEnabled();
      })
      .then((enabled) => {
        setNightlyRetryEnabled(enabled);
        setLoadFailed(false);
      })
      .catch(() => {
        setLoadFailed(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  const onToggleNightlyRetry = (next: boolean) => {
    if (loading || pending) return;
    setPending(true);
    toggleNightlyRetry(nightlyRetryEnabled, next, setNightlyRetryEnabled)
      .catch(() => {
        // service 已回滚；这里只负责让用户知道没生效。
        showAlert(
          t("pulse.boundaries.acts.nightlyRetry.toggleFailedTitle"),
          t("pulse.boundaries.acts.nightlyRetry.toggleFailedBody"),
        );
      })
      .finally(() => setPending(false));
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="boundaries-sheet">
      {/* header 与 MemorySheet / KnowledgeSheet 同一套：title + caption，xxs 间距 */}
      <View style={{ gap: spacing.xxs, marginBottom: spacing.sm }}>
        <Text variant="title" color="ink">{t("pulse.boundaries.title")}</Text>
        <Text variant="caption" color="muted">{t("pulse.boundaries.caption")}</Text>
      </View>

      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.md }}>
        {BOUNDARY_TIERS.map((tier) => (
          <View key={tier.id} style={{ gap: spacing.xxs }}>
            {/* 层名用 StatusPill：颜色即授权等级（running / warning / idle） */}
            <StatusPill
              status={tier.tone}
              label={t(tier.labelKey)}
              testID={`boundaries-tier-${tier.id}`}
            />
            <Text variant="caption" color="muted">{t(tier.captionKey)}</Text>
            {tier.items.map((item) => {
              // 唯一可调项：nightly-retry（job 名与条目 id 一致）。
              const adjustable = tier.id === "actsThenTells" && item.id === NIGHTLY_RETRY_JOB;
              return (
                <View key={item.id} testID={`boundaries-item-${item.id}`} style={rowStyle}>
                  <View style={rowBodyStyle}>
                    <Text variant="bodyStrong" color="ink">{t(item.titleKey)}</Text>
                    <Text variant="caption" color="body">{t(item.detailKey)}</Text>
                  </View>
                  {adjustable ? (
                    <View style={switchStyle}>
                      <Switch
                        value={nightlyRetryEnabled}
                        onValueChange={onToggleNightlyRetry}
                        disabled={loading || pending}
                        trackColor={{ false: colors.surface[2], true: colors.accent.default }}
                        thumbColor={colors.onAccent}
                        ios_backgroundColor={colors.surface[2]}
                        accessibilityLabel={t("pulse.boundaries.acts.nightlyRetry.a11y")}
                        testID="boundaries-nightly-retry-switch"
                      />
                      {loading ? (
                        <Text variant="monoCaption" color="muted">
                          {t("pulse.boundaries.acts.nightlyRetry.checking")}
                        </Text>
                      ) : null}
                      {!loading && loadFailed ? (
                        <Text variant="monoCaption" color="error">
                          {t("pulse.boundaries.acts.nightlyRetry.statusFailed")}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={{ marginTop: spacing.sm }} testID="boundaries-footer">
        <Text variant="caption" color="muted">{t("pulse.boundaries.footer")}</Text>
      </View>
    </BottomSheet>
  );
}

// 行样式与 SettingsSheet / MemorySheet 一致（paddingVertical xs + 1px border.subtle）。
const rowStyle = {
  flexDirection: "row" as const,
  alignItems: "flex-start" as const,
  gap: spacing.xs,
  paddingVertical: spacing.xs,
  borderTopWidth: 1,
  borderTopColor: colors.border.subtle,
};

const rowBodyStyle = { flex: 1, gap: 2 };

// 开关列：右对齐、与标题同一行；状态文案在开关下方（不挤压标题）。
const switchStyle = {
  alignItems: "flex-end" as const,
  gap: 2,
  maxWidth: 120,
};
