/**
 * Mock action state-transition tests.
 * Verifies Discuss leaves proposal unchanged; Confirm -> confirmed + assignment active.
 * No production state is touched.
 */
import { describe, it, expect } from 'vitest';
import {
  createStore,
  openTalk,
  sendMessage,
  confirmSuggestion,
  deferNeedsYou,
  dismissSuggestion,
} from './actions';

describe('showcase2 mock actions', () => {
  it('starts with one proposed suggestion and one open needs-you item', () => {
    const store = createStore();
    expect(store.state.pulse.suggestions[0].status).toBe('proposed');
    expect(store.state.pulse.suggestions[0].assignment).toBe('idle');
    expect(store.state.pulse.needsYou[0].status).toBe('open');
    expect(store.state.runtime.presence).toBe('attentive');
  });

  it('openTalk(suggestion) sets context label and does not confirm anything', () => {
    const store = createStore();
    const sug = store.state.pulse.suggestions[0];
    openTalk(store, { kind: 'suggestion', suggestionId: sug.id });

    expect(store.state.conversation.contextLabel).toBe(sug.context);
    expect(store.state.conversation.messages.length).toBeGreaterThan(0);
    expect(store.state.conversation.messages[0].role).toBe('ai');
    // Discuss must NOT confirm or activate.
    expect(sug.status).toBe('proposed');
    expect(sug.assignment).toBe('idle');
    expect(store.state.runtime.presence).toBe('engaged');
  });

  it('openTalk(noticed) preserves noticed context and creates no assignment', () => {
    const store = createStore();
    const noticed = store.state.pulse.noticed[0];
    openTalk(store, { kind: 'noticed', noticedId: noticed.id });

    expect(store.state.conversation.contextLabel).toBe(noticed.context);
    expect(store.state.runtime.hasAssignment).toBe(false);
  });

  it('confirmSuggestion -> proposal confirmed + assignment active', () => {
    const store = createStore();
    const sug = store.state.pulse.suggestions[0];
    confirmSuggestion(store, sug.id);

    expect(sug.status).toBe('confirmed');
    expect(sug.assignment).toBe('active');
    expect(store.state.runtime.hasAssignment).toBe(true);
  });

  it('deferNeedsYou marks item deferred', () => {
    const store = createStore();
    const ny = store.state.pulse.needsYou[0];
    deferNeedsYou(store, ny.id);
    expect(ny.status).toBe('deferred');
  });

  it('dismissSuggestion removes the suggestion', () => {
    const store = createStore();
    const sug = store.state.pulse.suggestions[0];
    dismissSuggestion(store, sug.id);
    expect(store.state.pulse.suggestions.length).toBe(0);
  });

  it('sendMessage pushes user message, sets thinking, then appends ai reply', async () => {
    const store = createStore();
    openTalk(store, { kind: 'direct' });
    const before = store.state.conversation.messages.length;

    sendMessage(store, 'hello');
    expect(store.state.conversation.messages.length).toBe(before + 1);
    expect(store.state.conversation.messages[before].role).toBe('user');
    expect(store.state.conversation.thinking).toBe(true);
    expect(store.state.runtime.presence).toBe('thinking');

    await new Promise((r) => setTimeout(r, 1500));
    expect(store.state.conversation.thinking).toBe(false);
    expect(store.state.conversation.messages.length).toBe(before + 2);
    expect(store.state.conversation.messages[before + 1].role).toBe('ai');
    expect(store.state.runtime.presence).toBe('engaged');
  });
});
