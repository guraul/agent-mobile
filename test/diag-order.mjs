import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(6000);
await page.screenshot({ path: 'test/diag-order-1.png' });
const bubbles = await page.evaluate(() => {
  const els = Array.from(document.querySelectorAll('div')).filter(d => {
    const r = d.getBoundingClientRect();
    const bg = window.getComputedStyle(d).backgroundColor;
    return r.width > 150 && r.height > 15 && (bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)');
  });
  els.sort((a,b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
  return els.slice(0, 10).map(e => ({ y: Math.round(e.getBoundingClientRect().y), role: window.getComputedStyle(e).backgroundColor === 'rgb(245, 166, 36)' ? 'USER' : 'AI', t: (e.textContent||'').trim().replace(/\s+/g,' ').slice(0, 30) }));
});
console.log('渲染顺序（从上到下）:');
bubbles.forEach(b => console.log(`  y=${b.y} ${b.role} ${b.t}`));
await browser.close();
