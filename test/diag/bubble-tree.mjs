import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);

const BFF = process.env.BFF_BASE || 'http://127.0.0.1:19234';
const APP = process.env.APP_BASE || 'http://127.0.0.1:9928';

const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto(`${APP}/`, { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async ({ BFF }) => {
  const res = await fetch(`${BFF}/api/auth/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
}, { BFF });
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(6000);
await page.waitForSelector('[data-testid^="project-"]', { timeout: 30000 });
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click', { bubbles: true });
await page.waitForTimeout(10000);

// 找到所有橙色用户气泡（bg = accent.default），遍历其内部 DOM 树各层高度
const tree = await page.evaluate(() => {
  const ACCENT = 'rgb(245, 166, 36)';
  const out = [];
  const all = Array.from(document.querySelectorAll('div'));
  for (const el of all) {
    const style = el.getAttribute('style') || '';
    if (!style.includes('background-color: ' + ACCENT)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    // 收集该气泡内部子孙的树（depth-limited）
    const rows = [];
    const walk = (node, depth) => {
      if (depth > 6) return;
      const rr = node.getBoundingClientRect();
      const st = node.getAttribute('style') || '';
      const padV = (st.match(/padding-?[vt]?:?\s*([\d.]+)px/) || [])[1];
      const marV = (st.match(/margin-?[vt]?:?\s*([\d.]+)px/) || [])[1];
      const lh = (st.match(/line-height:\s*([\d.]+)px/) || [])[1];
      rows.push({
        depth, tag: node.tagName, w: Math.round(rr.width), h: Math.round(rr.height),
        padV: padV || null, marV: marV || null, lh: lh || null,
        text: (node.textContent || '').trim().slice(0, 8),
      });
      for (const c of node.children) walk(c, depth + 1);
    };
    walk(el, 0);
    out.push({ bubble: `h=${Math.round(r.height)} w=${Math.round(r.width)}`, rows });
  }
  return out;
});

// 只打印包含"改"或"好吧"这些短消息的气泡树（取最后几个）
for (const t of tree.slice(-3)) {
  console.log('=== bubble', t.bubble, '===');
  for (const r of t.rows) {
    console.log(`${' '.repeat(r.depth)}[${r.tag}] h=${r.h} w=${r.w} padV=${r.padV} marV=${r.marV} lh=${r.lh} "${r.text}"`);
  }
}
await browser.close();
