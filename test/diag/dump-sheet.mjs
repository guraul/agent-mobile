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
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', { bubbles: true });
await page.waitForSelector('[aria-label="Select model"]', { timeout: 30000 });
await page.locator('[aria-label="Select model"]').click();
await page.waitForTimeout(1000);
const sheet = await page.evaluate(() => {
  const s = document.querySelector('[data-testid="bottom-sheet"]');
  if (!s) return { found: false };
  const rows = [...s.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent && e.textContent.trim()).map(e => e.textContent.trim());
  return { found: true, rows: [...new Set(rows)] };
});
console.log(JSON.stringify(sheet, null, 2));
await browser.close();
