import { chromium } from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.on('console', m => console.log('CONSOLE:', m.type(), m.text().slice(0, 150)));
p.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 200)));
await p.goto('http://localhost:9928/pulse', { waitUntil: 'domcontentloaded', timeout: 20000 });
await p.waitForTimeout(3000);
const items = await p.evaluate(() => {
  const els = [...document.querySelectorAll('[data-testid^="event-"]')];
  return els.map(e => ({ id: e.dataset.testid, rect: e.getBoundingClientRect().toJSON() }));
});
console.log('found items:', items.length, JSON.stringify(items[0] || null));
if (items[0]) {
  const { x, y, width, height } = items[0].rect;
  await p.mouse.click(x + width / 2, y + height / 2);
  await p.waitForTimeout(1500);
  const sheet = await p.evaluate(() => {
    const s = document.querySelector('[data-testid="event-sheet"]');
    const scrim = document.querySelector('[data-testid="event-sheet-scrim"]');
    return { sheet: !!s, scrim: !!scrim, sheetRect: s ? s.getBoundingClientRect().toJSON() : null };
  });
  console.log('after click:', JSON.stringify(sheet));
}
await b.close();
