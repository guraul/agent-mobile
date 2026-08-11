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
// 取所有消息气泡的文本（按 DOM 顺序，即渲染顺序）
const rendered = await page.evaluate(() => {
  const out = [];
  // 找所有 AI 气泡（Pulse 标签开头）和 user 气泡（黄色）
  document.querySelectorAll('div').forEach(d => {
    const bg = window.getComputedStyle(d).backgroundColor;
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    if (bg === 'rgb(245, 166, 36)' && r.width > 80 && r.height > 20) {
      out.push({ type: 'user', text: t.slice(0, 40) });
    }
  });
  // 找 AI 气泡：含 Pulse 标签 + 气泡背景
  document.querySelectorAll('div').forEach(d => {
    const bg = window.getComputedStyle(d).backgroundColor;
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    if (bg === 'rgb(28, 25, 23)' && r.width > 100 && r.height > 30 && t.length > 5) {
      out.push({ type: 'ai', text: t.slice(0, 40) });
    }
  });
  // 按 DOM 顺序排列
  const all = [];
  document.querySelectorAll('div').forEach(d => {
    const bg = window.getComputedStyle(d).backgroundColor;
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    if ((bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)') && r.width > 100 && r.height > 25 && t.length > 3) {
      all.push({ y: Math.round(r.y), bg: bg.slice(0,30), text: t.slice(0, 35) });
    }
  });
  return all.slice(-12);
});
console.log('渲染的消息气泡 (最后12个, 按DOM顺序):');
rendered.forEach(b => console.log(`  y=${b.y} ${b.bg.includes('245, 166') ? 'USER ' : 'AI   '} ${b.text}`));
await browser.close();
