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
// 检查最后一条消息是否包含测试字符串
const lastMsg = await page.evaluate(() => {
  const bubbles = Array.from(document.querySelectorAll('div')).filter(d => {
    const bg = window.getComputedStyle(d).backgroundColor;
    return (bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)') && d.textContent?.includes('live-final');
  });
  return bubbles.map(b => ({ text: b.textContent?.trim().slice(0,50), y: Math.round(b.getBoundingClientRect().y) }));
});
console.log('找到测试消息气泡:', lastMsg.length, lastMsg);
await browser.close();
