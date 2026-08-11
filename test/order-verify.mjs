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
// 检查最后渲染的消息（滚动到底后）
await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 1000 && !best) best = el;
  });
  if (best) best.scrollTop = best.scrollHeight;
});
await page.waitForTimeout(1000);
// 提取最底部可见文本（最后一条消息内容）
const lastText = await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => {
    if (el.scrollHeight > el.clientHeight + 1000 && !best) best = el;
  });
  if (!best) return '';
  const rect = best.getBoundingClientRect();
  // 找视口内最下方的消息文本
  const texts = [...document.querySelectorAll('div')].filter(d => {
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    return t.length > 5 && r.bottom < rect.bottom && r.bottom > rect.bottom - 300;
  });
  texts.sort((a,b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
  return texts.slice(0,3).map(d => (d.textContent||'').trim().slice(0,60));
});
console.log('底部三条消息:', JSON.stringify(lastText, null, 1));
// 与 API 的最新消息对比
const apiLast = await page.evaluate(async () => {
  const res = await fetch('http://106.13.181.13:4096/session/ses_0114cc2caffeD3ZpcCcuxcGnzR/message?limit=1', { headers: { 'Authorization': 'Basic ' + btoa('opencode:f14dd6828c5bcd6bd35d14be281c3e79802b002ddabd2bd7') } });
  const msgs = await res.json();
  const m = msgs[0];
  const text = m.parts.filter(p => p.type === 'text').map(p => p.text).join('').slice(0, 60);
  return { id: m.info.id, text };
});
console.log('API 最新消息:', JSON.stringify(apiLast));
await browser.close();
