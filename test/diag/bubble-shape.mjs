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

await page.waitForSelector('[data-testid^="project-"]', { timeout: 30000 }).catch(() => {});
const projectCount = await page.locator('[data-testid^="project-"]').count();
console.log('project items:', projectCount);
if (projectCount > 0) {
  await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', { bubbles: true });
  await page.waitForTimeout(6000);
}

const ta = page.locator('textarea').first();
const taCount = await ta.count();
console.log('textarea count:', taCount);
if (taCount > 0) {
  await ta.click();
  await ta.fill('改');
  await page.waitForTimeout(300);
  const sendBtn = page.locator('[aria-label="Send"]').first();
  if (await sendBtn.count() > 0) {
    await sendBtn.dispatchEvent('click', { bubbles: true });
  } else {
    await ta.press('Enter');
  }
  console.log('sent "改"');
  await page.waitForTimeout(12000);
}

// wait until assistant reply (some text) appears so bubbles coexist
await page.waitForTimeout(8000);

const dump = await page.evaluate(() => {
  const out = [];
  const walk = (el, depth) => {
    if (depth > 8) return;
    const rect = el.getBoundingClientRect();
    const t = (el.textContent || '').trim();
    const tag = el.tagName;
    const cls = typeof el.className === 'string' ? el.className.slice(0, 60) : '';
    if (rect.width > 0 && rect.height > 0) {
      out.push({
        tag, cls, depth,
        w: Math.round(rect.width), h: Math.round(rect.height),
        x: Math.round(rect.x), y: Math.round(rect.y),
        text: t.slice(0, 40),
      });
    }
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(document.body, 0);
  return out.filter((e) => e.text.length > 0 || e.tag === 'IMG' || e.tag === 'DIV');
});

const bubbles = dump.filter((e) => e.h > 30 && e.h < 400 && e.text.length > 0);
console.log('--- candidate bubbles (h 30-400) ---');
for (const b of bubbles.slice(0, 60)) {
  console.log(`[${b.tag}] h=${b.h} w=${b.w} x=${b.x} y=${b.y} cls=${b.cls} text="${b.text}"`);
}

await page.screenshot({ path: '/root/project/agent-mobile/test/diag/bubble-shape.png', fullPage: true });
console.log('screenshot saved');
await browser.close();
