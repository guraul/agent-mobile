import React, { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, Alert, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { Text } from "@/components";
import { LightPresenceDot } from "@/components/pulse/LightAtoms";
import { iconStroke, lightColors } from "@/theme";
import { spacing } from "@/theme";
import { opencodeClient, type OpenCodeSession } from "@/services/opencode-client";
import { loadToken } from "@/services/auth";
import { classifyRuntimeFailure, runtimeFailureMessage } from "@/services/runtime-presence";
import { resolveConversationKind } from "@/services/conversation-kind";
import { ProjectChatZ } from "@/components/chat/zcode/ProjectChatZ";
import type { EngagedAttentionRef } from "@/services/attention/store";

// Talk stack route（v0.1.1 UX correction / Companion migration）：/talk 是
// contextual conversation workspace，不再是 top-level tab。
// 进入即处于当前/默认 Agent Session：有最近 session → Resume；没有 → 直接创建并进入。
// Contextual Talk（Attention/Suggested/Noticed）通过 route params 进入同一 workspace：
//   sessionId+projectPath → 精确 Resume；attId* → Attention 上下文卡 + Mark handled；
//   autoContextText → 对话开场（Suggested/Noticed/Sources，无授权语义）。
//
// 双页分流（epic #35 C1，2026-09-28 拍板）：单路由 /talk，进页后按会话 directory
// 运行时分流——绑项目 → chatcode 工作台，market/无项目 → chat 伴侣页。
// route params 全兼容（判据在运行时，不在跳转前），e2e 零改动。

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
    // 分流判据（C1）：directory 是 session 属性，进页才知道 → 运行时判定。
    // chatcode 壳由 #31 落地；本批两支都渲染浅色 chat 形态，仅标题分流。
    const kind = resolveConversationKind(active.projectPath);
    return (
      <View style={s.screen}>
        <StatusBar style="dark" />
        <View style={s.shell}>
          <ProjectChatZ
            key={`${active.sessionId ?? "project"}-${active.projectPath}`}
            projectPath={active.projectPath}
            kind={kind}
            initialSessionId={active.sessionId ?? null}
            attention={active.attention}
            autoSendContext={active.autoSendContext}
            autoContextText={active.autoContextText}
            onClose={close}
          />
        </View>
      </View>
    );
  }

  const offline = failureKind === "opencode-offline";
  const bffDown = failureKind === "bff-offline";
  const failMsg = failureKind ? runtimeFailureMessage(failureKind) : null;

  return (
    <View style={s.screen}>
      <StatusBar style="dark" />
      <View style={s.shell}>
        <View style={s.header}>
          <Pressable
            onPress={close}
            accessibilityLabel="Back to Pulse"
            accessibilityRole="button"
            testID="talk-back"
            hitSlop={10}
            style={s.headerBtn}
          >
            <ArrowLeft color={lightColors.ink} size={20} strokeWidth={iconStroke} />
          </Pressable>
          <View testID="talk-orb" style={s.headerOrb}>
            <LightPresenceDot online={!offline} />
          </View>
          <View testID="talk-status" style={s.headerText}>
            <Text variant="lightLabel" color="lightAccentDeep">{offline || bffDown ? "Offline" : "Attentive"}</Text>
            <Text variant="lightChatTitle" color="lightInk">Pulse</Text>
          </View>
        </View>
        <View style={s.centerWrap}>
          {failMsg ? (
            <View style={s.failCard} testID="talk-offline">
              <View style={s.failTitleRow}>
                <View style={s.errorDot} />
                <Text variant="lightBodyStrong" color="lightInk">{failMsg.title}</Text>
              </View>
              <Text variant="lightCaption" color="lightGray">{failMsg.body}</Text>
              <Pressable
                onPress={boot}
                accessibilityRole="button"
                accessibilityLabel="Retry"
                testID="talk-retry"
                style={s.peachBtn}
              >
                <RefreshCw color={lightColors.ink} size={16} strokeWidth={2} />
                <Text variant="lightBodyStrong" color="lightInk">Retry</Text>
              </Pressable>
            </View>
          ) : (
            <Text variant="lightBody" color="lightGray" testID="talk-loading">
              {booting ? "Loading…" : (error ?? "")}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // 浅色 boot/offline 屏（#29）：cream 画布 + 手机壳容器（与 index/login/attention 同构）
  screen: { flex: 1, backgroundColor: lightColors.cream, alignItems: "center" },
  shell: {
    width: "100%",
    maxWidth: 480,
    flex: 1,
    backgroundColor: lightColors.cream,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerOrb: { width: 24, alignItems: "center" },
  headerText: { flex: 1, gap: 2 },
  centerWrap: { flex: 1, justifyContent: "center", padding: spacing.lg, gap: spacing.sm },
  failCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: lightColors.white,
    borderRadius: 16,
    padding: spacing.md,
    gap: 6,
  },
  failTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  errorDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: lightColors.upRed },
  peachBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 40,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: lightColors.peach,
  },
});
