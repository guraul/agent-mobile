// #98（切片 2 / 跨仓 #60 出口②）：定时任务确认卡——气泡内白卡（规则原文 + [确认] + [补充]）。
//
// 形态参照 docs/newdesign/html/chat-widgets.html 的 .inner-card / .w-head / .w-pill / .w-act
// （由 ①②③④ 四张 inner-card 重新设计而来，**不复活** #59 退役的 dutiesCard/projectsCard 家族）。
//
// 红线：
// - 颜色/字号/间距一律走 src/theme token（强制规定 5）；
// - 卡**非模态**、不跳页、留在对话流里（轻确认，校准她理解，不是审批）；
// - 失败**不得静默**：转错误态 + 重试按钮。
import React, { useState } from "react";
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
  cardControls,
  cardNote,
  describeCardCondition,
  describeCardDomain,
  describeCardMode,
  describeCardSchedule,
  phaseFromCardError,
  phaseFromCardResponse,
  type AssignmentCardPayload,
  type AssignmentCardPhase,
} from "../../../services/assignment/card-payload";
import type { FromCardResponse } from "../../../services/assignment/client";

export function AssignmentConfirmCard({
  payload,
  onConfirm,
  onSupplement,
}: {
  payload: AssignmentCardPayload;
  /** 确认/重试（POST /assignments/from-card）；reject 时卡片转错误态 */
  onConfirm: (payload: AssignmentCardPayload) => Promise<FromCardResponse>;
  /** [补充] 提交的文字 → 作为新消息发回模型（由 ChatPanelZ 注入），本卡随即失效 */
  onSupplement: (payload: AssignmentCardPayload, text: string) => void;
}) {
  const [phase, setPhase] = useState<AssignmentCardPhase>({ kind: "ready" });
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState("");
  const controls = cardControls(phase);
  const conditionLabel = describeCardCondition(payload.condition);
  const note = cardNote(phase);

  const submit = async () => {
    if (!controls.confirm && !controls.retry) return;
    setPhase({ kind: "submitting" });
    try {
      setPhase(phaseFromCardResponse(await onConfirm(payload)));
    } catch (e) {
      setPhase(phaseFromCardError(e));
    }
  };

  const submitSupplement = () => {
    const text = draft.trim();
    if (!text) return;
    setExpanded(false);
    setDraft("");
    setPhase({ kind: "superseded" });
    onSupplement(payload, text);
  };

  return (
    <View style={s.card} testID="assignment-card">
      <View style={s.head}>
        <Text variant="lightScheduleTitle" color="lightInk">定时任务</Text>
        <View style={s.pill}>
          <Text variant="lightScheduleMeta" color="lightGreenDeep">
            {describeCardDomain(payload.domain)} · {describeCardMode(payload.mode)}
          </Text>
        </View>
      </View>

      <Text variant="lightScheduleMeta" color="lightGray">{describeCardSchedule(payload.schedule)}</Text>
      <Text variant="lightBody" color="lightField">{payload.responsibility}</Text>
      {conditionLabel ? (
        <Text variant="lightCaption" color="lightGray">命中条件：{conditionLabel}</Text>
      ) : null}

      {phase.kind === "failed" ? (
        <Text variant="lightCaption" color="lightUpRed">创建失败：{phase.message}</Text>
      ) : note ? (
        <Text variant="lightCaption" color="lightGray">{note}</Text>
      ) : null}

      <View style={s.acts}>
        {controls.retry ? (
          <Pressable
            onPress={submit}
            accessibilityRole="button"
            accessibilityLabel="重试"
            testID="assignment-card-retry"
            style={[s.act, s.actPrimary]}
          >
            <Text variant="lightScheduleTitle" color="lightInk">重试</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={submit}
            disabled={!controls.confirm}
            accessibilityRole="button"
            accessibilityLabel="确认"
            testID="assignment-card-confirm"
            style={[s.act, s.actPrimary, !controls.confirm && s.actDisabled]}
          >
            <Text variant="lightScheduleTitle" color="lightInk">
              {phase.kind === "submitting" ? "创建中…" : "确认"}
            </Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => setExpanded(true)}
          disabled={!controls.supplement}
          accessibilityRole="button"
          accessibilityLabel="补充"
          testID="assignment-card-supplement"
          style={[s.act, s.actQuiet, !controls.supplement && s.actDisabled]}
        >
          <Text variant="lightScheduleTitle" color="lightSubtle">补充</Text>
        </Pressable>
      </View>

      {expanded ? (
        <View style={s.inputWrap}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="说说要改什么"
            placeholderTextColor={lightChatColors.inputPlaceholder}
            style={s.input}
            multiline
            testID="assignment-card-input"
            accessibilityLabel="补充说明"
          />
          <View style={s.acts}>
            <Pressable
              onPress={submitSupplement}
              disabled={!draft.trim()}
              accessibilityRole="button"
              accessibilityLabel="发送补充"
              testID="assignment-card-send"
              style={[s.act, s.actPrimary, !draft.trim() && s.actDisabled]}
            >
              <Text variant="lightScheduleTitle" color="lightInk">发送</Text>
            </Pressable>
            <Pressable
              onPress={() => { setExpanded(false); setDraft(""); }}
              accessibilityRole="button"
              accessibilityLabel="取消"
              style={[s.act, s.actQuiet]}
            >
              <Text variant="lightScheduleTitle" color="lightSubtle">取消</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  // mock .inner-card：白底圆角，落在 AI 气泡之内
  card: {
    backgroundColor: lightColors.white,
    borderRadius: lightRadius.inner,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
    minWidth: 0,
  },
  // mock .w-head：标题 + 状态
  head: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  // mock .w-pill：全圆小标签
  pill: {
    backgroundColor: lightColors.greenSubtle,
    borderRadius: lightRadius.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xxs,
  },
  // mock .w-acts / .w-act
  acts: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  act: {
    height: lightSizes.chipHeight,
    borderRadius: lightRadius.pill,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  // mock .w-act.peach：主动作
  actPrimary: { backgroundColor: lightColors.peach },
  // mock .w-act.quiet：次级动作
  actQuiet: { backgroundColor: "transparent", paddingHorizontal: spacing.xxs },
  actDisabled: { opacity: 0.45 },
  inputWrap: {
    gap: spacing.xs,
    marginTop: spacing.xxs,
  },
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
});
