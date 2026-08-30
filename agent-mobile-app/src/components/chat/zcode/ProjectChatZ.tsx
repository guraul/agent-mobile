// Fork of src/components/chat/ProjectChat.tsx —— ZCode 风格弹框壳：
// header 显示会话标题（副标题项目名），IconButton 化，主体为 ChatPanelZ。
// 回退开关：src/app/(tabs)/index.tsx 的 USE_ZCODE_CHAT_SHEET。
import React, { useEffect, useState, useCallback } from "react";
import { View, Pressable, StyleSheet, ScrollView } from "react-native";
import { ArrowLeft, Plus, Layers } from "lucide-react-native";
import { Text, Box, Button, IconButton } from "../../index";
import { colors, spacing, radius } from "../../../theme";
import { opencodeClient, type OpenCodeSession } from "../../../services/opencode-client";
import { ChatPanelZ } from "./ChatPanelZ";
import { BottomSheet } from "../../navigation/BottomSheet";

interface ProjectChatProps {
  projectPath: string;
  onBack: () => void;
}

function byRecent(a: OpenCodeSession, b: OpenCodeSession): number {
  return (b.time?.updated ?? 0) - (a.time?.updated ?? 0);
}

function sessionLabel(s: OpenCodeSession): string {
  return s.title?.trim() || s.id;
}

/**
 * Direct chat entry for a project: opens the most recently active session,
 * or an empty chat composer when no session exists yet.
 */
export function ProjectChatZ({ projectPath, onBack }: ProjectChatProps) {
  const [session, setSession] = useState<OpenCodeSession | null>(null);
  const [sessions, setSessions] = useState<OpenCodeSession[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const refreshSessions = useCallback(async () => {
    try {
      setPickerError(null);
      const list = await opencodeClient.listSessions(projectPath);
      setSessions([...list].sort(byRecent));
    } catch (e) {
      setPickerError(e instanceof Error ? e.message : String(e));
    }
  }, [projectPath]);

  const resolve = useCallback(async () => {
    try {
      setError(null);
      const list = await opencodeClient.listSessions(projectPath);
      const mostRecent = list.length ? [...list].sort(byRecent)[0] : null;
      setSession(mostRecent);
      setSessions([...list].sort(byRecent));
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
      setPickerError(null);
      const created = await opencodeClient.createSession({ directory: projectPath });
      await refreshSessions();
      setSession(created);
      setPickerOpen(false);
    } catch (e) {
      setPickerError(e instanceof Error ? e.message : String(e));
    }
  };

  const openPicker = () => {
    refreshSessions();
    setPickerOpen(true);
  };

  const switchTo = (s: OpenCodeSession) => {
    setSession(s);
    setPickerOpen(false);
  };

  return (
    <View style={styles.flex}>
      <View style={styles.headerRow}>
        <IconButton icon={ArrowLeft} onPress={onBack} accessibilityLabel="Back to projects" testID="zcode-sheet-back" />
        <View style={styles.titleWrap}>
          <Text variant="bodyStrong" color="ink" numberOfLines={1}>
            {session ? sessionLabel(session) : projectPath.split("/").filter(Boolean).pop()}
          </Text>
          <Text variant="caption" color="muted" numberOfLines={1}>
            {projectPath.split("/").filter(Boolean).pop()}
          </Text>
        </View>
        <IconButton icon={Layers} onPress={openPicker} accessibilityLabel="Switch session" />
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
          <ChatPanelZ key={session.id} sessionID={session.id} />
        </View>
      ) : (
        <Box padding="lg" style={styles.center}>
          <Text variant="body" color="muted">No session yet for this project.</Text>
          <Text variant="caption" color="muted">
            Start a new conversation.
          </Text>
          <Box margin="md">
            <Button
              variant="primary"
              label="New session"
              icon={Plus}
              onPress={createAndOpen}
            />
          </Box>
        </Box>
      )}

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} testID="session-picker">
        <Box padding="sm" style={styles.pickerHeader}>
          <Text variant="body" color="ink">会话</Text>
        </Box>
        <ScrollView style={styles.pickerList}>
          {pickerError ? (
            <Text variant="caption" color="error">{pickerError}</Text>
          ) : sessions.length === 0 ? (
            <Text variant="caption" color="muted">暂无会话</Text>
          ) : (
            sessions.map((s) => {
              const active = session?.id === s.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => switchTo(s)}
                  style={[styles.sessionItem, active && styles.sessionItemActive]}
                  accessibilityRole="button"
                >
                  <Text
                    variant="body"
                    color={active ? "accent" : "ink"}
                    numberOfLines={1}
                  >
                    {sessionLabel(s)}
                  </Text>
                  <Text variant="caption" color="muted">
                    {new Date(s.time?.updated ?? 0).toLocaleString()}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>
        <Box padding="sm" style={styles.pickerFooter}>
          <Button variant="primary" label="New session" icon={Plus} onPress={createAndOpen} />
        </Box>
      </BottomSheet>
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
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
    backgroundColor: colors.surface[3],
  },
  titleWrap: {
    flexShrink: 1,
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: spacing.xs,
  },
  pickerHeader: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.default,
  },
  pickerList: {
    maxHeight: 320,
  },
  pickerFooter: {
    borderTopWidth: 1,
    borderTopColor: colors.border.default,
  },
  sessionItem: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.xs,
    gap: 2,
  },
  sessionItemActive: {
    backgroundColor: colors.accent.subtle,
  },
});
