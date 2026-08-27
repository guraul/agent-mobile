import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
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

// count error bubbles BEFORE sending (historical errors from loadMessages)
const countBefore = await page.evaluate(() => {
  const t = document.body.innerText;
  const matches = t.split('\n').filter(l => l.includes('出错了') || l.includes('APIError'));
  return matches.length;
});
console.log('error bubbles BEFORE send:', countBefore);

// send hello to the currently-selected (broken) model
const input = page.locator('input, textarea').first();
await input.waitFor({ state: 'visible', timeout: 20000 });
await input.fill('hello');
await page.locator('[aria-label="Send"]').click();
console.log('sent hello, watching for a NEW error bubble...');

let countAfter = -1;
let timeline = [];
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const t = document.body.innerText;
    const lines = t.split('\n').filter(l => l.includes('出错了') || l.includes('APIError'));
    return lines;
  });
  timeline.push(`${i + 1}s: ${r.length} error lines`);
  if (r.length > countBefore) { countAfter = r.length; break; }
}
console.log('timeline:', timeline.slice(0, 5).join(' | '));
console.log('NEW error bubble appeared WITHOUT reload:', countAfter > countBefore);
console.log('countBefore:', countBefore, 'countAfter:', countAfter);
console.log('--- page errors ---');
console.log(logs.filter(l => l.startsWith('[PAGEERROR]')).join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/real-time-error-check.png' });
await browser.close();
