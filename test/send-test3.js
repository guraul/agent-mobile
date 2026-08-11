const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.getByText('Review the auth migration').first().click();
  await page.waitForTimeout(7000);
  await page.getByText('Pulse详情页关闭后无法再次打开').first().click({ force: true });
  await page.waitForTimeout(6000);
  const textarea = page.locator('textarea, input[placeholder*="Message"]');
  console.log('textarea count:', await textarea.count());
  const text = await page.locator('body').innerText();
  const i = text.indexOf('Message opencode');
  console.log('--- page near input ---');
  console.log(text.slice(Math.max(0, i - 300), i + 200));
  if (await textarea.count()) {
    await textarea.first().fill('请只回复：ok');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/tmp/dbg-filled.png' });
  }
  await browser.close();
})();
