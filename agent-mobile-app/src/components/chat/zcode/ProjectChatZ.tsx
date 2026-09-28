// Talk workspace 壳（浅色 chat.html 形态，#29）：居中 "Pulse — Chat/Code Chat" 标题 +
// 左返回 / 右 Layers（会话切换）+ Close，主体为 ChatPanelZ（白色聊天区 + inputbar）。
// 会话切换 BottomSheet 为旧暗色 sheet——#31 统一机械换肤，本批不动。
import React, { useEffect, useState, useCallback } from "react";
import { View, Pressable, StyleSheet, ScrollView } from "react-native";
import { ArrowLeft, Plus, Layers, X } from "lucide-react-native";
import { Text, Box, Button } from "../../index";
import { colors, spacing, radius, iconStroke, lightColors, lightChatSizes } from "../../../theme";
import { opencodeClient, type OpenCodeSession } from "../../../services/opencode-client";
import { ChatPanelZ } from "./ChatPanelZ";
import type { ConversationKind } from "../../../services/conversation-kind";
import type { EngagedAttentionRef } from "../../../services/attention/store";
import { BottomSheet } from "../../navigation/BottomSheet";

interface ProjectChatProps {
  projectPath: string;
  /** v0.1.1 UX correction：Talk tab 内嵌时无 back 目标 → 不渲染返回箭头 */
  onBack?: () => void;
  /** v0.1.1 correction：关闭当前会话视图（Talk → 回 Pulse；不删除会话，Layers 内仍可切回） */
  onClose?: () => void;
  /** #29 双页分流：directory 判据结果（chat=伴侣 / chatcode=工作台），决定标题形态 */
  kind?: ConversationKind;
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
export function ProjectChatZ({ projectPath, onBack, kind, attention, initialSessionId, autoSendContext, autoContextText, onClose }: ProjectChatProps) {
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
            <Pressable
              onPress={onBack}
              accessibilityLabel="Back to projects"
              accessibilityRole="button"
              testID="zcode-sheet-back"
              hitSlop={10}
              style={styles.headerBtn}
            >
              <ArrowLeft color={lightColors.ink} size={20} strokeWidth={iconStroke} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.titleWrap} pointerEvents="none">
          <Text variant="lightChatTitle" color="lightInk" numberOfLines={1}>
            {kind === "chatcode" ? "Pulse — Code Chat" : "Pulse — Chat"}
          </Text>
        </View>
        <View style={[styles.headerSide, styles.headerRight]}>
          <Pressable
            onPress={openPicker}
            accessibilityLabel="Switch session"
            accessibilityRole="button"
            hitSlop={10}
            style={styles.headerBtn}
          >
            <Layers color={lightColors.ink} size={20} strokeWidth={iconStroke} />
          </Pressable>
          {onClose ? (
            <Pressable
              onPress={onClose}
              accessibilityLabel="Close session"
              accessibilityRole="button"
              testID="zcode-session-close"
              hitSlop={10}
              style={styles.headerBtn}
            >
              <X color={lightColors.ink} size={20} strokeWidth={iconStroke} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {error ? (
        <Box margin="sm" style={styles.errorBox}>
          <Text variant="lightCaption" color="lightUpRed">{error}</Text>
        </Box>
      ) : null}

      {!ready ? (
        <Box padding="lg">
          <Text variant="lightBody" color="lightGray">Loading…</Text>
        </Box>
      ) : session ? (
        <View style={styles.flex}>
          <ChatPanelZ key={session.id} sessionID={session.id} attention={attention} autoSendContext={autoSendContext} autoContextText={autoContextText} />
        </View>
      ) : (
        <Box padding="lg" style={styles.center}>
          <Text variant="lightBody" color="lightGray">No session yet for this project.</Text>
          <Text variant="lightCaption" color="lightGray">
            Start a new conversation.
          </Text>
          <Pressable
            onPress={createAndOpen}
            accessibilityRole="button"
            accessibilityLabel="New session"
            style={styles.peachBtn}
          >
            <Plus color={lightColors.ink} size={16} strokeWidth={2} />
            <Text variant="lightBodyStrong" color="lightInk">New session</Text>
          </Pressable>
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
          {/* 老 Button 在暗色 sheet 内（#31 机械换肤时统一处理），保持暗色语言 */}
          <Button variant="primary" label="New session" icon={Plus} onPress={createAndOpen} />
        </Box>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", gap: 6 },
  // chat.html .chat-header：60px 高，标题居中，两侧操作位
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    height: lightChatSizes.headerHeight,
    paddingHorizontal: 12,
  },
  headerSide: {
    width: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    zIndex: 2,
  },
  headerRight: {
    justifyContent: "flex-end",
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  titleWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    backgroundColor: lightColors.rowGray,
    borderRadius: 8,
    padding: 10,
  },
  // chat.html .see-detail：peach 实心主行动作（chat 语言替代 violet）
  peachBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: lightColors.peach,
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
