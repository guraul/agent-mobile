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

let pid = null;
for (let i = 0; i < 10 && !pid; i++) {
  await page.waitForTimeout(5000);
  pid = await page.evaluate(() => {
    for (const e of document.querySelectorAll('[data-testid^="project-"]')) {
      const t = e.getAttribute('data-testid');
      if (/^project-[0-9a-f]+$/.test(t)) return t;
    }
    return null;
  });
}
console.log('project:', pid);
const box = await page.locator(`[data-testid="${pid}"]`).boundingBox();
await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
await page.waitForTimeout(12000);

// find the current open session id from the SSE stream URL or from the page
const sessId = await page.evaluate(() => {
  const perf = window.performance.getEntriesByType('resource').map(e => e.name).find(u => u.includes('stream') && u.includes('sessionID='));
  if (!perf) return null;
  const m = perf.match(/sessionID=([^&]+)/);
  return m ? decodeURIComponent(m[1]) : null;
});
console.log('open session:', sessId);
if (!sessId) { console.log('NO SESSION ID'); await browser.close(); process.exit(1); }

// inject a fake question.asked SSE event via the page's EventSource... but app uses fetch-based SSE.
// Instead, use the intercept approach: break the fetch stream and inject a synthetic event chunk.
await page.evaluate((sid) => {
  // Patch fetch to inject a fake question event on the FIRST stream chunk after now.
  const origFetch = window.fetch;
  let injected = false;
  window.fetch = async (...args) => {
    const url = String(args[0] || '');
    const res = await origFetch(...args);
    if (!url.includes('/api/opencode/stream') || injected) return res;
    try {
      const reader = res.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          // inject the fake question.asked event immediately
          const fake = {
            type: 'question.asked',
            properties: {
              id: 'que_injected',
              sessionID: sid,
              questions: [{
                question: '验证：实时 question 弹窗是否出现？',
                header: '实时验证',
                options: [
                  { label: '选项A', description: 'a' },
                  { label: '选项B', description: 'b' },
                ],
                multiple: false,
              }],
            },
          };
          const enc = new TextEncoder();
          controller.enqueue(enc.encode('event: message\ndata: ' + JSON.stringify(fake) + '\n\n'));
          injected = true;
          // forward real data
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) { controller.close(); break; }
              controller.enqueue(value);
            }
          } catch (e) { controller.error(e); }
        },
      });
      return new Response(stream, { status: res.status, headers: res.headers });
    } catch (e) { return res; }
  };
}, sessId);

// The app already has a stream open; injection needs a reconnect. Reload to force new stream with patch active (patch lost on reload though).
// Alternative: force reconnect by breaking current stream isn't trivial. Instead reload, but patch must survive — use addInitScript.
await browser.close();
console.log('note: injection via fetch patch needs addInitScript to survive reload; this attempt used post-load patch (won\'t catch existing stream). Aborting this approach.');
