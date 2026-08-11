const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const body = [];
  page.on('console', m => { if (m.type() === 'error') body.push(`[err] ${m.text()}`); });
  page.on('pageerror', e => body.push(`[pageerror] ${e}`));
  await page.goto('http://127.0.0.1:9928', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  const texts = await page.locator('body').innerText();
  body.push('--- BODY TEXT ---');
  body.push(texts.slice(0, 800));
  await page.screenshot({ path: '/tmp/dbg-home.png' });
  await browser.close();
  console.log(body.join('\n'));
})();
