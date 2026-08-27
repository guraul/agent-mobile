import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
await page.reload({ waitUntil: 'load', timeout: 120000 });
let pid = null;
for (let i = 0; i < 8 && !pid; i++) {
  await page.waitForTimeout(5000);
  pid = await page.evaluate(() => {
    for (const e of document.querySelectorAll('[data-testid^="project-"]')) {
      const t = e.getAttribute('data-testid');
      if (/^project-[0-9a-f]+$/.test(t)) return t;
    }
    return null;
  });
}
console.log('project:', pid);
const box = await page.locator(`[data-testid="${pid}"]`).boundingBox();
await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
await page.waitForTimeout(12000);
const res = await page.evaluate(() => {
  const bodyText = document.body.innerText;
  const hasErrorLabel = bodyText.includes('出错了');
  const hasApiError = bodyText.includes('APIError') || bodyText.includes('Authentication') || bodyText.includes('api key');
  const hasSheet = !!document.querySelector('[data-testid="project-chat-sheet"]');
  return {
    hasErrorLabel,
    hasApiError,
    hasSheet,
    bodyHead: bodyText.slice(0, 600),
    bodyLen: bodyText.length,
  };
});
console.log(JSON.stringify(res, null, 2));
console.log('--- page errors ---');
console.log(logs.filter(l => l.startsWith('[PAGEERROR]') || l.startsWith('[error]')).join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/error-bubble-check.png' });
await browser.close();
