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

// 1. 触发 trade-alert
const TOKEN = await page.evaluate(() => localStorage.getItem('pulse_opencode_token'));
const { execSync } = await import('node:child_process');
execSync(`curl -s -m 30 -X POST http://127.0.0.1:19234/api/scheduler/fund-estimation/run -H "Authorization: Bearer ${TOKEN}"`).toString();
let hasAlert = false;
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1000);
  hasAlert = await page.evaluate(() => document.body.innerText.includes('有基金需要交易'));
  if (hasAlert) { console.log('STEP1 alert appeared ~' + (i + 1) + 's'); break; }
}
console.log('STEP1 alert present:', hasAlert);

// 2. 点击 MARKET 条目（有 alert 时在 needs-you 内第一项）
const marketClicked = await page.evaluate(() => {
  const el = document.querySelector('[aria-label="有基金需要交易"]');
  if (!el) return false;
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
});
await page.waitForTimeout(800);
console.log('STEP2 clicked market:', marketClicked);
const sheetSeen = await page.evaluate(() => !!document.querySelector('[data-testid="trade-alert-sheet"]'));
const sheetText = sheetSeen ? await page.evaluate(() => document.querySelector('[data-testid="trade-alert-sheet"]').innerText.slice(0, 200)) : '';
console.log('STEP2 detail sheet appeared:', sheetSeen);
console.log('STEP2 sheet text:', JSON.stringify(sheetText));

// 3. 点击确认处理
const confirmed = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('div,span,button')].filter(d => d.textContent && d.textContent.trim() === '确认处理');
  if (btns.length === 0) return false;
  btns[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
});
await page.waitForTimeout(800);
console.log('STEP3 confirmed clicked:', confirmed);
const afterDismiss = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    hasAlertText: t.includes('有基金需要交易'),
    sheetClosed: !document.querySelector('[data-testid="trade-alert-sheet"]'),
    marketStillThere: t.includes('MARKET'),
  };
});
console.log('STEP3 after dismiss:', JSON.stringify(afterDismiss, null, 2));

// 4. MARKET 应回落到独立分组（不在 needs-you 第一项）
const layout = await page.evaluate(() => {
  const lines = document.body.innerText.split('\n');
  const idxNeeds = lines.indexOf('NEEDS YOU');
  const idxMarket = lines.indexOf('MARKET');
  return { idxNeeds, idxMarket, marketRightAfterNeeds: idxMarket === idxNeeds + 1 };
});
console.log('STEP4 layout:', JSON.stringify(layout));
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/trade-alert-dismiss.png' });
await browser.close();
