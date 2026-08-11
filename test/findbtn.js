const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');

(async () => {
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  page.on('console', m => { if (['error','warning'].includes(m.type())) errors.push(`[${m.type}] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e}`));
  await page.goto('http://127.0.0.1:9928', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  try {
    await page.getByText('Needs you').first().click();
    await page.waitForTimeout(4000);
  } catch (e) { errors.push(`[open sheet] ${e}`); }
  try {
    await page.getByText('Pulse详情页关闭后无法再次打开').first().click();
    await page.waitForTimeout(3000);
  } catch (e) { errors.push(`[open session] ${e}`); }
  await page.screenshot({ path: '/tmp/dbg-current.png' });
  await browser.close();
  console.log(errors.join('\n') || '(no console errors)');
})();
