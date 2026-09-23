/**
 * AIComposer — the real Talk input (spec V2 §13).
 * Capsule TextInput + an independent round gradient Send button outside the capsule.
 * Pulse never uses this component; Pulse only has the ConversationEntry.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type, spacing } from '../../theme/companion';

export function AIComposer({
  onSend,
  placeholder = 'Message Pulse…',
  autoFocus,
}: {
  onSend: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState('');
  const sendScale = useSharedValue(1);
  const insets = useSafeAreaInsets();

  const canSend = text.trim().length > 0;

  const sendStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const handleSend = () => {
    if (!canSend) return;
    sendScale.value = withSequence(
      withTiming(1.1, { duration: 125, easing: Easing.out(Easing.ease), reduceMotion: ReduceMotion.System }),
      withTiming(1, { duration: 125, easing: Easing.inOut(Easing.ease), reduceMotion: ReduceMotion.System }),
    );
    onSend(text.trim());
    setText('');
  };

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, spacing.md) },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.pill}>
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={colors.textMuted}
            value={text}
            onChangeText={setText}
            multiline
            autoFocus={autoFocus}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
        </View>

        <Pressable
          onPress={handleSend}
          disabled={!canSend}
          hitSlop={8}
          style={!canSend && styles.sendDisabled}
        >
          <Animated.View style={[styles.send, sendStyle]}>
            <LinearGradient
              colors={[colors.accentBright, colors.accentDeep]}
              start={{ x: 0.15, y: 0 }}
              end={{ x: 0.85, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.sendArrow}>➤</Text>
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pill: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevatedDeep,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  input: {
    ...type.body,
    color: colors.textPrimary,
    paddingVertical: spacing.md - 4,
    maxHeight: 100,
  },
  sendDisabled: { opacity: 0.4 },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  sendArrow: { color: '#FFFFFF', fontSize: 16 },
});
