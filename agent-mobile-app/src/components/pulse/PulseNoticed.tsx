/**
 * PulseNoticed — informational, lowest visual weight（RN 迁移 #F 浅色重做）。
 * mock .nrow：dot 6×6 green + fact 15/400 + time 12 gray，min-h 44；
 * 行间分隔线由容器（ghost 卡）经 style 透传（border-top rgba(0,0,0,.05)）。
 * 语义不变：informational，点击 → DetailSheet（Discuss 是唯一出口）。
 */
import React from "react";
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { lightColors, lightTypography } from "../../theme/light";
import { NoticedItem } from "./showcase-types";
import { PressableScale } from "./PressableScale";

export function PulseNoticed({
  item,
  onPress,
  testID,
  style,
}: {
  item: NoticedItem;
  onPress: (item: NoticedItem) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableScale
      style={[styles.row, style]}
      onPress={() => onPress(item)}
      scaleTo={0.99}
      testID={testID}
    >
      <View style={styles.dot} />
      <Text style={styles.fact} numberOfLines={1}>
        {item.fact}
      </Text>
      <Text style={styles.time}>{item.time}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12, // mock .nrow gap 12
    minHeight: 44, // mock min-height 44
    paddingVertical: 11, // mock padding 11px 2px
    paddingHorizontal: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: lightColors.green,
    marginTop: 6,
    flexShrink: 0,
  },
  fact: {
    fontSize: lightTypography.body.fontSize,
    fontWeight: lightTypography.body.fontWeight,
    lineHeight: lightTypography.body.lineHeight,
    color: lightColors.bodyText, // mock .nrow .fact #2A2A2A
    flex: 1,
    minWidth: 0,
  },
  time: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
    marginTop: 2, // mock .nrow .time margin-top 2
    flexShrink: 0,
  },
});
