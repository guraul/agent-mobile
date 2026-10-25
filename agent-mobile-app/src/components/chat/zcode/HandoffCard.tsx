// #61（S3+S2 / 跨仓 #61 出口③）：移交卡——气泡内白卡（摘要 + 目标 + 一个 pill 主按钮）。
//
// 形态与 #98 定时任务确认卡同构（.inner-card / .w-head / .w-act 语言），但目标段多一层
// 分段切换（新建项目 / 既有项目），**不新开页面**。
//
// 红线：
// - 颜色/字号/间距一律走 src/theme token（强制规定 5）；卡无阴影；
// - 一个 pill 主按钮（「移交到工作台」），次动作是 ghost 文字（「先不要」）；
// - 不做多轮（要追问就回全屏对话）；无计数、无 ALL CAPS、无循环动效；
// - 失败**不得静默**：error 态 + 原因 + 重试。
import React, { useCallback, useState } from "react";
import { View, Pressable, TextInput, StyleSheet } from "react-native";
import { Text } from "../../index";
import {
  lightColors,
  lightRadius,
  lightSizes,
  lightTypography,
  lightChatColors,
  spacing,
} from "../../../theme";
import {
  handoffControls,
  handoffNote,
  phaseFromHandoffError,
  supersedeHandoffPhase,
  type HandoffCardPhase,
} from "../../../services/handoff/card-phase";
import {
  directoryName,
  validateTargetDirectory,
} from "../../../services/handoff/target";
import type { HandoffPayload } from "../../../services/handoff/payload";
import type { HandoffRequest, HandoffTargetKind } from "../../../services/handoff/client";
import { opencodeClient, type OpenCodeProject } from "../../../services/opencode-client";

type Mode = HandoffTargetKind;

export function HandoffCard({
  payload,
  superseded = false,
  onHandoff,
}: {
  payload: HandoffPayload;
  /** 对话里又来了新移交卡 → 旧卡失效（「已更新」） */
  superseded?: boolean;
  /** 确认移交：建 handoff + 建工程会话 + 投首条消息 + consume + 跳 /talk（ChatPanelZ 注入） */
  onHandoff: (req: HandoffRequest) => Promise<{ sessionId: string }>;
}) {
  const [localPhase, setLocalPhase] = useState<HandoffCardPhase>({ kind: "draft" });
  const phase = supersedeHandoffPhase(localPhase, superseded);
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(payload.body);
  const [mode, setMode] = useState<Mode>("new");
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [projects, setProjects] = useState<OpenCodeProject[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const list = await opencodeClient.getProject();
      // 进不了 chatcode 壳的目录（/、/root/project、market 工作区）不出现在候选里
      setProjects(list.filter((p) => validateTargetDirectory(p.worktree).ok));
      setProjectsError(null);
    } catch (e) {
      setProjectsError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // 候选列表懒加载：切到「既有项目」才拉（不拖慢卡片首屏）；也由分段按钮触发，
  // 不用 effect——加载本就是为了响应这次点击，放点击里更直白。
  const openExisting = () => {
    setMode("existing");
    if (projects === null && !projectsError) void loadProjects();
  };

  const target = mode === "new" ? validateTargetDirectory(path) : validateTargetDirectory(selected);
  // 正文被清空同样拦住（后端 body 必填，别把空任务交出去）
  const controls = handoffControls(phase, target.ok && body.trim().length > 0);
  const note = handoffNote(phase);

  const submit = async () => {
    if (!controls.submit && !controls.retry) return;
    if (!target.ok) return;
    setLocalPhase({ kind: "submitting" });
    try {
      const res = await onHandoff({
        title: payload.title,
        body: body.trim(),
        targetKind: mode,
        targetDirectory: target.directory,
        targetName: mode === "new" ? (name.trim() || undefined) : undefined,
      });
      setLocalPhase({ kind: "done", sessionId: res.sessionId });
    } catch (e) {
      setLocalPhase(phaseFromHandoffError(e));
    }
  };

  const dismiss = () => setLocalPhase({ kind: "dismissed" });

  const locked = phase.kind !== "draft" && phase.kind !== "error";

  return (
    <View style={s.card} testID="handoff-card">
      <Text variant="lightScheduleTitle" color="lightInk">移交到工作台</Text>

      {editing ? (
        <View style={s.editWrap}>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            placeholder="要交接的目标、边界、落点"
            placeholderTextColor={lightChatColors.inputPlaceholder}
            style={s.bodyInput}
            testID="handoff-card-body-input"
            accessibilityLabel="交接内容"
          />
          <Pressable
            onPress={() => setEditing(false)}
            accessibilityRole="button"
            accessibilityLabel="收起编辑"
            testID="handoff-card-body-done"
            style={s.linkBtn}
          >
            <Text variant="lightCaption" color="lightAccentDeep">好了</Text>
          </Pressable>
        </View>
      ) : (
        <View style={s.summaryRow}>
          <Text variant="lightBody" color="lightField">{body}</Text>
          <Pressable
            onPress={() => setEditing(true)}
            disabled={locked}
            accessibilityRole="button"
            accessibilityLabel="改一下"
            testID="handoff-card-edit"
            style={[s.linkBtn, locked && s.disabled]}
          >
            <Text variant="lightCaption" color="lightAccentDeep">改一下</Text>
          </Pressable>
        </View>
      )}

      <Text variant="lightLabel" color="lightGroupLabel">目标</Text>
      <View style={s.segment} testID="handoff-card-modes">
        <Pressable
          onPress={() => setMode("new")}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel="新建项目"
          accessibilityState={{ selected: mode === "new" }}
          testID="handoff-card-mode-new"
          style={[s.segmentBtn, mode === "new" && s.segmentBtnActive]}
        >
          <Text variant="lightCaption" color={mode === "new" ? "lightInk" : "lightGray"}>新建项目</Text>
        </Pressable>
        <Pressable
          onPress={openExisting}
          disabled={locked}
          accessibilityRole="button"
          accessibilityLabel="既有项目"
          accessibilityState={{ selected: mode === "existing" }}
          testID="handoff-card-mode-existing"
          style={[s.segmentBtn, mode === "existing" && s.segmentBtnActive]}
        >
          <Text variant="lightCaption" color={mode === "existing" ? "lightInk" : "lightGray"}>既有项目</Text>
        </Pressable>
      </View>

      {mode === "new" ? (
        <View style={s.fieldWrap}>
          <TextInput
            value={path}
            onChangeText={setPath}
            editable={!locked}
            placeholder="/root/project/<repo>"
            placeholderTextColor={lightChatColors.inputPlaceholder}
            autoCapitalize="none"
            autoCorrect={false}
            style={s.input}
            testID="handoff-card-path"
            accessibilityLabel="项目路径"
          />
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!locked}
            placeholder="名称（可选，只作会话标题）"
            placeholderTextColor={lightChatColors.inputPlaceholder}
            style={s.input}
            testID="handoff-card-name"
            accessibilityLabel="会话标题"
          />
          {path.trim() && !target.ok ? (
            <Text variant="lightCaption" color="lightGray">{target.reason}</Text>
          ) : null}
        </View>
      ) : (
        <View style={s.fieldWrap} testID="handoff-card-projects">
          {projectsError ? (
            <View style={s.inlineRow}>
              <Text variant="lightCaption" color="lightGray">项目列表没读到</Text>
              <Pressable
                onPress={() => void loadProjects()}
                accessibilityRole="button"
                accessibilityLabel="重新读取项目"
                testID="handoff-card-projects-retry"
                style={s.linkBtn}
              >
                <Text variant="lightCaption" color="lightAccentDeep">重试</Text>
              </Pressable>
            </View>
          ) : projects === null ? (
            <Text variant="lightCaption" color="lightGray">正在读取项目…</Text>
          ) : projects.length === 0 ? (
            <Text variant="lightCaption" color="lightGray">还没有可用的项目目录，用「新建项目」填一个</Text>
          ) : (
            projects.map((p, i) => {
              const active = selected === p.worktree;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setSelected(p.worktree)}
                  disabled={locked}
                  accessibilityRole="radio"
                  accessibilityLabel={`${directoryName(p.worktree)} ${p.worktree}`}
                  accessibilityState={{ selected: active }}
                  testID={`handoff-card-project-${i}`}
                  style={[s.projectRow, active && s.projectRowActive]}
                >
                  <Text variant="lightBodyStrong" color="lightInk" numberOfLines={1}>
                    {directoryName(p.worktree)}
                  </Text>
                  <Text variant="lightCaption" color="lightGray" numberOfLines={1}>{p.worktree}</Text>
                </Pressable>
              );
            })
          )}
        </View>
      )}

      {phase.kind === "error" ? (
        <Text variant="lightCaption" color="lightUpRed" testID="handoff-card-error">移交失败：{phase.message}</Text>
      ) : note ? (
        <Text variant="lightCaption" color="lightGray" testID="handoff-card-note">{note}</Text>
      ) : null}

      {phase.kind === "done" || phase.kind === "dismissed" || phase.kind === "superseded" ? null : (
        <View style={s.acts}>
          {controls.retry ? (
            <Pressable
              onPress={() => void submit()}
              accessibilityRole="button"
              accessibilityLabel="重试"
              testID="handoff-card-retry"
              style={[s.act, s.actPrimary, !controls.retry && s.disabled]}
            >
              <Text variant="lightScheduleTitle" color="lightInk">重试</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => void submit()}
              disabled={!controls.submit}
              accessibilityRole="button"
              accessibilityLabel="移交到工作台"
              testID="handoff-card-submit"
              style={[s.act, s.actPrimary, !controls.submit && s.disabled]}
            >
              <Text variant="lightScheduleTitle" color="lightInk">
                {controls.busy ? "移交中…" : "移交到工作台"}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={dismiss}
            disabled={!controls.dismiss}
            accessibilityRole="button"
            accessibilityLabel="先不要"
            testID="handoff-card-dismiss"
            style={[s.act, s.actQuiet, !controls.dismiss && s.disabled]}
          >
            <Text variant="lightScheduleTitle" color="lightSubtle">先不要</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  // mock .inner-card：白底圆角，落在 AI 气泡之内（无阴影）
  card: {
    backgroundColor: lightColors.white,
    borderRadius: lightRadius.inner,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    minWidth: 0,
  },
  summaryRow: { gap: spacing.xxs },
  editWrap: { gap: spacing.xxs },
  bodyInput: {
    borderWidth: 1,
    borderColor: lightChatColors.techBorder,
    borderRadius: lightRadius.row,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 88,
    color: lightColors.fieldText,
    fontSize: lightTypography.body.fontSize,
    lineHeight: lightTypography.body.lineHeight,
    textAlignVertical: "top",
  },
  linkBtn: { alignSelf: "flex-start", paddingVertical: spacing.xxs },
  // 分段切换（新建 / 既有）
  segment: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    borderWidth: 1,
    borderColor: lightChatColors.techBorder,
    borderRadius: lightRadius.pill,
    padding: 2,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: lightSizes.chipHeight - 6,
    borderRadius: lightRadius.pill,
  },
  segmentBtnActive: { backgroundColor: lightChatColors.peachSubtle },
  fieldWrap: { gap: spacing.xxs },
  input: {
    borderWidth: 1,
    borderColor: lightChatColors.techBorder,
    borderRadius: lightRadius.row,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    color: lightColors.fieldText,
    fontSize: lightTypography.body.fontSize,
    lineHeight: lightTypography.body.lineHeight,
  },
  inlineRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  projectRow: {
    borderWidth: 1,
    borderColor: lightChatColors.techBorder,
    borderRadius: lightRadius.row,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: 2,
  },
  projectRowActive: {
    backgroundColor: lightChatColors.peachSubtle,
    borderColor: lightColors.peach,
  },
  acts: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  act: {
    height: lightSizes.chipHeight,
    borderRadius: lightRadius.pill,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  actPrimary: { backgroundColor: lightColors.peach },
  actQuiet: { backgroundColor: "transparent", paddingHorizontal: spacing.xxs },
  disabled: { opacity: 0.45 },
});
