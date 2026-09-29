// 通用气泡内白卡（#30，chat.html/.chatcode.html .inner-card 基准）：
// 白底圆角 14 内嵌 AI 气泡——头行（标题 + 右侧计数）+ 行列表 + 底注。
// 是 Duties/Projects 卡的统一载体，也是将来 Settings 气泡化的统一载体（D5 拍板）。
import React from "react";
import { View, StyleSheet, Text as RNText } from "react-native";
import { lightColors } from "../../../theme/light";

export function InnerCard({
  title,
  count,
  caption,
  children,
}: {
  title: string;
  count?: string | null;
  caption?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <View style={s.card}>
      <View style={s.head}>
        <RNText style={s.title}>{title}</RNText>
        {count ? <RNText style={s.count}>{count}</RNText> : null}
      </View>
      {children}
      {caption ? <RNText style={s.caption}>{caption}</RNText> : null}
    </View>
  );
}

const s = StyleSheet.create({
  // mock .inner-card：白底 radius 14，padding 6px 13px（行自身带纵向 padding）
  card: {
    backgroundColor: lightColors.white,
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 6,
    marginTop: 8,
  },
  // mock .w-head：标题左、计数右
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 2,
  },
  title: { fontSize: 15, fontWeight: "700", lineHeight: 22, color: lightColors.ink },
  count: { fontSize: 12, lineHeight: 17, color: lightColors.grayText },
  caption: {
    fontSize: 12,
    lineHeight: 17,
    color: lightColors.grayText,
    marginTop: 8,
    marginBottom: 6,
  },
});
