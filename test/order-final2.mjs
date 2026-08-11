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
// 滚动到最底部
await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => { if (el.scrollHeight > el.clientHeight + 1000 && !best) best = el; });
  if (best) best.scrollTop = best.scrollHeight;
});
await page.waitForTimeout(800);
// 从底部往上收集消息气泡（在列表容器内的）
const bubbles = await page.evaluate(() => {
  let list = null;
  document.querySelectorAll('div').forEach(el => { if (el.scrollHeight > el.clientHeight + 1000 && !list) list = el; });
  if (!list) return [];
  const out = [];
  document.querySelectorAll('div').forEach(d => {
    const bg = window.getComputedStyle(d).backgroundColor;
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    const inList = r.top >= list.getBoundingClientRect().top && r.bottom <= list.getBoundingClientRect().bottom;
    if (inList && r.width > 100 && r.height > 25 && t.length > 3 && (bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)')) {
      out.push({ y: Math.round(r.y), role: bg === 'rgb(245, 166, 36)' ? 'USER' : 'AI', text: t.slice(0, 40).replace(/\n/g,' ') });
    }
  });
  // 按 y 排序（y 越大越靠下）
  out.sort((a,b) => b.y - a.y);
  return out.slice(0, 8);
});
console.log('滚动到底后, 从底部往上 8 条消息:');
bubbles.forEach(b => console.log(`  ${b.role} y=${b.y}: ${b.text}`));
await browser.close();
