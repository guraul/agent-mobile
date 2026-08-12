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
  const scrollers = Array.from(document.querySelectorAll('div')).filter(d => {
    const s = window.getComputedStyle(d);
    return (s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflow === 'auto') && d.scrollHeight > d.clientHeight + 50;
  });
  return scrollers.map((s, i) => ({
    i, scrollTop: s.scrollTop, scrollHeight: s.scrollHeight, clientHeight: s.clientHeight, overflowY: getComputedStyle(s).overflowY
  }));
});
console.log('可滚动容器:', info);
if (info.length) {
  const r = await page.evaluate((idx) => {
    const scrollers = Array.from(document.querySelectorAll('div')).filter(d => {
      const s = window.getComputedStyle(d);
      return (s.overflowY === 'auto' || s.overflowY === 'scroll' || s.overflow === 'auto') && d.scrollHeight > d.clientHeight + 50;
    });
    scrollers[idx].scrollTop = scrollers[idx].scrollHeight;
    return { set: true, scrollTop: scrollers[idx].scrollTop };
  }, 0);
  console.log('手动滚动后:', r);
  await page.waitForTimeout(500);
  const bubbles = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('div')).filter(d => {
      const r = d.getBoundingClientRect();
      const bg = window.getComputedStyle(d).backgroundColor;
      return r.width > 150 && r.height > 15 && bg === 'rgb(28, 25, 23)';
    });
    els.sort((a,b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    return els.slice(0, 2).map(e => ({ y: Math.round(e.getBoundingClientRect().y), t: (e.textContent||'').trim().replace(/\s+/g,' ').slice(0, 30) }));
  });
  console.log('手动滚动后底部气泡:', bubbles);
}
await browser.close();
