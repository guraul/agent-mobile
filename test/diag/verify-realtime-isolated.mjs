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

// find the wrongmathf4 project (has the fresh session). Its id from earlier: 55288fb425d0... but find by matching data-testid
let targetPid = null;
for (let i = 0; i < 8 && !targetPid; i++) {
  await page.waitForTimeout(5000);
  targetPid = await page.evaluate(() => {
    // wrongmathf4 project id prefix f8ba2b07b97a... select that one
    for (const e of document.querySelectorAll('[data-testid^="project-"]')) {
      const t = e.getAttribute('data-testid');
      if (/^project-[0-9a-f]+$/.test(t) && t.includes('f8ba2b07b97a')) return t;
    }
    return null;
  });
  if (!targetPid) {
    // fall back to first real project if wrongmathf4 not shown
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

// count error bubbles before (historical errors from loadMessages, if any)
const countBefore = await page.evaluate(() => {
  const t = document.body.innerText;
  return t.split('\n').filter(l => l.includes('出错了') || l.includes('APIError')).length;
});
console.log('error bubbles BEFORE send:', countBefore);

// switch model to deepseek official (broken key) via the model sheet
await page.locator('[aria-label="Select model"]').click();
await page.waitForTimeout(800);
const clickDeepseek = await page.evaluate(() => {
  const all = [...document.querySelectorAll('div')];
  const title = all.find(d => d.textContent.trim() === '选择模型');
  if (!title) return false;
  let c = title.parentElement;
  while (c && getComputedStyle(c).position !== 'absolute') c = c.parentElement;
  if (!c) c = title.parentElement;
  const items = [...c.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent && e.textContent.trim().startsWith('deepseek: '));
  // pick one that is NOT the current volcengine one; prefer "deepseek: deepseek-chat"
  const target = items.find(e => e.textContent.trim() === 'deepseek: deepseek-chat') || items[0];
  if (!target) return false;
  const r = target.getBoundingClientRect();
  const el = document.elementFromPoint(r.x + r.width/2, r.y + r.height/2);
  if (el) { el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return true; }
  return false;
});
console.log('clicked deepseek model:', clickDeepseek);
await page.waitForTimeout(500);

// confirm pill now shows deepseek model
const pillText = (await page.locator('[aria-label="Select model"]').textContent()).trim();
console.log('model pill after switch:', pillText);

// send hello
const input = page.locator('input, textarea').first();
await input.waitFor({ state: 'visible', timeout: 20000 });
await input.fill('hello');
await page.locator('[aria-label="Send"]').click();
console.log('sent hello, watching for a NEW error bubble (no reload)...');

let appeared = false;
let seconds = -1;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(1000);
  const r = await page.evaluate(() => {
    const t = document.body.innerText;
    const lines = t.split('\n').filter(l => l.includes('出错了') || l.includes('APIError'));
    return lines.length;
  });
  if (r > countBefore) { appeared = true; seconds = i + 1; break; }
}
console.log('NEW error bubble WITHOUT reload:', appeared, appeared ? `(after ~${seconds}s)` : '');
console.log('--- page errors ---');
console.log(logs.filter(l => l.startsWith('[PAGEERROR]')).join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/realtime-final.png' });
await browser.close();
