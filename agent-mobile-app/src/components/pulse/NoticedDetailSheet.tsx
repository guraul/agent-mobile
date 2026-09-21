import React from "react";
import { View } from "react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Button } from "../primitives/Button";
import { Text } from "../primitives/Text";
import type { L1Statement } from "../../services/l1";
import { formatRelative } from "../../services/assignment/projection";
import { spacing } from "../../theme";

/**
 * NoticedDetailSheet — read-only detail for an L1 observation.
 * Viewing never mutates anything: L1 has no lifecycle. "Discuss" hands the
 * statement to Talk under the normal Talk rules; it marks nothing.
 */
export function NoticedDetailSheet({
  statement,
  onClose,
  onDiscuss,
}: {
  statement: L1Statement | null;
  onClose: () => void;
  onDiscuss: () => void;
}) {
  return (
    <BottomSheet visible={statement !== null} onClose={onClose} testID="noticed-detail-sheet">
      {statement ? (
        <View style={{ gap: spacing.xs }}>
          <Text variant="title" color="ink" testID="noticed-detail-text">
            {statement.text}
          </Text>
          <Text variant="monoCaption" color="muted" testID="noticed-detail-source">
            {statement.sourceRef} · {formatRelative(statement.occurredAt)}
          </Text>
          {statement.expiresAt ? (
            <Text variant="caption" color="muted">
              Valid until {formatRelative(statement.expiresAt)}
            </Text>
          ) : null}
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.md }}>
            <Button
              variant="secondary"
              label="Discuss"
              onPress={onDiscuss}
              testID="noticed-detail-discuss"
            />
            <Button variant="ghost" label="Close" onPress={onClose} testID="noticed-detail-close" />
          </View>
        </View>
      ) : null}
    </BottomSheet>
  );
}
