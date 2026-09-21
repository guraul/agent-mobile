import React from "react";
import { ScrollView, View } from "react-native";
import { BottomSheet } from "../navigation/BottomSheet";
import { Text } from "../primitives/Text";
import { spacing } from "../../theme";

/**
 * ListSheet — shared contextual overflow surface (More / See All / Projects).
 * Presentation only: the caller keeps canonical ordering and data untouched.
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
    <BottomSheet visible={visible} onClose={onClose} testID={testID}>
      <View style={{ marginBottom: spacing.sm }}>
        <Text variant="title" color="ink">{title}</Text>
      </View>
      <ScrollView style={{ maxHeight: 440 }} contentContainerStyle={{ gap: spacing.xxs }}>
        {children}
      </ScrollView>
    </BottomSheet>
  );
}
