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
// 从 API 拿完整消息列表（newest-first），对比渲染 DOM 中消息顺序
const apiData = await page.evaluate(async () => {
  const res = await fetch('http://106.13.181.13:4096/session/ses_0114cc2caffeD3ZpcCcuxcGnzR/message?limit=30', { headers: { 'Authorization': 'Basic ' + btoa('opencode:f14dd6828c5bcd6bd35d14be281c3e79802b002ddabd2bd7') } });
  const msgs = await res.json();
  // newest-first → 取最后 3 条（最旧）和第一条（最新）的 id 前缀
  return {
    newestId: msgs[0].info.id.slice(0, 16),
    oldestOfPage: msgs[29].info.id.slice(0, 16),
  };
});
console.log('API 最新消息 id:', apiData.newestId, '| 分页最旧 id:', apiData.oldestOfPage);
// 检查页面是否包含最新消息 id（说明已渲染）
const hasNewest = await page.evaluate((id) => {
  return document.body.innerHTML.includes(id);
}, apiData.newestId);
console.log('页面包含最新消息:', hasNewest);
await browser.close();
