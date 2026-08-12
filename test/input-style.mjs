import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(8000);
await page.locator('[data-testid="project-645633255eb0c98cf024f8d5d0f16ffd62627967"]').dispatchEvent('click', {bubbles:true});
await page.waitForTimeout(7000);
const s = await page.evaluate(() => {
  const i = Array.from(document.querySelectorAll('input, textarea')).find(e => e.getAttribute('placeholder') === 'Message Pulse…');
  if (!i) return null;
  const cs = window.getComputedStyle(i);
  const r = i.getBoundingClientRect();
  const voice = document.querySelector('[aria-label="Voice input"]');
  const send = document.querySelector('[aria-label="Send"]');
  const vc = voice ? voice.getBoundingClientRect() : null;
  const sc = send ? send.getBoundingClientRect() : null;
  return {
    input: { y: Math.round(r.y), h: Math.round(r.height), top: r.top, boxSizing: cs.boxSizing, padding: cs.padding, minHeight: cs.minHeight, height: cs.height, lineHeight: cs.lineHeight, textAlignVertical: cs.textAlignVertical, alignItems: cs.alignItems },
    voice: vc ? { y: Math.round(vc.y), h: Math.round(vc.height), center: Math.round(vc.y + vc.height/2) } : null,
    send: sc ? { y: Math.round(sc.y), h: Math.round(sc.height), center: Math.round(sc.y + sc.height/2) } : null,
    inputCenter: Math.round(r.y + r.height/2),
  };
});
console.log(JSON.stringify(s, null, 2));
await browser.close();
