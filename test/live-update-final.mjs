import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const AUTH = 'opencode:f14dd6828c5bcd6bd35d14be281c3e79802b002ddabd2bd7';
const SID = 'ses_0114cc2caffeD3ZpcCcuxcGnzR';
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[error] ${e.message}`));
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(7000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(6000);
const msg = 'live-final-' + Date.now().toString().slice(-6);
console.log('发送测试消息:', msg);
execSync(`curl -s -u "${AUTH}" -X POST "http://127.0.0.1:4096/session/${SID}/prompt_async" -H "Content-Type: application/json" -d '{"parts":[{"type":"text","text":"${msg}"}]}'`, { timeout: 15000 });
let found = false;
for (let i = 0; i < 15; i++) {
  await page.waitForTimeout(1000);
  const hit = await page.evaluate((m) => document.body.textContent.includes(m), msg);
  if (hit) { found = true; console.log(`PASS: ${i+1}s 时消息实时出现在 sheet 中`); break; }
}
if (!found) console.log('FAIL: 15s 内未出现');
console.log('=== 错误日志 ===');
logs.filter(l => l.includes('error') || l.includes('Error') || l.includes('minified')).forEach(l => console.log(l));
await browser.close();
