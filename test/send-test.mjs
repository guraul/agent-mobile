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
// 发一条测试消息
const ta = page.locator('textarea').first();
await ta.click();
await ta.fill('e2e-order-test-1723');
await page.waitForTimeout(300);
await page.locator('[aria-label="Send"]').first().dispatchEvent('click',{bubbles:true});
console.log('已发送测试消息，等待回复...');
// 等待并轮询：检查消息列表中的位置
for (let i=0;i<15;i++){
  await page.waitForTimeout(3000);
  const pos = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('div').forEach(d => {
      const bg = window.getComputedStyle(d).backgroundColor;
      const r = d.getBoundingClientRect();
      const t = (d.textContent||'').trim();
      if (r.width > 100 && r.height > 25 && t.length > 3 && (bg === 'rgb(245, 166, 36)' || bg === 'rgb(28, 25, 23)')) {
        out.push({ y: Math.round(r.y), role: bg === 'rgb(245, 166, 36)' ? 'USER' : 'AI', text: t.slice(0, 45) });
      }
    });
    out.sort((a,b) => b.y - a.y);
    return out.slice(0, 6);
  });
  const hasTest = pos.some(b => b.text.includes('e2e-order-test'));
  if (hasTest) {
    console.log(`[${i*3}s] 测试消息可见，底部消息顺序:`);
    pos.forEach(b => console.log(`  ${b.role} y=${b.y}: ${b.text}`));
    // 判断测试消息是否在最底部
    const idx = pos.findIndex(b => b.text.includes('e2e-order-test'));
    console.log(idx === 0 ? 'PASS 测试消息在底部' : `FAIL 测试消息在位置 ${idx}`);
    break;
  }
}
await browser.close();
