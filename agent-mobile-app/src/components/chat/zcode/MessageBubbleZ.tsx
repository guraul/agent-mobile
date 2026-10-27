import React, { useState } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import * as Clipboard from "expo-clipboard";
import Markdown from "react-native-markdown-display";
import { Check, Copy } from "lucide-react-native";
import { Text } from "../../index";
import { lightColors, lightChatColors, lightChatTypography, lightChatSizes, lightRadius, spacing } from "../../../theme";
import type { DisplayStep, ToolStep } from "../../../services/message-merging";
import type { AssignmentCardPayload } from "../../../services/assignment/card-payload";
import type { FromCardResponse } from "../../../services/assignment/client";
import { ThinkCard } from "./ThinkCard";
import { stripHtmlComments } from "../../../services/text-sanitize";
import { ToolGroupCard } from "./ToolGroupCard";
import { AiChatOrb } from "./AiChatOrb";
import { AssignmentConfirmCard } from "./AssignmentConfirmCard";
import { HandoffCard } from "./HandoffCard";
import type { HandoffRequest } from "../../../services/handoff/client";
import { t, useLocale } from "../../../i18n";

// 气泡排版（chat.html .bubble 基准，#29）：14.5/400 lh21，双气泡配色。
// code_inline 红线：必须显式覆盖 padding（默认 padding:10 会顶开相邻行）。
const bubbleBase = {
  fontSize: lightChatTypography.bubble.fontSize,
  lineHeight: lightChatTypography.bubble.lineHeight,
  color: lightChatColors.bubbleInk,
};

// user 气泡 markdown（米黄底）
const userMarkdown = {
  body: bubbleBase,
  paragraph: { marginVertical: 0 },
  code_inline: {
    color: lightChatColors.bubbleInk,
    backgroundColor: "rgba(13,13,13,.06)",
    padding: 0,
    lineHeight: lightChatTypography.bubble.lineHeight,
  },
};

// AI 气泡 markdown（浅灰底 #F1F1F1）
const aiMarkdown = {
  body: bubbleBase,
  heading1: { ...bubbleBase, fontSize: 17, fontWeight: "700" as const },
  heading2: { ...bubbleBase, fontSize: 16, fontWeight: "700" as const },
  heading3: { ...bubbleBase, fontSize: 15, fontWeight: "700" as const },
  code_inline: {
    color: lightChatColors.bubbleInk,
    backgroundColor: "rgba(13,13,13,.06)",
    padding: 0,
    lineHeight: lightChatTypography.bubble.lineHeight,
  },
  fence: {
    color: lightChatColors.bubbleInk,
    backgroundColor: lightColors.white,
    padding: 8,
    borderRadius: 8,
  },
  code_block: { color: lightChatColors.bubbleInk, backgroundColor: lightColors.white },
  link: { color: lightColors.accentDeep },
  paragraph: { marginVertical: 4 },
  bullet_list_icon: { color: lightColors.grayText },
};

// 气泡样式（chat.html .bubble：padding 11px 13px、radius 16、max-width 76%）
const bubbleBox = {
  maxWidth: lightChatSizes.bubbleMaxWidth,
  paddingHorizontal: lightChatSizes.bubblePadX,
  paddingVertical: lightChatSizes.bubblePadY,
  borderRadius: lightChatSizes.bubbleRadius,
} as const;

// 气泡下操作行：复制（1.5s Check 反馈）+ HH:mm 时间戳。复制 step.text 全文，
// 不受打字机 slice 影响（slice 只发生在 ChatPanelZ 的展示层）。
function Actions({ text, createdAt, align }: { text: string; createdAt: number; align: "left" | "right" }) {
  const [copied, setCopied] = useState(false);
  useLocale();
  const copy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* 剪贴板失败静默 */ }
  };
  const time = new Date(createdAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  return (
      <View style={[s.actions, align === "right" ? s.actionsRight : s.actionsLeft]}>
        <Pressable onPress={copy} accessibilityLabel={t("chat.message.copy")} style={s.actionBtn} hitSlop={6}>
          {copied ? (
            <Check color={lightColors.green} size={12} strokeWidth={2} />
          ) : (
            <Copy color={lightColors.grayText} size={12} strokeWidth={2} />
          )}
        </Pressable>
        <Text variant="lightCaption" color="lightGray">{time}</Text>
      </View>
  );
}

// user check-badge（chat.html .check-badge）：20px 圆 + 绿对勾 = 发送状态
function CheckBadge() {
  return (
    <View
      style={[
        s.badge,
        { width: lightChatSizes.badgeSize, height: lightChatSizes.badgeSize, borderRadius: lightChatSizes.badgeSize / 2 },
      ]}
    >
      <Check color={lightChatColors.greenCheck} size={11} strokeWidth={3} />
    </View>
  );
}

export const MessageBubbleZ = React.memo(function MessageBubbleZ({
  step,
  onOpenOutput,
  onConfirmAssignmentCard,
  onSupplementAssignmentCard,
  onHandoff,
  latestHandoffId,
}: {
  step: DisplayStep;
  /** #32：工具行点击 → 打开完整输出 LightSheet（sheet 在 ChatPanelZ 尾部渲染，保层叠正确） */
  onOpenOutput?: (tool: ToolStep) => void;
  /** #98：确认卡 [确认/重试] → POST /assignments/from-card（ChatPanelZ 注入） */
  onConfirmAssignmentCard?: (payload: AssignmentCardPayload) => Promise<FromCardResponse>;
  /** #98：确认卡 [补充] → 把补充文字作为新消息发回模型（ChatPanelZ 注入） */
  onSupplementAssignmentCard?: (payload: AssignmentCardPayload, text: string) => void;
  /** #61：移交卡 [移交到工作台] → 建 handoff + 工程会话 + 首条消息 + 跳 chatcode（ChatPanelZ 注入） */
  onHandoff?: (req: HandoffRequest) => Promise<{ sessionId: string }>;
  /** #61：最新一张移交卡的 step id（旧卡标「已更新」失效） */
  latestHandoffId?: string | null;
}) {
  // #32 信息层：thinking 块（think-card）+ 工具折叠组（tech-card，含 diff 代码卡）
  if (step.kind === "reasoning") {
    return <ThinkCard text={stripHtmlComments(step.text ?? "")} />;
  }
  if (step.kind === "toolGroup" || step.kind === "tool") {
    return <ToolGroupCard tools={step.kind === "toolGroup" ? step.tools : [step]} onOpenOutput={onOpenOutput} />;
  }

  // #98 定时任务确认卡：AI 气泡内白卡（非模态、不跳页，留在对话流里）
  if (step.kind === "assignmentCard") {
    return (
      <View style={s.rowAi}>
        <View style={s.orbSlot}>
          <AiChatOrb />
        </View>
        <View style={[s.bubble, bubbleBox, { backgroundColor: lightChatColors.bubbleAi, maxWidth: "92%" }]}>
          <AssignmentConfirmCard
            payload={step.payload}
            onConfirm={onConfirmAssignmentCard ?? (async () => { throw new Error("确认不可用"); })}
            onSupplement={onSupplementAssignmentCard ?? (() => {})}
          />
        </View>
      </View>
    );
  }

  // #61 移交卡：AI 气泡内白卡（摘要 + 目标 + 一个 pill 主按钮），非模态、不跳页
  if (step.kind === "handoffCard") {
    return (
      <View style={s.rowAi}>
        <View style={s.orbSlot}>
          <AiChatOrb />
        </View>
        <View style={[s.bubble, bubbleBox, { backgroundColor: lightChatColors.bubbleAi, maxWidth: "92%" }]}>
          <HandoffCard
            payload={step.payload}
            superseded={!!latestHandoffId && latestHandoffId !== step.id}
            onHandoff={onHandoff ?? (async () => { throw new Error("移交不可用"); })}
          />
        </View>
      </View>
    );
  }

  // #59 命令族回执 chip：轻量留痕（✓ 图标 + 反馈全文），取代原 showAlert 弹窗。
  // 落在消息流尾部（ChatPanelZ 的 localSteps），无需用户动手关。
  // ⚠️ 文本绝不截断：executeAssignmentCommand 的反馈是多行的（/assignments 列表条目、
  // proposal 的 `Proposal: prp_xxx` + `回复 /confirm prp_xxx 激活`），截断会丢命令链必需
  // 的 id——旧 showAlert 是全文可见的，chip 不能比它少字（#59 回归教训）。
  if (step.kind === "receipt") {
    return (
      <View style={s.receiptChip} testID="command-receipt">
        <Check color={lightChatColors.greenCheck} size={12} strokeWidth={2} />
        <View style={s.receiptTextWrap}>
          <Text variant="lightCaption" color="lightChipText">{step.text}</Text>
        </View>
      </View>
    );
  }

  // User: right-aligned cream-yellow bubble + check-badge（发送状态，chat.html msg-row.user）
  if (step.kind === "user") {
    // 零 parts 的 user 消息（历史脏数据，如 memx-refinement）：空气泡只剩 badge 悬浮，
    // 呈现层跳过（数据层 mergeMessages 过滤语义不动——换肤不换芯）
    if (!step.text.trim()) return null;
    return (
      <View style={s.rowUser}>
        <View style={[s.bubble, bubbleBox, { backgroundColor: lightChatColors.bubbleUser }]}>
          <Markdown style={userMarkdown}>{step.text}</Markdown>
        </View>
        <CheckBadge />
      </View>
    );
  }

  // Error / system intervention: semantic pill, never dressed as normal conversation.
  if (step.kind === "error") {
    return (
      <View style={s.rowAi}>
        <View style={[s.errorBox, { maxWidth: "92%" }]}>
          <Text variant="lightBody" color="lightUpRed">{step.text}</Text>
        </View>
      </View>
    );
  }

  // AI: orb avatar + 浅灰气泡（chat.html msg-row.ai；orb 底对齐气泡）
  return (
    <View style={s.rowAi}>
      <View style={s.orbSlot}>
        <AiChatOrb />
      </View>
      <View style={[s.bubble, bubbleBox, { backgroundColor: lightChatColors.bubbleAi }]}>
        {/* No fixed-height scroll container here: the typewriter reveals the
            text character by character, so the block must grow with the text. */}
        <Markdown style={aiMarkdown}>{stripHtmlComments(step.text)}</Markdown>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  // chat.html .msg-row：align-items flex-end（orb/badge 贴气泡底），gap 7
  rowUser: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: lightChatSizes.rowGap,
  },
  rowAi: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: lightChatSizes.rowGap,
  },
  bubble: {
    // maxWidth 由 bubbleBox 控制（76%）；flexShrink 保证长文本换行而不是撑破
    flexShrink: 1,
  },
  orbSlot: { justifyContent: "flex-end", paddingBottom: 2 },
  // #59 命令族回执 chip：暖杏底 + 全圆（mock .sugg-chip 语言），贴消息流左缘。
  // 多行反馈自然换行：宽度由 maxWidth 约束，高度随文本增长（不截断字符）。
  receiptChip: {
    flexDirection: "row",
    alignItems: "flex-start",
    alignSelf: "flex-start",
    gap: spacing.xs,
    maxWidth: "92%",
    backgroundColor: lightChatColors.chipWarmBg,
    borderRadius: lightRadius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  receiptTextWrap: { flexShrink: 1, minWidth: 0 },
  badge: {
    backgroundColor: lightChatColors.badge,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    flexShrink: 0,
  },
  errorBox: {
    backgroundColor: "rgba(229,72,77,.08)",
    borderLeftWidth: 3,
    borderLeftColor: lightColors.upRed,
    borderRadius: 8,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  // 用户气泡（右对齐）：复制+时间整体贴气泡右边缘，跟气泡本体对齐
  actionsRight: { alignSelf: "flex-end", paddingRight: 2 },
  // AI 气泡（左对齐）：缩进到气泡文本起点（orb 24 + gap 7）
  actionsLeft: { alignSelf: "flex-start", paddingLeft: 31 },
  actionBtn: { padding: 2 },
});
