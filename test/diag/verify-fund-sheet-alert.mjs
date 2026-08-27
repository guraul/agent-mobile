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

// 触发 trade-alert
const TOKEN = await page.evaluate(() => localStorage.getItem('pulse_opencode_token'));
const { execSync } = await import('node:child_process');
execSync(`curl -s -m 30 -X POST http://127.0.0.1:19234/api/scheduler/fund-estimation/run -H "Authorization: Bearer ${TOKEN}"`);
let hasAlert = false;
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1000);
  if (await page.evaluate(() => document.body.innerText.includes('有基金需要交易'))) { hasAlert = true; break; }
}
console.log('alert present:', hasAlert);

// 有提醒：点 MARKET（aria-label="有基金需要交易"）
const clicked = await page.evaluate(() => {
  const el = document.querySelector('[aria-label="有基金需要交易"]');
  if (!el) return false;
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
});
await page.waitForTimeout(800);
const sheet = await page.evaluate(() => {
  const s = document.querySelector('[data-testid="fund-sheet"]');
  if (!s) return { seen: false };
  return { seen: true, text: s.innerText.slice(0, 300) };
});
console.log('clicked market (alert):', clicked);
console.log('fund sheet (alert):', JSON.stringify(sheet, null, 2));
const hasDiff = sheet.seen && sheet.text.includes('有基金需要交易') && sheet.text.includes('超出');
const hasConfirm = sheet.seen && sheet.text.includes('确认处理');
console.log('shows diff 详情 + 确认处理:', hasDiff && hasConfirm);

// 确认处理 → 回落
const confirmed = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('div,span,button')].filter(d => d.textContent && d.textContent.trim() === '确认处理');
  if (!btns.length) return false;
  btns[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
});
await page.waitForTimeout(800);
const after = await page.evaluate(() => {
  const t = document.body.innerText;
  return { hasAlertText: t.includes('有基金需要交易'), sheetClosed: !document.querySelector('[data-testid="fund-sheet"]') };
});
console.log('confirmed:', confirmed, 'after:', JSON.stringify(after));
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/fund-sheet-alert.png' });
await browser.close();
