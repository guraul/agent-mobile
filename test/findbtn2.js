const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  page.on('console', m => { if (['error','warning'].includes(m.type())) errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e}`));
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  try {
    await page.getByText('Review the auth migration').first().click();
    await page.waitForTimeout(5000);
  } catch (e) { errors.push(`[open sheet] ${e}`); }
  await page.screenshot({ path: '/tmp/dbg-sheet.png' });
  const sheetText = await page.locator('body').innerText();
  errors.push('--- SHEET TEXT ---'); errors.push(sheetText.slice(0, 700));
  await browser.close();
  console.log(errors.join('\n'));
})();
