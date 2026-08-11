import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const consoleMsgs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(m.text().slice(0,120)); });
page.on('pageerror', e => consoleMsgs.push('PAGEERROR: ' + e.message.slice(0,150)));
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(7000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(5000);
const before = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('div').forEach(d => {
    const bg = window.getComputedStyle(d).backgroundColor;
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    if (r.width > 100 && r.height > 25 && t.length > 3 && (bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)')) {
      out.push({ y: Math.round(r.y), role: bg === 'rgb(245, 166, 36)' ? 'USER' : 'AI', text: t.slice(0, 30) });
    }
  });
  out.sort((a,b) => b.y - a.y);
  return out.slice(0, 3);
});
console.log('打开 sheet 后底部消息:', before.map(b => `${b.role} y=${b.y} ${b.text}`));
console.log('控制台错误:', consoleMsgs.length ? consoleMsgs.slice(0,5) : '无');
await browser.close();
