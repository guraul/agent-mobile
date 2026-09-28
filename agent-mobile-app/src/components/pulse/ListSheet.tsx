import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";
import { LightSheet } from "./LightSheet";
import { lightColors, lightTypography } from "../../theme/light";

/**
 * ListSheet — shared contextual overflow surface（RN 迁移 #F 浅色重做）。
 * 挂 LightSheet 原语；sheet-title 17/700 + 纵向滚动（mock .sheet-scroll max-h 460）。
 * More / See All 复用；presentation only：调用方保持 canonical 顺序，不改数据。
 */
export function ListSheet({
  visible,
  title,
  onClose,
  children,
  testID,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  testID?: string;
}) {
  return (
    <LightSheet visible={visible} onClose={onClose} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </LightSheet>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: lightTypography.title.fontSize,
    fontWeight: lightTypography.title.fontWeight,
    lineHeight: lightTypography.title.lineHeight,
    color: lightColors.ink,
    marginBottom: 10, // mock .sheet-title
  },
  scroll: { maxHeight: 460 }, // mock .sheet-scroll
  scrollContent: { gap: 8, paddingBottom: 4 },
});
