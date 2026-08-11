const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const out = [];
  page.on('pageerror', e => out.push(`[pageerror] ${e}`));
  page.on('console', m => { if (m.type() === 'error') out.push(`[err] ${m.text()}`); });
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  const texts = await page.locator('body').innerText();
  out.push('--- BODY ---'); out.push(texts.slice(0, 600));
  await page.screenshot({ path: '/tmp/dbg-pulse.png' });
  await browser.close();
  console.log(out.join('\n'));
})();
