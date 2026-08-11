const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const jsContent = [];
  page.on('response', async (r) => {
    const url = r.url();
    if ((url.includes('.js') || url.includes('bundle')) && !url.includes('4096')) {
      try {
        const txt = await r.text();
        if (txt.length < 5000000) jsContent.push(txt);
      } catch {}
    }
  });
  await page.goto('http://127.0.0.1:9928/pulse', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(5000);
  const all = jsContent.join(' ');
  console.log('js chunks:', jsContent.length);
  console.log('has /global/event:', all.includes('/global/event'));
  console.log('has "/event" (old):', all.includes('"/event"'));
  await browser.close();
})();
