import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));

// intercept SSE to log question.v2.asked events
await page.addInitScript(() => {
  window.__Q = [];
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
                if (text.includes('question.asked') || text.includes('question.v2.asked')) {
                  window.__Q.push(text.slice(0, 500));
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

// open agent-mobile project (it's active)
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

// send a message that should trigger a clarifying question
const input = page.locator('input, textarea').first();
await input.waitFor({ state: 'visible', timeout: 20000 });
const prompt = '这是一个测试，请先向我提一个澄清问题（用 question 工具），不要直接回答，然后等待我的回答。';
await input.fill(prompt);
await page.locator('[aria-label="Send"]').click();
console.log('sent question-trigger message');

// watch for question sheet + SSE capture
let sheetSeen = false, sseSeen = 0;
for (let i = 0; i < 40; i++) {
  await page.waitForTimeout(1000);
  const sheet = await page.evaluate(() => {
    const s = document.querySelector('[data-testid="question-sheet"]');
    return !!s;
  });
  const sse = await page.evaluate(() => window.__Q.length);
  if (sse > sseSeen) sseSeen = sse;
  if (sheet) { sheetSeen = true; console.log('QUESTION SHEET (testID question-sheet) appeared at', i + 1, 's'); break; }
}
console.log('question sheet appeared:', sheetSeen);
console.log('SSE question events captured:', sseSeen);
const qLog = await page.evaluate(() => window.__Q);
console.log('--- SSE capture sample ---');
qLog.slice(0, 2).forEach(l => console.log(l));
console.log('--- page errors ---');
console.log(logs.filter(l => l.startsWith('[PAGEERROR]')).join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/question-realtime.png' });
await browser.close();
