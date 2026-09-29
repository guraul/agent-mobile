// thinking 块（#32，chatcode.html .think-card 基准）：虚线框 + 斜体 reasoning 正文，
// 折叠/展开。流式文本沿用打字机 revealChars（ChatPanelZ 对 reasoning step 做同样的
// slice，extraData 红线不变），本组件只负责呈现。
import React, { useState } from "react";
import { View, Pressable, StyleSheet, Text as RNText } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { lightChatColors, lightChatSizes } from "../../../theme";

export function ThinkCard({ text }: { text?: string }) {
  const [open, setOpen] = useState(false);
  const body = (text ?? "").trim();

  return (
    <View style={s.card}>
      <Pressable
        onPress={() => body && setOpen((o) => !o)}
        style={s.head}
        accessibilityRole={body ? "button" : undefined}
        accessibilityLabel="思考过程"
      >
        <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
          <ChevronRight color="rgba(13,13,13,.45)" size={14} strokeWidth={2} />
        </View>
        <RNText style={s.headLabel}>思考</RNText>
      </Pressable>
      {open && body ? (
        <RNText style={s.body}>{body}</RNText>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  // mock .think-card：透明底 + 1px 虚线边 + radius 14
  card: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: lightChatColors.thinkBorder,
    borderRadius: lightChatSizes.techRadius,
    paddingVertical: 8,
    paddingHorizontal: 11,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  headLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
    color: lightChatColors.techHeadText,
  },
  // mock .think-body：12.5 斜体 lh1.5
  body: {
    marginTop: 6,
    fontSize: 12.5,
    lineHeight: 19,
    fontStyle: "italic",
    color: lightChatColors.thinkText,
  },
});
