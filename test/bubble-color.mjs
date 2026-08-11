import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(6000);
const bubbles = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('div').forEach(el => {
    const bg = window.getComputedStyle(el).backgroundColor;
    const r = el.getBoundingClientRect();
    if ((bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)' || bg === 'rgb(20, 18, 17)') && r.width > 100 && r.height > 20) {
      out.push({ bg, w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x) });
    }
  });
  return out.slice(0, 12);
});
console.log('气泡样本 (bg=背景色, x=左侧位置, w=宽度):');
bubbles.forEach(b => console.log(`  bg=${b.bg} x=${b.x} w=${b.w} h=${b.h}`));
const userBubbles = bubbles.filter(b => b.bg === 'rgb(245, 166, 36)');
const aiBubbles = bubbles.filter(b => b.bg !== 'rgb(245, 166, 36)');
console.log(`\nuser 气泡(黄): ${userBubbles.length}, AI 气泡(灰): ${aiBubbles.length}`);
console.log(userBubbles.length > 0 && aiBubbles.length > 0 ? 'PASS user/AI 视觉区分正常' : '注意: 可能只有一种气泡可见');
await browser.close();
