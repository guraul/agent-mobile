/**
 * Mock state architecture — SHOWCASE2_IMPLEMENTATION.md §11 / §20
 * Local, in-memory, interactive. No production state is touched.
 */

export type PresenceState =
  | 'attentive'
  | 'engaged'
  | 'thinking'
  | 'noticed'
  | 'needs-you'
  | 'offline';

export type PulseItemKind = 'needs-you' | 'suggestion' | 'noticed';

export type ProposalStatus = 'proposed' | 'confirmed';
export type AssignmentStatus = 'active' | 'idle';

export interface SourceMeta {
  source: string;
  time: string;
}

export interface NeedsYouItem {
  id: string;
  kind: 'needs-you';
  title: string;
  why: string;
  source: string;
  time: string;
  /** the action the AI is asking the user to look at */
  reviewTarget: string;
  status: 'open' | 'deferred';
}

export interface SuggestionItem {
  id: string;
  kind: 'suggestion';
  proposal: string;
  status: ProposalStatus;
  assignment: AssignmentStatus;
  /** context pinned when discussing this suggestion in Talk */
  context: string;
  confirmLabel: string;
}

export interface NoticedItem {
  id: string;
  kind: 'noticed';
  fact: string;
  time: string;
  context: string;
}

export type PulseItem = NeedsYouItem | SuggestionItem | NoticedItem;

export interface ConversationMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  /** optional contextual surfaces attached to an AI message */
  memory?: MemoryChip;
  knowledge?: KnowledgeSource[];
}

export interface MemoryChip {
  text: string;
  detail: string;
  source: string;
}

export interface KnowledgeSource {
  name: string;
  excerpt: string;
}

export type TalkEntry =
  | { kind: 'direct' }
  | { kind: 'suggestion'; suggestionId: string }
  | { kind: 'noticed'; noticedId: string }
  | { kind: 'needs-you'; needsYouId: string };

export interface Runtime {
  presence: PresenceState;
  online: boolean;
  reduceMotion: boolean;
  /** true once the user has confirmed a suggestion this session */
  hasAssignment: boolean;
}

export interface PulseState {
  greeting: string;
  aiLine: string;
  needsYou: NeedsYouItem[];
  suggestions: SuggestionItem[];
  noticed: NoticedItem[];
}

export interface ConversationState {
  entry: TalkEntry;
  contextLabel: string;
  messages: ConversationMessage[];
  /** whether the AI is currently "thinking" */
  thinking: boolean;
  /** nonce to re-trigger reply for same context */
  turn: number;
}

export interface ShowcaseState {
  runtime: Runtime;
  pulse: PulseState;
  conversation: ConversationState;
}
