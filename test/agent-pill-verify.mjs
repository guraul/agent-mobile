import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const reqs = [];
page.on('request', r => {
  if (r.url().includes('prompt_async')) {
    let d = '';
    try { d = r.postData()?.slice(0, 120) || ''; } catch {}
    reqs.push(d);
  }
});
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid="project-645633255eb0c98cf024f8d5d0f16ffd62627967"]').dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(7000);
const agentPill = page.locator('[aria-label="Switch agent"]');
console.log('agent pill 初始文本:', await agentPill.textContent());
await agentPill.click();
await page.waitForTimeout(300);
console.log('点击后 agent:', (await agentPill.textContent()).trim());
await agentPill.click();
await page.waitForTimeout(300);
console.log('再点击后 agent:', (await agentPill.textContent()).trim());
const modelPill = page.locator('[aria-label="Select model"]');
console.log('model pill:', (await modelPill.textContent()).trim());
await modelPill.click();
await page.waitForTimeout(400);
const items = await page.evaluate(() => Array.from(document.querySelectorAll('div')).filter(d => d.textContent === 'minimax-m3' || d.textContent === 'agnes-2.5-flash').map(d => d.textContent));
console.log('model 下拉选项:', [...new Set(items)]);
await page.locator('input, textarea').first().fill('agent-pill-test');
await page.locator('[aria-label="Send"]').click();
await page.waitForTimeout(4000);
console.log('prompt_async 请求:', reqs);
await page.screenshot({ path: '/root/project/agent-mobile/test/agent-pill.png' });
await browser.close();
