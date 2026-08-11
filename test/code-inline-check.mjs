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
// 找含反引号代码的 AI 消息（Markdown 渲染后 code_inline 是带背景的 span）
const info = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('span').forEach(s => {
    const bg = window.getComputedStyle(s).backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && s.textContent.length < 40) {
      const r = s.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        out.push({ text: s.textContent.slice(0, 30), bg, w: Math.round(r.width), h: Math.round(r.height), y: Math.round(r.y), x: Math.round(r.x) });
      }
    }
  });
  return out.slice(0, 10);
});
console.log('检测到的行内代码块:', JSON.stringify(info, null, 1));
// 截图一个含代码的消息区域
const shots = [];
document;
await page.screenshot({ path: 'code-inline-full.png', fullPage: false });
await browser.close();
