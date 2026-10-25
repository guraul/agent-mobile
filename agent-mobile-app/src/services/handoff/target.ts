// #61（S3+S2）：移交目标目录的校验纯函数（卡片「新建项目」输入框 / 「既有项目」候选共用）。
//
// 为什么要有禁用目录：`/talk` 单路由按 session.directory **运行时**分流
// （services/conversation-kind.ts）——根目录与 market 工作区落 chat 壳，
// 移交进去就拿不到 chatcode 工作台，所以这三类目录必须在提交前拦住。
//
// 红线：纯函数、零 RN 依赖、可单测。

export const MAX_TARGET_DIRECTORY_LENGTH = 1024;

/** 进不了 chatcode 壳的目录（resolveConversationKind 会判成 chat） */
export const FORBIDDEN_TARGET_DIRECTORIES: readonly string[] = ["/", "/root/project", "/root/project/homebase"];

export type TargetValidation =
  | { ok: true; directory: string }
  | { ok: false; reason: string };

/** 去首尾空白 + 去尾部斜杠（根目录保留 `/`） */
export function normalizeDirectory(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  if (trimmed.length > 1) return trimmed.replace(/\/+$/, "");
  return trimmed;
}

/** 绝对路径 + 不含 `..` + ≤1024 + 不是禁用目录 */
export function validateTargetDirectory(raw: unknown): TargetValidation {
  const directory = normalizeDirectory(raw);
  if (!directory) return { ok: false, reason: "填一个目标目录" };
  if (!directory.startsWith("/")) return { ok: false, reason: "要用绝对路径，以 / 开头" };
  if (directory.includes("..")) return { ok: false, reason: "路径里不能带 .." };
  if (directory.length > MAX_TARGET_DIRECTORY_LENGTH) {
    return { ok: false, reason: `路径不能超过 ${MAX_TARGET_DIRECTORY_LENGTH} 个字符` };
  }
  if (FORBIDDEN_TARGET_DIRECTORIES.includes(directory)) {
    return { ok: false, reason: "这个目录进不了工作台，换一个项目目录" };
  }
  return { ok: true, directory };
}

/** 目录末段名（`/root/project/agent-mobile` → `agent-mobile`）；根目录原样回显 */
export function directoryName(directory: string): string {
  const d = normalizeDirectory(directory);
  if (!d || d === "/") return d || "/";
  const parts = d.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : d;
}
