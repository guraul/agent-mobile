const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright-core');
const EXE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  const url = process.env.URL || 'http://127.0.0.1:9928/';
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2500);
  const body = await page.evaluate(() => document.body.innerText);
  console.log('=== DEPLOYED SHOWCASE2 (9928) ===');
  console.log(body.slice(0, 500));
  await page.screenshot({ path: '/tmp/opencode/s2-deployed-9928.png' });
  await browser.close();
})();
