import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message.slice(0,150)));
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(6000);
const result = await page.evaluate(() => {
  const rows = Array.from(document.querySelectorAll('div')).filter(d => {
    const r = d.getBoundingClientRect();
    const t = (d.textContent||'').trim();
    return r.width > 150 && t.length > 0 && t.length < 60 && (
      t.includes('思考中') || t.includes('工具(') || t.includes('开始执行') || t.includes('完成') ||
      t.includes('tool call') || t.startsWith('Pulse')
    );
  });
  return rows.slice(0, 20).map(e => ({ y: Math.round(e.getBoundingClientRect().y), t: (e.textContent||'').trim().replace(/\s+/g,' ').slice(0, 50) }));
});
console.log('过程旁白/标签 元素:');
result.forEach(r => console.log(`  y=${r.y} ${r.t}`));
console.log('页面错误:', errors.length ? errors : '无');
await page.screenshot({ path: '/root/project/agent-mobile/test/steps-render.png', fullPage: false });
await browser.close();
