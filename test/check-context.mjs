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
const ctx = await page.evaluate(() => {
  const matches = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n;
  while (n = walker.nextNode()) {
    if (n.textContent.includes('Loading earlier')) {
      matches.push(n.parentElement?.closest('div')?.textContent?.slice(0, 120));
    }
  }
  return matches.slice(0,3);
});
console.log('Loading earlier 出现上下文:', JSON.stringify(ctx));
// 检查是否是历史消息气泡
console.log('这是历史消息内容还是 UI 元素？需看是否在气泡内');
await browser.close();
