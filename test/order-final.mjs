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
// API: 该项目的最近 session 的最新非空消息
const apiInfo = await page.evaluate(async () => {
  const auth = 'Basic ' + btoa('opencode:f14dd6828c5bcd6bd35d14be281c3e79802b002ddabd2bd7');
  const base = 'http://106.13.181.13:4096';
  const sessions = await (await fetch(base + '/session?directory=' + encodeURIComponent('/root/project/agent-mobile'), { headers: { 'Authorization': auth } })).json();
  const sid = sessions[0].id;
  const msgs = await (await fetch(base + '/session/' + sid + '/message?limit=3', { headers: { 'Authorization': auth } })).json();
  const latest = msgs[0];
  const text = latest.parts.filter(p => p.type === 'text' && p.text).map(p => p.text).join('\n').slice(0, 50);
  return { sid, latestId: latest.info.id.slice(0,16), latestText: text };
});
console.log('API 最新消息:', JSON.stringify(apiInfo));
// 页面底部文本
await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => { if (el.scrollHeight > el.clientHeight + 1000 && !best) best = el; });
  if (best) best.scrollTop = best.scrollHeight;
});
await page.waitForTimeout(1000);
const pageBottomText = await page.evaluate(() => {
  let best = null;
  document.querySelectorAll('div').forEach(el => { if (el.scrollHeight > el.clientHeight + 1000 && !best) best = el; });
  if (!best) return '';
  const rect = best.getBoundingClientRect();
  const texts = [...document.querySelectorAll('div')].filter(d => {
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    return t.length > 8 && r.bottom > rect.bottom - 200;
  });
  texts.sort((a,b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom);
  return texts.map(d => (d.textContent||'').trim().slice(0,50)).slice(0,2);
});
console.log('页面底部消息:', JSON.stringify(pageBottomText));
const match = JSON.stringify(pageBottomText).includes(apiInfo.latestText.slice(0, 20));
console.log(match ? 'PASS 页面底部包含最新消息' : 'FAIL 页面底部不包含最新消息');
await browser.close();
