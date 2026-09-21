const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
  });
  await page.goto('http://localhost:9960/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/opencode/s2-pulse.png' });
  await browser.close();
  console.log('done');
})();
