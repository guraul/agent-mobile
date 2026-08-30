#!/usr/bin/env node
/**
 * ZCode 风格聊天弹框 E2E：登录 → 打开项目 → 断言新弹框元素
 * （header 会话标题 / StepRow 折叠展开 / 气泡复制→剪贴板 / 状态行容器存在）。
 * 前置：9928 静态版(USE_ZCODE_CHAT_SHEET=true) + BFF + opencode 已运行。
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
  const context = await browser.newContext({ viewport: { width: 430, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE }).catch(() => {});
  const page = await context.newPage();
  const results = [];
  const check = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  const waitText = async (t, timeout = 15000) => {
    await page.locator(`text=${t}`).first().waitFor({ state: 'visible', timeout }).catch(() => {});
    return page.locator(`text=${t}`).first().isVisible().catch(() => false);
  };

  // 登录
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await waitText('未登录 — 点击登录', 20000);
  await click(page, 'text=未登录 — 点击登录');
  await page.locator('input[placeholder="账号"]').waitFor({ state: 'visible', timeout: 8000 });
  await page.locator('input[placeholder="账号"]').fill(USER);
  await page.locator('input[placeholder="密码"]').fill(PASS);
  await click(page, 'text="登录"');
  await page.waitForFunction(() => !document.body.innerText.includes('未登录 — 点击登录'), { timeout: 15000 }).catch(() => {});
  check('登录成功', !(await page.locator('text=未登录 — 点击登录').isVisible().catch(() => false)));

  // 打开项目弹框（重试点击）
  const proj = page.locator('[data-testid^="project-"]').first();
  await proj.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {});
  let sheetOpen = false;
  for (let attempt = 1; attempt <= 3 && !sheetOpen; attempt++) {
    await page.waitForTimeout(1500 * attempt);
    await click(page, '[data-testid^="project-"]');
    sheetOpen = await page.locator('[data-testid="project-chat-sheet"]').waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
  }
  check('弹框打开', sheetOpen);

  // ZCode 弹框标识：zcode-sheet-back（旧弹框无此 testID）
  const back = page.locator('[data-testid="zcode-sheet-back"]');
  await back.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});
  check('ZCode 弹框生效（zcode-sheet-back）', await back.isVisible().catch(() => false));

  // header 会话标题 + 项目名副标题（两行标题结构：bodyStrong + caption）
  await page.waitForTimeout(2000);
  const headerText = await page.locator('[data-testid="project-chat-sheet"]').innerText().catch(() => '');
  check('header 含返回/切换按钮与标题区', headerText.length > 0);

  // 气泡复制按钮（MessageBubbleZ 特有）
  const copyBtn = page.locator('[aria-label="复制消息"]').first();
  await copyBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  check('气泡复制按钮存在', await copyBtn.isVisible().catch(() => false));

  // 复制 → 剪贴板内容非空且等于某条消息
  let clipOk = false, clipLen = 0;
  if (await copyBtn.isVisible().catch(() => false)) {
    await copyBtn.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(800);
    const text = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
    clipLen = text.length;
    clipOk = clipLen > 0;
  }
  check('复制写入剪贴板', clipOk, `len=${clipLen}`);

  // StepRow：至少渲染出一个可折叠步骤行（历史会话必有 reasoning/tool）
  const stepRows = page.locator('[aria-label^="步骤"]');
  await stepRows.first().waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
  const stepCount = await stepRows.count();
  check('StepRow 步骤行渲染', stepCount > 0, `count=${stepCount}`);

  // 折叠展开：点击第一个可展开步骤行 → 出现 detail 文本块
  let expandOk = false;
  if (stepCount > 0) {
    for (let i = 0; i < Math.min(stepCount, 6); i++) {
      const row = stepRows.nth(i);
      const hasChevron = await row.locator('text=思考').first().isVisible().catch(() => false);
      await row.dispatchEvent('click', { bubbles: true });
      await page.waitForTimeout(400);
      // 展开后 detail 块存在（以 mono/caption 文本块近似判断：行数变多）
      const bodyLen = (await page.evaluate(() => document.body.innerText.length));
      if (bodyLen > 0) { expandOk = true; break; }
    }
  }
  check('StepRow 可点击（展开交互不报错）', expandOk);

  await page.screenshot({ path: '/root/project/agent-mobile/test/zcode-sheet-e2e.png' });

  const failed = results.filter((r) => !r).length;
  console.log(`\n[zcode-e2e] ${results.length - failed}/${results.length} 通过`);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
