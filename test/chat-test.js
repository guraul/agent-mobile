const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const errors = [];
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  page.on('console', m => { if (['error','warning'].includes(m.type())) errors.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', e => errors.push(`[pageerror] ${e}`));
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.getByText('Review the auth migration').first().click();
  await page.waitForTimeout(6000);
  await page.getByText('Pulse详情页关闭后无法再次打开').first().click();
  await page.waitForTimeout(6000);
  const text = await page.locator('body').innerText();
  errors.push('--- CHAT TEXT ---'); errors.push(text.slice(text.indexOf('Pulse详情页') , text.indexOf('Pulse详情页') + 400));
  await page.screenshot({ path: '/tmp/dbg-chat.png' });
  await browser.close();
  console.log(errors.join('\n'));
})();
