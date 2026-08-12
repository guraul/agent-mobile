import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message.slice(0,200)}`));
page.on('request', r => {
  if (r.url().includes('4096') && r.method() !== 'GET') {
    let data = '';
    try { data = r.postData()?.slice(0, 80) || ''; } catch {}
    logs.push(`[REQ ${r.method()}] ${r.url().replace('http://106.13.181.13:4096','')} ${data}`);
  }
});
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(6000);
const msg = 'phone-send-test-' + Date.now().toString().slice(-6);
console.log('>>> 输入:', msg);
await page.locator('input, textarea').first().fill(msg);
await page.waitForTimeout(500);
const sendBtn = page.locator('[aria-label="Send"]');
console.log('Send 按钮数量:', await sendBtn.count());
await sendBtn.click();
await page.waitForTimeout(8000);
console.log('=== 非 GET 请求 ===');
logs.forEach(l => console.log(l));
console.log('=== 页面错误 ===');
logs.filter(l => l.includes('PAGEERROR')).forEach(l => console.log(l));
const onPage = await page.evaluate((m) => document.body.textContent.includes(m), msg);
console.log('页面包含发送消息:', onPage);
await browser.close();
