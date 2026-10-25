import { describe, expect, it } from "vitest";
import {
  FORBIDDEN_TARGET_DIRECTORIES,
  MAX_TARGET_DIRECTORY_LENGTH,
  directoryName,
  normalizeDirectory,
  validateTargetDirectory,
} from "./target";

describe("#61 移交目标目录校验", () => {
  it("普通绝对路径 → 合法", () => {
    expect(validateTargetDirectory("/root/project/agent-mobile")).toEqual({
      ok: true,
      directory: "/root/project/agent-mobile",
    });
  });

  it("相对路径 → 拒绝（以 / 开头是硬要求）", () => {
    for (const raw of ["root/project/x", "./x", "x", "~/x"]) {
      expect(validateTargetDirectory(raw).ok).toBe(false);
    }
  });

  it("含 .. → 拒绝（含目录穿越）", () => {
    expect(validateTargetDirectory("/root/project/../etc").ok).toBe(false);
    expect(validateTargetDirectory("/root/./project").ok).toBe(true);
  });

  it("禁用目录（/、/root/project、market 工作区）→ 拒绝", () => {
    for (const dir of FORBIDDEN_TARGET_DIRECTORIES) {
      const out = validateTargetDirectory(dir);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.reason).toBeTruthy();
    }
  });

  it("超长（>1024）→ 拒绝；边界 1024 通过", () => {
    const base = "/root/project/";
    const ok = base + "a".repeat(MAX_TARGET_DIRECTORY_LENGTH - base.length);
    expect(ok).toHaveLength(MAX_TARGET_DIRECTORY_LENGTH);
    expect(validateTargetDirectory(ok).ok).toBe(true);
    expect(validateTargetDirectory(`${ok}a`).ok).toBe(false);
  });

  it("空串 / 空白 / 非字符串 → 拒绝且带原因", () => {
    for (const raw of ["", "   ", null, undefined, 42]) {
      const out = validateTargetDirectory(raw);
      expect(out.ok).toBe(false);
      if (!out.ok) expect(out.reason).toBeTruthy();
    }
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
