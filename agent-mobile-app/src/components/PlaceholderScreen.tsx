import { View, StyleSheet } from "react-native";
import { Text } from "@/components";
import { colors, spacing } from "@/theme";

export default function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.container}>
      <Text variant="title" color="ink" align="center">
        {title}
      </Text>
      <Text variant="body" color="muted" align="center">
        Coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    padding: spacing.lg,
  },
});
