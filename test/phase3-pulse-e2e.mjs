#!/usr/bin/env node
/**
 * Phase 3 E2E：Pulse ← Attention store 全用户路径（真实运行）
 *
 * 登录 → 打开 Pulse → 断言无 NEEDS YOU（或记录） →
 * 真实触发 permission.asked（plan agent + minimax-m3）→
 * product SSE → NEEDS YOU 出现 Attention 卡片 → 点击进入项目会话 →
 * 真实 approve → 卡片消失（HANDLED 不再 actionable）
 *
 * 前置：9928 web 静态版(Phase 3 bundle) + BFF + opencode 运行中
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
  let json = null; try { json = JSON.parse(text); } catch { /* SSE */ }
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

  // BFF 登录（供 REST 触发真实业务事件）
  const login = await bff('/api/auth/login', { method: 'POST', body: JSON.stringify(ADMIN) });
  const TOKEN = login.json?.token;
  check('BFF 登录', !!TOKEN);

  // 浏览器端登录（localStorage 持久 token）
  await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
  await page.evaluate((t) => localStorage.setItem('pulse_opencode_token', t), TOKEN);
  await page.reload({ waitUntil: 'load' });
  await waitText('Good ', 20000) || await waitText('Pulse', 10000);
  check('Pulse 已登录加载', !(await page.locator('text=未登录 — 点击登录').isVisible().catch(() => false)));

  // 基线：记录当前 NEEDS YOU 区域状态（应为空或不含本次新 attention）
  await sleep(3000);
  const baselineNeedsYou = await page.locator('[data-testid^="attention-"]').count();
  console.log(`  [debug] baseline attention cards: ${baselineNeedsYou}`);

  // 真实触发 permission.asked（plan agent + minimax-m3）
  const created = await bff('/api/opencode/rest/session', {
    method: 'POST', body: JSON.stringify({ directory: '/root/project/agent-mobile', title: 'phase3-pulse-smoke' }),
  }, TOKEN);
  const sessionId = created.json?.id;
  check('创建真实 opencode 会话', created.status === 200 && !!sessionId, sessionId);
  await bff(`/api/opencode/rest/session/${sessionId}/prompt_async`, {
    method: 'POST',
    body: JSON.stringify({
      parts: [{ type: 'text', text: '请立即实际执行 shell 命令 `ls /root/project`，把命令输出原样返回给我。' }],
      agent: 'plan',
      model: { providerID: 'volcengine-plan', modelID: 'minimax-m3' },
    }),
  }, TOKEN);

  // product SSE → Attention store → NEEDS YOU 出现卡片
  let attentionCard = null;
  try {
    await page.locator('[data-testid^="attention-"]').first().waitFor({ state: 'visible', timeout: 180000 });
    const cards = await page.locator('[data-testid^="attention-"]').count();
    // 取第一个卡片的 testID（排除 dismiss 按钮 testID 前缀冲突）
    const testId = await page.locator('[data-testid^="attention-"]').first().getAttribute('data-testid');
    attentionCard = { count: cards, testId };
    check('Permission Attention 出现在 Pulse NEEDS YOU', cards > 0, `cards=${cards} first=${testId}`);
  } catch (e) {
    check('Permission Attention 出现在 Pulse NEEDS YOU', false, e.message);
  }

  // 卡片显示 Attention title/summary（非 runtime 状态文案）
  if (attentionCard) {
    const cardText = await page.locator(`[data-testid="${attentionCard.testId}"]`).innerText().catch(() => '');
    check('卡片展示 Attention title/summary', cardText.includes('权限请求'), cardText.split('\n').slice(0, 2).join(' | '));
  }

  // 点击 → 进入既有项目会话（ProjectChat sheet）
  if (attentionCard) {
    await click(`[data-testid="${attentionCard.testId}"]`);
    const sheet = await page.locator('[data-testid="project-chat-sheet"]').waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    check('点击 Attention 进入项目会话（Talk path）', sheet);
    if (sheet) {
      // 关闭 sheet（查看本身不得 HANDLED）
      const stillOpen = await bff('/api/product/attention?state=open', {}, TOKEN);
      check('查看不改 Attention state（仍 open）', (stillOpen.json?.items || []).some((i) => i.sessionId === sessionId), `open=${stillOpen.json?.items?.length}`);
      await page.keyboard.press('Escape').catch(() => {});
      await page.locator('[data-testid="project-chat-sheet"]').locator('..').dispatchEvent('click', { bubbles: true }).catch(() => {});
      await sleep(500);
    }
  }

  // 找到 requestID（attention subject）并真实 approve
  const list = await bff('/api/product/attention?state=open', {}, TOKEN);
  const permItem = (list.json?.items || []).find((i) => i.sessionId === sessionId && i.creationReasonRef === 'opencode.permission.blocking');
  if (permItem) {
    const reply = await bff(`/api/opencode/rest/permission/${permItem.subjectId}/reply`, {
      method: 'POST', body: JSON.stringify({ reply: 'once' }),
    }, TOKEN);
    check('真实 approve（runtime reply）', reply.status === 200);

    // HANDLED → SSE → 卡片消失
    try {
      await page.waitForFunction(
        (id) => !document.querySelector(`[data-testid="attention-${id}"]`),
        permItem.id,
        { timeout: 30000 },
      );
      check('approve → Attention 卡片从 Pulse 消失（HANDLED 不再 actionable）', true, permItem.id);
    } catch (e) {
      check('approve → Attention 卡片从 Pulse 消失（HANDLED 不再 actionable）', false, e.message);
    }
  } else {
    check('找到 open permission attention', false, 'not found after prompt');
  }

  await page.screenshot({ path: '/root/project/agent-mobile/test/phase3-pulse-e2e.png' });

  const failed = results.filter((r) => !r).length;
  console.log(`\n[phase3-e2e] ${results.length - failed}/${results.length} 通过（真实运行）`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
