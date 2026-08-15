import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useEffect, useState } from "react";
import { Platform, View, Text } from "react-native";
import { ErrorUtils } from "react-native/Libraries/vendor/core/ErrorUtils";

export default function RootLayout() {
  const [fatal, setFatal] = useState<string | null>(null);

  useEffect(() => {
    const show = (text: string) => setFatal(text.slice(0, 800));
    if (Platform.OS === "web") {
      const onErr = (msg: string | Event, src?: string, line?: number, col?: number, err?: Error) => {
        const text = typeof msg === "string" ? msg : msg.type ?? String(msg);
        show(`${text}\n${src ?? ""}:${line ?? ""}:${col ?? ""}\n${err?.stack ?? ""}`);
      };
      const onUnhandled = (e: PromiseRejectionEvent) => {
        show("unhandled rejection: " + String(e.reason).slice(0, 500));
      };
      window.addEventListener("error", onErr);
      window.addEventListener("unhandledrejection", onUnhandled);
      return () => {
        window.removeEventListener("error", onErr);
        window.removeEventListener("unhandledrejection", onUnhandled);
      };
    }
    const prev = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      show(`[${isFatal ? "fatal" : "error"}] ${String(error)}`);
    });
    return () => ErrorUtils.setGlobalHandler(prev);
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
