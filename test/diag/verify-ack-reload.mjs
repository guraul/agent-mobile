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
await page.waitForTimeout(12000);

// 1. 触发 trade-alert（先清除旧的 ack 状态，触发新的）
const TOKEN = await page.evaluate(() => localStorage.getItem('pulse_opencode_token'));
const { execSync } = await import('node:child_process');
execSync(`curl -s -m 30 -X POST http://127.0.0.1:19234/api/scheduler/fund-estimation/run -H "Authorization: Bearer ${TOKEN}"`);
let hasAlert = false;
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1000);
  if (await page.evaluate(() => document.body.innerText.includes('有基金需要交易'))) { hasAlert = true; break; }
}
console.log('STEP1 alert 出现:', hasAlert);

// 2. 点击 MARKET → 打开详情 sheet → 确认处理
await page.evaluate(() => {
  const el = document.querySelector('[aria-label="有基金需要交易"]');
  if (el) el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(800);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('div,span,button')].filter(d => d.textContent && d.textContent.trim() === '确认处理');
  if (btns[0]) btns[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(1500);
const afterConfirm = await page.evaluate(() => !document.body.innerText.includes('有基金需要交易'));
console.log('STEP2 确认处理后提醒消失:', afterConfirm);

// 3. 刷新页面
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(12000);
const afterReload = await page.evaluate(() => {
  const t = document.body.innerText;
  return { hasAlert: t.includes('有基金需要交易'), hasMarket: t.includes('MARKET') };
});
console.log('STEP3 刷新后:', JSON.stringify(afterReload));
console.log('刷新后不回到 needs-you:', !afterReload.hasAlert && afterReload.hasMarket);
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/ack-reload-check.png' });
await browser.close();
