import React, { useEffect, useState, useCallback } from "react";
import { View, FlatList, Pressable, StyleSheet, Alert, Platform } from "react-native";
import { Plus, Trash2, Pencil, MessageSquare, ChevronRight } from "lucide-react-native";
import { Text, Box, IconButton, Button } from "../index";
import { colors, spacing, radius, iconStroke } from "../../theme";
import {
  opencodeClient,
  type OpenCodeSession,
} from "../../services/opencode-client";
import { ChatPanel } from "../chat/ChatPanel";
import { subscribeToOpenCodeEvents } from "../../services/opencode-events";

interface SessionPanelProps {
  projectPath: string;
}

function formatTime(ms?: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toLocaleString("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionPanel({ projectPath }: SessionPanelProps) {
  const [sessions, setSessions] = useState<OpenCodeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<OpenCodeSession | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const list = await opencodeClient.listSessions(projectPath);
      setSessions(list);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [projectPath]);

  useEffect(() => {
    load();
    const unsub = subscribeToOpenCodeEvents((event) => {
      if (["session.updated", "session.idle", "message.updated"].includes(event.type)) {
        load();
      }
    });
    return unsub;
  }, [load]);

  const create = async () => {
    try {
      const created = await opencodeClient.createSession({ directory: projectPath });
      setSessions((prev) => [created, ...prev]);
      setActiveSession(created);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const remove = (session: OpenCodeSession) => {
    if (Platform.OS === "web") {
      if (!window.confirm(`Delete session "${session.title ?? session.id}"?`)) return;
    } else {
      Alert.alert("Delete session", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => doDelete(session) },
      ]);
      return;
    }
    doDelete(session);
  };

  const doDelete = async (session: OpenCodeSession) => {
    try {
      await opencodeClient.deleteSession(session.id);
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
      if (activeSession?.id === session.id) setActiveSession(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const rename = async (session: OpenCodeSession) => {
    const next = prompt("New session title:", session.title ?? "");
    if (next == null || next.trim() === "" || next === session.title) return;
    try {
      const updated = await opencodeClient.renameSession(session.id, next.trim());
      setSessions((prev) => prev.map((s) => (s.id === session.id ? updated : s)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (activeSession) {
    return (
      <View style={styles.flex}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => setActiveSession(null)} style={styles.backBtn}>
            <ChevronRight
              color={colors.body}
              size={18}
              strokeWidth={iconStroke}
              style={{ transform: [{ rotate: "180deg" }] }}
            />
            <Text variant="captionStrong" color="body" numberOfLines={1}>
              {activeSession.title ?? "Session"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.flex}>
          <ChatPanel sessionID={activeSession.id} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <View style={styles.headerRow}>
        <Text variant="captionStrong" color="muted">
          Sessions · {projectPath.split("/").pop()}
        </Text>
        <Button
          variant="primary"
          label="New session"
          icon={Plus}
          onPress={create}
          disabled={loading}
        />
      </View>

      {error ? (
        <Box padding="sm" backgroundColor="surface.1" rounded="md" margin="sm">
          <Text variant="caption" color="error">{error}</Text>
        </Box>
      ) : null}

      {loading ? (
        <Box padding="lg">
          <Text variant="body" color="muted">Loading sessions…</Text>
        </Box>
      ) : sessions.length === 0 ? (
        <Box padding="lg" style={styles.center}>
          <Text variant="body" color="muted">No sessions yet.</Text>
          <Text variant="caption" color="muted">Create one to start a conversation.</Text>
        </Box>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.listContent}
renderItem={({ item }) => (
             <Pressable
               onPress={() => setActiveSession(item)}
               accessibilityRole="none"
               style={styles.row}
             >
              <View style={styles.rowMain}>
                <MessageSquare color={colors.body} size={18} strokeWidth={iconStroke} />
                <View style={styles.flex}>
                  <Text variant="captionStrong" color="ink" numberOfLines={1}>
                    {item.title ?? "Untitled session"}
                  </Text>
                  <Text variant="caption" color="muted">
                    {formatTime(item.time?.created)} · {item.agent ?? "build"}
                  </Text>
                </View>
              </View>
              <View style={styles.rowActions}>
                <IconButton
                  icon={Pencil}
                  onPress={() => rename(item)}
                  accessibilityLabel="Rename"
                />
                <IconButton
                  icon={Trash2}
                  onPress={() => remove(item)}
                  accessibilityLabel="Delete"
                />
                <ChevronRight color={colors.muted} size={18} strokeWidth={iconStroke} />
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center" },
  listContent: { padding: spacing.sm },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.xxs,
    backgroundColor: colors.surface[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  rowMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    flexShrink: 1,
  },
});
