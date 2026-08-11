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
const info = await page.evaluate(() => {
  const ta = document.querySelector('textarea');
  const row = ta?.parentElement;
  // 找 tab 栏
  const tabs = [...document.querySelectorAll('a, div')].filter(d => {
    const r = d.getBoundingClientRect();
    const t = d.textContent || '';
    return r.y > 840 && (t.includes('Pulse') && t.includes('Talk'));
  });
  const tabBar = tabs[0];
  const rRow = row?.getBoundingClientRect();
  const rTab = tabBar?.getBoundingClientRect();
  const rTa = ta?.getBoundingClientRect();
  return {
    inputRow: rRow ? { y: Math.round(rRow.y), bottom: Math.round(rRow.bottom), h: Math.round(rRow.height) } : null,
    textarea: rTa ? { bottom: Math.round(rTa.bottom) } : null,
    tabBar: rTab ? { y: Math.round(rTab.y), bottom: Math.round(rTab.bottom) } : null,
    gapInputToTab: rRow && rTab ? Math.round(rTab.y - rRow.bottom) : null,
    innerHeight: window.innerHeight,
  };
});
console.log(JSON.stringify(info, null, 1));
await browser.close();
