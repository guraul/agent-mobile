import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const reqs = [];
page.on('request', r => { if (r.url().includes('4096')) reqs.push(r.url().replace(/http:\/\/[^/]+/, '')); });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
const items = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[data-testid^="project-"]')).map(el => ({
    testid: el.getAttribute('data-testid'),
    text: (el.textContent||'').trim().slice(0, 40)
  }));
});
console.log('项目列表:', items.map(i => `${i.testid} | ${i.text}`).join('\n  '));
console.log('4096 请求:', [...new Set(reqs)].join('\n  ') || '无');
if (items.length) {
  await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', {bubbles:true});
  await page.waitForTimeout(6000);
  const sheetOpen = await page.evaluate(() => !!document.querySelector('[data-testid="project-chat-sheet"]'));
  const bubbleCount = await page.evaluate(() => {
    return document.querySelectorAll('[data-testid^="bubble-"]').length;
  });
  console.log('sheet 元素存在:', sheetOpen, '| 气泡数量:', bubbleCount);
  const bottom = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('div')).filter(d => {
      const r = d.getBoundingClientRect();
      const bg = window.getComputedStyle(d).backgroundColor;
      return r.width > 150 && r.height > 20 && (bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)');
    });
    els.sort((a,b) => b.getBoundingClientRect().y - a.getBoundingClientRect().y);
    return els.slice(0, 3).map(e => ({ y: Math.round(e.getBoundingClientRect().y), t: (e.textContent||'').trim().slice(0, 25) }));
  });
  console.log('底部气泡:', bottom.map(b => `y=${b.y} ${b.t}`).join(' | '));
}
await browser.close();
