#!/usr/bin/env node
/**
 * Me 页 E2E 验收（Playwright，本地 dist 静态导出）
 *
 * 覆盖：三 Card 渲染 / 未登录态 / BFF 地址保存-恢复往返（AsyncStorage）
 * 不覆盖（需 BFF 登录，本机不可达 106.13.181.13）：model 选择 sheet、登出、ChatPanel pill
 *
 * 用法: node test/me-e2e.mjs
 */
import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
const { chromium } = pw;
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = '/root/project/agent-mobile/agent-mobile-app/dist';
const PORT = 9930;
const BASE = `http://127.0.0.1:${PORT}`;
const EXECUTABLE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.map': 'application/json',
};

const server = createServer(async (req, res) => {
  let path = decodeURIComponent((req.url || '/').split('?')[0]);
  if (path === '/') path = '/index.html';
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT)) return res.writeHead(403).end();
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(data);
  } catch {
    try {
      const data = await readFile(file + '.html');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    } catch {
      res.writeHead(404).end('Not Found');
    }
  }
});

async function waitText(page, text, timeout = 30000) {
  await page.locator(`text=${text}`).first().waitFor({ state: 'visible', timeout }).catch(() => {});
  return page.locator(`text=${text}`).first().isVisible().catch(() => false);
}

async function clickTestId(page, testId) {
  await page.locator(`[data-testid="${testId}"]`).first().dispatchEvent('click', { bubbles: true });
}

async function main() {
  if (!existsSync(EXECUTABLE)) throw new Error('未找到 headless chromium');
  await new Promise((r) => server.listen(PORT, r));
  console.log(`[e2e] 静态服务: ${BASE}/me.html`);

  const browser = await chromium.launch({ executablePath: EXECUTABLE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  // Step 0: 加载 Me 页（/me → me.html；直接请求 me.html 会 Unmatched Route）
  await page.goto(`${BASE}/me`, { waitUntil: 'load', timeout: 60000 });
  await waitText(page, 'BFF 地址');
  check('Me 页加载（Card 2 标题可见）', await waitText(page, 'BFF 地址', 10000));

  // Step 1: Card 1 连接与账号（未登录态 + BFF 不可达离线）
  check('Card 1 未登录态', await waitText(page, '未登录', 5000));
  check('Card 1 离线点（BFF 本机不可达）', await waitText(page, '离线', 5000));
  check('Card 1 去登录按钮', await page.locator('[data-testid="me-goto-login"]').isVisible().catch(() => false));

  // Step 2: Card 2 BFF 地址默认态
  const addrText = await page.locator('[data-testid="me-card-bff"]').innerText().catch(() => '');
  check('Card 2 显示默认地址', addrText.includes('(默认)'), addrText.split('\n').slice(0, 4).join(' | '));

  // Step 3: 保存新地址 → 提示重启生效 + AsyncStorage 写入
  const input = page.locator('[data-testid="me-bff-input"] input, [data-testid="me-bff-input"]').first();
  await input.fill('http://10.0.0.9:9999');
  await clickTestId(page, 'me-bff-save');
  check('保存后提示重启生效', await waitText(page, '保存后重启生效', 5000));
  const stored = await page.evaluate(() => localStorage.getItem('pulse_bff_url'));
  check('AsyncStorage pulse_bff_url 已写', stored === 'http://10.0.0.9:9999', `got=${stored}`);
  await page.screenshot({ path: '/root/project/agent-mobile/test/me-e2e-saved.png' });

  // Step 4: 恢复默认 → 回 env 默认 + AsyncStorage 清除
  await clickTestId(page, 'me-bff-reset');
  await page.waitForTimeout(500);
  const stored2 = await page.evaluate(() => localStorage.getItem('pulse_bff_url'));
  check('恢复默认后 pulse_bff_url 清除', stored2 === null, `got=${stored2}`);
  const addrText2 = await page.locator('[data-testid="me-card-bff"]').innerText().catch(() => '');
  check('恢复默认后显示 (默认)', addrText2.includes('(默认)'));

  // Step 5: Card 3 model 偏好（未登录无 agent 行，仅标题）
  check('Card 3 model 偏好标题', await page.locator('[data-testid="me-card-model"]').isVisible().catch(() => false));

  // Step 6: 底部 tab 切换回 Pulse 再回来
  await page.locator('text=Pulse').first().dispatchEvent('click', { bubbles: true }).catch(() => {});
  await page.waitForTimeout(3000);
  const backOnPulse = await waitText(page, 'NEEDS YOU', 5000) || (await page.locator('body').innerText()).includes('Good');
  check('切回 Pulse tab', backOnPulse);

  await page.screenshot({ path: '/root/project/agent-mobile/test/me-e2e-final.png', fullPage: true });

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n[e2e] ${results.length - failed}/${results.length} 通过；console/page 错误 ${errors.length} 条`);
  for (const e of errors.slice(0, 5)) console.log('  ' + e.slice(0, 200));
  await browser.close();
  server.close();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
