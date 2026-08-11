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
// 提取所有消息气泡（Pulse 标签或右侧气泡）按 DOM 顺序
const bubbles = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('div').forEach(d => {
    const t = (d.textContent||'').trim();
    // 消息气泡特征：Pulse 标签相邻 或 黄色背景
    const bg = window.getComputedStyle(d).backgroundColor;
    const r = d.getBoundingClientRect();
    if ((bg === 'rgb(245, 166, 36)' && r.width > 80) || (t.startsWith('Pulse') && r.height > 30 && r.width > 100)) {
      out.push({ text: t.slice(0, 40).replace(/\n/g, ' '), y: Math.round(r.y), bg: bg.slice(0,20) });
    }
  });
  return out.slice(0, 15);
});
console.log('页面气泡 (前15个, 按渲染顺序):');
bubbles.forEach(b => console.log(`  y=${b.y} ${b.bg} ${b.text}`));
// API 最新 5 条
const apiMsgs = await page.evaluate(async () => {
  const auth = 'Basic ' + btoa('opencode:f14dd6828c5bcd6bd35d14be281c3e79802b002ddabd2bd7');
  const res = await fetch('http://106.13.181.13:4096/session/ses_0114cc2caffeD3ZpcCcuxcGnzR/message?limit=8', { headers: { 'Authorization': auth } });
  const msgs = await res.json();
  return msgs.map(m => ({
    role: m.info.role,
    text: m.parts.filter(p => p.type === 'text' && p.text).map(p => p.text).join(' ').slice(0, 35),
    created: m.info.time?.created,
  }));
});
console.log('\nAPI 最新 8 条 (newest-first):');
apiMsgs.forEach(m => console.log(`  [${m.role}] ${m.text}`));
await browser.close();
