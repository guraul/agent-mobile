import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
page.on('pageerror', e=>console.log('PAGEERROR:', e.message.slice(0,150)));
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(6000);
const body = await page.locator('body').innerText();
// 检查是否有 user 消息（找 "告诉我" 或中文提问，或检查右侧气泡）
const userTexts = ['告诉我', '问题', '帮我', '请'];
const found = userTexts.filter(t => body.includes(t));
console.log('页面文本中包含的用户提问关键词:', found.length ? found : '无');
// 检查气泡对齐 - 找所有含文本的 box
const bubbleInfo = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('[dir="auto"]').forEach(el => {
    const t = (el.textContent||'').trim();
    if (t.length > 5 && t.length < 60) out.push({ t: t.slice(0,40), w: el.getBoundingClientRect().width });
  });
  return out.slice(0, 15);
});
console.log('文本气泡样本:', JSON.stringify(bubbleInfo, null, 1));
await browser.close();
