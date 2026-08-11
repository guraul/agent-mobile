import { chromium, devices } from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const ctx = await b.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
p.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 200)));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text().slice(0, 150)); });
await p.goto('http://localhost:9928/pulse', { waitUntil: 'domcontentloaded', timeout: 20000 });
await p.waitForTimeout(3000);
const item = await p.evaluate(() => {
  const el = document.querySelector('[data-testid^="event-"]');
  return el ? el.getBoundingClientRect().toJSON() : null;
});
console.log('item rect:', JSON.stringify(item));
if (item) {
  await p.touchscreen.tap(item.x + item.width / 2, item.y + item.height / 2);
  await p.waitForTimeout(1500);
  const sheet = await p.evaluate(() => {
    const s = document.querySelector('[data-testid="event-sheet"]');
    return { open: !!s, rect: s ? s.getBoundingClientRect().toJSON() : null };
  });
  console.log('after tap:', JSON.stringify(sheet));
}
await b.close();
