import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { loadToken } from "../../services/auth";
import { fetchAgentActivity } from "../../services/activity/client";
import { ACTIVITY_PAGE_LIMIT, buildTodayDigest } from "../../services/activity/digest";
import { iconSizes, iconStroke, spacing } from "../../theme";
import { lightColors, lightTypography } from "../../theme/light";

/**
 * TodayDigest — Pulse 顶部一句话：「她今天替你做了什么」（Tier1「先做后报」最小实验）。
 * 纯只读：复用 agent-activity 端点，不改执行权、不加执行路径。
 * 无数据 / 数据被截断 / 读失败 → 整行不渲染（不占位、不报错）；失败最多再试一次。
 */
export function TodayDigest({ onPress }: { onPress: () => void }) {
  const [text, setText] = useState<string | null>(null);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          await loadToken();
          const activity = await fetchAgentActivity(1, ACTIVITY_PAGE_LIMIT);
          setText(buildTodayDigest(activity));
          return;
        } catch {
          // 静默：这一行不值得让首页报错；只允许再试一次，仍失败就保持现状。
          if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  if (text === null) return null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={text}
      testID="pulse-today-digest"
      hitSlop={8}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.text} numberOfLines={1}>
        {text}
      </Text>
      <View style={styles.chevron}>
        <ChevronRight size={iconSizes.xs} strokeWidth={iconStroke} color={lightColors.grayText} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.xxs,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  text: {
    flex: 1,
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.subtleText,
  },
  chevron: { flexShrink: 0 },
});
