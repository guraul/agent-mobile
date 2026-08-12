import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
const items = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[data-testid^="project-"]')).map(el => ({
    testid: el.getAttribute('data-testid'),
    text: (el.textContent||'').trim().replace(/\s+/g,' ').slice(0, 40)
  }));
});
console.log('项目列表:');
items.forEach(i => console.log(`  ${i.testid} | ${i.text}`));
console.log('第一个项目:', items[0]?.testid);
if (items.length) {
  await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', {bubbles:true});
  await page.waitForTimeout(6000);
  const bubbles = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('div')).filter(d => {
      const r = d.getBoundingClientRect();
      const bg = window.getComputedStyle(d).backgroundColor;
      return r.width > 150 && r.height > 15 && (bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)');
    });
    els.sort((a,b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    return els.slice(0, 6).map(e => ({ y: Math.round(e.getBoundingClientRect().y), t: (e.textContent||'').trim().replace(/\s+/g,' ').slice(0, 30) }));
  });
  console.log('sheet 内气泡:');
  bubbles.forEach(b => console.log(`  y=${b.y} ${b.t}`));
}
await browser.close();
