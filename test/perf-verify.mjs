import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const t0 = Date.now();
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(6000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click',{bubbles:true});
// 等待消息渲染
let chatReady = false;
for (let i=0;i<15;i++){
  await page.waitForTimeout(500);
  const has = await page.locator('text=tool call').first().count().catch(()=>0);
  if (has>0) { chatReady = true; break; }
}
console.log(`点击项目 → 聊天内容渲染: ${Date.now()-t0}ms, 就绪=${chatReady}`);
await browser.close();
