import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: false, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
page.on('console', m => console.log(`[${m.type()}] ${m.text().slice(0,200)}`));
page.on('pageerror', e => console.log('PAGEERROR:', e.message));
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(7000);
await page.locator('[data-testid^="project-"]').first().dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(5000);
console.log('Sheet opened. Now evaluate ChatPanel debug...');
await page.evaluate(() => {
  window.__debugEvents = [];
  const origSubscribe = window.__origSubscribe || window.opencode?.subscribeToOpenCodeEvents;
  if (origSubscribe) {
    window.opencode.subscribeToOpenCodeEvents = (cb) => {
      console.log('DEBUG: subscribeToOpenCodeEvents called');
      const wrapped = (evt) => {
        console.log('DEBUG: SSE event received', evt.type, evt.properties);
        window.__debugEvents.push({ time: Date.now(), evt });
        cb(evt);
      };
      return origSubscribe(wrapped);
    };
  }
});
await page.waitForTimeout(3000);
console.log('Debug hooks installed. Now send test message via curl...');
