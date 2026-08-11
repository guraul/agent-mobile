import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const t0 = Date.now();
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'load', timeout: 120000 });
console.log(`load event: ${Date.now()-t0}ms`);
// 轮询直到项目条目出现
let shown = null;
for (let i=0;i<30;i++){
  await page.waitForTimeout(1000);
  const cnt = await page.locator('[data-testid^="project-"]').count();
  if (cnt>0) { shown = Date.now()-t0; break; }
}
console.log(`project item shown: ${shown}ms (or null)`);
await browser.close();
