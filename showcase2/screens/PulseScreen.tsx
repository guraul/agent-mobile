/**
 * PulseScreen — V2 composition (Final Decision Lock).
 *
 *   Header (presence) → Hero (AI narrative) → Featured (one important thing)
 *   → Supporting (labels + light rows) → Noticed (borderless) → Conversation entry.
 *
 * Pulse has NO TextInput and NO Send: the bottom capsule only enters Talk.
 * Noticed opens a read-only sheet; viewing changes no product state.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type, spacing, backgroundGradient } from '../theme';
import {
  Store,
  openTalk,
  confirmSuggestion,
  dismissSuggestion,
  deferNeedsYou,
} from '../mock/actions';
import { useStore } from '../mock/useStore';
import { TalkEntry, NoticedItem } from '../mock/types';
import { AIOrb } from '../components/AIOrb';
import { AIStatus } from '../components/AIStatus';
import { FeaturedItem } from '../components/FeaturedItem';
import { SupportingList } from '../components/SupportingList';
import { PulseNoticed } from '../components/PulseNoticed';
import { ConversationEntry } from '../components/ConversationEntry';
import { DetailSheet } from '../components/DetailSheet';
import { NoticedListSheet } from '../components/NoticedListSheet';
import { TextAction } from '../components/ActionChips';
import { AnimatedEntry } from '../components/AnimatedEntry';

interface Props {
  store: Store;
  onOpenTalk: (entry: TalkEntry) => void;
  scrollY: number;
  onScrollYChange: (y: number) => void;
}

export function PulseScreen({ store, onOpenTalk, scrollY, onScrollYChange }: Props) {
  const s = useStore(store);
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [detail, setDetail] = useState<NoticedItem | null>(null);
  const [showAllNoticed, setShowAllNoticed] = useState(false);

  // Restore scroll position when returning from Talk.
  useEffect(() => {
    if (scrollY > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ y: scrollY, animated: false });
    }
  }, [scrollY]);

  const openFromEntry = (entry: TalkEntry) => {
    openTalk(store, entry);
    onOpenTalk(entry);
  };

  const hasActiveAssignment = s.pulse.suggestions.some(
    (x) => x.status === 'confirmed' && x.assignment === 'active',
  );
  const aiLine = hasActiveAssignment
    ? 'Watching Huabao Medical ETF until you decide otherwise.'
    : s.pulse.aiLine;

  const openNeedsYou = s.pulse.needsYou.filter((x) => x.status === 'open');
  const featured = openNeedsYou[0];
  const restNeedsYou = openNeedsYou.slice(1);
  const suggestions = s.pulse.suggestions;
  const noticed = s.pulse.noticed;

  // Two-line hero: split the greeting at its first comma when it has one.
  const comma = s.pulse.greeting.indexOf(',');
  const heroLine1 = comma > 0 ? s.pulse.greeting.slice(0, comma + 1) : s.pulse.greeting;
  const heroLine2 = comma > 0 ? s.pulse.greeting.slice(comma + 1).trim() : '';

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={backgroundGradient.colors}
        locations={backgroundGradient.locations}
        start={backgroundGradient.start}
        end={backgroundGradient.end}
        style={StyleSheet.absoluteFill}
      />
      {/* Top ambient violet glow — "feel the violet air", not a purple screen */}
      <LinearGradient
        colors={[colors.ambientGlow, 'transparent']}
        style={styles.topGlow}
        pointerEvents="none"
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 130 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        onScroll={(e) => onScrollYChange(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Header — presence, not profile */}
        <View style={styles.header}>
          <AIOrb state={s.runtime.presence} size="header" />
          <View style={styles.headerStack}>
            <AIStatus state={s.runtime.presence} />
            <Text style={styles.appName}>Pulse</Text>
          </View>
        </View>

        {/* Hero — AI narrative */}
        <AnimatedEntry index={0}>
          <View style={styles.hero}>
            <Text style={styles.heroLine}>{heroLine1}</Text>
            {heroLine2 !== '' && <Text style={styles.heroLine}>{heroLine2}</Text>}
            <Text style={styles.aiVoice}>{aiLine}</Text>
          </View>
        </AnimatedEntry>

        {/* Featured — the one thing that needs a decision */}
        {featured && (
          <AnimatedEntry index={1}>
            <FeaturedItem
              item={featured}
              onReview={(it) => openFromEntry({ kind: 'needs-you', needsYouId: it.id })}
              onDiscuss={(it) => openFromEntry({ kind: 'needs-you', needsYouId: it.id })}
              onDefer={(it) => deferNeedsYou(store, it.id)}
            />
          </AnimatedEntry>
        )}

        {/* Supporting — remaining Needs You + Suggested, split by semantic label */}
        <AnimatedEntry index={2}>
          <SupportingList
            needsYou={restNeedsYou}
            suggestions={suggestions}
            onReview={(it) => openFromEntry({ kind: 'needs-you', needsYouId: it.id })}
            onDiscussNeedsYou={(it) =>
              openFromEntry({ kind: 'needs-you', needsYouId: it.id })
            }
            onDefer={(it) => deferNeedsYou(store, it.id)}
            onDiscussSuggestion={(it) =>
              openFromEntry({ kind: 'suggestion', suggestionId: it.id })
            }
            onConfirm={(it) => confirmSuggestion(store, it.id)}
            onDismiss={(it) => dismissSuggestion(store, it.id)}
          />
        </AnimatedEntry>

        {/* Noticed — borderless, lowest weight; read-only detail on tap */}
        <AnimatedEntry index={3}>
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionLabel}>Noticed</Text>
              {noticed.length > 5 && (
                <TextAction label="See All" onPress={() => setShowAllNoticed(true)} />
              )}
            </View>
            <View>
              {noticed.map((item) => (
                <PulseNoticed key={item.id} item={item} onPress={setDetail} />
              ))}
            </View>
          </View>
        </AnimatedEntry>
      </ScrollView>

      {/* Conversation entry — enters Talk; it is not an input */}
      <View style={[styles.entryDock, { paddingBottom: insets.bottom }]}>
        <ConversationEntry onEnter={() => openFromEntry({ kind: 'direct' })} />
      </View>

      {/* Noticed detail — read-only; Discuss is the only way into Talk */}
      {detail && (
        <DetailSheet
          label="Noticed"
          body={detail.fact}
          meta={`${detail.context} · ${detail.time}`}
          onDiscuss={() => {
            const id = detail.id;
            setDetail(null);
            openFromEntry({ kind: 'noticed', noticedId: id });
          }}
          onClose={() => setDetail(null)}
        />
      )}

      {showAllNoticed && (
        <NoticedListSheet items={noticed} onClose={() => setShowAllNoticed(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  topGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 260,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: 24,
  },
  headerStack: { gap: 2 },
  appName: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: colors.textPrimary,
  },

  hero: { marginBottom: spacing.xxl },
  heroLine: {
    ...type.display,
    lineHeight: 39,
    color: colors.textPrimary,
  },
  aiVoice: {
    ...type.body,
    color: colors.textSecondaryBright,
    marginTop: spacing.sm,
  },

  section: { marginBottom: spacing.xxxl },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionLabel: { ...type.label, color: colors.textLabel },

  entryDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,10,18,0.9)',
  },
});
