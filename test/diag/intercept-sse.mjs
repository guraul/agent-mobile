import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

// addInitScript survives reloads
await page.addInitScript(() => {
  window.__SSE_ERR = [];
  const origFetch = window.fetch;
  window.fetch = async (...args) => {
    const url = String(args[0] || '');
    const res = await origFetch(...args);
    if (url.includes('/api/opencode/stream')) {
      try {
        const reader = res.body.getReader();
        const stream = new ReadableStream({
          async start(controller) {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) { controller.close(); break; }
                const text = new TextDecoder().decode(value);
                // record any line mentioning message.updated + error
                for (const line of text.split('\n')) {
                  if (line.includes('message.updated') && line.includes('error')) {
                    window.__SSE_ERR.push(line.slice(0, 400));
                  }
                }
                controller.enqueue(value);
              }
            } catch (e) { controller.error(e); }
          },
        });
        return new Response(stream, { status: res.status, headers: res.headers });
      } catch (e) {
        return res;
      }
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

// open wrongmathf4 project (fresh session there)
let targetPid = null;
for (let i = 0; i < 10 && !targetPid; i++) {
  await page.waitForTimeout(5000);
  targetPid = await page.evaluate(() => {
    for (const e of document.querySelectorAll('[data-testid^="project-"]')) {
      const t = e.getAttribute('data-testid');
      if (/^project-[0-9a-f]+$/.test(t) && t.includes('f8ba2b07b97a')) return t;
    }
    return null;
  });
  if (!targetPid) {
    targetPid = await page.evaluate(() => {
      for (const e of document.querySelectorAll('[data-testid^="project-"]')) {
        const t = e.getAttribute('data-testid');
        if (/^project-[0-9a-f]+$/.test(t)) return t;
      }
      return null;
    });
  }
}
console.log('target project:', targetPid);
if (!targetPid) { console.log('NO PROJECT'); await browser.close(); process.exit(1); }
const box = await page.locator(`[data-testid="${targetPid}"]`).boundingBox();
await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
await page.waitForTimeout(12000);

const sseLogBefore = await page.evaluate(() => window.__SSE_ERR || []);
console.log('SSE error captures before send:', sseLogBefore.length);

// switch model to deepseek (bad key) and send hello
await page.locator('[aria-label="Select model"]').click();
await page.waitForTimeout(800);
await page.evaluate(() => {
  const all = [...document.querySelectorAll('div')];
  const title = all.find(d => d.textContent.trim() === '选择模型');
  if (!title) return;
  let c = title.parentElement;
  while (c && getComputedStyle(c).position !== 'absolute') c = c.parentElement;
  if (!c) c = title.parentElement;
  const items = [...c.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent && e.textContent.trim().startsWith('deepseek: '));
  const target = items.find(e => e.textContent.trim() === 'deepseek: deepseek-chat') || items[0];
  if (target) target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await page.waitForTimeout(500);
const input = page.locator('input, textarea').first();
await input.waitFor({ state: 'visible', timeout: 20000 });
await input.fill('hello');
await page.locator('[aria-label="Send"]').click();
console.log('sent hello');
await page.waitForTimeout(12000);

const sseLogAfter = await page.evaluate(() => window.__SSE_ERR || []);
console.log('SSE captures with message.updated+error:', sseLogAfter.length);
console.log('NEW captures:', sseLogAfter.length - sseLogBefore);
console.log('--- sample of new captures ---');
sseLogAfter.slice(sseLogBefore).forEach(l => console.log(' ', l));
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/intercept-sse.png' });
await browser.close();
