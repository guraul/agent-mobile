import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { Text, Box, Button, StatusDot, IconButton } from "@/components";
import { AIOrb } from "@/components/pulse/AIOrb";
import { AIStatus } from "@/components/pulse/AIStatus";
import { colors, spacing } from "@/theme";
import { opencodeClient, type OpenCodeSession } from "@/services/opencode-client";
import { loadToken } from "@/services/auth";
import { classifyRuntimeFailure, runtimeFailureMessage } from "@/services/runtime-presence";
import { ProjectChatZ } from "@/components/chat/zcode/ProjectChatZ";
import type { EngagedAttentionRef } from "@/services/attention/store";

// Talk stack route（v0.1.1 UX correction / Companion migration）：/talk 是
// contextual conversation workspace，不再是 top-level tab。
// 进入即处于当前/默认 Agent Session：有最近 session → Resume；没有 → 直接创建并进入。
// session 的列出/切换/新建完全由 ProjectChatZ 的 Layers picker 承载（OpenCode 原生能力，零重复 IA）。
// Contextual Talk（Attention/Suggested/Noticed）通过 route params 进入同一 workspace：
//   sessionId+projectPath → 精确 Resume；attId* → Attention 上下文卡 + Mark handled；
//   autoContextText → 对话开场（Suggested/Noticed/Sources，无授权语义）。

interface ActiveConversation {
  sessionId?: string;
  projectPath: string;
  attention?: EngagedAttentionRef;
  autoSendContext?: boolean;
  autoContextText?: string;
}

export default function TalkScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    sessionId?: string; projectPath?: string; autoContextText?: string;
    attId?: string; attTitle?: string; attSummary?: string; attSubjectId?: string; attState?: string;
    autoSendContext?: string;
  }>();
  const [active, setActive] = useState<ActiveConversation | null>(null);
  const [booting, setBooting] = useState(true);
  const [failureKind, setFailureKind] = useState<ReturnType<typeof classifyRuntimeFailure> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const boot = useCallback(async () => {
    setBooting(true);
    try {
      await loadToken();
      // Contextual 入口（Pulse/Attention 带 params）→ 直接落到目标会话，
      // 但先校验 pinned session 是否仍然存在（runtime 崩溃/重启可能吃掉会话 → 404）
      if (params.sessionId) {
        try {
          const s = await opencodeClient.getSession(params.sessionId);
          setActive({
            sessionId: params.sessionId,
            projectPath: params.projectPath || s.directory || "/",
            attention: params.attId
              ? { id: params.attId, title: params.attTitle ?? "", summary: params.attSummary ?? "", subjectId: params.attSubjectId ?? "", state: (params.attState ?? "open") as EngagedAttentionRef["state"], sessionId: params.sessionId }
              : undefined,
            autoSendContext: params.autoSendContext === "1",
            autoContextText: params.autoContextText,
          });
          setFailureKind(null);
          return;
        } catch (e) {
          const kind = classifyRuntimeFailure(e);
          if (kind === "opencode-offline" || kind === "bff-offline") {
            // runtime 不可用 → offline 态（Retry 重新 boot）
            setError(e instanceof Error ? e.message : String(e));
            setFailureKind(kind);
            return;
          }
          // 404/会话已丢失 → 逃生口：降级到默认会话，而不是钉死在错误态
          Alert.alert("原会话已不存在", "该会话已丢失（agent runtime 可能重启过）。已切换到最近的会话。");
        }
      }
      if (params.projectPath) {
        // 项目卡入口：ProjectChatZ 自会解析该项目最近 session（或给出 New session 空态）
        setActive({ projectPath: params.projectPath, autoContextText: params.autoContextText });
        setFailureKind(null);
        return;
      }
      // 裸进入 Talk（Conversation Entry / Sources ASK）：当前/默认 session = 全局最近；
      // 没有 → 直接创建（PM §8.1 Direct Talk）。autoContextText 作为开场消息透传。
      const list = await opencodeClient.listSessions();
      const sorted: OpenCodeSession[] = [...list].sort((a, b) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0));
      if (sorted.length > 0) {
        setActive({ sessionId: sorted[0].id, projectPath: sorted[0].directory || "/", autoContextText: params.autoContextText });
      } else {
        const created = await opencodeClient.createSession({ directory: "/" });
        setActive({ sessionId: created.id, projectPath: created.directory || "/", autoContextText: params.autoContextText });
      }
      setFailureKind(null);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setFailureKind(classifyRuntimeFailure(e));
    } finally {
      setBooting(false);
    }
  }, [params.sessionId, params.projectPath, params.autoContextText, params.attId, params.attTitle, params.attSummary, params.attSubjectId, params.attState, params.autoSendContext]);

  useEffect(() => { boot(); }, [boot]);

  // Talk is a stack route (no longer a tab): closing must never strand the user.
  const close = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }, [router]);

  if (active) {
    return (
      <View style={s.screen}>
        <ProjectChatZ
          key={`${active.sessionId ?? "project"}-${active.projectPath}`}
          projectPath={active.projectPath}
          initialSessionId={active.sessionId ?? null}
          attention={active.attention}
          autoSendContext={active.autoSendContext}
          autoContextText={active.autoContextText}
          onClose={close}
        />
      </View>
    );
  }

  const offline = failureKind === "opencode-offline";
  const bffDown = failureKind === "bff-offline";
  const failMsg = failureKind ? runtimeFailureMessage(failureKind) : null;

  return (
    <View style={s.screen}>
      <View style={s.header}>
        <IconButton icon={ArrowLeft} onPress={close} accessibilityLabel="Back to Pulse" testID="talk-back" />
        <View testID="talk-orb"><AIOrb state={offline ? "offline" : "attentive"} size="header" /></View>
        <View style={s.headerText}>
          <View testID="talk-status"><AIStatus state={offline ? "offline" : "attentive"} /></View>
          <Text variant="title" color="ink">Pulse</Text>
        </View>
      </View>
      <View style={s.centerWrap}>
        {failMsg ? (
          <Box padding="sm" backgroundColor="surface.1" rounded="md" testID="talk-offline">
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.xs }}>
              <StatusDot status="error" size={8} accessibilityLabel="AI offline" />
              <Text variant="bodyStrong" color="ink">{failMsg.title}</Text>
            </View>
            <Text variant="caption" color="muted">{failMsg.body}</Text>
            <Box marginTop="sm">
              <Button variant="secondary" label="Retry" icon={RefreshCw} onPress={boot} testID="talk-retry" />
            </Box>
          </Box>
        ) : (
          <Box padding="lg">
            <Text variant="body" color="muted" testID="talk-loading">
              {booting ? "Loading…" : (error ?? "")}
            </Text>
          </Box>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerText: { flex: 1, gap: 2 },
  centerWrap: { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
});
