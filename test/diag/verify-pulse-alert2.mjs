import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));

// 拦截 SSE 流，记录 trade-alert 到达情况
await page.addInitScript(() => {
  window.__TRADE_ALERTS = [];
  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = String(args[0] || '');
    const res = await origFetch(...args);
    if (url.includes('/api/events/stream')) {
      try {
        const reader = res.body.getReader();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) { controller.close(); break; }
                const text = new TextDecoder().decode(value);
                if (text.includes('fund.trade-alert')) {
                  window.__TRADE_ALERTS.push(text.slice(0, 300));
                }
                controller.enqueue(value);
              }
            } catch (e) { controller.error(e); }
          },
        });
        return new Response(stream, { status: res.status, headers: res.headers });
      } catch (e) { return res; }
    }
    return res;
  };
});

await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(10000);

// node 侧触发 fund-estimation → 产生 trade-alert
console.log('triggering fund-estimation...');
const TOKEN = await page.evaluate(() => localStorage.getItem('pulse_opencode_token'));
const { execSync } = await import('node:child_process');
const resp = execSync(`curl -s -m 30 -X POST http://127.0.0.1:19234/api/scheduler/fund-estimation/run -H "Authorization: Bearer ${TOKEN}"`).toString();
console.log('trigger result:', resp.slice(0, 120));

// 等 trade-alert 到达前端 + needs-you 显示
let hasAlert = false, sseCount = 0;
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(1000);
  hasAlert = await page.evaluate(() => document.body.innerText.includes('有基金需要交易'));
  sseCount = await page.evaluate(() => window.__TRADE_ALERTS.length);
  if (hasAlert && sseCount > 0) { console.log(`trade-alert 到达前端 ~${i + 1}s`); break; }
}
console.log('needs-you 有基金需要交易 出现:', hasAlert);
console.log('SSE trade-alert 捕获数:', sseCount);
if (sseCount > 0) {
  const sample = await page.evaluate(() => window.__TRADE_ALERTS[0]);
  console.log('trade-alert payload:', sample.slice(0, 300));
}
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/pulse-trade-alert2.png' });
await browser.close();
