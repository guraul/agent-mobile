import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(10000);

// 无提醒态：点 MARKET 条目（aria-label="基金行情"）
const clicked = await page.evaluate(() => {
  const el = document.querySelector('[aria-label="基金行情"]');
  if (!el) return false;
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
});
await page.waitForTimeout(800);
console.log('clicked market (no alert):', clicked);
const sheet = await page.evaluate(() => {
  const s = document.querySelector('[data-testid="fund-sheet"]');
  if (!s) return { seen: false };
  return { seen: true, text: s.innerText.slice(0, 300) };
});
console.log('fund sheet:', JSON.stringify(sheet, null, 2));
const hasEstimate = sheet.seen && /(\d\.\d{4})/.test(sheet.text) && sheet.text.includes('基金行情');
console.log('shows 基金行情 + 实时估值:', hasEstimate);
const hasConfirm = sheet.seen && sheet.text.includes('确认处理');
console.log('shows 确认处理 (无提醒不应有):', hasConfirm);
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/fund-sheet-no-alert.png' });
await browser.close();
