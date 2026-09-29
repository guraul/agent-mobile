# Chat 批次续作交底书（ZCode → opencode，2026-09-29）

> 交接人：ZCode（已执行 epic #35 五项中的四项半）。执行者：opencode。
> 配套：`docs/pipeline/CHAT_MIGRATION_BRIEF.md`（原交底书，仍然有效）、`docs/knowledge-base/modules/chat.md`（已同步至 #30）、本文件。
> **你的第一件事是本文 §1 的待办，第一待办是等用户 review PR #40。**

---

## 0. 一屏状态（精确到号，勿凭记忆）

| issue | 内容 | 状态 |
|---|---|---|
| #29 A | talk 双页路由骨架 + chat 页浅色化 | ✅ PR #36 merged `2435c0b`，deploy 全绿，epic 已勾 |
| #31 C | chatcode 壳 + 弹层浅色化 | ✅ PR #37 merged `2922e77`，deploy 全绿，epic 已勾 |
| #32 D | 工具折叠组 + thinking + diff 卡 | ✅ PR #38 merged `993214a`，deploy 全绿，epic 已勾 |
| #33 E | composer 两态 + 长按面板 + 排队队列 | ✅ PR #39 merged `d838701`，deploy 全绿（SSH 瞬断重跑一次），epic 已勾 |
| #30 B | inner-card 白卡 + Duties/Projects 卡 | 🔶 **PR #40 OPEN，等用户回复 ok** → merge |
| #34 F | sessions/workspace 抽屉 | ⛔ 需讨论，不开工（见 §4） |

- 本地 main = `d838701`（= origin/main）。PR #40 分支 `task/30-inner-card`，含 e2e 12 项版本（main 上是 10 项）。
- 9928 线上 = #33 版本，健康（生产 e2e 10/10）。
- 会话库内无 diff 数据、admin 账号有 1 条 Active 职责——截图场景见 §6 资产。

## 1. 立即待办（按序执行，勿跳步）

### 1a. PR #40 review 闭环（等用户 ok 后）
```bash
cd /Users/gubin/workspace/agent-mobile        # ⚠️ 必须先 cd 主工作区，见坑 7
scripts/pipeline/merge-pr.sh 40               # squash 合并，自动部署
git pull --ff-only
git worktree remove --force .worktrees/30-inner-card && git branch -D task/30-inner-card
# 部署确认（质量门+rsync 全绿后）：
gh run list --repo guraul/agent-mobile --limit 1   # 结论 success
curl -s -o /dev/null -w "%{http_code}\n" http://106.13.181.13:9928/   # 200
cd agent-mobile-app && E2E_URL=http://106.13.181.13:9928 E2E_NO_SEND=1 node scripts/e2e/pulse-e2e.mjs   # 期望 12/12
# epic 勾选（gh pr edit 会被 GraphQL projectCards 报错打断，一律走 REST）：
gh issue view 35 --repo guraul/agent-mobile --json body --jq .body | python3 - <<'EOF'
import sys; b = sys.stdin.read()
b = b.replace('- [ ] **#30 B** 气泡内白卡框架（inner-card）+ Duties / Projects 两卡（依赖 #29）',
              '- [x] **#30 B** 气泡内白卡框架（inner-card）+ Duties / Projects 两卡（PR #40 merged，deploy 全绿）')
open('/tmp/epic35.md','w').write(b)
EOF
jq -Rs '{body: .}' /tmp/epic35.md | gh api repos/guraul/agent-mobile/issues/35 -X PATCH --input -
```
若 deploy run 因 SSH 瞬断失败（`kex_exchange_identification: Connection reset`，#39 发生过一次）：**质量门已过的前提下 `gh run rerun <run-id> --failed` 重跑即可**，线上无损伤（软链未切）。

### 1b. 收尾（#30 merge 后做，epic 全勾触发）
- `docs/knowledge-base/modules/router.md`：补「双 chat 页分流」段（/talk 单路由 + `resolveConversationKind` 运行时判据 → chat/chatcode 两壳；判据表见 chat.md 顶部 2026-09-29 各段）。
- `docs/knowledge-base/INDEX.md`：路由表补 chat.md 更新提示。
- `docs/pipeline/PROGRESS.md`：追加 chat 批次变更记录一行。
- 提交推送（docs-only 不触发部署）。

### 1c. 挂起验证项（需要用户输入，逐项问、别擅自动）
1. **#33 排队全链路 e2e**：busy 时发两条 → 队列 chip → 依次发出。需要真实 agent 运行（`pnpm e2e` 带发送模式，AGENTS.md 约定需用户确认）。**先问用户“可以发吗”**。
2. **#32 diff 卡真实数据**：库内无任何 diff 数据（edit 工具零实例）。下次真实 edit 会话出现后，用 `test/chat32-shots.mjs` 改 sessionId 补截 diff 代码卡。
3. **#30 Failed/Missed 行为**：待真实失败/补偿职责出现后补验（Retry/Run now/Skip 按钮形态）。

## 2. #34 讨论材料（不开工；把本节整理后向用户提出，等拍板）

**冲突点一：与旧拍板冲突。** 2026-09-27 拍板“抽屉暂不做，coding 入口绑最新 session”；2026-09-28 新指令“chatcode.html 功能全量实现”（含抽屉）。抽屉是否解禁、何时做，需用户明确。
**冲突点二：与绑最新 session 机制冲突。** 抽屉本身就是会话选择器——上线后“绑最新 session”是否被替代？两套并存（默认最新 + 抽屉可切）还是切换？我的建议：并存——默认仍绑最新 session，抽屉作为显式入口（点击 Layers 图标唤起，替代 chat 侧已有的 Layers 功能位）。
**技术成本（供决策参考）**：RN Web 无原生 drawer（transform+手势自实现）；PanResponder 桌面鼠标/移动触摸双端行为要分别验证；边缘手势与 K70 全面屏手势区冲突，真机验证成本高；左滑四操作（swipe cell）需自实现；workspace 五 tab 的数据源未确认（opencode 接口覆盖度存疑——文件/终端/diff 需要新 BFF 通道）。
**建议切法**：桌面端先做“点击入口唤起抽屉”（无手势），移动端手势第二批；workspace 抽屉的文件/终端 tab 等 opencode 接口确认后再排。**用户拍板前：一行代码都不写。**

## 3. 本批已沉淀的关键事实（写码前读 chat.md 对应段）

- **分流**：`src/services/conversation-kind.ts` `resolveConversationKind(directory)`——market 目录（`MARKET_TALK_DIRECTORY=/root/project/family-finance`）/无目录/根目录 → chat；其余 → chatcode。talk.tsx 运行时判定传 `kind` 给 ProjectChatZ（标题分流；chatcode 侧无 Layers 选择器）。
- **token**：浅色一律 `src/theme/light.ts`，chat 专属段 = `lightChatColors/Typography/Sizes/OrbStops`（peach #F3BA8F 主行动作；tech/code 段 #FBF9EC/#322B24 等）。禁硬编码色值。
- **composer 两态**：收起 pill（草稿预览 Pressable + 内嵌发送钮 + pill-sub ma-btn）↔ 展开 box；发送成功自动收起。e2e 依赖 `[data-testid="composer-preview"]`（先点它再数 textarea）与 `[aria-label="Send"]`。
- **队列**：`message-queue.ts` 纯函数；busy = 现有 `sending` 状态（prompt_async 挂起整个 agent run）；失败回填队首 + `queueBlocked` 阻塞自动重试；chip 操作解除。
- **卡片**：`chat-cards.ts` 纯函数（状态口径复用 assignment/projection）；`/assignments`、`/projects` 客户端拦截（不进 agent/队列/不产生 opencode 消息）；白卡必须嵌灰色 AI 气泡壳（对比度教训）。
- **弹层**：LightSheet 无 zIndex 靠渲染顺序压层——任何新 sheet 渲染在组件树**最后**；lucide 图标不吃 style.transform（旋转要外包 View）；agent 长按面板 = Pressable onLongPress（delayLongPress 400）。

## 4. 红线（违反即返工，全文见 AGENTS.md + chat.md）

1. 「换肤不换芯」：SSE/reducer/打字机/滚动粘底/分页零改动；新数据逻辑必须独立纯函数 + 单测。
2. chronological 语义 / `extraData={revealChars}` / 轮询勿与打字机同开 / error 勿直塞 Text / question v1 双监听 / code_inline 显式覆盖 padding。
3. **服务器 106.13.181.13 是生产环境：禁止跑测试 / scp / git 操作**（只许 ssh + systemctl）。测试全在本地；部署走 pipeline。
4. 勿动 `docs/newdesign/`；勿动旧齿轮与 SettingsSheet；KB/Memory 卡不做。
5. PR 开完必须等用户回复 ok 才能 merge；merge 后自动部署。
6. 敏感凭据不入库；`~/.pulse-e2e-creds` 勿读内容。

## 5. 环境坑（本会话全部实测踩过，别再踩）

1. **Bash cwd 持久化陷阱**：shell 的 cwd 会跨调用保留，**绝不 `cd` 进 `.worktrees/*`**（merge-pr.sh 删 worktree 会连 shell 一起带走，报 `spawn /bin/zsh ENOENT`，只能靠子代理重建目录自救）。一律 `git -C <path>` 或每条命令 `cd /Users/gubin/workspace/agent-mobile &&` 开头。merge-pr.sh 必须从主工作区跑。
2. **本机 8GB 内存**：`tsc` 与 `test` 分开跑；本地 export 用 `NODE_OPTIONS="--max-old-space-size=3584" EXPO_PUBLIC_OPENCODE_URL=http://106.13.181.13:19234 pnpm exec expo export --platform web --clear`（单跑能过，别并发）。
3. **git push 走代理 502**：`git -c http.version=HTTP/1.1 push ...` + ls-remote 验证循环重试（三连失败是常态，第四次常成）。
4. **gh pr edit / issue edit 会被 GraphQL projectCards 弃用报错打断**：一律走 REST——`gh issue view N --json body --jq .body | python3 改写 > /tmp/x.md && jq -Rs '{body: .}' /tmp/x.md | gh api repos/guraul/agent-mobile/issues/N -X PATCH --input -`。
5. **本地视觉验收链路**（pre-merge 不用等部署）：export 后 `pnpm exec expo serve --port 9928`——**localhost:9928 恰好在 BFF CORS 白名单**（family-finance packages/web/lib/cors.ts），登录/token 注入全链路可跑。截图脚本 `test/chat29/30/31/32/33-shots.mjs` 可改路径复用（playwright-core + 本机 Chrome + CDP 真视口 411×752；**headless CLI 窄视口截图是伪影**）。
6. **RN Web 坑**：`editable={false}` 的 TextInput 渲染成 div 不是 textarea；lucide 图标 style.transform 会整个消失；onLongPress 只认真实指针序列（playwright 用 `mouse.down→hold→up`，dispatchEvent 不触发）；RN Web Pressable 的 click 对 dispatchEvent 兼容（加 bubbles）。
7. **审图走子代理**（主模型禁读图）：读图前先核对文件 MD5/内容是否为预期对象（#30 第一轮就抓到“两张图字节相同”）；截图后强制滚底（见 chat30-shots.mjs 的 scrollChatToBottom）。
8. grep 交替 `\|` 失效用 `-E`；`.mjs` 是 ESM（`createRequire(import.meta.url)`）。
9. 主工作区有用户未提交痕迹（`CHAT_KICKOFF_PROMPT.md` 删除、`.workbuddy/`、根目录 package.json）——**勿动勿提交**。

## 6. 可复用资产

| 资产 | 用途 |
|---|---|
| `test/chat29/30/31/32/33-shots.mjs` | 各特性截图脚本（改 worktree 路径 + sessionId 即复用） |
| `scripts/e2e/pulse-e2e.mjs` | e2e 主脚本，本地 12 项（含卡片步，NO_SEND 可跑） |
| `~/.pulse-e2e-creds` | e2e 凭据（勿读内容） |
| 本地 export + `expo serve --port 9928` | pre-merge 视觉验收（CORS 命中） |
| `scripts/pipeline/*` | new-task.sh / open-pr.sh / merge-pr.sh / deploy.sh / rollback.sh |

## 7. 沟通约定

- 中文；进度汇报三段式（已完成/待确认/下一步）；方案分歧必须给理由和替代方案。
- 每个 PR body 首行 `Closes #N`；开完 PR 即停下等 review，**ok 才 merge**。
- 完成一个 issue：tsc → test → e2e → 截图+子代理审图 → chat.md 同步 → epic 勾选 → 汇报。
