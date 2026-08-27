import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
page.on('console', m => { if (m.type() === 'error') logs.push(`[console.error] ${m.text()}`); });

// patch survives reload; inject a fake question.asked event once per stream connection
await page.addInitScript(() => {
  const origFetch = window.fetch;
  window.__INJECTED = 0;
  window.fetch = async (...args) => {
    const url = String(args[0] || '');
    const res = await origFetch(...args);
    if (!url.includes('/api/opencode/stream')) return res;
    try {
      const reader = res.body.getReader();
      const stream = new ReadableStream({
        async start(controller) {
          // read first chunk to know sessionID filter (from URL), then inject
          const enc = new TextEncoder();
          const inject = () => {
            if (window.__INJECTED >= 1) return;
            const sidParam = url.match(/sessionID=([^&]+)/);
            const sid = sidParam ? decodeURIComponent(sidParam[1]) : '';
            const fake = {
              type: 'question.asked',
              properties: {
                id: 'que_injected_' + window.__INJECTED,
                sessionID: sid,
                questions: [{
                  question: '实时验证：这个弹窗应该立即出现',
                  header: '实时验证',
                  options: [
                    { label: '选项A', description: 'a' },
                    { label: '选项B', description: 'b' },
                  ],
                  multiple: false,
                }],
              },
            };
            controller.enqueue(enc.encode('event: message\ndata: ' + JSON.stringify(fake) + '\n\n'));
            window.__INJECTED++;
          };
          // inject as soon as the session-filtered stream starts (only for session-scoped streams)
          if (url.includes('sessionID=')) inject();
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
});

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

const injectedCount = await page.evaluate(() => window.__INJECTED);
console.log('injected events:', injectedCount);
const sheetSeen = await page.evaluate(() => !!document.querySelector('[data-testid="question-sheet"]'));
console.log('question sheet appeared:', sheetSeen);
if (sheetSeen) {
  const sheetText = await page.evaluate(() => document.querySelector('[data-testid="question-sheet"]').innerText.slice(0, 200));
  console.log('sheet text:', JSON.stringify(sheetText));
}
console.log('--- page errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/question-injected.png' });
await browser.close();
