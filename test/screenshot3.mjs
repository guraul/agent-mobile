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
// 找到所有可滚动的元素
const scrollables = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('*').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 50 && el.clientHeight > 100) {
      out.push({ tag: el.tagName, cls: (el.className||'').toString().slice(0,60), sh: el.scrollHeight, ch: el.clientHeight });
    }
  });
  return out.slice(0, 10);
});
console.log('可滚动元素:', JSON.stringify(scrollables, null, 1));
await browser.close();
