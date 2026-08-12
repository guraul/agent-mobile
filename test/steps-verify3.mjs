import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid="project-645633255eb0c98cf024f8d5d0f16ffd62627967"]').dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(6000);
const result = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('div, span'));
  const hits = [];
  for (const d of all) {
    const t = (d.textContent||'').trim();
    if (/工具\(|思考中|开始执行|^完成$|Pulse/.test(t) && t.length < 40) {
      const r = d.getBoundingClientRect();
      hits.push({ y: Math.round(r.y), t: t.replace(/\s+/g,' ') });
    }
  }
  hits.sort((a,b) => a.y - b.y);
  return hits.slice(0, 25);
});
console.log('旁白/标签命中:');
result.forEach(r => console.log(`  y=${r.y} ${r.t}`));
await page.screenshot({ path: '/root/project/agent-mobile/test/steps-render3.png' });
await browser.close();
