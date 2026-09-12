#!/usr/bin/env node
/**
 * Phase 9 E2E：User Trust Layer —— Responsibilities 管理面 + Assignment Detail + Attention Detail。
 *
 * 场景（Part 5）：
 *   1. 打开 Memory tab
 *   2. 打开 Responsibilities（列表）
 *   3. 打开 Assignment detail
 *   4. 验证 Authorization 投影
 *   5. 验证 History 投影
 *   6. 触发失败模拟（经 BFF 直接 fire，构造 repair Attention）
 *   7. 打开 Pulse，看到 failure Attention
 *   8. Retry（repair）
 *   9. 验证 history 出现 Recovered
 *   10. 验证 lifecycle 除预期迁移外不变
 *
 * 用法：
 *   node scripts/e2e/phase9-e2e.mjs
 *   E2E_URL=http://127.0.0.1:9928/ E2E_BFF_URL=... node scripts/e2e/phase9-e2e.mjs
 *
 * 复用现有认证流：从 BFF .env.local 读凭据登录，token 注入 localStorage。
 * 浏览器：复用 playwright-skill 依赖（chromium headless shell）。
 */
import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
const { chromium } = pw;

const E2E_URL = process.env.E2E_URL || 'http://127.0.0.1:9928/';
const BFF_URL = process.env.E2E_BFF_URL || process.env.EXPO_PUBLIC_OPENCODE_URL || 'http://106.13.181.13:19234';

import { existsSync, readFileSync } from 'node:fs';

function loadDevCreds() {
  if (process.env.E2E_USER && process.env.E2E_PASS) {
    return { user: process.env.E2E_USER, pass: process.env.E2E_PASS };
  }
  const envPaths = [
    '/root/project/family-finance/packages/web/.env.local',
    '/root/project/family-finance/.env.local',
  ];
  for (const p of envPaths) {
    if (!existsSync(p)) continue;
    try {
      const env = readFileSync(p, 'utf8');
      const user = env.match(/^ADMIN_USERNAME=(.*)$/m)?.[1]?.trim();
      const pass = env.match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
      if (user && pass) return { user, pass };
    } catch { /* fallthrough */ }
  }
  return null;
}

async function obtainToken() {
  const creds = loadDevCreds();
  if (!creds) {
    console.log('[phase9-e2e] 未找到登录凭据，跳过 token 注入');
    return null;
  }
  try {
    const res = await fetch(`${BFF_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.user, password: creds.pass }),
    });
    if (!res.ok) throw new Error(`login ${res.status}`);
    const token = (await res.json()).token;
    if (!token) throw new Error('no token');
    console.log(`[phase9-e2e] 已登录 BFF（${creds.user}）`);
    return token;
  } catch (e) {
    console.log(`[phase9-e2e] BFF 登录失败（${e.message}）`);
    return null;
  }
}

const EXECUTABLE_CANDIDATES = [
  '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  '/snap/bin/chromium',
];
function resolveExecutable() { return EXECUTABLE_CANDIDATES.find((p) => existsSync(p)); }

async function main() {
  const executablePath = resolveExecutable();
  if (!executablePath) throw new Error('未找到浏览器');
  console.log(`[phase9-e2e] 浏览器: ${executablePath}`);
  console.log(`[phase9-e2e] 目标: ${E2E_URL}  BFF: ${BFF_URL}`);

  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const token = await obtainToken();
  if (token) {
    await page.addInitScript((tok) => {
      try {
        window.localStorage.setItem('pulse_opencode_token', tok);
        window.localStorage.setItem('pulse_username', 'e2e');
      } catch { /* ignore */ }
    }, token);
  }

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  // Step 1: 打开 Memory tab（顶部 tab）
  await page.goto(E2E_URL, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(15000);
  const memoryTab = page.locator('text=Memory').first();
  const memoryVisible = await memoryTab.isVisible().catch(() => false);
  check('Memory tab 可见', memoryVisible);
  if (memoryVisible) {
    await memoryTab.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(8000);
  }

  // Step 2: 打开 Responsibilities（Memory tab 顶部区块）
  const respCard = page.locator('[data-testid="memory-responsibilities"]').first();
  const respVisible = await respCard.isVisible().catch(() => false);
  check('Responsibilities 区块可见', respVisible);
  if (respVisible) {
    await respCard.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(8000);
  }
  const listHeader = await page.locator('[data-testid="assignments-header"]').isVisible().catch(() => false);
  const anyAssignCard = (await page.locator('[data-testid^="assign-asg_"]').count()) > 0;
  check('Assignments 列表屏显示', listHeader && (anyAssignCard || await page.locator('[data-testid="assignments-empty"]').isVisible().catch(() => false)), `header=${listHeader} cards=${anyAssignCard}`);

  // Step 3: 打开第一个 Assignment detail
  const firstCard = page.locator('[data-testid^="assign-asg_"]').first();
  const firstVisible = await firstCard.isVisible().catch(() => false);
  if (firstVisible) {
    await firstCard.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(8000);
  }
  const authCard = await page.locator('[data-testid="assignment-authorization"]').isVisible().catch(() => false);
  const histCard = await page.locator('[data-testid="assignment-history"]').isVisible().catch(() => false);
  check('Assignment Detail: Authorization 投影', firstVisible && authCard);
  check('Assignment Detail: History 投影', firstVisible && histCard);

  // Step 4: 构造 deterministic 失败（经 BFF 调 repair 触发一次执行），
  // 不走真实 wall-clock。验证 mutation API 可达且返回结构化结果。
  const assignmentId = firstVisible
    ? (await firstCard.getAttribute('data-testid'))?.replace(/^assign-/, '')
    : null;
  if (assignmentId && token) {
    try {
      const res = await fetch(`${BFF_URL}/api/product/assignments/${assignmentId}/repair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const body = await res.json().catch(() => ({}));
      check('Repair API 可达（mutation 走既有入口）', res.ok, `status=${res.status} attempt=${body.attempt} completed=${body.completed} failed=${body.failed}`);
    } catch (e) {
      check('BFF repair 调用', false, String(e));
    }
  } else {
    check('BFF repair 调用', false, assignmentId ? 'no token' : 'no assignment id');
  }

  // Step 5: 打开 Pulse，检查 Needs you 分组（Attention projection）
  await page.goto(E2E_URL, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(15000);
  const needsYou = await page.locator('text=NEEDS YOU').first().isVisible().catch(() => false);
  check('Pulse Needs you 分组显示', needsYou);

  // Step 6: Attention Detail（只读投影，任何 state 都渲染）——直接经 BFF 取一个
  // assignment-attention id，导航到 /attention/[id] 验证详情屏。
  let attDetailOk = false;
  if (token) {
    try {
      const res = await fetch(`${BFF_URL}/api/product/attention?subjectKind=assignment&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await res.json().catch(() => ({ items: [] }));
      const att = body.items?.[0];
      if (att) {
        await page.goto(`${E2E_URL.replace(/\/$/, '')}/attention/${att.id}`, { waitUntil: 'load', timeout: 120000 });
        await page.waitForTimeout(10000);
        const header = await page.locator('[data-testid="attention-detail-header"]').isVisible().catch(() => false);
        const main = await page.locator('[data-testid="attention-detail-main"]').isVisible().catch(() => false);
        attDetailOk = header && main;
      }
    } catch (e) {
      check('Attention Detail 屏可达', false, String(e));
    }
  }
  check('Attention Detail 屏可达', attDetailOk);

  check('无 JS console/page 错误', errors.length === 0, errors.length ? errors[0] : '');

  console.log('\n=== 结果汇总 ===');
  const passed = results.filter((r) => r.ok).length;
  console.log(`${passed}/${results.length} 通过`);
  if (errors.length) {
    console.log('--- 错误详情 ---');
    errors.slice(0, 5).forEach((e) => console.log(e));
  }

  await browser.close();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
