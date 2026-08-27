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

// 触发 fund-estimation → trade-alert
const TOKEN = await page.evaluate(() => localStorage.getItem('pulse_opencode_token'));
const { execSync } = await import('node:child_process');
const resp = execSync(`curl -s -m 30 -X POST http://127.0.0.1:19234/api/scheduler/fund-estimation/run -H "Authorization: Bearer ${TOKEN}"`).toString();
console.log('trigger:', resp.slice(0, 120));

let hasAlert = false;
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1000);
  hasAlert = await page.evaluate(() => document.body.innerText.includes('有基金需要交易'));
  if (hasAlert) { console.log('alert appeared ~' + (i + 1) + 's'); break; }
}

const state = await page.evaluate(() => {
  const t = document.body.innerText;
  const lines = t.split('\n');
  const idxNeeds = lines.indexOf('NEEDS YOU');
  const idxMarket = lines.indexOf('MARKET');
  const hasAlertText = t.includes('有基金需要交易');
  const alertIdx = lines.findIndex(l => l.includes('有基金需要交易'));
  // MARKET 条目是否在 NEEDS YOU 内（紧跟其后）
  const marketInsideNeeds = idxMarket > idxNeeds && (idxNeeds >= 0);
  return {
    hasAlertText,
    alertIdx,
    marketInsideNeeds,
    marketAfterNeedsImmediately: idxMarket === idxNeeds + 1 || idxMarket === idxNeeds + 2,
    segment: t.slice(idxNeeds, idxNeeds + 150),
  };
});
console.log(JSON.stringify(state, null, 2));
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/pulse-marquee-alert-layout.png' });
await browser.close();
