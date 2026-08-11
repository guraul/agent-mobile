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
const info = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('span').forEach(s => {
    const bg = window.getComputedStyle(s).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && s.textContent.length < 40) {
      const r = s.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        out.push({ text: s.textContent.slice(0, 25), h: Math.round(r.height), y: Math.round(r.y) });
      }
    }
  });
  return out.slice(0, 6);
});
console.log('修复后行内代码高度:', JSON.stringify(info, null, 1));
const ok = info.every(i => i.h <= 26);
console.log(ok ? 'PASS: 高度 ≤ 26px（正文行高 22px 内，不再覆盖）' : 'FAIL: 仍有超高元素');
await page.screenshot({ path: 'code-inline-fixed.png', fullPage: false });
await browser.close();
