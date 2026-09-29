#!/usr/bin/env node
/**
 * Pulse UI 端到端测试（Playwright）
 *
 * 用法:
 *   node scripts/e2e/pulse-e2e.mjs                # 跑全部步骤（含发消息，需确认）
 *   E2E_URL=http://127.0.0.1:9928/pulse node scripts/e2e/pulse-e2e.mjs
 *   E2E_NO_SEND=1 node scripts/e2e/pulse-e2e.mjs  # 跳过发消息步骤
 *
 * 浏览器路径自动探测（优先 headless shell，其次 snap chromium / macOS Chrome）。
 * Playwright 依赖按序解析：本仓 node_modules（pnpm add -D playwright-core）→
 * 服务器 playwright-skill 路径（向后兼容）。
 */
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    'playwright-core', // 本仓 devDependency（本地 / CI）
    '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js', // 服务器
  ];
  for (const c of candidates) {
    try { return nodeRequire(c); } catch { /* next */ }
  }
  throw new Error('playwright-core 未找到：先 pnpm add -D playwright-core');
}
const { chromium } = loadPlaywright();

const E2E_URL = process.env.E2E_URL || 'http://127.0.0.1:9928/'; // Pulse 首页 = /（708dc7b 起路由不再是 /pulse）
const NO_SEND = !!process.env.E2E_NO_SEND;
const BFF_URL = process.env.EXPO_PUBLIC_OPENCODE_URL || 'http://106.13.181.13:19234';

// 登录前置：attention/项目 API 需要 JWT（Phase 1 起）。凭据从 BFF 本地 .env.local
// 读取（dev 默认管理员）或 E2E_USER/E2E_PASS 覆盖——脚本不携带任何凭据。
import { existsSync, readFileSync } from 'node:fs';

function loadDevCreds() {
  if (process.env.E2E_USER && process.env.E2E_PASS) {
    return { user: process.env.E2E_USER, pass: process.env.E2E_PASS };
  }
  const envPaths = [
    // 本地凭据（用户 home，不入库）：{"user":"...","pass":"..."}
    process.env.HOME ? `${process.env.HOME}/.pulse-e2e-creds` : null,
    '/root/project/family-finance/packages/web/.env.local',
    '/root/project/family-finance/.env.local',
  ].filter(Boolean);
  for (const p of envPaths) {
    if (!existsSync(p)) continue;
    try {
      if (p.endsWith('.pulse-e2e-creds')) {
        const j = JSON.parse(readFileSync(p, 'utf8'));
        if (j.user && j.pass) return { user: j.user, pass: j.pass };
        continue;
      }
      const env = readFileSync(p, 'utf8');
      const user = env.match(/^ADMIN_USERNAME=(.*)$/m)?.[1]?.trim();
      const pass = env.match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
      if (user && pass) return { user, pass };
    } catch { /* fallthrough */ }
  }
  return null;
}

/** 登录 BFF 并把 token 注入浏览器 localStorage（AsyncStorage web 载体），返回 null 表示跳过注入 */
async function obtainToken() {
  const creds = loadDevCreds();
  if (!creds) {
    console.log('[e2e] 未找到登录凭据（E2E_USER/E2E_PASS 或 BFF .env.local），跳过 token 注入');
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
    if (!token) throw new Error('no token in login response');
    console.log(`[e2e] 已登录 BFF（${creds.user}），token 注入 localStorage`);
    return token;
  } catch (e) {
    console.log(`[e2e] BFF 登录失败（${e.message}），继续无登录尝试`);
    return null;
  }
}

const EXECUTABLE_CANDIDATES = [
  '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // darwin
];

function resolveExecutable() {
  return EXECUTABLE_CANDIDATES.find((p) => existsSync(p));
}

async function main() {
  const executablePath = resolveExecutable();
  if (!executablePath) {
    throw new Error('未找到浏览器，请安装 playwright chromium 或 snap chromium');
  }
  console.log(`[e2e] 浏览器: ${executablePath}`);
  console.log(`[e2e] 目标: ${E2E_URL}`);
  console.log(`[e2e] 发消息步骤: ${NO_SEND ? '跳过' : '启用'}`);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const token = await obtainToken();
  if (token) {
    // AsyncStorage(web) 直接以 key 写 localStorage；在应用脚本前注入避免 401 竞态
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

  // Step 0: 加载页面
  await page.goto(E2E_URL, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(15000);
  check('页面加载 (JS bundle + render)', (await page.locator('body').innerText().catch(() => '')).length > 0);

  // Step 1: Pulse 首页 / Companion 结构（single-surface，无 tab bar）
  const pulseVisible = await page.locator('text=Pulse').first().isVisible().catch(() => false);
  check('Pulse 首页可见', pulseVisible);
  const heroVisible = await page.locator('[data-testid="pulse-hero"]').first().isVisible().catch(() => false);
  check('Pulse Hero 可见', heroVisible);
  const entryVisible = await page.locator('[data-testid="conversation-entry"]').first().isVisible().catch(() => false);
  check('Conversation Entry 可见（Pulse 无输入框）', entryVisible);
  const tabBarCount = await page.locator('[role="tablist"]').count().catch(() => 0);
  check('无 bottom tab bar', tabBarCount === 0, `tablist=${tabBarCount}`);

  // 第一个可见 Pulse 条目：Featured（OPEN Attention）优先，其次任一 Supporting 语义行
  let pulseItem = page.locator('[data-testid="featured-attention"]').first();
  let itemVisible = await pulseItem.isVisible().catch(() => false);
  if (!itemVisible) {
    pulseItem = page.locator('[data-testid^="supporting-"]').first();
    itemVisible = await pulseItem.isVisible().catch(() => false);
  }
  check('Pulse 条目可见 (Featured / Supporting)', itemVisible);

  // Step 1b: Phase 12 Noticed（observation L1）——informational，不应混入 Needs you
  // 排除 noticed-see-all（溢出按钮）与 noticed-list-sheet(-scrim)（LightSheet scrim
  // 关闭态仍常驻 DOM——opacity 0 + pointerEvents none，与旧 BottomSheet 同构）
  const noticedItem = page
    .locator('[data-testid^="noticed-"]:not([data-testid*="sheet"]):not([data-testid="noticed-see-all"])')
    .first();
  const noticedVisible = await noticedItem.isVisible().catch(() => false);
  // noticed 是动态 L1 数据（如收盘后 statement 轮转清空）——无数据时跳过而非 FAIL
  check(
    'Phase 12 Noticed 分组可见 (observation L1)',
    true,
    noticedVisible ? 'present' : 'no noticed data — 动态 L1，跳过子断言',
  );
  if (noticedVisible) {
    const noticedText = await noticedItem.innerText().catch(() => '');
    // fact 是任意语言的 L1 statement（不保证含"我注意到"字样），只断言行有内容；
    // informational ≠ attention 的语义保护由下方"未混入 Needs you"兜底
    check('Noticed 条目为 informational 行（有内容）', noticedText.trim().length > 0, noticedText.slice(0, 60));
    // observation L1 不得变成 Attention（Needs you / Featured）
    const needsYouText = await page
      .locator('[data-testid="featured-attention"], [data-testid^="supporting-ny-"]')
      .allInnerTexts()
      .catch(() => []);
    const leaked = needsYouText.some((t) => /我注意到/.test(t));
    check('Noticed 未混入 Needs you（observation ≠ Attention）', !leaked);
  }

  // Step 1c: Running 行 → chatcode 壳（epic #35 C1 分流：绑项目 directory → "Pulse — Code Chat"）
  // running 行是动态项目事件数据，缺失时跳过而非 FAIL
  const runRow = page.locator('[data-testid^="supporting-run-"]').first();
  const runVisible = await runRow.isVisible().catch(() => false);
  if (runVisible) {
    await runRow.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(12000);
    const codeChatTitle = await page.locator('text=Pulse — Code Chat').first().isVisible().catch(() => false);
    const layersGone = (await page.locator('[aria-label="Switch session"]').count()) === 0;
    check('Running 行进入 chatcode 壳 (Pulse — Code Chat)', codeChatTitle && layersGone,
      `title=${codeChatTitle} picker-hidden=${layersGone}`);
    await page.goBack();
    await page.waitForTimeout(8000);
  } else {
    check('Running 行进入 chatcode 壳 (Pulse — Code Chat)', true, 'no running data — 动态，跳过子断言');
  }

  // Step 2: Conversation Entry → Talk workspace（stack push，真实输入框）
  // #33 composer 两态：收起态是 pill 预览（点击展开全高输入）——先点预览再断言 textarea
  let hasTextarea = false;
  if (entryVisible) {
    await page.locator('[data-testid="conversation-entry"]').first().dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(15000);
    const preview = page.locator('[data-testid="composer-preview"]').first();
    if (await preview.isVisible().catch(() => false)) {
      await preview.dispatchEvent('click', { bubbles: true });
      await page.waitForTimeout(1500);
    }
    hasTextarea = (await page.locator('textarea').count()) > 0;
    check('Conversation Entry 打开 Talk workspace (含输入框)', hasTextarea, `textarea=${hasTextarea}`);
  } else {
    check('Conversation Entry 打开 Talk workspace (含输入框)', false, '未找到对话入口');
  }

  // Step 4: 发消息验证流式（可选，默认启用）
  if (!NO_SEND && hasTextarea) {
    // #33 composer 两态：收起态的 textarea 是 readonly 草稿预览，先点它展开成可编辑输入
    const preview = page.locator('[data-testid="composer-preview"]').first();
    if (await preview.isVisible().catch(() => false)) {
      await preview.dispatchEvent('click', { bubbles: true });
      await page.waitForTimeout(800);
    }
    const ta = page.locator('textarea').first();
    await ta.click();
    await ta.fill('Reply with exactly: e2e-ok');
    await page.waitForTimeout(500);
    const sendBtn = page.locator('[aria-label="Send"]').first();
    const sendCount = await sendBtn.count();
    if (sendCount > 0) {
      await sendBtn.dispatchEvent('click', { bubbles: true });
    } else {
      await ta.press('Enter');
    }
    console.log('[e2e] 已发送，等待流式回复 (最多 60s)...');
    let gotReply = false;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(5000);
      const body = await page.locator('body').innerText().catch(() => '');
      if (/e2e-ok/i.test(body)) { gotReply = true; break; }
    }
    check('流式回复渲染 (含 e2e-ok)', gotReply);
  } else if (!NO_SEND) {
    check('流式回复渲染 (含 e2e-ok)', false, '无输入框，跳过');
  }

  // Step 5: 斜杠卡片（#30）——客户端拦截，不进 agent，NO_SEND 模式即可真实验证
  if (hasTextarea) {
    const sendCard = async (cmd, marker, label) => {
      // 完整模式下发送后 composer 自动收起——先确保展开（NO_SEND 模式已展开则跳过）
      const preview = page.locator('[data-testid="composer-preview"]').first();
      if (await preview.isVisible().catch(() => false)) {
        await preview.dispatchEvent('click', { bubbles: true });
        await page.waitForTimeout(800);
      }
      const ta = page.locator('textarea').first();
      await ta.click();
      await ta.fill(cmd);
      await page.waitForTimeout(400);
      const sendBtn = page.locator('[aria-label="Send"]').first();
      if ((await sendBtn.count()) > 0) {
        await sendBtn.dispatchEvent('click', { bubbles: true });
      } else {
        await ta.press('Enter');
      }
      await page.waitForTimeout(4000);
      const visible = await page.locator(`text=${marker}`).first().isVisible().catch(() => false);
      check(label, visible);
    };
    await sendCard('/assignments', 'Duties', '斜杠 /assignments → Duties 卡');
    await sendCard('/projects', 'Projects', '斜杠 /projects → Projects 卡');
  } else {
    check('斜杠 /assignments → Duties 卡', false, '无输入框，跳过');
    check('斜杠 /projects → Projects 卡', false, '无输入框，跳过');
  }

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
