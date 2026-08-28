import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(2000);
// 预置 token（模拟已登录）
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
// 开始计时 + reload
const t0 = Date.now();
await page.reload({ waitUntil: 'load', timeout: 120000 });
const loadDone = Date.now() - t0;
console.log('DOMContentLoaded-ish (reload resolved):', loadDone, 'ms');

// 记录 SSE 请求发起时间
let sseReqMs = null, fundReqMs = null;
page.on('request', r => {
  const u = r.url();
  if (u.includes('/api/events/stream')) fundReqMs = Date.now() - t0;
  if (u.includes('/api/opencode/stream')) sseReqMs = Date.now() - t0;
});

// 轮询 MARKET 文本出现时间
let marketMs = null, projectMs = null;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(300);
  const st = await page.evaluate(() => {
    const t = document.body.innerText;
    return { hasMarket: t.includes('MARKET') && /易方达|华宝|科创50/.test(t), hasProject: t.includes('NEEDS YOU') };
  });
  if (st.hasMarket && marketMs === null) marketMs = Date.now() - t0;
  if (st.hasProject && projectMs === null) projectMs = Date.now() - t0;
  if (marketMs !== null && projectMs !== null) break;
}
console.log('opencode stream 请求:', sseReqMs, 'ms');
console.log('events stream 请求:', fundReqMs, 'ms');
console.log('跑马灯(MARKET)出现:', marketMs, 'ms');
console.log('项目(NEEDS YOU)出现:', projectMs, 'ms');
await browser.close();
