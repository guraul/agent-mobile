import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Text } from "../primitives/Text";
import { Button } from "../primitives/Button";
import { StatusPill } from "../feedback/StatusPill";
import type { StatusType } from "../feedback/StatusDot";
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
import { ACTIVITY_PAGE_LIMIT, filterActivityToToday } from "../../services/activity/digest";
import { colors, spacing } from "../../theme";

/**
 * ActivitySheet — "Lately": a read-only record of what I did under your
 * authority (PM §14 autonomy made visible, step one). It only answers "what
 * did I do"; no grant / revoke / re-run control. An empty window is not an
 * error (nothing needed doing is a legitimate fact); failing to load is
 * (+ Try again). Layout mirrors MemorySheet: header + ScrollView + token rows.
 */

const OUTCOME_STATUS: Record<AgentActivityOutcome, StatusType> = {
  matched: "warning",
  evaluated: "idle",
  failed: "error",
};

export function ActivitySheet({
  visible,
  onClose,
  days = DEFAULT_ACTIVITY_DAYS,
}: {
  visible: boolean;
  onClose: () => void;
  /** 1 = 「今天」模式（本地日界过滤）；缺省沿用 7 天审计窗口。 */
  days?: number;
}) {
  const [activity, setActivity] = useState<AgentActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 打开面板时重拉；重置与落地都放在 promise 回调里（effect 同步段不碰 setter）。
  const reload = useCallback(() => {
    return loadToken()
      .then(() => {
        setLoading(true);
        setError(null);
        setActivity(null); // 读不到时不留上一次的旧数字（陈旧摘要比空态更误导）
        return fetchAgentActivity(days, days === 1 ? ACTIVITY_PAGE_LIMIT : undefined);
      })
      .then((fetched) => {
        setActivity(days === 1 ? filterActivityToToday(fetched, Date.now()) : fetched);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [days]);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  const windowDays = activity?.windowDays ?? days;
  const empty = !loading && !error && (activity?.executions.length ?? 0) === 0;
  const emptyText =
    days === 1 ? "Nothing needed doing today" : buildActivityEmptyText(windowDays);

  return (
    <BottomSheet visible={visible} onClose={onClose} testID="activity-sheet">
      <View style={{ gap: spacing.xxs, marginBottom: spacing.sm }}>
        <Text variant="title" color="ink">Lately</Text>
        <Text variant="caption" color="muted">
          Read-only record of what I did under your authority. Looking changes nothing.
        </Text>
      </View>
      {activity ? (
        <View style={{ marginBottom: spacing.sm }}>
          <Text variant="captionStrong" color="body" testID="activity-summary">
            {buildActivitySummary(activity, days === 1 ? "Today" : undefined)}
          </Text>
        </View>
      ) : null}
      <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ gap: spacing.sm }}>
        {loading ? (
          <Text variant="caption" color="muted" testID="activity-loading">Loading…</Text>
        ) : null}

        {!loading && error ? (
          <View style={{ gap: spacing.xs }} testID="activity-error">
            <Text variant="caption" color="error">{"Couldn't load this right now"}</Text>
            <Button variant="secondary" label="Try again" onPress={reload} testID="activity-retry" />
          </View>
        ) : null}

        {empty ? (
          <Text variant="caption" color="muted" testID="activity-empty">
            {emptyText}
          </Text>
        ) : null}

        {(activity?.executions ?? []).map((item) => (
          <View
            key={item.id}
            testID={`activity-item-${item.id}`}
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
              <Text variant="bodyStrong" color="ink" numberOfLines={2}>{item.title}</Text>
              <Text variant="monoCaption" color="muted">{formatActivityTime(item.at)}</Text>
            </View>
            <StatusPill
              status={OUTCOME_STATUS[item.outcome] ?? OUTCOME_STATUS.evaluated}
              label={activityOutcomeLabel(item.outcome)}
              testID={`activity-outcome-${item.id}`}
            />
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
