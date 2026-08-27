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
if (!pid) { console.log('NO PROJECT'); await browser.close(); process.exit(1); }
const box = await page.locator(`[data-testid="${pid}"]`).boundingBox();
await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
await page.waitForTimeout(12000);

// count error bubbles on load (this clean session has 1 historical error)
const countBefore = await page.evaluate(() => {
  const t = document.body.innerText;
  return t.split('\n').filter(l => l.includes('出错了') || l.includes('APIError')).length;
});
console.log('error bubbles BEFORE send:', countBefore);

// switch model to deepseek bad-key model
await page.locator('[aria-label="Select model"]').click();
await page.waitForTimeout(800);
const picked = await page.evaluate(() => {
  const all = [...document.querySelectorAll('div')];
  const title = all.find(d => d.textContent.trim() === '选择模型');
  if (!title) return false;
  let c = title.parentElement;
  while (c && getComputedStyle(c).position !== 'absolute') c = c.parentElement;
  if (!c) c = title.parentElement;
  const items = [...c.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent && e.textContent.trim().startsWith('deepseek: '));
  const target = items.find(e => e.textContent.trim() === 'deepseek: deepseek-chat') || items[0];
  if (!target) return false;
  target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  return true;
});
console.log('picked deepseek:', picked);
await page.waitForTimeout(500);
console.log('model pill:', (await page.locator('[aria-label="Select model"]').textContent()).trim());

const input = page.locator('input, textarea').first();
await input.waitFor({ state: 'visible', timeout: 20000 });
await input.fill('hello');
await page.locator('[aria-label="Send"]').click();
console.log('sent hello, watching...');
let appeared = false, seconds = -1;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(1000);
  const n = await page.evaluate(() => {
    const t = document.body.innerText;
    return t.split('\n').filter(l => l.includes('出错了') || l.includes('APIError')).length;
  });
  if (n > countBefore) { appeared = true; seconds = i + 1; break; }
}
console.log('NEW error bubble WITHOUT reload:', appeared, appeared ? `(~${seconds}s)` : '');
console.log('countBefore:', countBefore);
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/clean-session-realtime.png' });
await browser.close();
