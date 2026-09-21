/**
 * Minimal contextual stack — SHOWCASE2_VISUAL_SPEC.md §12.
 * Root = Pulse. Talk = full-screen push. Back preserves Pulse scroll.
 * No tab bar / drawer.
 */
import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Store } from '../mock/actions';
import { TalkEntry } from '../mock/types';
import { PulseScreen } from '../screens/PulseScreen';
import { TalkScreen } from '../screens/TalkScreen';
import { colors } from '../theme';

export type Route = { name: 'pulse' } | { name: 'talk'; entry: TalkEntry };

export function AppRouter({ store }: { store: Store }) {
  const [route, setRoute] = useState<Route>({ name: 'pulse' });
  // Preserve Pulse scroll offset across Talk push/pop.
  const [pulseScrollY, setPulseScrollY] = useState(0);

  const goToTalk = useCallback(
    (entry: TalkEntry) => setRoute({ name: 'talk', entry }),
    [],
  );
  const goBack = useCallback(() => setRoute({ name: 'pulse' }), []);

  return (
    <View style={styles.root}>
      {route.name === 'pulse' ? (
        <PulseScreen
          store={store}
          onOpenTalk={goToTalk}
          scrollY={pulseScrollY}
          onScrollYChange={setPulseScrollY}
        />
      ) : (
        <TalkScreen store={store} onBack={goBack} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
});
