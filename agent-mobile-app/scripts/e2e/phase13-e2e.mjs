#!/usr/bin/env node
/**
 * Phase 13 E2E：Assignment Proposal → Pulse L2 Suggestion（PHASE13_DESIGN §10 关键路径）。
 *
 * 场景：
 *   1. 打开 Pulse，SSE 订阅就绪
 *   2. BFF 注入 proposal（market/ongoing，observation 出处）→ SUGGESTED 卡不重开页面即出现（SSE 刷新）
 *   3. 点卡体 → 无 confirm 请求发出，proposal 仍 proposed（查看 ≠ 授权）
 *   4. 点 [确认] → 卡片消失；BFF：proposal confirmed + Assignment active；Memory→Responsibilities 可见
 *   5. 注入第二张 proposal → 点 [不用了] → 卡片消失；BFF：proposal rejected、无 Assignment
 *   6. Attention 计数全程不变（无意外 Attention）
 *   7. 清理：撤销 E2E 创建的 Assignment（revoked 惰性残留，同 P8 smoke 惯例）
 *
 * 数据策略（risk-6）：全部经 BFF 既有 API 注入/断言（Talk 结构化提案入口 + createdBy=observation:* 模拟
 * observation 出处），不依赖真实行情时间窗，不直接触碰 DB。
 *
 * 用法：
 *   node scripts/e2e/phase13-e2e.mjs
 *   E2E_URL=http://127.0.0.1:9928/ E2E_BFF_URL=... node scripts/e2e/phase13-e2e.mjs
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
  if (!creds) return null;
  try {
    const res = await fetch(`${BFF_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.user, password: creds.pass }),
    });
    if (!res.ok) throw new Error(`login ${res.status}`);
    const token = (await res.json()).token;
    console.log(`[phase13-e2e] 已登录 BFF`);
    return token;
  } catch (e) {
    console.log(`[phase13-e2e] BFF 登录失败（${e.message}）`);
    return null;
  }
}

const EXECUTABLE_CANDIDATES = [
  '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  '/snap/bin/chromium',
];
function resolveExecutable() { return EXECUTABLE_CANDIDATES.find((p) => existsSync(p)); }

// ── BFF helpers（全部走既有 API，不碰 DB）──

function api(token) {
  return async (path, opts = {}) => {
    const res = await fetch(`${BFF_URL}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  };
}

/** 注入一条 market/ongoing proposal（Talk 结构化提案入口；createdBy=observation:* 模拟 observation 出处） */
async function injectProposal(apiCall, tag) {
  const { status, body } = await apiCall('/api/product/assignment-proposals', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'ongoing',
      domain: 'market',
      responsibility: `[P13 E2E ${tag}] 持续监控测试基金，达到目标净值时提醒`,
      trigger: {
        kind: 'schedule-rule',
        schedule: '50 14 * * 1-5',
        timezone: 'Asia/Shanghai',
        condition: { kind: 'fund-nav-above-target' },
        enabled: true,
      },
      instructionRef: `observation:e2e:${tag}:${Date.now()}`,
      createdBy: 'observation:e2e',
    }),
  });
  if (status !== 201 || !body?.proposal?.id) throw new Error(`inject proposal failed: ${status} ${JSON.stringify(body).slice(0, 200)}`);
  return body.proposal;
}

async function attentionCount(apiCall) {
  const { body } = await apiCall('/api/product/attention');
  return (body.items ?? []).length;
}

async function main() {
  const executablePath = resolveExecutable();
  if (!executablePath) throw new Error('未找到浏览器');
  console.log(`[phase13-e2e] 浏览器: ${executablePath}`);
  console.log(`[phase13-e2e] 目标: ${E2E_URL}  BFF: ${BFF_URL}`);

  const token = await obtainToken();
  if (!token) throw new Error('需要 BFF 登录凭据（E2E 直接驱动既有 API 注入数据）');
  const apiCall = api(token);

  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  await page.addInitScript((tok) => {
    try {
      window.localStorage.setItem('pulse_opencode_token', tok);
      window.localStorage.setItem('pulse_username', 'e2e');
    } catch { /* ignore */ }
  }, token);

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  // 5xx 资源失败单独收集（含 URL）；排除 /api/opencode/*——opencode runtime（127.0.0.1:4096）
  // 不在运行时的 502 是环境依赖，与 Phase 13 链路无关
  const http5xx = [];
  page.on('response', (r) => {
    if (r.status() >= 500 && !r.url().includes('/api/opencode/')) http5xx.push(`${r.status()} ${r.url()}`);
  });

  // 跟踪 confirm 请求（negative：点卡体不得发出）
  const confirmRequests = [];
  page.on('request', (r) => {
    if (r.url().includes('/confirm')) confirmRequests.push(r.url());
  });

  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  const attBefore = await attentionCount(apiCall);

  // Step 1: 打开 Pulse
  await page.goto(E2E_URL, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(15000);

  // Step 2: 注入 P1 → SUGGESTED 卡经 SSE 出现（不重开页面）
  const p1 = await injectProposal(apiCall, 'CONFIRM-PATH');
  console.log(`[phase13-e2e] 注入 P1=${p1.id}`);
  let p1Visible = false;
  try {
    await page.locator(`[data-testid="suggestion-${p1.id}"]`).waitFor({ state: 'visible', timeout: 20000 });
    p1Visible = true;
  } catch { /* timeout */ }
  check('S2: proposal 注入后 Suggested 卡经 SSE 出现（不重开页面）', p1Visible);
  if (p1Visible) {
    const cardText = await page.locator(`[data-testid="suggestion-${p1.id}"]`).innerText();
    check('S2: 卡片四问齐备（为什么/确认后/撤销出口）',
      cardText.includes('为什么：') && cardText.includes('确认后：') && cardText.includes('撤销'),
      cardText.replace(/\n/g, ' | ').slice(0, 160));
  }

  // Step 3: 点卡体 → 无 confirm 请求（查看 ≠ 授权）
  if (p1Visible) {
    await page.locator(`[data-testid="suggestion-${p1.id}"]`).dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(3000);
    const { body } = await apiCall(`/api/product/assignment-proposals?status=proposed`);
    const stillProposed = (body.items ?? []).some((p) => p.id === p1.id);
    check('S3: 点卡体后 proposal 仍 proposed（无 confirm 请求）', stillProposed && confirmRequests.length === 0,
      `confirmRequests=${confirmRequests.length}`);
  } else {
    check('S3: 点卡体后 proposal 仍 proposed（无 confirm 请求）', false, '卡片未出现，跳过');
  }

  // Step 4: 点 [确认] → 卡片消失 + Assignment active
  let assignmentId = null;
  if (p1Visible) {
    await page.locator(`[data-testid="suggestion-confirm-${p1.id}"]`).dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(6000);
    const cardGone = !(await page.locator(`[data-testid="suggestion-${p1.id}"]`).isVisible().catch(() => false));
    check('S4: Confirm 后 Suggested 卡消失', cardGone);
    const { body: listBody } = await apiCall('/api/product/assignment-proposals?status=confirmed');
    const confirmed = (listBody.items ?? []).find((p) => p.id === p1.id);
    check('S4: BFF proposal confirmed', !!confirmed);
    // 定位 Assignment：经 provenance.proposalId 回链（resolution 回填是已知既有缺口，见最终报告）
    const { body: asgList } = await apiCall('/api/product/assignments');
    const asgItems = asgList?.items ?? [];
    const created = asgItems.find((a) => a.provenance?.proposalId === p1.id);
    assignmentId = created?.id ?? null;
    check('S4: Assignment 创建且 active（activation moment = confirm）', created?.state === 'active', `id=${assignmentId} state=${created?.state}`);
    check('S4: authorizationRef = confirmation:<proposalId>', String(created?.authorizationRef ?? '').includes(p1.id), created?.authorizationRef);

    // S4b: Memory tab → Responsibilities 可见（Phase 9 管理面）
    if (assignmentId) {
      const memoryTab = page.locator('text=Memory').first();
      if (await memoryTab.isVisible().catch(() => false)) {
        await memoryTab.dispatchEvent('click', { bubbles: true });
        await page.waitForTimeout(8000);
        const respCard = page.locator('[data-testid="memory-responsibilities"]').first();
        if (await respCard.isVisible().catch(() => false)) {
          await respCard.dispatchEvent('click', { bubbles: true });
          await page.waitForTimeout(8000);
        }
        const inList = await page.locator(`[data-testid="assign-${assignmentId}"]`).isVisible().catch(() => false);
        check('S4b: 激活的 Assignment 在 Responsibilities 可见', inList, `id=${assignmentId}`);
        // 回到 Pulse 供后续步骤使用
        await page.goto(E2E_URL, { waitUntil: 'load', timeout: 120000 });
        await page.waitForTimeout(12000);
      } else {
        check('S4b: 激活的 Assignment 在 Responsibilities 可见', false, 'Memory tab 不可见');
      }
    }
  } else {
    check('S4: Confirm 后 Suggested 卡消失', false, '跳过');
    check('S4: BFF proposal confirmed', false, '跳过');
    check('S4: Assignment 创建且 active（activation moment = confirm）', false, '跳过');
    check('S4: authorizationRef = confirmation:<proposalId>', false, '跳过');
  }

  // Step 5: 注入 P2 → 点 [不用了] → rejected、无 Assignment
  const p2 = await injectProposal(apiCall, 'REJECT-PATH');
  console.log(`[phase13-e2e] 注入 P2=${p2.id}`);
  let p2Visible = false;
  try {
    await page.locator(`[data-testid="suggestion-${p2.id}"]`).waitFor({ state: 'visible', timeout: 20000 });
    p2Visible = true;
  } catch { /* timeout */ }
  check('S5: 第二张 proposal 经 SSE 出现', p2Visible);
  if (p2Visible) {
    await page.locator(`[data-testid="suggestion-reject-${p2.id}"]`).dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(6000);
    const cardGone = !(await page.locator(`[data-testid="suggestion-${p2.id}"]`).isVisible().catch(() => false));
    check('S5: Reject 后卡片消失', cardGone);
    const { body: rejBody } = await apiCall('/api/product/assignment-proposals?status=rejected');
    const rejected = (rejBody.items ?? []).find((p) => p.id === p2.id);
    check('S5: BFF proposal rejected', !!rejected);
    if (assignmentId) {
      const { body: asgList } = await apiCall('/api/product/assignments');
      const asgItems = asgList?.items ?? asgList ?? [];
      const noNewAssignment = !asgItems.some((a) => a.provenance?.proposalId === p2.id);
      check('S5: Reject 未创建 Assignment', noNewAssignment);
    }
  } else {
    check('S5: Reject 后卡片消失', false, '跳过');
    check('S5: BFF proposal rejected', false, '跳过');
  }

  // Step 6: Attention 计数不变（无意外 Attention）
  const attAfter = await attentionCount(apiCall);
  check('S6: 全程无意外 Attention', attAfter === attBefore, `before=${attBefore} after=${attAfter}`);

  // Step 7: 清理——撤销 E2E 创建的 Assignment（revoked 惰性残留，不再触发）
  if (assignmentId) {
    const { status, body } = await apiCall(`/api/product/assignments/${assignmentId}/revoke`, {
      method: 'POST', body: JSON.stringify({}),
    });
    check('S7: 清理——E2E Assignment 已撤销', status === 200 && body?.item?.state === 'revoked', `status=${status}`);
  } else {
    check('S7: 清理——E2E Assignment 已撤销', false, 'no assignment created');
  }

  // JS 错误与非 opencode 5xx（opencode runtime 不在运行时的 502 是环境依赖，已按 URL 排除）
  const jsErrors = errors.filter((e) => !/Failed to load resource/.test(e) || !/502/.test(e));
  check('无 JS 错误 / 非 opencode 5xx', jsErrors.length === 0 && http5xx.length === 0,
    [...jsErrors, ...http5xx][0] ?? '');

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
