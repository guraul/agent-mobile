import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(7000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(5000);
// 检查当前可见的最后一条消息（初始应自动滚到底部）
const vis = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('div').forEach(d => {
    const bg = window.getComputedStyle(d).backgroundColor;
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    if (r.width > 100 && r.height > 25 && t.length > 3 && (bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)')) {
      out.push({ y: Math.round(r.y), role: bg === 'rgb(245, 166, 36)' ? 'USER' : 'AI', text: t.slice(0, 45) });
    }
  });
  out.sort((a,b) => b.y - a.y);
  return out.slice(0, 6);
});
console.log('可见消息 (从底部往上):');
vis.forEach(b => console.log(`  ${b.role} y=${b.y}: ${b.text}`));
await page.screenshot({ path: '/tmp/final.png' });
await browser.close();
