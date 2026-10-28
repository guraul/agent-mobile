import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Button } from "../primitives/Button";
import { Input } from "../primitives/Input";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { loadToken } from "../../services/auth";
import {
  checkIcsUrl,
  createIcsSource,
  deleteIcsSource,
  fetchIcsSources,
  type IcsSourceItem,
} from "../../services/external/client";
import { colors, spacing } from "../../theme";
import { showAlert } from "../../services/alert";
import { t, useLocale } from "../../i18n";

function messageOf(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  // 未登录时 BFF 回 401（auth 层已清 token）；给一句能行动的文案，别把 "unauthorized" 甩到屏上。
  return message === "unauthorized" ? t("pulse.calendar.signInRequired") : message;
}

/**
 * CalendarSheet — 外部日历（ICS 只读订阅）录入与删除（issue #153 切片 3b）。
 * 结构对齐 MemorySheet：title + caption、行列表、底部一行错误（不弹窗刷屏）。
 * 列表里的地址一律是 BFF 打码值；删除需二次确认（showAlert）。
 */
export function CalendarSheet({
  visible,
  onClose,
  onChanged,
}: {
  visible: boolean;
  onClose: () => void;
  /** 源集合变化后通知外层（Settings 行的计数/首条摘要要跟着刷新）。 */
  onChanged?: () => void;
}) {
  // 订阅语言：切换时 sheet 重渲染，渲染期 t() 取到新文案。
  useLocale();
  const [sources, setSources] = useState<IcsSourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  // 打开面板时重拉；状态落地都放在 promise 回调里（effect 同步段不碰 setter）。
  const reload = useCallback(() => {
    return loadToken()
      .then(() => {
        setLoading(true);
        return fetchIcsSources();
      })
      .then((items) => {
        setSources(items);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(messageOf(e));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  const add = () => {
    const url = draft.trim();
    const check = checkIcsUrl(url);
    if (!check.ok) {
      setError(
        t(
          check.reason === "https"
            ? "pulse.calendar.invalidHttps"
            : "pulse.calendar.invalidIcs",
        ),
      );
      return;
    }
    setBusy(true);
    setError(null);
    createIcsSource({ url })
      .then(() => {
        setDraft("");
        return reload();
      })
      .then(() => onChanged?.())
      .catch((e: unknown) => {
        setError(t("pulse.calendar.addFailedLine", { detail: messageOf(e) }));
      })
      .finally(() => {
        setBusy(false);
      });
  };

  const confirmDelete = (item: IcsSourceItem) => {
    const label = item.label ?? item.url;
    showAlert(
      t("pulse.calendar.deleteTitle"),
      t("pulse.calendar.deleteBody", { label }),
      [
        { text: t("app.common.cancel"), style: "cancel" },
        {
          text: t("pulse.calendar.delete"),
          style: "destructive",
          onPress: () => {
            deleteIcsSource(item.id)
              .then(() => reload())
              .then(() => onChanged?.())
              .catch((e: unknown) => {
                setError(t("pulse.calendar.deleteFailedLine", { detail: messageOf(e) }));
              });
          },
        },
      ],
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="calendar-sheet">
      <View style={{ gap: spacing.xxs, marginBottom: spacing.sm }}>
        <Text variant="title" color="ink">{t("pulse.calendar.title")}</Text>
        <Text variant="caption" color="muted">{t("pulse.calendar.caption")}</Text>
      </View>

      {error ? (
        <Text variant="caption" color="error" testID="calendar-error">{error}</Text>
      ) : null}

      <ScrollView style={{ maxHeight: 320 }} contentContainerStyle={{ gap: spacing.xxs }}>
        {loading ? (
          <Text variant="caption" color="muted" testID="calendar-loading">
            {t("pulse.calendar.loading")}
          </Text>
        ) : null}
        {!loading && !error && sources.length === 0 ? (
          <Text variant="caption" color="muted" testID="calendar-empty">
            {t("pulse.calendar.empty")}
          </Text>
        ) : null}
        {sources.map((item) => {
          const label = item.label ?? item.url;
          return (
            <View
              key={item.id}
              testID={`calendar-item-${item.id}`}
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
                <Text variant="bodyStrong" color="ink" numberOfLines={1}>{label}</Text>
                {item.label ? (
                  <Text variant="monoCaption" color="muted" numberOfLines={1}>{item.url}</Text>
                ) : null}
                {item.lastError ? (
                  <Text variant="caption" color="error" numberOfLines={1}>{item.lastError}</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => confirmDelete(item)}
                hitSlop={8}
                testID={`calendar-delete-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel={t("pulse.calendar.deleteA11y", { label })}
              >
                <Icon icon={Trash2} size="sm" color="error" />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder={t("pulse.calendar.addPlaceholder")}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          testID="calendar-input"
        />
        <Button
          label={t("pulse.calendar.add")}
          onPress={add}
          loading={busy}
          disabled={draft.trim().length === 0}
          fullWidth
          testID="calendar-add"
        />
      </View>
    </BottomSheet>
  );
}
