import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { LightSheet } from "./LightSheet";
import type { L1MarketEstimateData } from "../../services/l1";
import { lightColors, lightTypography, lightRadius } from "../../theme/light";
import { t, useLocale } from "../../i18n";

/**
 * FundSheet — read-only market estimate detail（RN 迁移 #F 浅色重做）。
 * 挂 LightSheet 原语；行样式基准 pulseB-sheet-fund.html .fund-row
 * （row-gray 圆角 14 + name 15/600 + code 12 gray + 涨跌 13/600 红涨绿跌）。
 * Informational only: no lifecycle, no obligation, no actions（L1 语义不变）。
 */
export function FundSheet({
  visible,
  funds,
  onClose,
}: {
  visible: boolean;
  funds: L1MarketEstimateData[];
  onClose: () => void;
}) {
  // 订阅语言：切换时 sheet 重渲染，渲染期 t() 取到新文案。
  useLocale();
  return (
    <LightSheet visible={visible} onClose={onClose} testID="fund-sheet">
      <Text style={styles.title}>{t("pulse.market.title")}</Text>
      <Text style={styles.cap}>{t("pulse.market.caption")}</Text>
      <View style={styles.list}>
        {funds.map((f) => (
          <View key={f.code} testID={`fund-row-${f.code}`} style={styles.fundRow}>
            <Text style={styles.fundName}>{f.name}</Text>
            <Text style={styles.fundCode}>{f.code}</Text>
            <Text style={[styles.fundLine, f.changePct >= 0 ? styles.up : styles.down]}>
              {f.estimatedNav.toFixed(4)} · {t("pulse.market.prev", { nav: f.prevNav.toFixed(4) })} ·{" "}
              {f.changePct >= 0 ? "+" : ""}
              {f.changePct.toFixed(2)}%
            </Text>
          </View>
        ))}
      </View>
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
  cap: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
    marginBottom: 12, // mock .sheet-cap
  },
  list: { gap: 8 },
  fundRow: {
    backgroundColor: lightColors.rowGray,
    borderRadius: lightRadius.row,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  fundName: {
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
    color: lightColors.fieldText, // mock .fund-name #1A1A1A
  },
  fundCode: {
    fontSize: lightTypography.caption.fontSize,
    fontWeight: lightTypography.caption.fontWeight,
    lineHeight: lightTypography.caption.lineHeight,
    color: lightColors.grayText,
    marginTop: 1,
  },
  fundLine: {
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19, // round(13 × 1.45)
    marginTop: 4,
  },
  up: { color: lightColors.upRed }, // 红涨
  down: { color: lightColors.green }, // 绿跌
});
