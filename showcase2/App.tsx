/**
 * Showcase2 — Pulse / Talk single-surface AI companion prototype.
 * Entry: SafeAreaProvider -> app state -> screens.
 * No production code is imported. Local mock only.
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStore } from './mock/actions';
import { AppRouter } from './navigation/AppRouter';

export default function App() {
  const store = React.useMemo(() => createStore(), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppRouter store={store} />
    </SafeAreaProvider>
  );
}
