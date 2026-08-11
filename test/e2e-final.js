const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(`[err] ${m.text()}`); });
  page.on('pageerror', e => errs.push(`[pageerror] ${e}`));
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.getByText('Review the auth migration').first().click();
  await page.waitForTimeout(6000);
  await page.getByText('Pulse详情页关闭后无法再次打开').first().click();
  await page.waitForTimeout(6000);
  const textarea = page.locator('textarea[placeholder*="Message"]');
  console.log('textarea:', await textarea.count());
  const body1 = await page.locator('body').innerText();
  const hasReply = body1.includes('好的') || body1.includes('收到');
  console.log('existing reply visible:', hasReply);
  const t0 = Date.now();
  await textarea.first().fill('请只回复三个字：测试通过');
  await page.waitForTimeout(500);
  await page.getByLabel('Send').first().click();
  console.log('sent at', ((Date.now()-t0)/1000).toFixed(1), 's');
  let seen = false;
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(2000);
    const t = await page.locator('body').innerText();
    if (t.includes('测试通过')) { seen = true; console.log('REPLY VISIBLE after', ((Date.now()-t0)/1000).toFixed(1), 's'); break; }
  }
  console.log('streaming reply appeared:', seen);
  await page.screenshot({ path: '/tmp/e2e-final-result.png' });
  console.log('console errors:', errs.join(' | ') || 'none');
  await browser.close();
})();
