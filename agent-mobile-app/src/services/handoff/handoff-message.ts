// #61（S3+S2）：移交后投喂给工程会话的**首条消息**模板。
//
// 目的：让 chatcode 里的 agent 一上来就知道「这是从伴侣聊天交接来的任务」、
// 任务边界在哪、落点在哪，并要求先给执行计划再动手（Tier2 语气：先问不命令）。
//
// 红线：纯函数、零 RN 依赖、可单测。

export type HandoffMessageInput = {
  /** 卡的正文：目标 / 边界 / 落点 */
  body: string;
  /** 目标目录 */
  directory: string;
  /** 来源会话 id；缺失时「交接信息」整行省略（绝不出现 undefined） */
  sourceSessionId?: string | null;
};

export function buildHandoffMessage(input: HandoffMessageInput): string {
  const lines = ["以下是伴侣聊天里交接过来的一个任务。", "", input.body.trim(), ""];
  const source = (input.sourceSessionId ?? "").trim();
  // 来源会话缺失 → 整行省略（不写半截「交接信息：；目标目录 …」）
  if (source) lines.push(`交接信息：来源会话 ${source}；目标目录 ${input.directory}`);
  lines.push("请先说明你的执行计划，再开始动手。");
  return lines.join("\n");
}
