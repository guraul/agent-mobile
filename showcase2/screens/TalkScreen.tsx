/**
 * TalkScreen — full-screen contextual conversation mode (spec §10).
 * Header: back + orb + name + status. Context chip above composer.
 * AI = borderless text with orb; User = accentSoft bubble. Thinking dots.
 * Back returns to Pulse preserving scroll + conversation.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  ReduceMotion,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type, spacing, backgroundGradient } from '../theme';
import { Store, sendMessage, resetPresence } from '../mock/actions';
import { useStore } from '../mock/useStore';
import { AIOrb } from '../components/AIOrb';
import { AIStatus } from '../components/AIStatus';
import { ContextChip } from '../components/ContextChip';
import { ConversationMessage } from '../components/ConversationMessage';
import { ThinkingDots } from '../components/ThinkingDots';
import { AIComposer } from '../components/AIComposer';
import { PressableScale } from '../components/PressableScale';
import { MemorySheet } from '../components/MemorySheet';
import { KnowledgeSheet } from '../components/KnowledgeSheet';
import { MemoryChip, KnowledgeSource } from '../mock/types';

interface Props {
  store: Store;
  onBack: () => void;
}

export function TalkScreen({ store, onBack }: Props) {
  const s = useStore(store);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [contextDismissed, setContextDismissed] = useState(false);
  const [memory, setMemory] = useState<MemoryChip | null>(null);
  const [knowledge, setKnowledge] = useState<KnowledgeSource | null>(null);

  // Page push entrance: from right 8% + full fade (spec §8).
  const enter = useSharedValue(1);
  const exit = useSharedValue(1);
  const enterStyle = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [{ translateX: (1 - enter.value) * 0.08 * 400 }],
  }));

  useEffect(() => {
    enter.value = 0;
    enter.value = withTiming(1, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [enter]);

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exit.value,
    transform: [{ translateX: (1 - exit.value) * -0.04 * 400 }],
  }));

  const showContextChip = s.conversation.contextLabel !== '' && !contextDismissed;

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [s.conversation.messages.length, s.conversation.thinking]);

  const handleSend = (text: string) => {
    sendMessage(store, text);
    scrollToBottom();
  };

  const handleBack = () => {
    resetPresence(store);
    exit.value = withTiming(0, {
      duration: 150,
      easing: Easing.in(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
    setTimeout(onBack, 140);
  };

  const presence = s.runtime.presence;

  return (
    <Animated.View style={[styles.root, enterStyle, exitStyle]}>
      {/* Full-screen ambient violet background */}
      <LinearGradient
        colors={backgroundGradient.colors}
        locations={backgroundGradient.locations}
        start={backgroundGradient.start}
        end={backgroundGradient.end}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={[colors.ambientGlow, 'transparent']}
        style={styles.headerGlow}
        pointerEvents="none"
      />

      {/* Header — centered AI identity, no dead buttons on the right */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.headerSide}>
          <PressableScale style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backArrow}>‹</Text>
          </PressableScale>
        </View>
        <View style={styles.headerCenter}>
          <View style={styles.orbWrap}>
            {/* subtle radial violet ambient glow behind the orb (spec §10) */}
            <View pointerEvents="none" style={styles.orbGlow} />
            <AIOrb state={presence} size="avatar" />
          </View>
          <Text style={styles.headerName}>Pulse</Text>
          <AIStatus state={presence} />
        </View>
        <View style={styles.headerSide} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: spacing.xxl + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {s.conversation.messages.map((m) => (
            <ConversationMessage
              key={m.id}
              message={m}
              onOpenMemory={setMemory}
              onOpenKnowledge={setKnowledge}
            />
          ))}
          {s.conversation.thinking && (
            <View style={styles.thinkingRow}>
              <AIOrb state="thinking" size="dot" />
              <ThinkingDots />
            </View>
          )}
        </ScrollView>

        {/* Context chip + composer */}
        <View>
          {showContextChip && (
            <View style={styles.contextRow}>
              <ContextChip
                label={s.conversation.contextLabel}
                onDismiss={() => setContextDismissed(true)}
              />
            </View>
          )}
          <AIComposer onSend={handleSend} autoFocus={false} />
        </View>
      </KeyboardAvoidingView>

      {memory && <MemorySheet memory={memory} onClose={() => setMemory(null)} />}
      {knowledge && (
        <KnowledgeSheet source={knowledge} onClose={() => setKnowledge(null)} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  headerSide: {
    width: 44,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 26, color: colors.textPrimary, lineHeight: 28 },
  orbWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.ambientGlowSoft,
  },
  headerName: { ...type.heading, color: colors.textPrimary },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg },
  thinkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingLeft: spacing.xs,
  },
  contextRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.sm,
  },
});
