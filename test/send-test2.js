const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 420, height: 900 } });
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.getByText('Review the auth migration').first().click();
  await page.waitForTimeout(7000);
  await page.getByText('Pulse详情页关闭后无法再次打开').first().click();
  await page.waitForTimeout(8000);
  const input = page.locator('input[placeholder="Message opencode…"]');
  const cnt = await input.count();
  const text = await page.locator('body').innerText();
  const i = text.indexOf('Message opencode');
  console.log('input count:', cnt);
  console.log(text.slice(Math.max(0,i-200), i+100));
  await page.screenshot({ path: '/tmp/dbg-send2.png' });
  await browser.close();
})();
