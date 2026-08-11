import React, { useEffect, useState, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ChevronRight, MessageSquare } from "lucide-react-native";
import { Text, Box, Button } from "../index";
import { colors, spacing, iconStroke } from "../../theme";
import { opencodeClient, type OpenCodeSession } from "../../services/opencode-client";
import { ChatPanel } from "./ChatPanel";

interface ProjectChatProps {
  projectPath: string;
  onBack: () => void;
}

function byRecent(a: OpenCodeSession, b: OpenCodeSession): number {
  return (b.time?.updated ?? 0) - (a.time?.updated ?? 0);
}

/**
 * Direct chat entry for a project: opens the most recently active session,
 * or an empty chat composer when no session exists yet.
 */
export function ProjectChat({ projectPath, onBack }: ProjectChatProps) {
  const [session, setSession] = useState<OpenCodeSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolve = useCallback(async () => {
    try {
      setError(null);
      const list = await opencodeClient.listSessions(projectPath);
      const mostRecent = list.length ? [...list].sort(byRecent)[0] : null;
      setSession(mostRecent);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReady(true);
    }
  }, [projectPath]);

  useEffect(() => {
    resolve();
  }, [resolve]);

  const createAndOpen = async () => {
    try {
      setError(null);
      const created = await opencodeClient.createSession({ directory: projectPath });
      setSession(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <View style={styles.flex}>
      <View style={styles.headerRow}>
        <Pressable onPress={onBack} style={styles.backBtn} accessibilityRole="button">
          <ChevronRight
            color={colors.body}
            size={18}
            strokeWidth={iconStroke}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
          <Text variant="captionStrong" color="body" numberOfLines={1}>
            {projectPath.split("/").filter(Boolean).pop()}
          </Text>
        </Pressable>
      </View>

      {error ? (
        <Box padding="sm" backgroundColor="surface.1" rounded="md" margin="sm">
          <Text variant="caption" color="error">{error}</Text>
        </Box>
      ) : null}

      {!ready ? (
        <Box padding="lg">
          <Text variant="body" color="muted">Loading…</Text>
        </Box>
      ) : session ? (
        <View style={styles.flex}>
          <ChatPanel sessionID={session.id} />
        </View>
      ) : (
        <Box padding="lg" style={styles.center}>
          <MessageSquare color={colors.muted} size={28} strokeWidth={iconStroke} />
          <Text variant="body" color="muted">No session yet for this project.</Text>
          <Text variant="caption" color="muted">
            Start a new conversation.
          </Text>
          <Box margin="md">
            <Button
              variant="primary"
              label="New session"
              icon={MessageSquare}
              onPress={createAndOpen}
            />
          </Box>
        </Box>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.surface[3],
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    flexShrink: 1,
  },
});
