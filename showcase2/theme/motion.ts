/**
 * Motion tokens — SHOWCASE2_VISUAL_SPEC.md §8
 * Durations + easings. Loops use ease-in-out.
 */
export const motion = {
  fast: 120,
  base: 220,
  slow: 320,

  // Page push (Pulse -> Talk)
  push: 300,
  pushOffset: 0.08,

  // Item appearance stagger
  itemAppear: 220,
  itemStagger: 40,
  itemTranslateY: 10,

  // Presence breathing
  breathing: 3600,
  breathingEngaged: 2600,
  breathingRange: { opacity: [0.92, 1] as const, scale: [1, 1.07] as const },

  // Thinking dots
  thinking: 1200,

  // Interaction
  pressScale: 0.97,
  pressDuration: 120,
  sendPop: 250,

  // Contextual transition (Talk)
  composerRise: 200,
  conversationFade: 250,
  fadeOffset: 60,

  // Sheet
  sheet: 300,
} as const;

export const easing = {
  standard: [0.32, 0.72, 0, 1] as const,
  inOut: 'ease-in-out',
} as const;
