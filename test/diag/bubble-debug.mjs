import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);

const BFF = process.env.BFF_BASE || 'http://127.0.0.1:19234';
const APP = process.env.APP_BASE || 'http://127.0.0.1:9928';

const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('[console.err]', m.text().slice(0,200)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message.slice(0,300)));

await page.goto(`${APP}/`, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async ({ BFF }) => {
  const res = await fetch(`${BFF}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
  return { ok: res.ok, hasToken: !!body.token, status: res.status };
}, { BFF }).then(r => console.log('login:', JSON.stringify(r)));
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000);

const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
console.log('--- body text ---');
console.log(bodyText);

const inputs = await page.evaluate(() =>
  Array.from(document.querySelectorAll('input, textarea, [contenteditable]')).map((el) => ({
    tag: el.tagName, type: el.getAttribute('type'), placeholder: el.getAttribute('placeholder'),
    aria: el.getAttribute('aria-label'), testid: el.getAttribute('data-testid'), visible: !!(el.offsetWidth || el.offsetHeight),
  }))
);
console.log('--- inputs ---', JSON.stringify(inputs, null, 2));

const projects = await page.locator('[data-testid^="project-"]').count();
console.log('project items:', projects);
if (projects > 0) {
  await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', { bubbles: true });
  await page.waitForTimeout(6000);
  const sheet = await page.locator('[data-testid="project-chat-sheet"]').count();
  console.log('chat sheet testid count:', sheet);
  const inputs2 = await page.evaluate(() =>
    Array.from(document.querySelectorAll('input, textarea, [contenteditable]')).map((el) => ({
      tag: el.tagName, type: el.getAttribute('type'), placeholder: el.getAttribute('placeholder'), aria: el.getAttribute('aria-label'), visible: !!(el.offsetWidth || el.offsetHeight),
    }))
  );
  console.log('--- inputs after click ---', JSON.stringify(inputs2, null, 2));
  const body2 = await page.evaluate(() => document.body.innerText.slice(0, 400));
  console.log('--- body after click ---');
  console.log(body2);
}
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/bubble-debug.png' });
await browser.close();
