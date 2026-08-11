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
  const rRow = row?.getBoundingClientRect();
  return { inputRowBottom: rRow ? Math.round(rRow.bottom) : null, innerHeight: window.innerHeight };
});
console.log('输入行底部:', info.inputRowBottom, '窗口高:', info.innerHeight, info.inputRowBottom === info.innerHeight ? 'PASS 贴底' : '(应等于窗口高,tab栏在其上)');
await page.screenshot({ path: '/tmp/chat4.png' });
await browser.close();
