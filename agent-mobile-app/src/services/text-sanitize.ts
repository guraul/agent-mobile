// #71：AI 正文进 markdown 渲染前的净化——剥离 HTML 注释块（含跨行）。
// 背景：memx 的 STYLE_SIGNAL 信号标记（instructions 注入要求模型输出）被模型
// 原样吐进回复正文，对用户是纯噪音。只处理 assistant 展示文本，用户气泡不动。
// 围栏代码块内的 <!-- --> 是合法代码内容，不剥离。
export function stripHtmlComments(text: string): string {
  if (!text.includes("<!--")) return text;
  const lines = text.split("\n");
  const out: string[] = [];
  let inFence = false;
  let skipping = false;
  for (const line of lines) {
    const fence = line.trimStart().startsWith("```");
    if (fence) inFence = !inFence;
    if (inFence) {
      out.push(line);
      continue;
    }
    if (skipping) {
      if (line.includes("-->")) skipping = false;
      continue;
    }
    if (line.includes("<!--")) {
      const before = line.slice(0, line.indexOf("<!--"));
      if (line.includes("-->")) {
        const after = line.slice(line.indexOf("-->") + 3);
        const merged = before + after;
        if (merged.trim()) out.push(merged);
        continue;
      }
      if (before.trim()) out.push(before);
      skipping = true;
      continue;
    }
    out.push(line);
  }
  // 展示层净化：顺带裁掉尾部空白（剥注释后常残留空行）
  return out.join("\n").trimEnd();
}
