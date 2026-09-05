import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);

const BFF = process.env.BFF_BASE || 'http://127.0.0.1:19234';
const APP = process.env.APP_BASE || 'http://127.0.0.1:9928';

const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

await page.goto(`${APP}/`, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async ({ BFF }) => {
  const res = await fetch(`${BFF}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
}, { BFF });
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000);
await page.waitForSelector('[data-testid^="project-"]', { timeout: 30000 });
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', { bubbles: true });
await page.waitForTimeout(6000);

const dump = await page.evaluate(() => {
  const sheet = document.querySelector('[data-testid="project-chat-sheet"]') || document.body;
  const out = [];
  const walk = (el, depth) => {
    if (depth > 6) return;
    const r = el.getBoundingClientRect();
    const t = (el.textContent || '').trim();
    const cls = typeof el.className === 'string' ? el.className.slice(0, 50) : '';
    const isInput = el.tagName === 'TEXTAREA' || el.tagName === 'INPUT' || el.getAttribute('contenteditable') === 'true';
    if (isInput || (r.width > 0 && r.height > 0 && t.length > 0 && t.length < 50)) {
      out.push({ tag: el.tagName, cls, depth, w: Math.round(r.width), h: Math.round(r.height), t: t.slice(0, 30), input: isInput });
    }
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(sheet, 0);
  return out;
});
console.log('--- chat sheet elements ---');
for (const d of dump.slice(0, 120)) {
  console.log(`[${d.tag}]${d.input ? ' INPUT' : ''} h=${d.h} w=${d.w} cls=${d.cls} "${d.t}"`);
}
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/bubble-sheet.png' });
await browser.close();
