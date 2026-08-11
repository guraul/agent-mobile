const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  const posts = [];
  page.on('request', r => { if (r.method() === 'POST' && r.url().includes('4096')) posts.push(r.url()); });
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  await page.getByText('Review the auth migration').first().click();
  await page.waitForTimeout(6000);
  const row = page.locator('text=Pulse详情页关闭后无法再次打开').last();
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.waitForTimeout(5000);
  const textarea = page.locator('textarea[placeholder*="Message"]');
  if (!(await textarea.count())) {
    console.log('NOT in chat. body head:', (await page.locator('body').innerText()).slice(0, 200));
    await browser.close(); return;
  }
  await textarea.first().fill('请只回复四个字：流式正常');
  await page.waitForTimeout(500);
  await page.locator('[aria-label="Send"]').first().click();
  console.log('POSTs:', posts.join(' | '));
  const t0 = Date.now();
  let seen = false;
  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);
    const t = await page.locator('body').innerText();
    if (t.includes('流式正常')) { seen = true; console.log('REPLY VISIBLE at', ((Date.now()-t0)/1000).toFixed(1), 's'); break; }
  }
  console.log('reply appeared:', seen);
  await page.screenshot({ path: '/tmp/e2e-precise-result.png' });
  await browser.close();
})();
