import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
page.on('request', r => { if (r.url().includes('prompt_async') || r.url().includes('/stream')) console.log('[REQ]', r.method(), r.url().slice(0,120)); });
await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
await page.reload({ waitUntil: 'load', timeout: 120000 });
let pid = null;
for (let i = 0; i < 8 && !pid; i++) {
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
// 输入 hello 并发送
const input = page.locator('input, textarea').first();
await input.waitFor({ state: 'visible', timeout: 20000 });
await input.fill('hello');
await page.locator('[aria-label="Send"]').click();
console.log('sent hello, waiting for error bubble...');
let found = false;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const t = document.body.innerText;
    return { hasErr: t.includes('出错了') || t.includes('APIError') || t.includes('Authentication'), tail: t.slice(-300) };
  });
  if (r.hasErr) { found = true; console.log(`ERROR BUBBLE after ~${i+1}s`); console.log('tail:', r.tail); break; }
}
console.log('error bubble appeared:', found);
console.log('--- logs ---');
console.log(logs.filter(l => l.startsWith('[PAGEERROR]') || l.startsWith('[error]')).join('\n') || '(no page errors)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/send-error-check.png' });
await browser.close();
