// 工具折叠组（#32，chatcode.html .tech-card / .code-card 基准）：
// 头部（工具名/输入摘要 + N 项徽章 + running 状态）→ 展开 per-call 行（图标 + 工具名 +
// mono 目标 + diffstat/状态）→ 行点击经 onOpenOutput 打开完整输出 LightSheet（在
// ChatPanelZ 尾部渲染，保证压在所有内容之上——LightSheet 靠渲染顺序压层）。
// patch 类工具（edit/write 的 metadata.diff）在组卡下方渲染着色 diff 代码卡（常显，对齐 mock）。
import React, { useMemo, useState } from "react";
import { View, Pressable, StyleSheet, ScrollView, Text as RNText } from "react-native";
import {
  Check,
  ChevronRight,
  FileText,
  Loader,
  Pencil,
  Search,
  Terminal,
} from "lucide-react-native";
import { lightColors, lightChatColors, lightChatSizes } from "../../../theme";
import { langFromPath, parseDiff, type ParsedDiff } from "../../../services/tool-diff";
import type { ToolStep } from "../../../services/message-merging";

const MAX_DIFF_LINES = 400;

function toolIcon(tool: string) {
  if (tool === "bash" || tool === "terminal") return Terminal;
  if (tool === "grep" || tool === "glob") return Search;
  if (tool === "edit" || tool === "write" || tool === "patch") return Pencil;
  return FileText;
}

const isRunning = (t: ToolStep) => t.status === "running" || t.status === "pending";

/* 着色 diff 代码卡（mock .code-card：深暖底 + mono 行级红绿底） */
function CodeDiffCard({ parsed }: { parsed: ParsedDiff }) {
  const lang = parsed.file ? langFromPath(parsed.file) : "";
  const shown = parsed.lines.slice(0, MAX_DIFF_LINES);
  const truncated = parsed.lines.length > MAX_DIFF_LINES;

  return (
    <View style={d.card}>
      <View style={d.head}>
        <FileText color={lightChatColors.codeHeadText} size={13} strokeWidth={2} />
        <RNText style={d.headFile} numberOfLines={1}>
          {parsed.file ?? "diff"}
        </RNText>
        {lang ? <RNText style={d.headLang}>{lang}</RNText> : null}
      </View>
      <ScrollView style={d.body} nestedScrollEnabled>
        {shown.map((line, i) => (
          <View
            key={i}
            style={[
              d.line,
              line.type === "add" && { backgroundColor: lightChatColors.codeAddBg },
              line.type === "del" && { backgroundColor: lightChatColors.codeDelBg },
            ]}
          >
            <RNText style={[d.sign, (line.type === "add" || line.type === "del") && { color: lightChatColors.codeHeadText }]}>
              {line.type === "add" ? "+" : line.type === "del" ? "−" : line.type === "hunk" ? "@" : " "}
            </RNText>
            <RNText
              style={[
                d.lineText,
                line.type === "add" && { color: lightChatColors.codeAddText },
                line.type === "del" && { color: lightChatColors.codeDelText },
                line.type === "hunk" && { color: lightChatColors.codeHeadText },
              ]}
            >
              {line.text}
            </RNText>
          </View>
        ))}
        {truncated ? (
          <RNText style={d.truncated}>… 已截断（共 {parsed.lines.length} 行）</RNText>
        ) : null}
      </ScrollView>
    </View>
  );
}

export function ToolGroupCard({
  tools,
  onOpenOutput,
}: {
  tools: ToolStep[];
  onOpenOutput?: (tool: ToolStep) => void;
}) {
  const [open, setOpen] = useState(false);
  const running = tools.some(isRunning);

  // diff 解析按组 memo（parseDiff 纯函数；脏数据 → null 不渲染卡）
  const diffs = useMemo(
    () =>
      tools
        .map((t) => (t.diffText ? { tool: t, parsed: parseDiff(t.diffText) } : null))
        .filter((x): x is { tool: ToolStep; parsed: ParsedDiff } => x !== null && x.parsed !== null),
    [tools],
  );

  const single = tools.length === 1 ? tools[0] : null;
  const headLabel = single ? single.tool : "工具调用";

  return (
    <View>
      <View style={s.card}>
        <Pressable
          onPress={() => setOpen((o) => !o)}
          style={s.head}
          accessibilityRole="button"
          accessibilityLabel={`工具调用 ${tools.length} 项`}
        >
          <View style={{ transform: [{ rotate: open ? "90deg" : "0deg" }] }}>
            <ChevronRight color="rgba(13,13,13,.45)" size={14} strokeWidth={2} />
          </View>
          <RNText style={s.headLabel} numberOfLines={1}>
            {headLabel}
            {single && (single.title || single.inputSummary) ? ` · ${single.title ?? single.inputSummary}` : ""}
          </RNText>
          <RNText style={s.badge}>{tools.length} 项</RNText>
          {running ? (
            <Loader color={lightColors.amber} size={14} strokeWidth={2} />
          ) : (
            <Check color={lightChatColors.greenCheck} size={14} strokeWidth={2.5} />
          )}
        </Pressable>

        {open
          ? tools.map((t, i) => {
              const Icon = toolIcon(t.tool);
              const target = t.title ?? t.inputSummary;
              const parsed = t.diffText ? parseDiff(t.diffText) : null;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => t.output && onOpenOutput?.(t)}
                  disabled={!t.output}
                  style={[s.row, i > 0 && s.rowDivider]}
                  accessibilityRole={t.output ? "button" : undefined}
                  accessibilityLabel={t.output ? `查看 ${t.tool} 输出` : t.tool}
                >
                  <Icon color={lightChatColors.techIcon} size={15} strokeWidth={2} />
                  <RNText style={s.rowName} numberOfLines={1}>
                    {t.tool}
                  </RNText>
                  {target ? (
                    <RNText style={s.rowTarget} numberOfLines={1}>
                      {target}
                    </RNText>
                  ) : null}
                  {parsed ? (
                    <RNText style={s.diffstat}>
                      <RNText style={{ color: lightChatColors.diffAdd }}>+{parsed.additions}</RNText>
                      {" "}
                      <RNText style={{ color: lightChatColors.diffDel }}>−{parsed.deletions}</RNText>
                    </RNText>
                  ) : null}
                  {isRunning(t) ? (
                    <Loader color={lightColors.amber} size={14} strokeWidth={2} />
                  ) : (
                    <Check color={lightChatColors.greenCheck} size={14} strokeWidth={2.5} />
                  )}
                </Pressable>
              );
            })
          : null}
      </View>

      {diffs.map(({ tool, parsed }) => (
        <CodeDiffCard key={`diff-${tool.id}`} parsed={parsed} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  // mock .tech-card：暖白底 + 细边 + radius 14
  card: {
    backgroundColor: lightChatColors.techSurface,
    borderWidth: 1,
    borderColor: lightChatColors.techBorder,
    borderRadius: lightChatSizes.techRadius,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingVertical: 7,
    paddingHorizontal: 5,
  },
  headLabel: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 18,
    color: lightChatColors.techHeadText,
  },
  badge: {
    fontSize: 10.5,
    fontWeight: "600",
    lineHeight: 15,
    color: lightColors.grayText,
    backgroundColor: lightColors.white,
    borderWidth: 1,
    borderColor: lightChatColors.techBorder,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 32,
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: "rgba(13,13,13,.06)",
  },
  rowName: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
    color: lightColors.ink,
    flexShrink: 0,
  },
  rowTarget: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: lightChatColors.techMono,
  },
  diffstat: {
    fontSize: 10.5,
    lineHeight: 15,
    flexShrink: 0,
  },
});

const d = StyleSheet.create({
  // mock .code-card：深暖底卡
  card: {
    backgroundColor: lightChatColors.codeSurface,
    borderRadius: lightChatSizes.techRadius,
    marginTop: 8,
    overflow: "hidden",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,.08)",
  },
  headFile: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: lightChatColors.codeHeadText,
  },
  headLang: {
    fontSize: 10,
    lineHeight: 14,
    color: lightChatColors.codeHeadText,
    backgroundColor: "rgba(255,255,255,.09)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: "hidden",
  },
  body: {
    maxHeight: 340,
    paddingVertical: 9,
  },
  line: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingLeft: 8,
  },
  sign: {
    width: 14,
    fontSize: 11,
    lineHeight: 19,
    color: lightChatColors.codeHeadText,
    opacity: 0.7,
  },
  lineText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 19,
    color: lightChatColors.codeText,
  },
  truncated: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 10.5,
    lineHeight: 15,
    color: lightChatColors.codeHeadText,
  },
});
