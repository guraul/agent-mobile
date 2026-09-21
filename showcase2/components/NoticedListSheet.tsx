/**
 * NoticedListSheet — full Noticed list, opened by "See All".
 * "See All" only appears when Noticed has more than 5 rows (spec V2 §8).
 * Read-only: viewing changes no product state.
 */
import React, { useEffect } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { colors, type, spacing, radii } from '../theme';
import { NoticedItem } from '../mock/types';

export function NoticedListSheet({
  items,
  onClose,
}: {
  items: NoticedItem[];
  onClose: () => void;
}) {
  const slide = useSharedValue(0);

  useEffect(() => {
    slide.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [slide]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - slide.value) * 120 }],
  }));

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.scrim} onPress={onClose} />
      <Animated.View style={[styles.sheet, sheetStyle]}>
        <View style={styles.handle} />
        <Text style={styles.label}>Noticed</Text>
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <View key={item.id} style={styles.row}>
              <View style={styles.dot} />
              <Text style={styles.fact}>{item.fact}</Text>
              <Text style={styles.time}>{item.time}</Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.scrim,
  },
  sheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radii.radiusSheet,
    borderTopRightRadius: radii.radiusSheet,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    padding: spacing.xl,
    paddingBottom: spacing.xl + 24,
    gap: spacing.md,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  label: { ...type.label, color: colors.textLabel },
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 11,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.noticed,
    marginTop: 7,
    flexShrink: 0,
  },
  fact: { ...type.body, color: colors.textSecondary, flex: 1, minWidth: 0 },
  time: { ...type.metadata, color: colors.textMuted, flexShrink: 0 },
});
