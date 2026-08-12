import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid="project-645633255eb0c98cf024f8d5d0f16ffd62627967"]').dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(7000);
const info = await page.evaluate(() => {
  const out = {};
  out.body = { scrollHeight: document.body.scrollHeight, scrollTop: document.body.scrollTop, clientHeight: document.body.clientHeight };
  const scrollers = Array.from(document.querySelectorAll('div')).filter(d => {
    const s = window.getComputedStyle(d);
    const r = d.getBoundingClientRect();
    return (s.overflowY === 'auto' || s.overflowY === 'scroll') && r.width > 100 && r.height > 100;
  });
  out.scrollers = scrollers.map((s, i) => {
    const r = s.getBoundingClientRect();
    return { i, y: Math.round(r.y), h: Math.round(r.height), sh: s.scrollHeight, st: s.scrollTop, ov: getComputedStyle(s).overflowY };
  });
  const sheet = document.querySelector('[data-testid="project-chat-sheet"]');
  out.sheet = sheet ? { sh: sheet.scrollHeight, ch: sheet.clientHeight } : null;
  return out;
});
console.log('body:', info.body);
console.log('滚动容器:', info.scrollers);
console.log('sheet:', info.sheet);
await browser.close();
