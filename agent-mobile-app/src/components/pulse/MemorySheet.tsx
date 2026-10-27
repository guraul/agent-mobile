import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { Trash2 } from "lucide-react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Text } from "../primitives/Text";
import { Icon } from "../primitives/Icon";
import { loadToken } from "../../services/auth";
import {
  fetchMemories,
  forgetMemory,
  buildMemoryGroups,
  type MemoryGroup,
} from "../../services/memory/client";
import { colors, spacing } from "../../theme";
import { showAlert } from "../../services/alert";
import { t, useLocale } from "../../i18n";

/**
 * MemorySheet — "What I remember" (canonical = memx projection, read-only +
 * Forget). Memory is a capability, not a destination: no tab, no page.
 */
export function MemorySheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [groups, setGroups] = useState<MemoryGroup[]>([]);
  // 订阅语言：切换时 sheet 重渲染，渲染期 t() 取到新文案。
  useLocale();
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 打开面板时重拉；状态落地都放在 promise 回调里（effect 同步段不碰 setter）。
  const reload = useCallback(() => {
    return loadToken()
      .then(() => {
        setLoading(true);
        return fetchMemories();
      })
      .then((projection) => {
        setGroups(buildMemoryGroups(projection));
        setSource(projection.source);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  const doForget = (item: { id: string; title: string }) => {
    showAlert(
      t("pulse.memory.forgetTitle"),
      t("pulse.memory.forgetBody", { title: item.title }),
      [
        { text: t("app.common.cancel"), style: "cancel" },
        {
          text: t("pulse.memory.forget"),
          style: "destructive",
          onPress: () => {
            forgetMemory(item.id)
              .then(() => reload())
              .catch((e) =>
                showAlert(
                  t("pulse.memory.forgetFailed"),
                  e instanceof Error ? e.message : String(e),
                ),
              );
          },
        },
      ],
    );
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="memory-sheet">
      <View style={{ gap: spacing.xxs, marginBottom: spacing.sm }}>
        <Text variant="title" color="ink">{t("pulse.memory.title")}</Text>
        <Text variant="caption" color="muted">{t("pulse.memory.caption")}</Text>
      </View>
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.sm }}>
        {loading ? (
          <Text variant="caption" color="muted" testID="memory-loading">
            {t("pulse.memory.loading")}
          </Text>
        ) : null}
        {!loading && error ? (
          <Text variant="caption" color="error" testID="memory-error">{error}</Text>
        ) : null}
        {!loading && !error && groups.length === 0 ? (
          <Text variant="caption" color="muted" testID="memory-empty">
            {t("pulse.memory.empty")}
          </Text>
        ) : null}
        {groups.map((g) => (
          <View key={g.key} style={{ gap: spacing.xxs }}>
            <Text variant="label" color="muted">{g.label.toUpperCase()}</Text>
            {g.items.map((item) => (
              <View
                key={item.id}
                testID={`memory-item-${item.id}`}
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
                  <Text variant="bodyStrong" color="ink">{item.title}</Text>
                  <Text variant="caption" color="body">{item.detail}</Text>
                  <Text variant="monoCaption" color="muted">
                    {item.updatedAtLabel} · {item.source}
                  </Text>
                </View>
                <Pressable
                  onPress={() => doForget(item)}
                  hitSlop={8}
                  testID={`memory-forget-${item.id}`}
                  accessibilityLabel={t("pulse.memory.forgetA11y", { title: item.title })}
                >
                  <Icon icon={Trash2} size="sm" color="error" />
                </Pressable>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      {source ? (
        <Text variant="monoCaption" color="muted">{t("pulse.memory.source", { source })}</Text>
      ) : null}
    </BottomSheet>
  );
}
