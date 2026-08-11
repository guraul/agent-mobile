const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  page.on('request', r => { if (r.url().includes('4096')) console.log('REQ', r.method(), r.url().slice(0, 80), r.headers()['authorization'] ? 'auth' : 'NO-AUTH'); });
  page.on('response', r => { if (r.url().includes('4096')) console.log('RES', r.status(), r.url().slice(0, 80)); });
  page.on('console', m => { if (['error','warning'].includes(m.type())) console.log('CONSOLE', m.type(), m.text().slice(0, 150)); });
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(4000);
  await page.getByText('Review the auth migration').first().click();
  await page.waitForTimeout(6000);
  await page.getByText('Pulse详情页关闭后无法再次打开').first().click();
  await page.waitForTimeout(6000);
  console.log('--- after entering chat ---');
  await page.waitForTimeout(5000);
  await browser.close();
})();
