#!/usr/bin/env node
/**
 * Phase 4 E2E：Attention → Talk → Handling（真实运行）
 *
 * Path 1 Permission（真实业务事件）：plan agent(bash=ask, minimax-m3) 真实触发
 *   permission.asked → Pulse 卡片 → 点击 → Resume 引用 session（sheet 标题=会话名）
 *   → 真实 approve → HANDLED → 卡片消失。
 *
 * Path 2 Market（⚠️ 部分标注 simulation）：open market Attention 由
 *   phase4-sim.test.ts（PHASE4_SIM=1，真实 DB + 同一 runtime 代码路径）注入——
 *   周末无法经真实 scheduler 产生未过期窗口。Mobile 侧全为真实交互：
 *   点击 → Create 新会话 + engage 回填 → 上下文注入 → 显式「标记已处理」→ HANDLED。
 *
 * 前置：9928(Phase 4 bundle) + BFF + opencode 运行中；PHASE4_SIM 已注入 market attention。
 */
import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
const { chromium } = pw;
import { readFileSync } from 'node:fs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:9928';
const BFF = 'http://127.0.0.1:19234';
const EXECUTABLE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';
const env = readFileSync('/root/project/family-finance/packages/web/.env.local', 'utf8');
const getUser = (k) => env.split('\n').find((l) => l.startsWith(k + '='))?.slice(k.length + 1).trim();
const ADMIN = { username: getUser('ADMIN_USERNAME'), password: getUser('ADMIN_PASSWORD') };

async function bff(path, init = {}, token = null) {
  const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) };
  const res = await fetch(`${BFF}${path}`, { ...init, headers });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch { /* */ }
  return { status: res.status, json, text };
}

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const results = [];
  const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitText = async (t, timeout = 15000) => {
    await page.locator(`text=${t}`).first().waitFor({ state: 'visible', timeout }).catch(() => {});
    return page.locator(`text=${t}`).first().isVisible().catch(() => false);
  };
  const click = async (sel) => page.locator(sel).first().dispatchEvent('click', { bubbles: true });

  const login = await bff('/api/auth/login', { method: 'POST', body: JSON.stringify(ADMIN) });
  const TOKEN = login.json?.token;
  check('BFF 登录', !!TOKEN);

  // ============ Path 1: Permission（真实业务事件） ============
  console.log('\n──── Path 1: Permission → Resume → approve → HANDLED ────');
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((t) => localStorage.setItem('pulse_opencode_token', t), TOKEN);
  await page.reload({ waitUntil: 'load' });
  await waitText('Good ', 20000) || await waitText('Pulse', 10000);
  await sleep(2500);

  const created = await bff('/api/opencode/rest/session', {
    method: 'POST', body: JSON.stringify({ directory: '/root/project/agent-mobile', title: 'phase4-perm-smoke' }),
  }, TOKEN);
  const sessionId = created.json?.id;
  check('P1 创建真实会话', created.status === 200 && !!sessionId, sessionId);
  await bff(`/api/opencode/rest/session/${sessionId}/prompt_async`, {
    method: 'POST',
    body: JSON.stringify({
      parts: [{ type: 'text', text: '请立即实际执行 shell 命令 `ls /root/project`，把命令输出原样返回给我。' }],
      agent: 'plan',
      model: { providerID: 'volcengine-plan', modelID: 'minimax-m3' },
    }),
  }, TOKEN);

  let perm = null;
  try {
    // 按 sessionId 精确轮询 API（market sim 卡可能先出现，不能用 DOM 前缀匹配）
    await (async () => {
      const start = Date.now();
      while (Date.now() - start < 180000) {
        const list = await bff('/api/product/attention?state=open&domain=coding', {}, TOKEN);
        const hit = (list.json?.items || []).find((i) => i.sessionId === sessionId);
        if (hit) { perm = hit; return; }
        await sleep(3000);
      }
    })();
    check('P2 asked → Attention（open, session 绑定）', !!perm, perm ? `id=${perm.id}` : 'timeout');
    if (perm) {
      await page.locator(`[data-testid="attention-${perm.id}"]`).waitFor({ state: 'visible', timeout: 20000 });
      check('P2b 卡片经 product SSE 渲染到 Pulse', true, perm.id);
    }
  } catch (e) {
    check('P2 asked → Attention 出现在 Pulse', false, e.message);
  }

  if (perm) {
    // 点击 → Resume 引用 session（sheet 标题 = 会话名）
    await click(`[data-testid="attention-${perm.id}"]`);
    const sheetOpen = await page.locator('[data-testid="project-chat-sheet"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    check('P3 点击 → 项目会话弹框', sheetOpen);
    const resumed = await waitText('phase4-perm-smoke', 20000);
    check('P4 Resume 的是 Attention 引用的 session（标题=phase4-perm-smoke）', resumed);
    const contextBanner = await waitText('📌 处理中', 10000);
    check('P5 上下文卡可见（📌 处理中）', contextBanner);

    // 查看不改 state
    const still = await bff(`/api/product/attention/${perm.id}`, {}, TOKEN);
    check('P6 查看/Resume 后仍 OPEN', still.json?.item?.state === 'open');

    // 真实 approve → HANDLED → 卡片消失
    await bff(`/api/opencode/rest/permission/${perm.subjectId}/reply`, {
      method: 'POST', body: JSON.stringify({ reply: 'once' }),
    }, TOKEN);
    try {
      await page.waitForFunction(
        (id) => !document.querySelector(`[data-testid="attention-${id}"]`),
        perm.id, { timeout: 30000 },
      );
      check('P7 approve → HANDLED → Pulse 卡片消失', true, perm.id);
    } catch (e) {
      check('P7 approve → HANDLED → Pulse 卡片消失', false, e.message);
    }
    const after = await bff(`/api/product/attention/${perm.id}`, {}, TOKEN);
    check('P8 状态=HANDLED, artifact=perm_reply', after.json?.item?.state === 'handled'
      && after.json?.item?.handlingRef?.startsWith('perm_reply:'));
  }

  // ============ Path 2: Market（⚠️ attention 注入为 simulation，交互真实） ============
  console.log('\n──── Path 2: Market → Create → explicit handling → HANDLED ────');
  const openList = await bff('/api/product/attention?state=open&domain=market', {}, TOKEN);
  const market = (openList.json?.items || []).find((i) => i.subjectId === '012323');
  check('M1 open market Attention 可用（simulation 注入，见 phase4-sim.test.ts）', !!market, market?.id);

  if (market) {
    await click(`[data-testid="attention-${market.id}"]`);
    const sheetOpen = await page.locator('[data-testid="project-chat-sheet"]').waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
    check('M2 点击 → Create 新会话并进入 Talk', sheetOpen);
    let banner = false;
    {
      const start = Date.now();
      while (Date.now() - start < 30000) {
        const txt = await page.evaluate(() => document.body.innerText).catch(() => '');
        if (txt.includes('处理中') && txt.includes('华宝医疗ETF联接C')) { banner = true; break; }
        await sleep(1500);
      }
    }
    check('M3 上下文卡注入（📌 处理中：华宝医疗…）', banner);

    // engage 回填：attention.session_id = 新建 session；state 仍 OPEN（预检+建会话有延迟，轮询）
    let backfilled = null;
    {
      const start = Date.now();
      while (Date.now() - start < 15000) {
        const d = await bff(`/api/product/attention/${market.id}`, {}, TOKEN);
        if (d.json?.item?.sessionId) { backfilled = d.json.item; break; }
        await sleep(1500);
      }
    }
    check('M4 engage 回填 session 引用且仍 OPEN（engage≠handled）',
      !!backfilled?.sessionId && backfilled?.sessionId?.startsWith('ses_') && backfilled?.state === 'open',
      `sessionId=${backfilled?.sessionId}`);

    // auto-send context message 到达会话
    const ctxSent = await waitText('【来自 Pulse Attention】', 60000);
    check('M5 Attention 上下文消息注入会话', ctxSent);

    // 显式 Mark handled → HANDLED → 卡片消失
    await click('[data-testid="attention-mark-handled"]');
    try {
      await page.waitForFunction(
        (id) => !document.querySelector(`[data-testid="attention-${id}"]`),
        market.id, { timeout: 30000 },
      );
      check('M6 显式 Mark handled → HANDLED → Pulse 卡片消失', true, market.id);
    } catch (e) {
      check('M6 显式 Mark handled → HANDLED → Pulse 卡片消失', false, e.message);
    }
    const after = await bff(`/api/product/attention/${market.id}`, {}, TOKEN);
    check('M7 HANDLED + handling_ref=handling:<session>（≠ DISMISSED）',
      after.json?.item?.state === 'handled' && after.json?.item?.handlingRef?.startsWith('handling:ses_'),
      after.json?.item?.handlingRef);
  }

  await page.screenshot({ path: '/root/project/agent-mobile/test/phase4-handling-e2e.png' });
  const failed = results.filter((r) => !r).length;
  console.log(`\n[phase4-e2e] ${results.length - failed}/${results.length} 通过（Path1 真实业务事件；Path2 attention 注入为 simulation、交互真实）`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

// 辅助：检测 header 是否包含上下文卡（页内innerText 已包含）
function headerText(page) {
  return true; // sheet innerText 检查已在 P4 覆盖 title；banner 检查合并到 M3/P5
}

main().catch((e) => { console.error(e); process.exit(1); });
