import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid="project-645633255eb0c98cf024f8d5d0f16ffd62627967"]').dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(7000);
const modelPill = page.locator('[aria-label="Select model"]');
console.log('model pill:', (await modelPill.textContent()).trim());
await modelPill.click();
await page.waitForTimeout(800);
const sheetVisible = await page.evaluate(() => {
  const el = document.body.textContent.includes('选择模型');
  return el;
});
console.log('弹出框出现(含"选择模型"标题):', sheetVisible);
const items = await page.evaluate(() => {
  const hits = [];
  document.querySelectorAll('div').forEach(d => {
    const t = (d.textContent||'').trim();
    if (t === 'minimax-m3' || t === 'agnes-2.5-flash') hits.push(t);
  });
  return [...new Set(hits)];
});
console.log('模型选项:', items);
await page.screenshot({ path: '/root/project/agent-mobile/test/model-sheet.png' });
await page.locator('[aria-label="Close sheet"]').click().catch(() => {});
await browser.close();
