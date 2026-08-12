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
const res = await page.evaluate(() => {
  const bubbles = Array.from(document.querySelectorAll('div')).filter(d => {
    const r = d.getBoundingClientRect();
    const bg = window.getComputedStyle(d).backgroundColor;
    return r.width > 150 && r.height > 15 && bg === 'rgb(28, 25, 23)';
  });
  bubbles.sort((a,b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
  const last = bubbles.slice(0, 3).map(e => ({ y: Math.round(e.getBoundingClientRect().y), h: Math.round(e.getBoundingClientRect().height), t: (e.textContent||'').trim().replace(/\s+/g,' ').slice(0, 35) }));
  const viewportH = window.innerHeight;
  return { last, viewportH };
});
console.log('视口高度:', res.viewportH);
console.log('最底部 3 个气泡:');
res.last.forEach(b => console.log(`  y=${b.y} h=${b.h} ${b.t}`));
await page.screenshot({ path: '/root/project/agent-mobile/test/scroll-verify.png' });
await browser.close();
