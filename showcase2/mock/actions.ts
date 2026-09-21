/**
 * Mock actions — SHOWCASE2_IMPLEMENTATION.md §11
 * Mutations on local mock state only. Each action swaps the top-level state
 * reference and notifies subscribers so React re-renders.
 */
import { ShowcaseState, TalkEntry } from './types';

export interface Store {
  state: ShowcaseState;
  subscribe: (fn: () => void) => () => void;
}

const storeSubscribers = new WeakMap<Store, Set<() => void>>();

function emit(store: Store) {
  storeSubscribers.get(store)?.forEach((fn) => fn());
}

function commit(store: Store) {
  store.state = { ...store.state };
  emit(store);
}

export function createStore(): Store {
  const store = {} as Store;
  store.state = {
    runtime: {
      presence: 'attentive',
      online: true,
      reduceMotion: false,
      hasAssignment: false,
    },
    pulse: {
      greeting: 'Good morning, Wei.',
      aiLine: 'I kept an eye on things overnight.',
      needsYou: [
        {
          id: 'ny-preview-412',
          kind: 'needs-you',
          title: 'Preview deployment #412 is blocked.',
          why: 'It blocks the 14:00 release you asked me to watch.',
          source: 'ci-runner',
          time: '12 min ago',
          reviewTarget: 'Preview deployment #412',
          status: 'open',
        },
      ],
      suggestions: [
        {
          id: 'sug-medical-etf',
          kind: 'suggestion',
          proposal: 'I think we should keep an eye on Huabao Medical ETF.',
          status: 'proposed',
          assignment: 'idle',
          context: 'Huabao Medical ETF',
          confirmLabel: 'Confirm',
        },
      ],
      noticed: [
        {
          id: 'nt-fund-decline',
          kind: 'noticed',
          fact: 'I noticed the fund estimate has declined for three trading days.',
          time: '3d',
          context: 'Fund estimate trend',
        },
        {
          id: 'nt-pricing',
          kind: 'noticed',
          fact: 'Maya referenced "pricing-v3" twice yesterday.',
          time: 'yesterday',
          context: 'pricing-v3.md',
        },
        {
          id: 'nt-backup',
          kind: 'noticed',
          fact: 'Nightly backup finished at 03:12.',
          time: '6h ago',
          context: 'Nightly backup',
        },
      ],
    },
    conversation: {
      entry: { kind: 'direct' },
      contextLabel: '',
      messages: [],
      thinking: false,
      turn: 0,
    },
  };
  store.subscribe = (fn: () => void) => {
    let set = storeSubscribers.get(store);
    if (!set) {
      set = new Set();
      storeSubscribers.set(store, set);
    }
    set.add(fn);
    return () => {
      set.delete(fn);
    };
  };
  return store;
}

/** Begin a Talk session from a Pulse entry. Preserves context + seeds AI greeting. */
export function openTalk(store: Store, entry: TalkEntry): void {
  const s = store.state;
  let contextLabel = '';
  let messages: ShowcaseState['conversation']['messages'] = [];
  const turn = s.conversation.turn;

  switch (entry.kind) {
    case 'direct':
      messages = [
        {
          id: `m-direct-0-${turn}`,
          role: 'ai',
          text: "I'm here.\n\nWhat would you like to work through?",
        },
      ];
      break;
    case 'suggestion': {
      const sug = s.pulse.suggestions.find((x) => x.id === entry.suggestionId);
      contextLabel = sug ? sug.context : 'Discussion';
      messages = [
        { id: `m-sug-0-${turn}`, role: 'ai', text: "I've been watching this one with you." },
        {
          id: `m-sug-1-${turn}`,
          role: 'ai',
          text:
            'I noticed the decline has continued across three trading days.\n\nWe can monitor it for another session before deciding whether it deserves action.',
        },
      ];
      break;
    }
    case 'noticed': {
      const n = s.pulse.noticed.find((x) => x.id === entry.noticedId);
      contextLabel = n ? n.context : 'Noticed';
      messages = [
        {
          id: `m-nt-0-${turn}`,
          role: 'ai',
          text:
            'Yes. The pattern is visible in the last three trading days.\n\nI can walk you through what might be driving it.',
          memory:
            n?.id === 'nt-fund-decline'
              ? {
                  text: 'Recalled: you prefer waiting out short momentum dips before acting.',
                  detail:
                    'You waited out a similar 3-day dip in May and it recovered within two weeks.',
                  source: 'Talk · 3 weeks ago',
                }
              : undefined,
          knowledge:
            n?.id === 'nt-pricing'
              ? [
                  {
                    name: 'pricing-v3.md',
                    excerpt:
                      'Pricing v3 revises the monthly tier: entry plan drops to 29, adds a usage-based cap. Maya referenced it in yesterday\u2019s standup.',
                  },
                ]
              : undefined,
        },
      ];
      break;
    }
    case 'needs-you': {
      const ny = s.pulse.needsYou.find((x) => x.id === entry.needsYouId);
      contextLabel = ny ? ny.reviewTarget : 'In review';
      messages = [
        {
          id: `m-ny-0-${turn}`,
          role: 'ai',
          text:
            'I flagged this one because it blocks the 14:00 release.\n\nTell me how you want to handle it.',
        },
      ];
      break;
    }
  }

  s.conversation = {
    entry,
    contextLabel,
    messages,
    thinking: false,
    turn: s.conversation.turn,
  };
  s.runtime.presence = 'engaged';
  commit(store);
}

/** Mark AI as thinking, then push a mock reply. */
export function sendMessage(store: Store, text: string): void {
  const c = store.state.conversation;
  c.messages = [
    ...c.messages,
    { id: `m-user-${Date.now()}`, role: 'user', text },
  ];
  c.thinking = true;
  c.turn += 1;
  store.state.runtime.presence = 'thinking';
  commit(store);

  const reply =
    c.entry.kind === 'suggestion'
      ? 'Got it. I\u2019ll keep watching the three-day pattern and flag it if it turns.\n\nNo action needed from you right now.'
      : c.entry.kind === 'noticed'
        ? 'Understood. I\u2019ll keep this in mind and bring it up if it becomes worth acting on.'
        : "Good. I'm on it.\n\nI'll update you here once there's something worth your attention.";

  globalThis.setTimeout(() => {
    c.messages = [...c.messages, { id: `m-ai-${Date.now()}`, role: 'ai', text: reply }];
    c.thinking = false;
    store.state.runtime.presence = 'engaged';
    commit(store);
  }, 1400);
}

/** Confirm a suggestion: proposal -> confirmed, assignment -> active. */
export function confirmSuggestion(store: Store, suggestionId: string): void {
  const sug = store.state.pulse.suggestions.find((x) => x.id === suggestionId);
  if (!sug) return;
  sug.status = 'confirmed';
  sug.assignment = 'active';
  store.state.runtime.hasAssignment = true;
  commit(store);
}

/** Defer a needs-you item (local state only). */
export function deferNeedsYou(store: Store, id: string): void {
  const ny = store.state.pulse.needsYou.find((x) => x.id === id);
  if (!ny) return;
  ny.status = 'deferred';
  commit(store);
}

/** Dismiss a suggestion locally (removed from list). */
export function dismissSuggestion(store: Store, id: string): void {
  store.state.pulse.suggestions = store.state.pulse.suggestions.filter(
    (x) => x.id !== id,
  );
  commit(store);
}

/** Reset presence to attentive when leaving Talk. */
export function resetPresence(store: Store): void {
  store.state.runtime.presence = 'attentive';
  commit(store);
}

export type { ShowcaseState, TalkEntry };
