# test/ — Showcase2 验证脚本

Playwright 浏览器自动化（复用 `~/.claude/skills/playwright-skill/` 的依赖与 chromium-headless-shell）。

前置：9928 静态服务在跑（`systemctl start showcase2-9928`）。

| 脚本 | 用途 |
|------|------|
| `verify-9928.cjs` | 部署冒烟：打开 9928，输出首页文本并截图 |
| `v2-shots.cjs` | V2 核心流程：Pulse 顶/底、Noticed sheet、Talk 空态/回复/上下文（含断言，失败 exit 1） |
| `seeall-shots.cjs` | See All 路径（需 Noticed > 5 条）；默认 mock 3 条会 SKIP（exit 0） |

截图输出到 `/tmp/opencode/`（`OUT` 环境变量可覆盖），URL 用 `URL` 覆盖（默认 `http://127.0.0.1:9928/`）。

## 部署

```bash
cd showcase2
pnpm exec expo export --platform web --clear   # --clear 必须，避免旧 bundle
systemctl restart showcase2-9928                # gzipCache 需重启才生效
```

## See All 验证流程

1. 临时在 `mock/actions.ts` 的 `noticed` 数组补 3 条（凑到 6 条）
2. `pnpm exec expo export --platform web --clear && systemctl restart showcase2-9928`
3. `node test/seeall-shots.cjs`
4. 回退：`git checkout -- mock/actions.ts` → 重新 export + restart
