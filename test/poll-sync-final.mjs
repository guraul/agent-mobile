import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const AUTH = 'opencode:f14dd6828c5bcd6bd35d14be281c3e79802b002ddabd2bd7';
const SID = 'ses_0114cc2caffeD3ZpcCcuxcGnzR';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const polls = [];
page.on('request', r => { if (r.url().includes('/message?limit=10')) polls.push(Date.now()); });
page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0,150)));
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid="project-645633255eb0c98cf024f8d5d0f16ffd62627967"]').dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(6000);
const msg = 'poll-sync-' + Date.now().toString().slice(-6);
console.log('发送测试:', msg);
execSync(`curl -s -u "${AUTH}" -X POST "http://127.0.0.1:4096/session/${SID}/prompt_async" -H "Content-Type: application/json" -d '{"parts":[{"type":"text","text":"${msg}"}]}'`, { timeout: 15000 });
// 等轮询周期（5s）+ 渲染
let found = false;
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(1000);
  if (await page.evaluate((m) => document.body.textContent.includes(m), msg)) {
    found = true; console.log(`PASS: ${i+1}s 内出现（轮询触发次数: ${polls.length}）`); break;
  }
}
if (!found) console.log('FAIL: 12s 内未出现');
console.log('轮询时间戳:', polls.slice(-5));
await browser.close();
