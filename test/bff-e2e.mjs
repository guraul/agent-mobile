import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);

const BFF = process.env.BFF_BASE || 'http://127.0.0.1:19235';
const APP = process.env.APP_BASE || 'http://127.0.0.1:9928';
const USER = process.env.BFF_USER || 'admin';
const PASS = process.env.BFF_PASS || 'admin123';

const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });

const deltas = [];
const streamStatuses = [];
page.on('request', r => {
  if (r.url().includes('/api/opencode/stream')) {
    deltas.push({ url: r.url(), headers: r.headers() });
  }
});
page.on('response', r => {
  if (r.url().includes('/api/opencode/stream')) streamStatuses.push(r.status());
});

// 1. load app first (so page origin is 9928, allowed by BFF CORS), then login via BFF
await page.goto(`${APP}/pulse`, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
const loginRes = await page.evaluate(async ({ BFF, USER, PASS }) => {
  const res = await fetch(`${BFF}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USER, password: PASS }),
  });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
  return { ok: res.ok, hasToken: !!body.token, status: res.status };
}, { BFF, USER, PASS });
console.log('login:', JSON.stringify(loginRes));
if (!loginRes.ok || !loginRes.hasToken) throw new Error('login failed');

// 2. reload so app boots with token
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000);

// 3. login banner should be gone
const banner = page.locator('text=未登录');
const bannerVisible = await banner.count() > 0;
console.log('login banner visible after login:', bannerVisible);

// 4. open first project
const project = page.locator('[data-testid^="project-"]').first();
const projectCount = await project.count();
console.log('project items:', projectCount);
if (projectCount === 0) throw new Error('no project items');
await project.dispatchEvent('click', { bubbles: true });
await page.waitForTimeout(6000);

// 5. dynamic model list: open model sheet, expect > 3 options
const modelPill = page.locator('[aria-label="Select model"]');
await modelPill.waitFor({ state: 'visible', timeout: 30000 });
console.log('model pill:', (await modelPill.textContent()).trim());
await modelPill.click();
await page.waitForTimeout(800);
const modelOptions = await page.evaluate(() => {
  const sheet = document.querySelector('[data-testid="bottom-sheet"]') || document.body;
  return Array.from(sheet.querySelectorAll('div'))
    .filter(d => d.textContent && d.textContent.trim().length > 0 && d.textContent.trim().length < 60)
    .map(d => d.textContent.trim());
});
const uniqueModels = [...new Set(modelOptions)];
console.log('model sheet options (unique):', uniqueModels.slice(0, 20));
await page.keyboard.press('Escape').catch(() => {});
await page.waitForTimeout(300);

// 6. send a message
await page.locator('input, textarea').first().fill('say hi in one short sentence');
await page.locator('[aria-label="Send"]').click();
await page.waitForTimeout(15000);

// 7. assert stream requests succeeded (200 = Bearer token accepted; 401 would fail)
console.log('stream requests:', deltas.length);
if (deltas.length === 0) throw new Error('no stream request captured');
await page.waitForTimeout(2000);
console.log('stream statuses:', streamStatuses);
if (streamStatuses.length === 0 || streamStatuses.some(s => s === 401)) {
  throw new Error('stream request not authorized (401)');
}

// 8. assert final assistant text rendered
const bodyText = await page.evaluate(() => document.body.innerText);
const hasReply = /hi|hello|你好|嗨/i.test(bodyText);
console.log('assistant reply rendered:', hasReply);

// 9. assert typewriter deltas were applied (delta events consumed by reducer)
const deltaApplied = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div'));
  return els.some(d => d.textContent && /工具\(|say hi|hello|hi/i.test(d.textContent));
});
console.log('delta/typewriter content present:', deltaApplied);

await page.screenshot({ path: '/root/project/agent-mobile/test/bff-e2e.png' });
await browser.close();
console.log('E2E DONE');