// Duties 卡（#30，chat-widgets.html DutiesWidget 定稿）：职责查询答案——
// 状态 pill（Active/Failed/Missed）+ 行内动作（Revoke 红字 / Retry 桃色 / Run now + Skip）。
// 动作回调上抛 ChatPanelZ（调 assignments API + 刷新卡），本组件纯呈现。
import React from "react";
import { View, Pressable, StyleSheet, Text as RNText } from "react-native";
import { InnerCard } from "./InnerCard";
import { lightColors, lightChatColors } from "../../../theme/light";
import type { DutyAction, DutyRow } from "../../../services/chat-cards";

const PILL_STYLES: Record<DutyRow["pill"], { bg: string; fg: string }> = {
  // mock .w-pill.active / .failed / .missed
  Active: { bg: "rgba(92,187,99,.16)", fg: "#2E7D32" },
  Failed: { bg: "rgba(229,72,77,.12)", fg: "#C43B40" },
  Missed: { bg: "rgba(229,161,58,.18)", fg: "#9A6A1B" },
};

const ACTION_LABEL: Record<DutyAction, string> = {
  revoke: "Revoke",
  retry: "Retry",
  "run-now": "Run now",
  skip: "Skip",
};

export function DutiesCard({
  rows,
  caption,
  busyId,
  onAction,
}: {
  rows: DutyRow[];
  caption?: string | null;
  busyId?: string | null;
  onAction?: (action: DutyAction, row: DutyRow) => void;
}) {
  return (
    <InnerCard title="Duties" count={`${rows.length} active`} caption={caption}>
      {rows.map((row, i) => {
        const pill = PILL_STYLES[row.pill];
        const busy = busyId === row.id;
        return (
          <View key={row.id} style={[s.row, i > 0 && s.rowDivider]}>
            <RNText style={[s.pill, { backgroundColor: pill.bg, color: pill.fg }]}>{row.pill}</RNText>
            <View style={s.main}>
              <RNText style={s.name} numberOfLines={1}>{row.name}</RNText>
              {row.meta ? <RNText style={s.meta} numberOfLines={1}>{row.meta}</RNText> : null}
            </View>
            <View style={s.acts}>
              {row.actions.map((action) => {
                const peach = action === "retry" || action === "run-now";
                return (
                  <Pressable
                    key={action}
                    onPress={() => onAction?.(action, row)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel={`${ACTION_LABEL[action]} ${row.name}`}
                    style={[s.act, peach && s.actPeach, busy && { opacity: 0.5 }]}
                  >
                    <RNText style={[s.actText, action === "revoke" && { color: lightChatColors.diffDel }, peach && { color: lightColors.ink }]}>
                      {ACTION_LABEL[action]}
                    </RNText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </InnerCard>
  );
}

const s = StyleSheet.create({
  // mock .w-row：图标/pill + 主文本 + 动作，行间细分隔线
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,.06)" },
  pill: {
    flexShrink: 0,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 16,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "600", lineHeight: 20, color: lightColors.ink },
  meta: { fontSize: 12, lineHeight: 17, color: lightColors.grayText, marginTop: 2 },
  acts: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  // mock .w-act：peach 实心 30px / quiet・danger 透明字
  act: {
    borderRadius: 16,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  actPeach: {
    backgroundColor: lightColors.peach,
    height: 30,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  actText: { fontSize: 13, fontWeight: "600", lineHeight: 18, color: lightColors.grayText },
});
