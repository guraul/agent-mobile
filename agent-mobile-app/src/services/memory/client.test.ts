import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildMemoryGroups } from "./client";
import type { MemoryProjection } from "./client";

// Memory client 测试：分组纯函数（User / Projects 分组，PM §6 scope 语义）。

vi.mock("../../config/opencode", () => ({ getBaseUrl: () => "http://test" }));
vi.mock("../auth", () => ({
  tokenHeader: () => ({ Authorization: "Bearer test" }),
  handleUnauthorized: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("buildMemoryGroups", () => {
  const projection: MemoryProjection = {
    source: "opencode-memx",
    user: [
      { id: "user_aaa", scope: "user", category: "沟通与交互风格", text: "先给结论再展开", date: "2026-08-06", deprecated: false, updatedAt: "2026-08-06", source: "opencode-memx", sourceRef: "USER.md" },
      { id: "user_bbb", scope: "user", category: "工具与环境偏好", text: "统一使用 pnpm", date: "2026-08-10", deprecated: false, updatedAt: "2026-08-10", source: "opencode-memx", sourceRef: "USER.md" },
    ],
    projects: [
      {
        slug: "root-project-agent-mobile",
        entries: [
          { id: "project_root-project-agent-mobile_project_showcase_deploy", scope: "project", project: "root-project-agent-mobile", title: "showcase deploy", hook: "npx serve 部署 9928", sourceRef: "~/.opencode/projects/root-project-agent-mobile/.mem/project_showcase_deploy.md", updatedAt: 1788672000000 },
        ],
      },
      {
        slug: "root-project",
        entries: [
          { id: "project_root-project_project_playwright", scope: "project", project: "root-project", title: "playwright 方案", hook: "chromium-headless-shell", sourceRef: "~/.opencode/projects/root-project/.mem/project_playwright_browser.md", updatedAt: 1788585600000 },
        ],
      },
    ],
  };

  it("User 分组在前，随后每个 project 一个分组（Memory ≠ conversation history）", () => {
    const groups = buildMemoryGroups(projection);
    expect(groups.map((g) => g.key)).toEqual(["user", "root-project-agent-mobile", "root-project"]);
    expect(groups[0]!.label).toBe("User");
    expect(groups[0]!.items).toHaveLength(2);
    // user 组条目标题是 category（preferences/working style 的语义归类）
    expect(groups[0]!.items[0]!.title).toBe("沟通与交互风格");
  });

  it("project 条目带 scope 来源（sourceRef 尾两段）与 updatedAt（ISO 日期）", () => {
    const groups = buildMemoryGroups(projection);
    const item = groups[1]!.items[0]!;
    expect(item.source).toBe(".mem/project_showcase_deploy.md");
    expect(item.updatedAtLabel).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(item.detail).toBe("npx serve 部署 9928");
  });

  it("空投影 → 无分组（不渲染空 UI 段）", () => {
    expect(buildMemoryGroups({ source: "opencode-memx", user: [], projects: [] })).toEqual([]);
  });
});
