import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForSelector('[data-testid^="project-"]', { timeout: 30000 });
const pid = await page.evaluate(() => {
  const els = document.querySelectorAll('[data-testid^="project-"]');
  for (const e of els) {
    const t = e.getAttribute('data-testid');
    if (/^project-[0-9a-f]+$/.test(t)) return t;
  }
  return null;
});
console.log('real project id:', pid);
const box = await page.locator(`[data-testid="${pid}"]`).boundingBox();
console.log('box:', box);
await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
await page.waitForTimeout(9000);
const state = await page.evaluate(() => {
  const sheet = document.querySelector('[data-testid="project-chat-sheet"]');
  const pill = document.querySelector('[aria-label="Select model"]');
  return { sheetFound: !!sheet, pillFound: !!pill, bodyHead: document.body.textContent.slice(0, 400) };
});
console.log(JSON.stringify(state, null, 2));
await browser.close();
