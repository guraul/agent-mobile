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
// 找到消息列表滚动容器
const sel = await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 1000 && !best || (best && el.scrollHeight > best.scrollHeight)) {
      best = el;
    }
  });
  return best ? { sh: best.scrollHeight, ch: best.clientHeight } : null;
});
console.log('消息列表容器:', JSON.stringify(sel));
// 初始在底部
await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 1000 && !best) best = el;
  });
  best.scrollTop = best.scrollHeight;
});
await page.waitForTimeout(800);
// 上滑到中间位置
await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 1000 && !best) best = el;
  });
  best.scrollTop = 1500;
});
const pos1 = await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 1000 && !best) best = el;
  });
  return best.scrollTop;
});
await page.waitForTimeout(2500);
const pos2 = await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 1000 && !best) best = el;
  });
  return best.scrollTop;
});
console.log(`上滑后位置: ${pos1} → 2.5s后: ${pos2}`);
console.log(pos1 === pos2 ? 'PASS 滚动位置保持，未被拉回底部' : 'FAIL 滚动位置被改变');
await browser.close();
