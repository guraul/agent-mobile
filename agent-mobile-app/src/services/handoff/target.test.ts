import { afterEach, describe, expect, it } from "vitest";
import {
  FORBIDDEN_TARGET_DIRECTORIES,
  MAX_TARGET_DIRECTORY_LENGTH,
  directoryName,
  normalizeDirectory,
  validateTargetDirectory,
} from "./target";
import { setLocale } from "../../i18n";

describe("#61 移交目标目录校验", () => {
  afterEach(() => setLocale("en"));

  it("普通绝对路径 → 合法", () => {
    expect(validateTargetDirectory("/root/project/agent-mobile")).toEqual({
      ok: true,
      directory: "/root/project/agent-mobile",
    });
  });

  it("相对路径 → 拒绝（以 / 开头是硬要求）", () => {
    for (const raw of ["root/project/x", "./x", "x", "~/x"]) {
      expect(validateTargetDirectory(raw)).toEqual({ ok: false, reason: "Use an absolute path starting with /" });
    }
  });

  it("含 .. → 拒绝（含目录穿越）", () => {
    expect(validateTargetDirectory("/root/project/../etc")).toEqual({
      ok: false,
      reason: "Paths can't contain ..",
    });
    expect(validateTargetDirectory("/root/./project").ok).toBe(true);
  });

  it("禁用目录（/、/root/project、market 工作区）→ 拒绝", () => {
    for (const dir of FORBIDDEN_TARGET_DIRECTORIES) {
      expect(validateTargetDirectory(dir)).toEqual({
        ok: false,
        reason: "That directory can't open the workbench. Pick another project directory.",
      });
    }
  });

  it("超长（>1024）→ 拒绝；边界 1024 通过", () => {
    const base = "/root/project/";
    const ok = base + "a".repeat(MAX_TARGET_DIRECTORY_LENGTH - base.length);
    expect(ok).toHaveLength(MAX_TARGET_DIRECTORY_LENGTH);
    expect(validateTargetDirectory(ok).ok).toBe(true);
    expect(validateTargetDirectory(`${ok}a`)).toEqual({
      ok: false,
      reason: `Path can't be longer than ${MAX_TARGET_DIRECTORY_LENGTH} characters`,
    });
  });

  it("空串 / 空白 / 非字符串 → 拒绝且带原因", () => {
    for (const raw of ["", "   ", null, undefined, 42]) {
      expect(validateTargetDirectory(raw)).toEqual({ ok: false, reason: "Enter a target directory" });
    }
  });

  it("zh：校验 reason 回到原有中文", () => {
    setLocale("zh");
    expect(validateTargetDirectory("")).toEqual({ ok: false, reason: "填一个目标目录" });
    expect(validateTargetDirectory("x")).toEqual({ ok: false, reason: "要用绝对路径，以 / 开头" });
    expect(validateTargetDirectory("/a/../b")).toEqual({ ok: false, reason: "路径里不能带 .." });
    expect(validateTargetDirectory("/")).toEqual({ ok: false, reason: "这个目录进不了工作台，换一个项目目录" });
    expect(validateTargetDirectory(`/${"a".repeat(MAX_TARGET_DIRECTORY_LENGTH)}`)).toEqual({
      ok: false,
      reason: `路径不能超过 ${MAX_TARGET_DIRECTORY_LENGTH} 个字符`,
    });
  });

  it("尾部斜杠归一化（/root/project/x/ → /root/project/x）", () => {
    expect(normalizeDirectory("/root/project/x///")).toBe("/root/project/x");
    expect(normalizeDirectory("/")).toBe("/");
    expect(validateTargetDirectory("/root/project/x/")).toEqual({ ok: true, directory: "/root/project/x" });
  });

  it("禁用目录带尾斜杠同样被拦（/root/project/homebase/）", () => {
    expect(validateTargetDirectory("/root/project/homebase/").ok).toBe(false);
  });

  it("目录末段名用于候选列表展示", () => {
    expect(directoryName("/root/project/agent-mobile")).toBe("agent-mobile");
    expect(directoryName("/root/project/agent-mobile/")).toBe("agent-mobile");
    expect(directoryName("/")).toBe("/");
    expect(directoryName("")).toBe("/");
  });
});
