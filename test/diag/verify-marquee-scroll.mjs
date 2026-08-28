import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(10000);

// 找 MARKET 条目内的 Animated.View（有 transform translateX 的元素）
const scrollInfo = await page.evaluate(async () => {
  const findAnimated = () => {
    // 找含 MARKET 文本的条目容器
    const all = [...document.querySelectorAll('*')];
    const mkt = all.find(e => e.children.length === 0 && e.textContent === 'MARKET');
    if (!mkt) return null;
    // 向上找到条目，再找其内部有 transform 的容器
    let container = mkt.parentElement;
    for (let i = 0; i < 6 && container; i++) container = container.parentElement;
    if (!container) return null;
    // 条目内找 style 含 translateX 的元素
    const scrollers = [...container.querySelectorAll('*')].filter(e => {
      const s = e.style && e.style.transform;
      return s && s.includes('translateX');
    });
    return scrollers.map(e => e.style.transform);
  };
  const s0 = findAnimated();
  await new Promise(r => setTimeout(r, 600));
  const s1 = findAnimated();
  return { before: s0, after: s1 };
});
console.log('transform before:', JSON.stringify(scrollInfo.before));
console.log('transform after 600ms:', JSON.stringify(scrollInfo.after));
const changed = JSON.stringify(scrollInfo.before) !== JSON.stringify(scrollInfo.after);
console.log('跑马灯在滚动:', changed);
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/marquee-scroll-check.png' });
await browser.close();
