// Talk workspace 壳（Companion migration）：orb + Pulse 标题（副标题会话名），
// IconButton 化（Layers 会话切换 / Close），主体为 ChatPanelZ。
import React, { useEffect, useState, useCallback } from "react";
import { View, Pressable, StyleSheet, ScrollView } from "react-native";
import { ArrowLeft, Plus, Layers, X } from "lucide-react-native";
import { Text, Box, Button, IconButton } from "../../index";
import { AIOrb } from "../../pulse/AIOrb";
import { AIStatus } from "../../pulse/AIStatus";
import { colors, spacing, radius } from "../../../theme";
import { opencodeClient, type OpenCodeSession } from "../../../services/opencode-client";
import { ChatPanelZ } from "./ChatPanelZ";
import type { EngagedAttentionRef } from "../../../services/attention/store";
import { BottomSheet } from "../../navigation/BottomSheet";

interface ProjectChatProps {
  projectPath: string;
  /** v0.1.1 UX correction：Talk tab 内嵌时无 back 目标 → 不渲染返回箭头 */
  onBack?: () => void;
  /** v0.1.1 correction：关闭当前会话视图（Talk → 回 Pulse；不删除会话，Layers 内仍可切回） */
  onClose?: () => void;
  /** Phase 4：从 Attention 进入时携带（上下文卡 + Mark handled 入口） */
  attention?: EngagedAttentionRef;
  /** Attention 引用的既有 session —— 精确 Resume（PM §8.2/§16.4），优先于"最近会话" */
  initialSessionId?: string | null;
  /** market 类 Create 流程：新会话挂载后自动发送 Attention 上下文消息 */
  autoSendContext?: boolean;
  /** v0.1.1 通用上下文首消息（Suggested/Noticed → Talk）：透传 ChatPanelZ，无授权语义 */
  autoContextText?: string;
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
export function ProjectChatZ({ projectPath, onBack, attention, initialSessionId, autoSendContext, autoContextText, onClose }: ProjectChatProps) {
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
      const sorted = [...list].sort(byRecent);
      // Attention Resume：优先恢复 Attention 引用的那个 session（同一会话、同一上下文）。
      // Create 流程刚建的 session 可能还没出现在 listSessions（竞态）→ 构造占位对象，
      // 不回退到"最近会话"（那会把上下文发进无关会话）；
      // 仅当完全无 initialSessionId 时才用最近会话。Reconstruct 属 PM §4.2，Phase 4 不自动做。
      const preferred = initialSessionId
        ? sorted.find((x) => x.id === initialSessionId)
          ?? { id: initialSessionId, title: attention?.title, directory: projectPath, time: { created: Date.now(), updated: Date.now() } }
        : null;
      const mostRecent = preferred ?? (sorted.length ? sorted[0] : null);
      setSession(mostRecent);
      setSessions(sorted);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setReady(true);
    }
  }, [projectPath, initialSessionId]);

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
        <View style={styles.headerSide}>
          {onBack ? (
            <IconButton icon={ArrowLeft} onPress={onBack} accessibilityLabel="Back to projects" testID="zcode-sheet-back" />
          ) : null}
        </View>
        <View style={styles.titleWrap}>
          <View style={styles.headerOrb}>
            <AIOrb state={error ? "offline" : "attentive"} size="avatar" />
          </View>
          <Text variant="bodyStrong" color="ink" numberOfLines={1}>
            Pulse
          </Text>
          <AIStatus state={error ? "offline" : "attentive"} />
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>
          <IconButton icon={Layers} onPress={openPicker} accessibilityLabel="Switch session" />
          {onClose ? (
            <IconButton icon={X} onPress={onClose} accessibilityLabel="Close session" testID="zcode-session-close" />
          ) : null}
        </View>
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
          <ChatPanelZ key={session.id} sessionID={session.id} attention={attention} autoSendContext={autoSendContext} autoContextText={autoContextText} />
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
  headerSpacer: { width: 40 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(167,139,250,0.12)",
    backgroundColor: "#0B0A12",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
  },
  headerSide: {
    width: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    zIndex: 2,
  },
  headerRight: {
    justifyContent: "flex-end",
  },
  headerOrb: {
    marginBottom: 2,
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
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
