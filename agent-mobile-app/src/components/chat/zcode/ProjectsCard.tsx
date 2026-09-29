// Projects 卡（#30，chat-widgets.html ProjectsWidget 定稿）：项目查询——
// 绿点（running）/ 灰点（idle）+ Open ›（跳 chatcode 工作台）。
import React from "react";
import { View, Pressable, StyleSheet, Text as RNText } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { InnerCard } from "./InnerCard";
import { lightColors, lightChatColors } from "../../../theme/light";
import type { ProjectRow } from "../../../services/chat-cards";

export function ProjectsCard({
  rows,
  onOpen,
}: {
  rows: ProjectRow[];
  onOpen?: (path: string) => void;
}) {
  const runningCount = rows.filter((r) => r.running).length;
  return (
    <InnerCard title="Projects" count={`${runningCount} running`}>
      {rows.map((row, i) => (
        <View key={row.path} style={[s.row, i > 0 && s.rowDivider]}>
          {/* mock .w-dot：running 绿 / idle 灰 */}
          <View style={[s.dot, { backgroundColor: row.running ? lightChatColors.greenCheck : "#C9C9C4" }]} />
          <View style={s.main}>
            <RNText style={s.name} numberOfLines={1}>{row.name}</RNText>
            {row.meta ? <RNText style={s.meta} numberOfLines={1}>{row.meta}</RNText> : null}
          </View>
          <Pressable
            onPress={() => onOpen?.(row.path)}
            accessibilityRole="button"
            accessibilityLabel={`Open ${row.name}`}
            style={s.open}
            hitSlop={6}
          >
            <RNText style={s.openText}>Open</RNText>
            <ChevronRight color={lightColors.ink} size={14} strokeWidth={2.5} />
          </Pressable>
        </View>
      ))}
    </InnerCard>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  rowDivider: { borderTopWidth: 1, borderTopColor: "rgba(0,0,0,.06)" },
  // mock .w-dot 8px
  dot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "600", lineHeight: 20, color: lightColors.ink },
  meta: { fontSize: 12, lineHeight: 17, color: lightColors.grayText, marginTop: 2 },
  // mock .w-open：13/600 ink + ›
  open: { flexDirection: "row", alignItems: "center", gap: 2, flexShrink: 0 },
  openText: { fontSize: 13, fontWeight: "600", lineHeight: 18, color: lightColors.ink },
});
