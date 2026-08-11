const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const reqs = [];
  page.on('request', r => { if (r.url().includes('4096')) reqs.push(`${r.method()} ${r.url().split('/').pop().split('?')[0]}`); });
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 120)); });
  page.on('pageerror', e => errs.push('pageerror: ' + String(e).slice(0, 120)));
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.getByText('Review the auth migration').first().click();
  await page.waitForTimeout(6000);
  await page.getByText('Pulse详情页关闭后无法再次打开').first().click();
  await page.waitForTimeout(6000);
  const textarea = page.locator('textarea[placeholder*="Message"]');
  await textarea.first().fill('请只回复四个字：流式正常');
  await page.waitForTimeout(500);
  await page.locator('[aria-label="Send"]').first().click();
  console.log('sent. waiting for streaming reply...');
  const t0 = Date.now();
  let seen = false;
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);
    const t = await page.locator('body').innerText();
    if (t.includes('流式正常')) { seen = true; console.log('REPLY VISIBLE at', ((Date.now()-t0)/1000).toFixed(1), 's'); break; }
  }
  console.log('reply appeared:', seen);
  await page.screenshot({ path: '/tmp/e2e-stream-result.png' });
  const msgLoads = reqs.filter(r => r.includes('message')).length;
  console.log('message reloads:', msgLoads);
  console.log('errors:', errs.join(' | ') || 'none');
  await browser.close();
})();
