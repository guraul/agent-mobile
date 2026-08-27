import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
page.on('console', m => { if (m.type() === 'error') logs.push(`[console.error] ${m.text()}`); });
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
  const fundNames = ['易方达','科创50','医疗','新能源','创业板','国防','华宝'];
  const matched = fundNames.filter(n => t.includes(n));
  const hasNav = /(\d\.\d{4})/.test(t);
  const hasPct = /([+-]?\d+\.\d{2}%)/.test(t);
  const hasAlert = t.includes('有基金需要交易');
  return {
    fundMatches: matched,
    hasNav,
    hasPct,
    hasAlert,
    bodyHead: t.slice(0, 400),
  };
});
console.log(JSON.stringify(state, null, 2));
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/pulse-marquee.png' });
await browser.close();
