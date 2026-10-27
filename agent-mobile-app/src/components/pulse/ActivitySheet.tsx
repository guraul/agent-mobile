import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Text } from "../primitives/Text";
import { Button } from "../primitives/Button";
import { loadToken } from "../../services/auth";
import {
  fetchAgentActivity,
  buildActivitySummary,
  buildActivityEmptyText,
  activityOutcomeLabel,
  formatActivityTime,
  DEFAULT_ACTIVITY_DAYS,
  type AgentActivity,
  type AgentActivityOutcome,
} from "../../services/activity/client";
import { colors, radius, spacing } from "../../theme";

/**
 * ActivitySheet — 「她最近做了什么」只读审计清单（PM §14 自主性可见化第一步）。
 * 只回答"她替你做了什么"，不做权限调整：没有任何授权 / 撤销 / 重跑按钮。
 * 空窗口不是错误（没有需要动手的事是合法事实），读不到才是错误（+ 重试）。
 */

const OUTCOME_TONE: Record<AgentActivityOutcome, {
  bg: string;
  border: string;
  text: "success" | "muted" | "error";
}> = {
  matched: {
    bg: colors.status.fill.success,
    border: colors.status.border.success,
    text: "success",
  },
  evaluated: {
    bg: colors.status.fill.idle,
    border: colors.status.border.idle,
    text: "muted",
  },
  failed: {
    bg: colors.status.fill.error,
    border: colors.status.border.error,
    text: "error",
  },
};

export function ActivitySheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [activity, setActivity] = useState<AgentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setActivity(null); // 读不到时不留上一次的旧数字（陈旧摘要比空态更误导）
    try {
      await loadToken();
      setActivity(await fetchAgentActivity(DEFAULT_ACTIVITY_DAYS));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  const windowDays = activity?.windowDays ?? DEFAULT_ACTIVITY_DAYS;
  const empty = !loading && !error && (activity?.executions.length ?? 0) === 0;

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="activity-sheet">
      <View style={{ gap: spacing.xxs, marginBottom: spacing.sm }}>
        <Text variant="title" color="ink">她最近做了什么</Text>
        <Text variant="caption" color="muted">
          只读记录：她按你的授权做过什么。查看不会改变任何状态。
        </Text>
      </View>

      {activity ? (
        <Text variant="captionStrong" color="body" testID="activity-summary">
          {buildActivitySummary(activity)}
        </Text>
      ) : null}

      <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: spacing.xs }}>
        {loading ? (
          <Text variant="caption" color="muted" testID="activity-loading">加载中…</Text>
        ) : null}

        {!loading && error ? (
          <View style={{ gap: spacing.xs, paddingVertical: spacing.xs }} testID="activity-error">
            <Text variant="caption" color="error">暂时读不到记录</Text>
            <Button variant="secondary" label="重试" onPress={reload} testID="activity-retry" />
          </View>
        ) : null}

        {empty ? (
          <Text variant="caption" color="muted" testID="activity-empty">
            {buildActivityEmptyText(windowDays)}
          </Text>
        ) : null}

        {(activity?.executions ?? []).map((item) => {
          const tone = OUTCOME_TONE[item.outcome] ?? OUTCOME_TONE.evaluated;
          return (
            <View
              key={item.id}
              testID={`activity-item-${item.id}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.xs,
                paddingVertical: spacing.xs,
                borderTopWidth: 1,
                borderTopColor: colors.border.subtle,
              }}
            >
              <View style={{ flex: 1, gap: spacing.xxs }}>
                <Text variant="body" color="ink" numberOfLines={2}>{item.title}</Text>
                <Text variant="monoCaption" color="muted">{formatActivityTime(item.at)}</Text>
              </View>
              <View
                style={{
                  paddingHorizontal: spacing.xs,
                  paddingVertical: spacing.xxs,
                  borderRadius: radius.xs,
                  backgroundColor: tone.bg,
                  borderWidth: 1,
                  borderColor: tone.border,
                }}
              >
                <Text variant="monoCaption" color={tone.text}>
                  {activityOutcomeLabel(item.outcome)}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}
