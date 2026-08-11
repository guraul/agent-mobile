import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(7000);
// 打印所有项目条目文本
const projects = await page.evaluate(() => {
  return [...document.querySelectorAll('[data-testid^="project-"]')].map(e => ({
    testid: e.getAttribute('data-testid'),
    text: (e.textContent||'').slice(0, 50),
  }));
});
console.log('项目条目:', JSON.stringify(projects));
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(5000);
const header = await page.evaluate(() => {
  const ta = document.querySelector('textarea');
  // 找 header 文本（项目名）
  const texts = [...document.querySelectorAll('div')].filter(d => {
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    return t.length > 2 && t.length < 40 && r.y < 60 && r.y > 0;
  });
  return texts.slice(0,5).map(d => d.textContent.trim());
});
console.log('聊天 header 区域文本:', JSON.stringify(header));
// 检查请求了哪个 session
const sessionReqs = [];
page.on('request', r => { if (r.url().includes('/session/')) sessionReqs.push(r.url()); });
await browser.close();
