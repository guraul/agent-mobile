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
}, { BFF });
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000);
await page.waitForSelector('[data-testid^="project-"]', { timeout: 30000 });
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', { bubbles: true });

// wait for textarea to appear (up to 90s)
let ta = null;
for (let i = 0; i < 18; i++) {
  await page.waitForTimeout(5000);
  const count = await page.locator('textarea').count();
  if (count > 0) { ta = page.locator('textarea').first(); console.log(`textarea appeared after ${(i+1)*5}s`); break; }
  const loading = await page.evaluate(() => document.body.innerText.includes('Loading messages…'));
  if (!loading) { console.log('loading text gone (maybe rendered)'); }
}

// if still no textarea, try New session
if (!ta) {
  console.log('no textarea; trying New session button');
  const newBtn = page.locator('[aria-label="New session"], text=New session').first();
  if (await newBtn.count() > 0) {
    await newBtn.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(8000);
  }
  const count = await page.locator('textarea').count();
  if (count > 0) ta = page.locator('textarea').first();
  console.log('textarea after New session:', count);
}

if (ta) {
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
  // wait for the user bubble + some assistant reaction
  await page.waitForTimeout(15000);
} else {
  console.log('STILL no textarea — cannot send');
}

const dump = await page.evaluate(() => {
  const sheet = document.querySelector('[data-testid="project-chat-sheet"]') || document.body;
  const out = [];
  const walk = (el, depth) => {
    if (depth > 10) return;
    const r = el.getBoundingClientRect();
    const t = (el.textContent || '').trim();
    const cls = typeof el.className === 'string' ? el.className.slice(0, 60) : '';
    const style = el.getAttribute('style') || '';
    const bg = (style.match(/background-color:\s*([^;]+)/) || [])[1] || '';
    if (r.width > 0 && r.height > 0 && r.height > 20 && r.height < 500) {
      out.push({ tag: el.tagName, cls, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y), bg: bg.slice(0,30), text: t.slice(0, 30) });
    }
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(sheet, 0);
  return out;
});

// heuristics: user bubble = blue accent bg (accent.default), right-aligned
const accentBubbles = dump.filter((d) => d.bg && /rgb\(/.test(d.bg));
console.log('--- colored bubbles (with bg) ---');
for (const b of accentBubbles.slice(0, 40)) {
  console.log(`[${b.tag}] h=${b.h} w=${b.w} x=${b.x} y=${b.y} bg=${b.bg} text="${b.text}"`);
}
console.log('--- all candidate h 30-500 ---');
for (const b of dump.filter((d) => d.text.length > 0).slice(0, 80)) {
  console.log(`[${b.tag}] h=${b.h} w=${b.w} x=${b.x} y=${b.y} bg=${b.bg} text="${b.text}"`);
}

await page.screenshot({ path: '/root/project/agent-mobile/test/diag/bubble-shape2.png', fullPage: true });
await browser.close();
