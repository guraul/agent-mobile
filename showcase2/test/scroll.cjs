const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright-core');
const EXE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';

async function clickText(page, text) {
  return page.evaluate((t) => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode;
      if (n.textContent.trim() === t) {
        const r = document.createRange();
        r.selectNodeContents(n);
        const rect = r.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        const target = document.elementFromPoint(x, y) || document.body;
        for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        }
        return true;
      }
    }
    return false;
  }, text);
}

async function getScroll(page) {
  return page.evaluate(() => {
    const scrollers = [...document.querySelectorAll('div')].filter(
      (d) => d.scrollHeight > d.clientHeight + 100 && d.scrollHeight > 500,
    );
    return scrollers[0] ? scrollers[0].scrollTop : -1;
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://127.0.0.1:9960/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  // scroll so that Noticed row is visible mid-viewport
  await page.evaluate(() => {
    const scrollers = [...document.querySelectorAll('div')].filter(
      (d) => d.scrollHeight > d.clientHeight + 100 && d.scrollHeight > 500,
    );
    const el = scrollers[0];
    if (el) el.scrollTop = 170;
  });
  await page.waitForTimeout(500);
  const scrollBefore = await getScroll(page);
  console.log('scroll before =', scrollBefore);

  // click the Noticed row (should be in viewport now)
  const ok = await clickText(page, 'Nightly backup finished at 03:12.');
  console.log('clicked noticed row =', ok);
  await page.waitForTimeout(1300);
  const inTalk = await page.evaluate(() => document.body.innerText.includes('Nightly backup'));
  console.log('in Talk (context chip) =', inTalk);

  // back
  await clickText(page, '‹');
  await page.waitForTimeout(900);
  const scrollAfter = await getScroll(page);
  console.log('scroll after back =', scrollAfter);
  console.log('scroll preserved =', Math.abs(scrollBefore - scrollAfter) < 3);

  await browser.close();
  console.log('DONE');
})();
