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
const layout = await page.evaluate(() => {
  const out = [];
  const check = (el, depth) => {
    if (depth > 12) return;
    const r = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (r.width > 200 && r.height > 10) {
      out.push({
        depth,
        tag: el.tagName,
        y: Math.round(r.y), h: Math.round(r.height),
        w: Math.round(r.width), x: Math.round(r.x),
        pad: style.padding,
        bg: style.backgroundColor.slice(0,30),
        testid: el.getAttribute('data-testid') || '',
      });
    }
    for (const c of el.children) check(c, depth+1);
  };
  check(document.body, 0);
  // 只保留 body 级和主要容器
  return out.filter(o => o.h > 30).slice(0, 25);
});
console.log(JSON.stringify(layout, null, 1));
await browser.close();
