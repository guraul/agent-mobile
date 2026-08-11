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
const pos = await page.evaluate(() => {
  const out = {};
  const ta = document.querySelector('textarea');
  if (ta) { const r = ta.getBoundingClientRect(); out.textarea = { y: Math.round(r.y), bottom: Math.round(r.bottom), h: Math.round(r.height), x: Math.round(r.x), w: Math.round(r.width) }; }
  const mic = document.querySelector('[aria-label="Voice input"]');
  if (mic) { const r = mic.getBoundingClientRect(); out.mic = { y: Math.round(r.y), bottom: Math.round(r.bottom) }; }
  // 输入行容器（textarea 的父级）
  const row = ta?.parentElement;
  if (row) { const r = row.getBoundingClientRect(); out.inputRow = { y: Math.round(r.y), bottom: Math.round(r.bottom), h: Math.round(r.height), x: Math.round(r.x), w: Math.round(r.width), pad: window.getComputedStyle(row).padding }; }
  // 底部 tab 栏
  const tabs = [...document.querySelectorAll('div')].find(d => d.getBoundingClientRect().y > 800 && d.getBoundingClientRect().h < 60);
  if (tabs) { const r = tabs.getBoundingClientRect(); out.tabs = { y: Math.round(r.y), bottom: Math.round(r.bottom) }; }
  out.window = { innerHeight: window.innerHeight, vw: window.innerWidth };
  return out;
});
console.log(JSON.stringify(pos, null, 1));
await browser.close();
