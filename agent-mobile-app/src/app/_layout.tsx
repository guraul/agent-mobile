import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

export default function RootLayout() {
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    const onErr = (msg: string | Event, src?: string, line?: number, col?: number, err?: Error) => {
      const text = typeof msg === "string" ? msg : msg.type ?? String(msg);
      setFatal(`${text}\n${src ?? ""}:${line ?? ""}:${col ?? ""}\n${err?.stack ?? ""}`.slice(0, 800));
    };
    const onUnhandled = (e: PromiseRejectionEvent) => {
      setFatal("unhandled rejection: " + String(e.reason).slice(0, 500));
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  if (fatal) {
    return (
      <View style={{ flex: 1, backgroundColor: "#111", padding: 20, justifyContent: "center" }}>
        <Text style={{ color: "#f66", fontSize: 13 }}>FATAL ERROR</Text>
        <Text style={{ color: "#fcc", fontSize: 11, marginTop: 8 }}>{fatal}</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  );
}
