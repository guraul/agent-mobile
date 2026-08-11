#!/usr/bin/env node
/**
 * Pulse UI 端到端测试（Playwright）
 *
 * 用法:
 *   node scripts/e2e/pulse-e2e.mjs                # 跑全部步骤（含发消息，需确认）
 *   E2E_URL=http://127.0.0.1:9928/pulse node scripts/e2e/pulse-e2e.mjs
 *   E2E_NO_SEND=1 node scripts/e2e/pulse-e2e.mjs  # 跳过发消息步骤
 *
 * 浏览器路径自动探测（优先 headless shell，其次 snap chromium）。
 * 需在项目外依赖 Playwright：从 playwright-skill 的 node_modules 解析。
 */
import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
const { chromium } = pw;

const E2E_URL = process.env.E2E_URL || 'http://127.0.0.1:9928/pulse';
const NO_SEND = !!process.env.E2E_NO_SEND;

import { existsSync } from 'node:fs';

const EXECUTABLE_CANDIDATES = [
  '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  '/snap/bin/chromium',
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

  // Step 1: Pulse 首页 / 项目事件
  const pulseVisible = await page.locator('text=Pulse').first().isVisible().catch(() => false);
  check('Pulse 首页可见', pulseVisible);
  const groupNeedsYou = await page.locator('text=NEEDS YOU').first().isVisible().catch(() => false);
  const groupToday = await page.locator('text=TODAY').first().isVisible().catch(() => false);
  check('项目分组显示 (Needs you / Today)', groupNeedsYou || groupToday, `needsYou=${groupNeedsYou} today=${groupToday}`);

  // 取第一个可见的项目事件条目（分组标题下方的项目卡片）
  const projectEventItem = page.locator('[data-testid^="project-"]').first();
  const projectVisible = await projectEventItem.isVisible().catch(() => false);
  check('项目事件条目可见', projectVisible);

  // Step 2: 点击项目 → 直接进入对话
  let hasTextarea = false;
  let chatRendered = false;
  if (projectVisible) {
    await projectEventItem.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(8000);
    const sheetVisible = await page.locator('[data-testid="project-chat-sheet"]').first().isVisible().catch(() => false);
    hasTextarea = (await page.locator('textarea').count()) > 0;
    chatRendered = hasTextarea;
    check('点击项目打开对话面板 (含输入框)', sheetVisible && chatRendered, `sheet=${sheetVisible} textarea=${hasTextarea}`);
  } else {
    check('点击项目打开对话面板 (含输入框)', false, '未找到项目事件条目');
  }

  // Step 4: 发消息验证流式（可选，默认启用）
  if (!NO_SEND && hasTextarea) {
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
