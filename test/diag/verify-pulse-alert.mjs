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

// 触发 fund-estimation（会产生 trade-alert 事件推给 SSE）
const triggerRes = await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/scheduler/fund-estimation/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('pulse_opencode_token') },
  });
  return { status: res.status, body: (await res.text()).slice(0, 200) };
});
console.log('trigger fund-estimation:', JSON.stringify(triggerRes));

// 等 trade-alert 事件到达 → needs-you 提示出现
let hasAlert = false;
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(1000);
  hasAlert = await page.evaluate(() => document.body.innerText.includes('有基金需要交易'));
  if (hasAlert) { console.log('TRADE ALERT needs-you appeared after ~' + (i + 1) + 's'); break; }
}
console.log('needs-you 有基金需要交易 出现:', hasAlert);
const detail = await page.evaluate(() => {
  const t = document.body.innerText;
  const idx = t.indexOf('有基金需要交易');
  return idx >= 0 ? t.slice(idx, idx + 120) : '';
});
console.log('提醒详情:', JSON.stringify(detail));
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/pulse-trade-alert.png' });
await browser.close();
