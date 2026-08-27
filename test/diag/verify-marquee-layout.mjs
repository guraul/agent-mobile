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

const state = await page.evaluate(() => {
  const t = document.body.innerText;
  const lines = t.split('\n');
  const idxNeeds = lines.indexOf('NEEDS YOU');
  const idxMarket = lines.indexOf('MARKET');
  const idxToday = lines.indexOf('TODAY');
  const idxOther = lines.indexOf('OTHER PROJECTS');
  const hasFund = /易方达|华宝|科创50|新能源|创业板|国防/.test(t);
  const hasWatching = lines.includes('Watching');
  return {
    hasMarket: idxMarket >= 0,
    hasFund,
    hasWatching,
    order: {
      needsYou: idxNeeds,
      market: idxMarket,
      today: idxToday,
      other: idxOther,
    },
    // 检查 MARKET 是否在 NEEDS YOU 之后、OTHER 之前
    marketAfterNeeds: idxMarket > idxNeeds,
    marketBeforeOther: idxOther === -1 || idxMarket < idxOther,
    bodyHead: t.slice(0, 500),
  };
});
console.log(JSON.stringify(state, null, 2));
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/pulse-marquee-item.png' });
await browser.close();
