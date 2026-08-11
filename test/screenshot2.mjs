import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
const item = page.locator('[data-testid^="project-"]').first();
await item.dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(6000);
// 向上滚动找 user 消息
await page.mouse.move(215, 450);
await page.mouse.wheel(0, -3000);
await page.waitForTimeout(1500);
// 检查滚动是否弹回底部（用户上滑被拉回）
const scrollInfo1 = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="project-chat-sheet"]')?.parentElement || document.scrollingElement;
  return el.scrollTop;
});
await page.waitForTimeout(2000);
const scrollInfo2 = await page.evaluate(() => {
  const el = document.querySelector('[data-testid="project-chat-sheet"]')?.parentElement || document.scrollingElement;
  return el.scrollTop;
});
console.log('上滑后 scrollTop:', scrollInfo1, '→ 2s后:', scrollInfo2);
const body = await page.locator('body').innerText();
const hasUserQ = /告诉我目前遇到了什么问题|遇到了什么问题/.test(body);
console.log('页面包含 user 提问文本:', hasUserQ);
await page.screenshot({ path: '/tmp/chat2.png' });
await browser.close();
