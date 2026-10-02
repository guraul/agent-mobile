// Talk workspace 壳（浅色 chat.html 形态，#29）：居中 "Pulse — Chat/Code Chat" 标题 +
// 左返回 / 右 Layers（会话切换）+ Close，主体为 ChatPanelZ（白色聊天区 + inputbar）。
// #34F（issue #46）：chat 侧 Layers 改为唤起 SessionsDrawer（边缘手势 + 拖拽关闭），
// 替代原 LightSheet 会话选择器——避免两个会话选择 UI 并存；
// chatcode 侧维持"绑最新 session"无入口（抽屉入口待用户确认，边缘手势暂不挂）。
import React, { useEffect, useState, useCallback } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { ArrowLeft, Plus, Layers, X } from "lucide-react-native";
import { Text, Box } from "../../index";
import { SessionsDrawer } from "./SessionsDrawer";
import { iconStroke, lightColors, lightChatColors, lightChatSizes } from "../../../theme";
import { opencodeClient, type OpenCodeSession } from "../../../services/opencode-client";
import { ChatPanelZ } from "./ChatPanelZ";
import type { ConversationKind } from "../../../services/conversation-kind";
import type { EngagedAttentionRef } from "../../../services/attention/store";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
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
      setDrawerOpen(false);
    } catch (e) {
      setPickerError(e instanceof Error ? e.message : String(e));
    }
  };

  const openPicker = () => {
    refreshSessions();
    setDrawerOpen(true);
  };

  const switchTo = (s: OpenCodeSession) => {
    setSession(s);
    setDrawerOpen(false);
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
          {/* chatcode 绑项目最新 session（resume-most-recent），无会话选择器（#31）；
              chat 侧 Layers 仍是 session 列出/切换/新建的唯一 UI */}
          {kind !== "chatcode" ? (
            <Pressable
              onPress={openPicker}
              accessibilityLabel="Switch session"
              accessibilityRole="button"
              hitSlop={10}
              style={styles.headerBtn}
            >
              <Layers color={lightColors.ink} size={20} strokeWidth={iconStroke} />
            </Pressable>
          ) : null}
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

      {/* #34F：sessions 抽屉（chat 侧 Layers 唤起 + 左缘右滑手势）；
          chatcode 侧仅挂抽屉不动边缘手势、无入口——待用户确认后再开 */}
      <SessionsDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        sessions={sessions}
        activeId={session?.id ?? null}
        error={pickerError}
        onSwitch={switchTo}
        onCreate={createAndOpen}
        onGestureClose={() => setDrawerOpen(false)}
        edgeGesture={kind !== "chatcode"}
      />
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
});
