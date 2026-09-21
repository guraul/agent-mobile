import React from "react";
import { View } from "react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Text } from "../primitives/Text";
import type { L1MarketEstimateData } from "../../services/l1";
import { colors, radius, spacing } from "../../theme";

/**
 * FundSheet — read-only market estimate detail (L1 market-estimate).
 * Informational only: no lifecycle, no obligation, no actions.
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
  return (
    <BottomSheet visible={visible} onClose={onClose} testID="fund-sheet">
      <View style={{ gap: spacing.xs }}>
        <Text variant="title" color="ink">Market</Text>
        <Text variant="caption" color="muted">
          Estimates I am keeping an eye on. Informational only.
        </Text>
        {funds.map((f) => (
          <View
            key={f.code}
            testID={`fund-row-${f.code}`}
            style={{
              backgroundColor: colors.surface[1],
              borderRadius: radius.sm,
              padding: spacing.sm,
              gap: spacing.xxs,
            }}
          >
            <Text variant="bodyStrong" color="ink">{f.name}</Text>
            <Text variant="monoCaption" color="muted">{f.code}</Text>
            <Text variant="captionStrong" color={f.changePct >= 0 ? "success" : "error"}>
              {f.estimatedNav.toFixed(4)} · prev {f.prevNav.toFixed(4)} · {f.changePct >= 0 ? "+" : ""}
              {f.changePct.toFixed(2)}%
            </Text>
          </View>
        ))}
      </View>
    </BottomSheet>
  );
}
