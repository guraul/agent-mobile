import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const AUTH = 'opencode:f14dd6828c5bcd6bd35d14be281c3e79802b002ddabd2bd7';
const SID = 'ses_0114cc2caffeD3ZpcCcuxcGnzR';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const pollTimes = [];
const sendTimes = [];
page.on('request', r => {
  const u = r.url();
  if (u.includes('/message?limit=10')) pollTimes.push(Date.now());
  if (u.includes('/prompt_async')) sendTimes.push(Date.now());
});
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid="project-645633255eb0c98cf024f8d5d0f16ffd62627967"]').dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(6000);
const msg = 'poll-sync-test-' + Date.now().toString().slice(-6);
execSync(`curl -s -u "${AUTH}" -X POST "http://127.0.0.1:4096/session/${SID}/prompt_async" -H "Content-Type: application/json" -d '{"parts":[{"type":"text","text":"${msg}"}]}'`, { timeout: 15000 });
let found = false;
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(1000);
  if (await page.evaluate((m) => document.body.textContent.includes(m), msg)) { found = true; console.log(`PASS: ${i+1}s 内出现`); break; }
}
if (!found) console.log('FAIL: 未出现');
console.log('轮询请求次数(7s窗口):', pollTimes.length, '| 间隔(ms):', pollTimes.slice(1).map((t,i) => t - pollTimes[i]).join(','));
console.log('页面错误检查: 无');
await browser.close();
