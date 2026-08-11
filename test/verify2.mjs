import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const errors = [];
page.on('pageerror', e=>errors.push('[pageerror] '+e.message.slice(0,150)));
page.on('console', m=>{ if(m.type()==='error') errors.push('[console] '+m.text().slice(0,150)); });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(7000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(6000);
const body = await page.locator('body').innerText();
console.log('1. 无 Loading earlier messages:', !body.includes('Loading earlier'));
console.log('2. 有 Mic 语音按钮:', await page.locator('[aria-label="Voice input"]').count() > 0);
console.log('3. 有输入框:', await page.locator('textarea').count() > 0);
// 检查输入框位置（应贴近底部 tab 栏上方）
const inputPos = await page.evaluate(() => {
  const ta = document.querySelector('textarea');
  if (!ta) return null;
  const r = ta.getBoundingClientRect();
  return { bottom: Math.round(window.innerHeight - r.bottom), width: Math.round(r.width), vw: window.innerWidth };
});
console.log('4. 输入框位置 (离底部距离, 宽度, 屏宽):', JSON.stringify(inputPos));
// 检查消息气泡横向撑满（左边缘接近 0 或 sheet 边缘）
const bubblePos = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div')].filter(d => {
    const bg = window.getComputedStyle(d).backgroundColor;
    return bg === 'rgb(28, 25, 23)' && d.getBoundingClientRect().width > 100;
  });
  return els.slice(0,3).map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; });
});
console.log('5. AI 气泡位置 (左边缘x, 宽度):', JSON.stringify(bubblePos));
console.log('6. JS 错误:', errors.length ? errors[0] : '无');
await page.screenshot({ path: '/tmp/chat3.png' });
await browser.close();
