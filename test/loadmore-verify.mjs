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
const countBubbles = async () => page.evaluate(() => {
  // 统计 Pulse 标签数量（每条 AI 消息一个）和 tool calls 行数
  const pulseLabels = [...document.querySelectorAll('div')].filter(d => d.textContent === 'Pulse').length;
  const toolLines = [...document.querySelectorAll('div')].filter(d => /tool call/.test(d.textContent||'')).length;
  return { pulseLabels, toolLines };
});
console.log('初始:', JSON.stringify(await countBubbles()));
// 滚动到顶部触发 loadMore（程序化滚动不会触发 onScroll，改用真实滚轮）
await page.mouse.move(215, 450);
for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, -500); await page.waitForTimeout(50); }
await page.waitForTimeout(5000);
console.log('滚动到顶后:', JSON.stringify(await countBubbles()));
await browser.close();
