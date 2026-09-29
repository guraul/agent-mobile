import { describe, expect, it } from "vitest";
import {
  extractDiffText,
  langFromPath,
  looksLikeDiff,
  parseDiff,
} from "./tool-diff";

const SAMPLE_DIFF = `diff --git a/src/auth/login.ts b/src/auth/login.ts
index 3f2a1b..9c8d7e 100644
--- a/src/auth/login.ts
+++ b/src/auth/login.ts
@@ -1,4 +1,5 @@
 async function login(form) {
-  redirect('/dashboard')
-  return api.login(form)
+  const res = await api.login(form)
+  if (!res.ok) return showError(res)
+  redirect('/dashboard')
 }
`;

describe("looksLikeDiff", () => {
  it("识别 diff --git 头 / 裸 hunk / 工具输出正文", () => {
    expect(looksLikeDiff(SAMPLE_DIFF)).toBe(true);
    expect(looksLikeDiff("@@ -1,2 +1,3 @@\n-a\n+b")).toBe(true);
    expect(looksLikeDiff("Wrote file successfully.")).toBe(false);
    expect(looksLikeDiff("")).toBe(false);
  });
});

describe("extractDiffText", () => {
  it("优先取 metadata.diff（opencode edit/write 约定字段）", () => {
    expect(
      extractDiffText({
        tool: "edit",
        output: "Edit applied successfully.",
        metadata: { diff: SAMPLE_DIFF, filepath: "/root/x.ts" },
      })
    ).toBe(SAMPLE_DIFF);
  });

  it("metadata 无 diff 而 output 是 diff 时取 output", () => {
    expect(extractDiffText({ tool: "patch", output: SAMPLE_DIFF })).toBe(SAMPLE_DIFF);
  });

  it("非 diff 输出返回 undefined（不渲染代码卡）", () => {
    expect(extractDiffText({ tool: "write", output: "Wrote file successfully." })).toBeUndefined();
    expect(extractDiffText({ tool: "bash", output: "total 0" })).toBeUndefined();
    expect(extractDiffText({ tool: "read" })).toBeUndefined();
  });
});

describe("parseDiff", () => {
  it("解析标准 unified diff：文件路径 / 增删统计 / 行类型", () => {
    const d = parseDiff(SAMPLE_DIFF);
    expect(d).not.toBeNull();
    expect(d!.file).toBe("src/auth/login.ts");
    expect(d!.additions).toBe(3);
    expect(d!.deletions).toBe(2);
    expect(d!.lines.map((l) => l.type)).toEqual([
      "meta", "meta", "meta", "meta", "hunk",
      "context", "del", "del", "add", "add", "add", "context", "context",
    ]);
    expect(d!.lines[6]).toEqual({ type: "del", text: "  redirect('/dashboard')" });
    expect(d!.lines[8]).toEqual({ type: "add", text: "  const res = await api.login(form)" });
  });

  it("+++ 头缺 a/b 前缀时也取到路径；/dev/null 不覆盖 file", () => {
    const d = parseDiff("@@ -1 +1 @@\n-a\n+b\n");
    expect(d!.file).toBeUndefined();
    const d2 = parseDiff("--- /dev/null\n+++ b/new/file.ts\n@@ -0,0 +1 @@\n+hi\n");
    expect(d2!.file).toBe("new/file.ts");
  });

  it("\\ No newline 记为 meta 且不计增删", () => {
    const d = parseDiff("@@ -1 +1 @@\n-old\n\\ No newline at end of file\n+new\n");
    expect(d!.additions).toBe(1);
    expect(d!.deletions).toBe(1);
    expect(d!.lines[2].type).toBe("meta");
  });

  it("非 diff / 空 输入返回 null", () => {
    expect(parseDiff("Wrote file successfully.")).toBeNull();
    expect(parseDiff("")).toBeNull();
  });

  it("重命名 diff 取 b 侧目标路径", () => {
    const d = parseDiff('diff --git a/old.ts b/renamed.ts\n--- a/old.ts\n+++ b/renamed.ts\n@@ -1 +1 @@\n-x\n+y\n');
    expect(d!.file).toBe("renamed.ts");
  });
});

describe("langFromPath", () => {
  it("从扩展名取语言徽章值", () => {
    expect(langFromPath("/root/x/src/login.tsx")).toBe("tsx");
    expect(langFromPath("README.MD")).toBe("md");
    expect(langFromPath("no-ext")).toBe("");
  });
});
