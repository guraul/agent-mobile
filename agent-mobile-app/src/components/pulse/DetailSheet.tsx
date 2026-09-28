/**
 * DetailSheet — read-only detail for a Noticed statement（RN 迁移 #C 重做）。
 * Viewing never changes product state（D9：查看 ≠ 授权/处理）。
 * Discuss is the only way out of the sheet into Talk。
 *
 * 重做：挂 LightSheet 浅色原语（scrim + 白卡 + 顶圆角 28 + handle），
 * 样式基准 pulseB-sheet-noticed.html（group-label / body / meta / chip review "Discuss"）。
 * props API 与旧版一致（index.tsx 装配零改动）；mount 即显示、close 即卸载（语义同旧版）。
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { LightSheet } from "./LightSheet";
import { LightChip } from "./LightAtoms";
import { lightColors, lightTypography } from "../../theme/light";

export function DetailSheet({
  label,
  body,
  meta,
  onDiscuss,
  onClose,
  testID,
}: {
  label: string;
  body: string;
  meta: string;
  onDiscuss?: () => void;
  onClose: () => void;
  testID?: string;
}) {
  return (
    <LightSheet visible onClose={onClose} testID={testID}>
      <View style={styles.content}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.body}>{body}</Text>
        <Text style={styles.meta}>{meta}</Text>
        <View style={styles.actions}>
          {onDiscuss && (
            <LightChip
              label="Discuss"
              kind="review"
              onPress={onDiscuss}
              testID={testID ? `${testID}-discuss` : undefined}
            />
          )}
        </View>
      </View>
    </LightSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: 2 },
  label: {
    fontSize: lightTypography.label.fontSize,
    fontWeight: lightTypography.label.fontWeight,
    lineHeight: lightTypography.label.lineHeight,
    color: lightColors.groupLabel,
    marginBottom: 8,
  },
  body: {
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 24, // mock .sheet-body 16/400 lh1.5
    color: lightColors.ink,
    marginVertical: 2,
  },
  meta: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
    marginTop: 4,
    marginBottom: 14,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 14 },
});
