# Chat 伴侣化 · 交接书（DSH → GLM ZCode）

> **交接时间**：2026-10-10
> **交出方**：DSH 主控会话（deepseek-flash）
> **接手方**：GLM ZCode
> **唯一进度权威**：`docs/pipeline/CHAT_COMPANION_BRIEF.md`（92 KB，自包含）。**本文件是"状态快照 + 操作手册"**，不替代 BRIEF；两者冲突时**以 BRIEF 为准**。
> **本文件取代** `CHAT_COMPANION_KICKOFF_PROMPT.md`（那份是 2026-10-08 的旧开工 prompt，**内含已过时的接手点，已加失效横幅，勿再使用**）。
> **配套开工 prompt**：`docs/pipeline/CHAT_COMPANION_ZCODE_PROMPT.md`（可直接整段粘贴给 ZCode 启动）。

---

## 0. 接手三件事（先做这个）

1. **读 BRIEF**：`docs/pipeline/CHAT_COMPANION_BRIEF.md`。重点顺序：
   - §2 进度总表 → 一眼看清哪七项已拍板
   - §3 已拍板决策明细（**这是所有实现的合同**，尤其 §3.2 / §3.6 / §3.7）
   - §6 执行队列（E1→E4 的依赖图与门）
   - §7 Backlog 与旧遗留
   - §8 事实备忘（**大量已探明的事实，读了能省几小时；勿重复调查**）
   - §9 沟通与协作
2. **读本文件 §6「已知陷阱」+ §7「验证手册」**——这是 DSH 这轮踩过的坑，能让你少走弯路。
3. **向用户确认"下一步做哪个"**。当前**没有正在进行的任务**：E2 被用户主动叫停、其余都在待命。**不要自己开工**，先问。

---

## 1. 一分钟摘要

**产品目标**：让 agent-mobile 的 chat 页从"工程聊天"变成"伴侣式纯聊天"——chat 背后挂一个**只读 + 产品动作**的 `companion` agent（禁 bash/edit/write），工具过程不上界面；有火花时通过三条出口切走（①记录 ②定时任务 ③切 chatcode）。

**代码现状**：

- ✅ **E3-b（#58）+ E3-c（#59）已合并并已部署上线**（PR #63 / #64），含一次**上线后回归修复**。
- ⏸️ **其余全部未开工**（E1 / E2 / E3-a / E3-d1 / E3-d2 / E4）。
- 🔴 **最大阻塞 = E1**：生产 opencode 还是 **v1.18.34**，而所有新能力（companion agent、v2 插件、exa MCP）都要 v2。E1 不只是运维动作——**v2 的 API 契约与 v1 不同，BFF 和 App 都要改**，还要迁移 **1.8 GB 数据库**。E3-a / E3-d2 / E4 都排在它后面。
- ⏸️ **E2（改名 family-finance → homebase）被用户叫停**：用户原话「可能不在 dsh 做，先停止」，随后决定**把后续工作整体移交给你**。DSH 侧留下的中间产物**已全部丢弃**（worktree 已删、分支已删、无 PR、无提交）；但**DSH 已完成的分析仍然有效，见本文件 §4.2，别重做**。

**你接手后的合理起点（我的建议，需用户拍板）**：**#57（E3-a 的客户端半边）**——不碰生产、本机可完整验证；或 **E2**（若用户确认改由你执行）。

---

## 2. 环境与仓库事实（已核实）

### 2.1 三个位置

| 位置 | 路径 | 说明 |
|---|---|---|
| 主仓 | `/Users/gubin/workspace/agent-mobile` | 公开仓 `guraul/agent-mobile`；**App 在 `agent-mobile-app/`** |
| BFF 仓 | `~/workspace/family-finance` | **私有仓，独立 git**；monorepo，`packages/web` = Next.js BFF，`packages/shared` |
| 生产服务器 | `root@106.13.181.13` | Ubuntu 24.04；三个 systemd 服务 |
| 本机 opencode 源码 | `~/workspace/opencode-src` | **tag v2.0.26** 的源码（E1/E4 的契约依据） |
| memx 插件 | `~/workspace/opencode-memx` | 本机 checkout；**生产用的是 `/root/project/opencode-memx`** |

### 2.2 生产服务（全部 systemd、开机自启）

| 服务 | 端口 | 关键路径 | 备注 |
|---|---|---|---|
| `opencode-4096.service` | `127.0.0.1:4096` | — | **v1.18.34**，仅 BFF 本机可达 |
| `bff-19234.service` | `0.0.0.0:19234` | `/root/project/family-finance/packages/web` | Next.js 生产模式 |
| `serve-9928.service` | `0.0.0.0:9928` | `/root/project/agent-mobile/agent-mobile-app` | 静态站，**releases/ + 软链**，保留最近 5 版 |
| （备用）`expo-metro-9928` | 9928 | — | **disabled**，切回 Expo Go 热重载时用 |

- **BFF CORS 只放行 9928 的三个 origin**（见 family-finance `lib/cors.ts`）→ **换端口前必须先改 CORS**。
- 线上入口：`http://106.13.181.13:9928`（Pulse 首页在 `/`；`/memory`、`/me` 都重定向到 `/`——**这是设计，不是 bug**）。
- 本地 checkout 与服务器目录：`/root/project/agent-mobile`（git checkout）与 `/root/project/agent-mobile/agent-mobile-app`（只放 `releases/` + `dist` 软链，**不是 git 仓**）。

### 2.3 工具链版本

| 项 | 本机 | 生产 |
|---|---|---|
| node | v24.21.0 | v24.21.0（CI 固定此版本） |
| pnpm | **12.6.0** | agent-mobile CI 用 `12`；family-finance CI 用 `11` |
| opencode | **v2.0.26**（`~/.opencode/bin/opencode`） | **v1.18.34** |
| gh CLI | 已登录 `guraul`，scopes 含 `repo`/`workflow`/`project` | — |

### 2.4 部署链（两仓各自独立，无 PR 级检查）

**agent-mobile → 静态站 9928**（`.github/workflows/deploy-web.yml`）

- 触发：**push 到 main**，且路径命中 `agent-mobile-app/**` 或该 workflow 文件本身。**讨论文档/根目录文件改动不触发部署。**
- 流程：`pnpm install --frozen-lockfile` → **`tsc --noEmit` + `pnpm test`（质量门就在这一步）** → `expo export --platform web --clear` → rsync 到 `releases/run-<id>-<sha>` → 切 `dist` 软链 → `systemctl restart serve-9928` → curl 验证 200。
- **`--clear` 必须保留**，否则 env 不注入。
- 回滚：`scripts/pipeline/rollback.sh`（releases 秒切）。

**family-finance → BFF 19234**（该仓 `.github/workflows/deploy.yml`）

- 触发：push 到 main，路径命中 `packages/web/**` / `pnpm-lock.yaml` / `deploy/**` / workflow 本身。
- 流程：**在 Actions 里构建**（服务器 1.9 G 内存不可靠）→ `rsync` `.next` tarball 到服务器 → 服务器 `git fetch && git reset --hard origin/main` → `pnpm install --frozen-lockfile --prod` → **最后一步**才 rsync `deploy/bff-19234.service` 到 `/etc/systemd/system/` + `daemon-reload` + `restart` + 健康检查（307/200）。
- ⚠️ **`deploy/bff-19234.service` 是"仓库即代码"，CI 每次部署都会覆盖 systemd 单元**。这条事实对 E2 至关重要（见 §4.2）。
- ⚠️ CI 用 `--frozen-lockfile` → **新增 workspace package 必须重算并提交 `pnpm-lock.yaml`**。

### 2.5 状态与凭据（**不要打印内容**）

- `~/.pulse-e2e-creds`：JSON `{"user": "...", "pass": "..."}`，e2e/探测脚本的登录凭据来源。
- 手机端**不持有 opencode 凭证**（BFF 侧持有）——这是硬规定。

---

## 3. 已完成（含证据）

### 3.1 代码

| 内容 | issue/PR | commit | 状态 |
|---|---|---|---|
| busy 真实信号替换 `sending` + 状态行三点脉动 | #58 / PR #63 | `26caf9a` | ✅ 已合并、已部署 |
| 退役 `/assignments` `/projects` 及其卡片/纯函数/单测 + chatcode Layers 入口 | #59 / PR #64 | `aeeed74` | ✅ 已合并、已部署 |
| **busy 回归修复（白名单化）** | #58 的回归 | **`0e498bf`** | ✅ 已合并、已部署、**已复测** |

### 3.2 这次上线抓到的真 bug（**务必读，含设计教训**）

**症状**：chat 页在不发消息时，「运行中…」**永久显示**。

**根因**：BFF `app/api/opencode/stream/route.ts` 每 **10 秒**发一个 `server.heartbeat`；而 `classifyBusyEvent` 原本对**未知事件一律判为 activity** → 每 10s 刷新 `lastEventAt` → **永远跨不过 20 秒的静默阈值** → 永久 busy。

**修复**：把判定方向**反转为显式白名单**——只列举真实活动事件（`delta` / `message.*` / `session.updated` / `session.created` + `question.` / `permission.` 前缀），其余（含 heartbeat）一律 `ignored`。

**复测（Chrome 模拟 Redmi K70）**：空转 30s **全程无 busy**；发消息后 **5–24s 显示、26s 起消失**（修复前是永久）。

**教训（已写进 BRIEF §3.7，实现时遵守）**：**任何"周期性连接级事件"都不得参与 busy 判定**；判定**必须用白名单**——黑名单在周期性噪音下必然退化为"永久 busy"。

### 3.3 文档

- `docs/pipeline/CHAT_COMPANION_BRIEF.md`：本轮新增/更新了 E0 探针结论、E1 契约验证与运行时实测、MCP 配置形态、E3-d 端点设计、busy 回归与教训、思考卡收敛拍板等。**最新提交 `289319e`**。
- `AGENTS.md`（根）与 `../family-finance/AGENTS.md`：规则同步。

### 3.4 git 现状（2026-10-10 交接时刻）

- agent-mobile：`main` = **`289319e`**，**已推送**，与 `origin/main` 同步。工作区只剩 4 个**与本次无关的历史 untracked 条目**（`.workbuddy/`、`node_modules/`、`package.json`、`pnpm-lock.yaml`）——**别以为是你的改动**。
- 现存 worktree：`.worktrees/31-chatcode-shell`、`.worktrees/32-chat-info-layer`、`.worktrees/test`（都是历史遗留）。
- family-finance 本地 `main`：**干净，0 ahead / 3 behind `origin/main`** → 动手前先 `git fetch origin`。
- 服务器 family-finance checkout：干净，停在 `ee54685`（落后 `origin/main`，下次部署会 `reset --hard` 补齐）。

---

## 4. 待办全景

### 4.1 issue 地图（交接时实测状态）

| issue | 状态 | 内容 | 阻塞/前置 |
|---|---|---|---|
| **#52** | OPEN | **Epic：chat 伴侣化** | — |
| **#53** | OPEN | **E1** 生产 opencode 升 v2 + model 修正 + exa MCP | **需用户开生产变更窗口** |
| **#54** | OPEN | **E2** homebase 改名迁移 | **已暂停**（见 §4.2） |
| **#55** | OPEN | E3 companion 主体（父 issue） | 子项分列 |
| **#56** | OPEN | E4 v2 插件 + 出口①（记忆写入） | E3-d2 + E2 |
| **#57** | OPEN | **E3-a** chat 页强制 `agent=companion` + 去选择器 **+ 思考卡收敛（新增）** | 生产侧依赖 **E1**；客户端半边本机可做 |
| #58 | **CLOSED** | E3-b busy 真实信号 + 状态行动效 | 已合并已部署 |
| #59 | **CLOSED** | E3-c 退役卡片 + chatcode Layers 入口 | 已合并已部署 |
| **#60** | OPEN | **E3-d1** 出口② 定时任务：NL 编译 + 确认卡 → assignment 引擎 | E0 结论；不依赖 E1 |
| **#61** | OPEN | **E3-d2** 出口③ 切 chatcode：移交卡 + BFF 两端点 + 只读回程工具 | **依赖 E1 + E3-a** |
| **#62** | OPEN | Backlog：memx 复用（DSH 共用）+ 提炼模型换 mimo 的核验与生产同步 | 非阻塞 |
| **#65** | OPEN | E3-c 遗留：`/projects` 行为变更、失败通道不一致、回执不落盘、e2e 断言弱点 | #59 收口，非阻塞 |
| **#44** | OPEN | 排队入口（busy 时加入队列）+ 排队全链路 e2e | 数据层已由 #58 铺好，只剩交互层 |
| #46 / #48 / #50 | OPEN | 抽屉、登录跳转、Dock 落壳 | **不进本 epic** |

看板：Projects board #1「Agent Mobile Delivery」（`PVT_kwHOAG-OWc4Bk11m`）。标签：`epic`、`companion`。

### 4.2 E2（已暂停，但分析成果必须保留）⚠️

**用户已叫停**，理由是"可能不在 dsh 做"。DSH 侧产物**全部丢弃**：worktree 与分支已删、**无提交、无推送、无 PR**。所以 **E2 的代码改动需要从零重做**——但下面的分析**不用重做**。

**A. agent-mobile 侧引用清单（实测共 11 行 + 8 个文档）**

```
agent-mobile-app/src/services/conversation-kind.ts:9        MARKET_TALK_DIRECTORY
agent-mobile-app/src/services/conversation-kind.test.ts:38, :48
agent-mobile-app/scripts/e2e/phase13-e2e.mjs:34,35
agent-mobile-app/scripts/e2e/phase9-e2e.mjs:37,38
agent-mobile-app/scripts/e2e/pulse-e2e.mjs:44,45, :341 (?projectPath= 编码串)
agent-mobile-app/scripts/e2e/v011-e2e.mjs:31
```
一律 `/root/project/family-finance` → `/root/project/homebase`。
知识库 8 个文件：`docs/knowledge-base/{ARCHITECTURE,OPERATIONS,API,DATA,INDEX}.md` 与 `docs/knowledge-base/modules/{router,pulse-stream,services}.md`。

> 附带事实：这 11 行**同时是"本机 e2e 跑不起来"的原因**——`agent-mobile-app/scripts/e2e/*.mjs` 里有 **17 处 `/root/...` 硬编码**（浏览器可执行路径、`.env.local` 读取路径、`projectPath`），macOS 本机跑 `pnpm e2e` **必然失败**。**改这些硬编码属于 E2 范围**（顺手改会污染别的 PR）。

**B. 服务器侧（只用 1 个文件引用！）**

- `grep -rn "family-finance" /etc/systemd/system/` → **只有 `bff-19234.service` 的 3 行**：
  - `Description=BFF (family-finance web) production server on 19234`
  - `WorkingDirectory=/root/project/family-finance/packages/web`
  - `ExecStart=/usr/bin/node /root/project/family-finance/packages/web/node_modules/next/dist/bin/next start ...`
- **无 cron、无其他脚本、无其他 service 引用**（实测）。
- `/root/project/family-finance` = **356 MB**，与根分区**同一文件系统**（`/dev/vda2`）→ **`mv` 是秒级原子操作**。
- ⭐ **`packages/web/.next` 内零绝对路径残留**（`grep -rl` 命中 **0**）→ **搬目录后不需要重新构建**。
- 服务器 checkout 的 `origin` = `git@github.com:guraul/family-finance.git`。
- **停机影响**：BFF 中断约 **5–10 秒**（一次 restart），全程约 3 分钟。

**C. ⭐ 因果顺序陷阱（搞反必炸，务必理解）**

`deploy/bff-19234.service` 是**仓库即代码**，CI 每次部署都会覆盖线上 systemd 单元；而 `deploy.yml` 是**先 `cd $REPO` / 装依赖 / 落 `.next`，最后一步才装 unit**。于是：

- **先合并 family-finance 的改名 PR** → 本次部署仍用旧路径跑完，**但最后把指向新路径的 unit 装上去** → 下次重启 BFF **直接起不来**。
- **先搬目录、不改 unit** → `Restart=on-failure` **立刻重启风暴**。

✅ **正确顺序（写死）**：

1. **同一时刻**完成：`mv /root/project/family-finance /root/project/homebase` **＋** 手工改线上 `/etc/systemd/system/bff-19234.service` 的三行 → `daemon-reload` → `restart` → 健康检查。
2. GitHub 仓改名 `guraul/family-finance` → `homebase`。
3. 服务器与本地 checkout 的 remote 指向新 URL（别只依赖 GitHub 重定向）。
4. 合并 **family-finance** PR（含 unit + workflow 路径 + `personal-context` 骨架 + lockfile）。
5. 合并 **agent-mobile** PR（11 行 + 8 文档）→ 触发 deploy-web。
6. 端到端验证 + **由用户确认页面可访问**。

**D. family-finance 侧其它要点**

- 该仓 `family-finance` 一词有 **61 处命中**，**多数是正当包名**：`@family-finance/shared`、`family-finance-cron`（Cloudflare worker）等。
  → **包 scope 是否一起改，BRIEF/issue 里都没写，必须先问用户**（DSH 已明确禁止子代理擅自改）。
  → 历史归档目录 `docs/superpowers/**` 里的引用**一律不改**。
- `personal-context` 骨架：在 `packages/` 下新增第三个 package。**新增 package 必须重算并提交 `pnpm-lock.yaml`**（CI 用 `--frozen-lockfile`，否则部署直接失败）。
- 改了 `.github/workflows/deploy.yml` 会触发该仓自己的部署（路径命中 `deploy/**` 与 workflow 自身）——**注意别让"半成品路径改动"进 main**。

### 4.3 E1（最大阻塞，先方案后执行）

见 BRIEF §8「E1 契约验证」「E1 运行时实测」与 §3.3 的任务卡。核心风险：

- **R1**：v2 **没有 v1 的旧路由**（`/session`、`/config`、`/agent`、`/global/event` 全部消失）→ **BFF + App 契约必须重写**，这不只是运维动作。
- **R2**：**数据库迁移不可逆**（1.8 GB `opencode.db`；迁移 38→49，7 张新表）。**动手前必须快照 `.db` + `-wal` + `-shm`。**
- **R3/R4**：memx 插件锁定 `@opencode-ai/plugin@1.18.12`；配置键改名（`plugin`→`plugins`、`agent`→`agents`、`provider`→`providers`）。
- **R9**：v2 事件流**易失**——`session.text.delta` **只在直播时可见**，补拉不到；`message.part.delta` 只存在于 v1 兼容层。
- v2 的关键契约（**已实测确认**）：auth = **Basic `opencode:<password>`**；`POST /api/session`（`location.directory` + `agent` + `model`）；`POST /api/session/{id}/prompt` body `{text, agents?}` → **200 立即返回**；model ref 是 `{providerID, id}`（**不是 `modelID`**）；事件 `GET /api/event`；运行中可 `POST /api/session/:id/agent|model` 切换。
- **用户已拍板**：**先升 v2 → 再配 exa MCP**；生产 App 侧 model 统一 `opencode/mimo-v2.6-flash-free`。

### 4.4 #57（E3-a）——**我建议的起点**

**目标**：把能力差异落在 **agent 配置层**，chat 页发出的消息固定 `agent=companion`（只读 + 产品动作，**禁 bash/edit/write 全家**），chatcode 侧维持现状。

**范围（issue 正文为准，2026-10-10 已扩充）**：

1. opencode 新增 `companion`（primary）agent：白名单 `read`/`grep`/`glob` + `websearch` + 产品动作工具；**显式配 `model`**；`permission` 层拒绝 bash/edit/write。
2. 客户端强制：chat 页发送时固定 `agent: "companion"`，不随 session/用户选择变化。
3. chat 侧**去掉 agent 选择器**（agent pill 循环 + `agent-sheet`），并修 `FALLBACK_AGENTS` 过滤逻辑。
4. **顺手把 `FALLBACK_AGENTS` 的过滤坑修掉**：`ChatPanelZ.tsx:77` `FALLBACK_AGENTS = [build, plan, design]`，`:448`/`:453` 用它**过滤** `listAgents()` 结果 → **不改客户端名单，服务端新建的 `companion` 永远不会出现在选择器里**。
5. **【2026-10-10 新增·用户拍板】思考卡收敛**：chat 页**不得再按 reasoning step 刷卡片**——现在一次多步推理会密集刷出多张 `{> 思考}` 虚线卡（本机实测 reasoning part **6456** > text part **3675**），与 BRIEF §3.7「UI 层工具/过程不上界面」相悖。收敛方式二选一（**折叠成单条状态行**如 `思考中…`/`已思考 N 步`，**或直接不渲染**），判准 = **不新增过程类 UI**；**chatcode 侧不动**。

**已知坑**：agent/model 在 v1 只能**按消息**指定（session 建后不可变）；v2 才有 `session.create` 的 `agent`/`model` 与运行中 `switchAgent`。**必须显式配 model**——生产 `opencode.json` 的 agent model 还是已下线的 `deepseek/deepseek-v4-flash`（issue #41 同源），不配则新 agent `ProviderModelNotFoundError` 且**无 error 气泡**（最隐蔽的失败形态）。**所以生产侧真正上线必须等 E1。**

**可先做的本机部分**：`companion` agent 配置写法验证（本机 opencode v2）+ 客户端强制接线 + 去选择器 + 思考卡收敛 + 单测/tsc。

### 4.5 三条出口（已拍板，供实现参考）

- **出口①（记录）**：E4，`personal-context` + v2 薄插件（`memory_read`/`search`/`write`）。
- **出口②（定时任务）**：E3-d1（#60），NL → 编译 → chat 内确认卡 → 写 assignment 引擎。**`confirmedBy` 已拍板用 `"card"`**。
- **出口③（切 chatcode）**：E3-d2（#61），移交卡 + **BFF 两端点**：
  - `POST /api/product/handoff` + `GET /api/product/handoff/{id}`（新 `handoff` 表，ULID，TTL 7 天，**BFF 只做哑存储**，**不携带原始指令**）
  - 只读查询：`GET /api/product/session-status?directory=` 与 `GET /api/product/session-messages?sessionID=&limit=`（默认 20 / 上限 50，**摘要 ≤500 字符，排除 reasoning 与工具载荷**，**只读**读 opencode DB）
  - **双确认语义**：保留 BFF 原有 `assessConfirmation` 矩阵（授权不变量 + 直接创建返回 405），卡确认随后立刻 `POST /api/product/assignment-proposals/{id}/confirm`，`confirmedBy: "card"`，**确认失败必须可见 + 可重试**。

---

## 5. 建议的下一步（等用户拍板）

| 优先级 | 做什么 | 为什么 | 需要用户提供什么 |
|---|---|---|---|
| **1** | **#57 的本机半边**（companion agent 配置 + 客户端强制 + 去选择器 + 思考卡收敛） | 不碰生产，本机可完整跑 tsc/test；是伴侣化的核心体验 | 无（可直接开工） |
| **2** | **E2**（若确认改由你执行） | 独立、无技术阻塞，只差生产窗口 | **生产变更窗口** + 包 scope 是否改 |
| 3 | **E1** | 解锁 E3-a 生产上线 / E3-d2 / E4 | **较大的生产窗口** + 数据库快照许可 |
| 4 | #60（出口②） | 不依赖 E1 | 无 |
| 5 | #62 / #65 / #44 | 清理类 | 无 |

**⚠️ 开工前必问用户的一件事**：BRIEF 里明确写着会话被冻结过、且"可写类工作等用户明示"。**别把"移交给你"理解成"你可以自行开工"。**

---

## 6. 已知陷阱与教训（DSH 这轮踩过的）

### 6.1 git / GitHub

1. **agent-mobile 的 `origin` 是 HTTPS，而 HTTPS push 会失败**：`fatal: unable to access 'https://github.com/guraul/agent-mobile.git/': Empty reply from server`（复现 2 次）。
   → **push 时显式用 SSH URL**：`git push git@github.com:guraul/agent-mobile.git main`。`origin` 保持 HTTPS 未改。
   （family-finance 的 origin 已经是 SSH，无此问题。）
2. **`gh issue comment <n> --body "多行文本"` 会报 `accepts 1 arg(s), received 3`** → **一律用 `--body-file`**（同理 `gh issue edit --body-file`）。
3. 仓库里的 pipeline 脚本：`scripts/pipeline/{new-task.sh,open-pr.sh,merge-pr.sh,rollback.sh,status.sh}`，用法见 `docs/pipeline/README.md`。
   - `merge-pr.sh` 会**删掉 worktree** → **必须先从 worktree 里 `cd` 出来**，否则 shell 被连根带走。

### 6.2 worktree 陷阱（**DSH 这次真踩了**）

- 在 worktree 里若把 `agent-mobile-app/node_modules` 做成**指向主仓的软链**（为省 705 MB），**pnpm 会直接拒绝工作**：
  `Failed to create directory at ".../node_modules": workspace hoist directory is not a real directory`
  → worktree 里 `pnpm exec tsc` / `pnpm test` **全都跑不起来**。
- 绕过办法（只用于临时验证）：直接调真实二进制
  ```bash
  node node_modules/typescript/bin/tsc --noEmit
  ./node_modules/.bin/vitest run
  ```
- **正解**：worktree 里老老实实 `pnpm install`（软链省不了事，只会让你以为"测试跑过了"其实没跑）。

### 6.3 代码红线（来自仓库 `AGENTS.md`，任何 agent 都必须遵守）

1. **勿改消息数组的 chronological 语义**：`listMessages` 旧在前，排序一律以 `time.created` 为准。
2. **勿移除打字机限速 / FlatList `extraData`**：`revealChars` 逐字揭示依赖 `extraData={revealChars}`；移除会整块弹出。**轮询兜底与打字机冲突，勿同时启用。**
3. **勿改组件硬编码颜色/字号/间距**：必须走 `src/theme/`。**勿改 `StatusType` 取值集合。**
4. **敏感凭据不入库**（`EXPO_TOKEN`、`EXPO_PUBLIC_OPENCODE_*` 等）。
5. **9928 端口归属**：由 `serve-9928.service` 托管静态应用；改端口**必须先改 BFF CORS**。
6. **临时脚本/截图/日志统一放仓库根 `test/`**（已 gitignore，不入库）。
7. **勿改 `docs/newdesign/`**（用户活跃编辑区）。
8. **改完 TS 必须验证**：`cd agent-mobile-app && pnpm exec tsc --noEmit`；纯逻辑改动**必须同步跑 `pnpm test`**（vitest，`src/**/*.test.ts`）。
9. **不要动依赖版本/lockfile**（除 E2 那种明确需要新增 package 的场景）。

### 6.4 `AGENTS.md` 里对你的适用范围（重要，别被绕晕）

仓库 `AGENTS.md` 规则 **11 / 12 / 13** 是写给 **DSH 这个 harness** 的（"DSH 控制 opencode 做事"、免费档模型回退链 `space-bunny-free` → `mimo-v2.6-flash-free` → `step-5-preview-free`、并发纪律等）——**那是 DSH 的子代理委派拓扑，对你不适用**。同理规则 10（图片必须走 vision-reader 子代理）是因为**DSH 主模型不支持图片输入**；你若支持图片，可自行判断。

**但下面这些是普适的，你必须遵守**：规则 1（Expo SDK 57 版本化文档）、2（tsc + test）、3、4、5、6、7、8、9，以及 §6.3 的全部内容。

### 6.5 别的坑

- **`product_wait` 超时 ≠ 失败**（DSH 专用经验，仅供参考）。
- 生产 `opencode.json` 的 agent model 仍是**已下线的** `deepseek/deepseek-v4-flash`——见 §4.4。
- **本机 opencode v2 配置**（`~/.config/opencode/opencode.json`，实测）：
  ```jsonc
  "plugin": [],                       // 本机零插件
  "mcp": {
    "wiki-query": { "type": "local",  "command": ["node", ".../llm-wiki-mcp/dist/index.js", "--vault-path", ".../gbwikis"] },
    "servers":    { "exa": { "type": "remote", "url": "https://mcp.exa.ai/mcp" } }   // ⚠️ 注意是 mcp.servers.exa 这层嵌套
  },
  "model": "opencode/mimo-v2.6-flash-free",
  "experimental": { "policies": [ { "action": "provider.use", "resource": "zhipuai",   "effect": "deny" },
                                  { "action": "provider.use", "resource": "openrouter", "effect": "deny" } ] }
  ```
  → **E1 配 exa MCP 时要照这个嵌套形态写**；另注意 `zhipuai`/`openrouter` 两个 provider 被显式 deny。
- **生产 opencode 装了两个插件**：`opencode-memx.ts` **+ `superpowers`**（BRIEF §6 E1-a 明确"先摘插件"）→ **E1 升级前必须先摘掉这两个**，否则 v2 起不来。

---

## 7. 验证手册

### 7.1 本机（首选，不改生产）

```bash
cd /Users/gubin/workspace/agent-mobile/agent-mobile-app
pnpm exec tsc --noEmit      # 类型
pnpm test                   # vitest，当前基线 = 27 文件 / 235 测试全过
pnpm lint
```

**基线数字（交接时刻）**：`tsc` 0 错误；`vitest` **27 个测试文件 / 235 个测试全过**。**低于这个数是回归。**

### 7.2 浏览器验证（真机视口）

- **仓库自带 e2e 在本机跑不了**：`agent-mobile-app/scripts/e2e/*.mjs` 共 **17 处 `/root/...` 硬编码**（见 §4.2）。**别浪费时间试 `pnpm e2e`。**
- 用 playwright skill：
  ```bash
  cd ~/.agents/skills/playwright-skill && node run.js <你的脚本.js>
  ```
  - **永远 `headless: true`**；`PW_BROWSER=chrome|chromium` 可切换（不设则自动探测）。
  - **不要把 playwright 装进本仓库**（会动 `pnpm-lock.yaml`）；仓库已有 `playwright-core`，脚本经 `createRequire` 复用 skill 目录的依赖。
  - 截图放 `/tmp/` 或仓库根 `test/`。
- **Redmi K70 视口 = 393 × 852，DPR 2.75**（用户明确要求过用这个尺寸看）。
- 线上站：`http://106.13.181.13:9928`；登录：`POST http://106.13.181.13:19234/api/auth/login`，token 注入 `localStorage['pulse_opencode_token']`，凭据在 `~/.pulse-e2e-creds`（**别打印**）。
- 已知 headless 坑：`locator.click` / `mouse` 对 RN Web `Pressable` 时序不稳 → 用 `dispatchEvent(new MouseEvent('click', {...}))` 复现真实点击。
- **e2e 断言尽量结合角色（USER/AI）与位置**，避免被 AI 回复里引用测试文本误命中。

### 7.3 生产（**只读**；写操作必须先拿到用户的变更窗口）

```bash
# 只读检查
systemctl status bff-19234 serve-9928 opencode-4096 --no-pager
grep -rn "family-finance" /etc/systemd/system/          # E2 相关
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:19234/
```
**生产不是测试机**——别在生产上试跑、别改配置、别重启服务，除非用户在"变更窗口"里明确授权。

### 7.4 "变更窗口"是什么意思（用户问过，这里留个定义）

= **用户授权你去动生产机器的那段时间**。流程：**先给方案 → 用户点头 → 约定时间 → 执行 → 立刻验证 → 失败回滚 → 用户确认页面可访问**（最后一步只有用户能做）。
- **E2 的窗口**：约 3 分钟，BFF 中断 5–10 秒，**完全可逆**（`mv` 回来即可）。
- **E1 的窗口**：分钟级，且**数据库迁移不可逆**——动手前必须快照 `.db` + `-wal` + `-shm`。

---

## 8. 未决问题（需要用户拍板，别自己定）

1. **E2 到底由谁做、什么时候做**（用户说"可能不在 dsh 做"→ 现在移交给你，需确认）。
2. **family-finance 的 npm 包 scope 要不要一起从 `@family-finance/*` 改成 `@homebase/*`**（61 处命中，多数是包名）。
3. **`personal-context` 新包的命名**（`@homebase/personal-context`？）。
4. **思考卡收敛的具体形态**：折叠成一条状态行 **还是** 直接不渲染？（#57 里给了二选一，等实现时定）
5. **#44 排队功能**是否重启（数据层已由 #58 铺好）。
6. **E1 的生产窗口时点**。

---

## 9. 文档地图

| 文档 | 用途 |
|---|---|
| **`docs/pipeline/CHAT_COMPANION_BRIEF.md`** | ⭐ **唯一进度权威**。§2 进度 / §3 拍板明细 / §6 执行队列 / §7 backlog / §8 事实备忘 |
| `docs/pipeline/CHAT_COMPANION_HANDOFF_ZCODE.md` | **本文件**：状态快照 + 操作手册 |
| `docs/pipeline/CHAT_COMPANION_KICKOFF_PROMPT.md` | ❌ **已失效**（接手点过时），仅历史留档 |
| `docs/pipeline/README.md` | 交付流程与 pipeline 脚本用法 |
| `docs/pipeline/PROGRESS.md` | 进度台账 |
| `AGENTS.md` | 仓库强制规定 + 知识库路由 |
| `docs/knowledge-base/INDEX.md` | 知识库入口（模块地图） |
| `docs/knowledge-base/modules/chat.md` | chat 界面（气泡/打字机/弹窗/输入区） |
| `docs/knowledge-base/modules/services.md` | opencode 对接（REST/SSE/reducer/状态机/auth） |
| `docs/knowledge-base/OPERATIONS.md` | 构建/部署/预览/测试/环境变量 |
| `docs/newdesign/` | ⛔ **设计稿，用户活跃编辑中，勿改** |

**`test/` 目录（gitignored，不入库）**里有本轮产生的探针与 issue 草稿，例如：
`issue-{epic,e1,e2,e3,e3a,e4}.md`、`sub-e3{a,b,c,d1,d2}.md`、`k70-{probe,dom-probe,busy-probe,sse-frames}.mjs`、`v2-contract-probe.mjs`。
⚠️ **因为不入库，若你在别的机器上工作，这些拿不到**——需要时按本文件描述重写。

---

## 10. 交接边界

**DSH 已在交接前停下所有工作**：无运行中的子代理、无后台任务、无未提交改动、无未合并 PR。

**交给你的**：

- 仓库状态（见 §3.4）：agent-mobile `main` = `289319e`（已推送），family-finance `main` 干净（落后 3 个提交）。
- 全部决策与事实（BRIEF + 本文件）。
- 待办全景与建议优先级（§4、§5）。

**明确没做的（别以为做了）**：

- ❌ E2 **一行都没改**（中间产物已丢弃）→ 需要从零做。
- ❌ E1 / E3-a / E3-d / E4 **全部未开工**。
- ❌ 生产机器**没有被本次交接改动过任何东西**；GitHub 仓名**未改**。

**你需要用户授权才能做的**：任何生产写操作（含 systemd、目录迁移、服务重启、opencode 升级、数据库迁移）、GitHub 仓改名、合并 PR 到 main（合并即触发部署）。

---

*本文件由 DSH 主控会话于 2026-10-10 生成。若与 BRIEF 冲突，以 BRIEF 为准；若发现本文件描述的现状与仓库实际不符，请以实测为准并更新本文件。*
