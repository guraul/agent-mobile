// #61（S3+S2）：移交目标目录的校验纯函数（卡片「新建项目」输入框 / 「既有项目」候选共用）。
//
// 为什么要有禁用目录：`/talk` 单路由按 session.directory **运行时**分流
// （services/conversation-kind.ts）——根目录与 market 工作区落 chat 壳，
// 移交进去就拿不到 chatcode 工作台，所以这三类目录必须在提交前拦住。
//
// 红线：纯函数、零 RN 依赖、可单测。

import { t } from "../../i18n";

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
  if (!directory) return { ok: false, reason: t("handoff.target.empty") };
  if (!directory.startsWith("/")) return { ok: false, reason: t("handoff.target.notAbsolute") };
  if (directory.includes("..")) return { ok: false, reason: t("handoff.target.traversal") };
  if (directory.length > MAX_TARGET_DIRECTORY_LENGTH) {
    return { ok: false, reason: t("handoff.target.tooLong", { max: MAX_TARGET_DIRECTORY_LENGTH }) };
  }
  if (FORBIDDEN_TARGET_DIRECTORIES.includes(directory)) {
    return { ok: false, reason: t("handoff.target.forbidden") };
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
