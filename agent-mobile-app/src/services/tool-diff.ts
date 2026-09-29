// diff 解析纯函数（epic #35 / #32，数据源 = opencode 工具 part 的 patch 类输出）：
// opencode 的 edit/write 工具把 unified diff 放在 state.metadata.diff（edit 恒有，
// write 仅覆盖已存在文件时）；个别版本也走 state.output。本模块只做两件事：
//   extractDiffText —— 从工具 part 的字段里提取 diff 原文（不是 diff 返回 undefined）
//   parseDiff      —— unified diff 原文 → 结构化行 + 统计（组件渲染用）
// 红线：纯函数、零 RN 依赖、可单测；解析不碰消息数组语义（chronological 不涉此处）。

export type DiffLineType = "add" | "del" | "context" | "hunk" | "meta";

export interface DiffLine {
  type: DiffLineType;
  /** 去掉 +/-/空格 前缀后的行内容（hunk/meta 保留原文） */
  text: string;
}

export interface ParsedDiff {
  /** 从 diff --git / +++ 头解析出的文件路径（尽量取 b 侧） */
  file?: string;
  additions: number;
  deletions: number;
  lines: DiffLine[];
}

/** 看起来像 unified diff 的启发式：diff --git 头，或 @@ hunk 头（裸 hunk 也算） */
export function looksLikeDiff(text: string): boolean {
  if (!text) return false;
  if (text.startsWith("diff --git ")) return true;
  return /^@@ -\d+(,\d+)? \+\d+(,\d+)? @@/m.test(text);
}

/**
 * 从工具 part 字段提取 diff 原文。
 * 优先级：metadata.diff（opencode edit/write 的约定字段）→ output 本身像 diff。
 */
export function extractDiffText(part: {
  tool?: string;
  output?: string;
  metadata?: unknown;
}): string | undefined {
  if (part.metadata && typeof part.metadata === "object") {
    const diff = (part.metadata as { diff?: unknown }).diff;
    if (typeof diff === "string" && diff.trim()) return diff;
  }
  if (typeof part.output === "string" && looksLikeDiff(part.output)) return part.output;
  return undefined;
}

/** 语言标签（code-head 的 lang 徽章）：文件扩展名小写映射 */
export function langFromPath(path: string): string {
  const m = /\.([a-zA-Z0-9]+)$/.exec(path.trim());
  return m ? m[1].toLowerCase() : "";
}

function stripPathPrefix(p: string): string {
  // "a/src/x.ts" / "b/src/x.ts" → "src/x.ts"；带引号（含空格路径）先去引号
  const unquoted = p.replace(/^"(.*)"$/, "$1");
  return unquoted.replace(/^[ab]\//, "");
}

/**
 * 解析 unified diff。非 diff 输入返回 null（调用方据此不渲染代码卡）。
 * 容错目标：opencode edit/write 的 metadata.diff、git diff 输出、裸 hunk。
 * 不抛错——脏行按 meta 处理，统计只认 +/- 前缀行。
 */
export function parseDiff(text: string): ParsedDiff | null {
  if (!text || !looksLikeDiff(text)) return null;

  const lines: DiffLine[] = [];
  let file: string | undefined;
  let additions = 0;
  let deletions = 0;
  // 只在 hunk 体内计数（---/+++ 头与 --- 分隔线不算增删）
  let inHunk = false;

  for (const raw of text.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      inHunk = false;
      lines.push({ type: "meta", text: raw });
      // diff --git a/x b/y：取 b 侧（重命名时 b 侧是目标路径）
      const m = /^diff --git a\/(.+) b\/(.+)$/.exec(raw);
      if (m) file = stripPathPrefix(`b/${m[2]}`);
      continue;
    }
    if (raw.startsWith("+++ ")) {
      inHunk = false;
      const p = stripPathPrefix(raw.slice(4).trim());
      if (p && p !== "/dev/null") file = p;
      lines.push({ type: "meta", text: raw });
      continue;
    }
    if (raw.startsWith("--- ")) {
      inHunk = false;
      lines.push({ type: "meta", text: raw });
      continue;
    }
    if (raw.startsWith("@@ ")) {
      inHunk = true;
      lines.push({ type: "hunk", text: raw });
      continue;
    }
    if (raw.startsWith("\\ No newline at end of file")) {
      lines.push({ type: "meta", text: raw });
      continue;
    }
    if (raw.startsWith("+")) {
      if (inHunk) additions += 1;
      lines.push({ type: "add", text: raw.slice(1) });
      continue;
    }
    if (raw.startsWith("-")) {
      if (inHunk) deletions += 1;
      lines.push({ type: "del", text: raw.slice(1) });
      continue;
    }
    if (raw.startsWith(" ")) {
      lines.push({ type: "context", text: raw.slice(1) });
      continue;
    }
    // 空行 / 其余脏行：hunk 内的空行等价 context（内容为空）
    if (inHunk) lines.push({ type: "context", text: raw });
    else if (raw) lines.push({ type: "meta", text: raw });
  }

  if (!lines.length) return null;
  return { file, additions, deletions, lines };
}
