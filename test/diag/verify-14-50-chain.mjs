import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
page.on('console', m => { if (m.type() === 'error') logs.push(`[console.error] ${m.text()}`); });

// 拦截 SSE 流，记录 trade-alert 是否到达前端
await page.addInitScript(() => {
  window.__ALERT = [];
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
                if (text.includes('fund.trade-alert')) window.__ALERT.push(text.slice(0, 200));
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
await page.waitForTimeout(12000);

// 确认跑马灯在（SSE 连接存活）
const mktBefore = await page.evaluate(() => document.body.innerText.includes('MARKET'));
console.log('跑马灯存在(SSE 连接):', mktBefore);

// 触发 run（后端会在 1s 内推 trade-alert）
const TOKEN = await page.evaluate(() => localStorage.getItem('pulse_opencode_token'));
const { execSync } = await import('node:child_process');
execSync(`curl -s -m 30 -X POST http://127.0.0.1:19234/api/scheduler/fund-estimation/run -H "Authorization: Bearer ${TOKEN}"`);
console.log('triggered run');

// 等待 trade-alert 到达前端
let sseGot = 0, uiGot = false;
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(1000);
  sseGot = await page.evaluate(() => window.__ALERT.length);
  uiGot = await page.evaluate(() => document.body.innerText.includes('有基金需要交易'));
  if (sseGot > 0 || uiGot) {
    console.log(`t=${i + 1}s SSE收到=${sseGot} UI显示=${uiGot}`);
    break;
  }
}
console.log('SSE trade-alert 到达前端:', sseGot > 0);
console.log('UI needs-you 有基金需要交易:', uiGot);
if (sseGot > 0) {
  const sample = await page.evaluate(() => window.__ALERT[0]);
  console.log('alert payload:', sample.slice(0, 200));
}
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/14-50-check.png' });
await browser.close();
