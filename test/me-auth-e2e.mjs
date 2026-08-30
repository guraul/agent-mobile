#!/usr/bin/env node
/**
 * Me 页登录态 E2E：Pulse 登录 → Me 显示用户名 → Card3 agent 行 → model 选择 sheet
 * （搜索过滤 + 选中持久化）→ 登出回未登录。
 * 前置：9928 静态版 + BFF(19234) + opencode(4096) 已运行。
 * 凭据从 family-finance .env.local 读，不写死。
 */
import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
const { chromium } = pw;
import { readFileSync } from 'node:fs';

const BASE = process.env.E2E_URL || 'http://127.0.0.1:9928';
const EXECUTABLE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';
const env = readFileSync('/root/project/family-finance/packages/web/.env.local', 'utf8');
const getUser = (k) => env.split('\n').find((l) => l.startsWith(k + '='))?.slice(k.length + 1).trim();
const USER = getUser('ADMIN_USERNAME');
const PASS = getUser('ADMIN_PASSWORD');

async function click(page, selector) {
  await page.locator(selector).first().dispatchEvent('click', { bubbles: true });
}

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const results = [];
  const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  const waitText = async (t, timeout = 15000) => {
    await page.locator(`text=${t}`).first().waitFor({ state: 'visible', timeout }).catch(() => {});
    return page.locator(`text=${t}`).first().isVisible().catch(() => false);
  };

  // Step 1: Pulse 未登录 → 点横幅开登录 sheet
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  check('Pulse 未登录横幅', await waitText('未登录 — 点击登录'));
  await click(page, 'text=未登录 — 点击登录');
  await waitText('登录 Pulse', 5000);

  // Step 2: 填账号密码登录
  await page.locator('input[placeholder="账号"]').fill(USER);
  await page.locator('input[placeholder="密码"]').fill(PASS);
  await click(page, 'text="登录"');
  await page.waitForFunction(() => !document.body.innerText.includes('未登录 — 点击登录'), { timeout: 15000 }).catch(() => {});
  check('登录后横幅消失', !(await page.locator('text=未登录 — 点击登录').isVisible().catch(() => false)));

  // Step 3: 进 Me 页 → 用户名 + 登出按钮 + Card3 agent 行
  await page.goto(`${BASE}/me`, { waitUntil: 'load', timeout: 60000 });
  check('Me 显示用户名', await waitText(USER, 20000));
  check('登出按钮出现', await page.locator('[data-testid="me-logout"]').isVisible().catch(() => false));
  const agentRow = page.locator('[data-testid^="me-agent-"]').first();
  await agentRow.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  const agentCount = await page.locator('[data-testid^="me-agent-"]').count();
  check('Card3 agent 行渲染', agentCount > 0, `count=${agentCount}`);
  const agentId = await agentRow.getAttribute('data-testid').catch(() => null);

  // Step 4: model 选择 sheet → 搜索过滤 → 选中持久化
  let sheetOk = false, filterOk = false, prefOk = false, picked = '';
  if (agentId) {
    await click(page, `[data-testid="${agentId}"]`);
    await page.locator('[data-testid="me-model-search"]').waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
    sheetOk = await page.locator('[data-testid="me-model-sheet"]').isVisible().catch(() => false);
    // 排除 sheet 容器/遮罩/搜索框/清除/确认按钮,只数 model 行
    const rowSel = '[data-testid^="me-model-"]:not([data-testid="me-model-sheet"]):not([data-testid="me-model-sheet-scrim"]):not([data-testid="me-model-search"]):not([data-testid="me-model-search-clear"]):not([data-testid="me-model-confirm"])';
    // listProviders 首次请求在 next dev 下要现场编译,可能数秒后才出行
    await page.locator(rowSel).first().waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
    const before = await page.locator(rowSel).count();
    console.log(`  [debug] rows before=${before}`);
    await page.locator('[data-testid="me-model-search"]').fill('pro');
    await page.waitForTimeout(800);
    const after = await page.locator(rowSel).count();
    console.log(`  [debug] rows after(pro)=${after}`);
    filterOk = before > 1 ? (after > 0 && after < before) : after > 0;
    const row = page.locator(rowSel).first();
    picked = (await row.getAttribute('data-testid').catch(() => '')) || '';
    if (picked) {
      await click(page, `[data-testid="${picked}"]`);
      await page.waitForTimeout(500);
      const prefKey = `pulse_model_pref_${agentId.replace('me-agent-', '')}`;
      const raw = await page.evaluate((k) => localStorage.getItem(k), prefKey);
      prefOk = !!raw && raw.includes(picked.replace('me-model-', ''));
    }
    await page.screenshot({ path: '/root/project/agent-mobile/test/me-auth-e2e.png' });
  }
  check('model sheet 打开', sheetOk);
  check('搜索过滤生效(lite)', filterOk);
  check('选中写入 AsyncStorage', prefOk, picked);

  // Step 4.5: ChatPanel 默认 pill 读 Me 偏好（优先级：Me 偏好 > session model > fallback）
  let pillOk = false;
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  const proj = page.locator('[data-testid^="project-"]').first();
  await proj.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  if (!(await proj.isVisible().catch(() => false))) {
    // 无活跃项目 → 展开 OTHER PROJECTS（idle 项目同样可打开聊天）
    await click(page, 'text=OTHER PROJECTS');
    await proj.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  }
  if (await proj.isVisible().catch(() => false)) {
    let sheetVisible = false;
    for (let attempt = 1; attempt <= 3 && !sheetVisible; attempt++) {
      await page.waitForTimeout(2000 * attempt); // 等 Pressable 手势系统就绪
      await click(page, '[data-testid^="project-"]');
      sheetVisible = await page.locator('[data-testid="project-chat-sheet"]').waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
      console.log(`  [debug] attempt ${attempt}: chat sheet visible=${sheetVisible}, textarea=${await page.locator('textarea').count()}`);
    }
    pillOk = await waitText(picked.replace('me-model-', ''), 25000);
    if (!pillOk) {
      const texts = await page.evaluate(() => document.body.innerText.split('\n').filter((l) => /deepseek|build|plan/i.test(l)).slice(0, 8));
      console.log('  [debug] chat 相关文本:', JSON.stringify(texts));
      await page.screenshot({ path: '/root/project/agent-mobile/test/me-pill-debug.png' });
    }
  } else {
    console.log('  [debug] Pulse 无可见项目行,跳过 pill 检查');
  }
  check('ChatPanel 默认 pill 读 Me 偏好', pillOk, picked.replace('me-model-', ''));

  // Step 5: 回 Me 页登出 → 回未登录态 + 本地 token 清除
  await page.goto(`${BASE}/me`, { waitUntil: 'load', timeout: 60000 });
  await page.locator('[data-testid="me-logout"]').waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  await click(page, '[data-testid="me-logout"]');
  await page.waitForTimeout(1500);
  check('登出后显示未登录', await waitText('未登录', 8000));
  const tokenGone = await page.evaluate(() => localStorage.getItem('pulse_opencode_token'));
  check('本地 token 已清', tokenGone === null, `got=${tokenGone ? tokenGone.slice(0, 12) + '…' : 'null'}`);
  const userGone = await page.evaluate(() => localStorage.getItem('pulse_username'));
  check('本地 username 已清', userGone === null);

  const failed = results.filter((r) => !r).length;
  console.log(`\n[auth-e2e] ${results.length - failed}/${results.length} 通过`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
