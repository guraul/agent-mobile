/**
 * ConversationMessage — AI vs User layout (spec §10, §12).
 * User: subtle accentSoft bubble, right-aligned, max-width 80%.
 * AI: borderless plain text blocks, orb avatar + indent, memory/KB chips.
 * Memory/KB chips are tappable -> open contextual sheets (spec §11).
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, type, spacing, radii } from '../theme';
import {
  ConversationMessage as Message,
  MemoryChip,
  KnowledgeSource,
} from '../mock/types';
import { AIOrb } from './AIOrb';

function MemoryLine({
  memory,
  onOpen,
}: {
  memory: MemoryChip;
  onOpen: (m: MemoryChip) => void;
}) {
  return (
    <Pressable style={styles.memoryChip} onPress={() => onOpen(memory)}>
      <Text style={styles.memoryText}>{memory.text}</Text>
      <Text style={styles.memoryCaret}>⌄</Text>
    </Pressable>
  );
}

function KnowledgeRow({
  sources,
  onOpen,
}: {
  sources: KnowledgeSource[];
  onOpen: (s: KnowledgeSource) => void;
}) {
  return (
    <View style={styles.kbRow}>
      {sources.map((s) => (
        <Pressable key={s.name} style={styles.kbChip} onPress={() => onOpen(s)}>
          <Text style={styles.kbName}>▸ {s.name}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ConversationMessage({
  message,
  onOpenMemory,
  onOpenKnowledge,
}: {
  message: Message;
  onOpenMemory?: (m: MemoryChip) => void;
  onOpenKnowledge?: (s: KnowledgeSource) => void;
}) {
  if (message.role === 'user') {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{message.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiRow}>
      <AIOrb state="engaged" size="dot" />
      <View style={styles.aiBody}>
        <Text style={styles.aiText}>{message.text}</Text>
        {message.memory && onOpenMemory && (
          <View style={styles.attachment}>
            <MemoryLine memory={message.memory} onOpen={onOpenMemory} />
          </View>
        )}
        {message.knowledge && message.knowledge.length > 0 && onOpenKnowledge && (
          <KnowledgeRow sources={message.knowledge} onOpen={onOpenKnowledge} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: {
    alignSelf: 'flex-end',
    maxWidth: '80%',
    marginLeft: spacing.xl,
  },
  userBubble: {
    backgroundColor: 'rgba(139,92,246,0.15)',
    borderRadius: radii.radiusBubble,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(167,139,250,0.28)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  userText: { ...type.body, color: '#EFEAFB' },
  aiRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingLeft: spacing.xs,
  },
  aiBody: { flex: 1, gap: spacing.sm },
  aiText: { ...type.body, color: colors.textSecondaryBright, lineHeight: 24 },
  attachment: { marginTop: spacing.xs },
  memoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    height: 32,
    borderRadius: radii.radiusChip,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  memoryText: { ...type.bodySmall, color: colors.textSecondary },
  memoryCaret: { ...type.bodySmall, color: colors.textMuted },
  kbRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  kbChip: {
    height: 32,
    borderRadius: radii.radiusChip,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
  },
  kbName: { ...type.metadata, color: colors.textSecondary },
});
