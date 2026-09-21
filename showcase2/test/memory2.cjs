const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright-core');
const EXE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://127.0.0.1:9960/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  // enter noticed
  await page.evaluate(() => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode;
      if (n.textContent.trim() === 'I noticed the fund estimate has declined for three trading days.') {
        const r = document.createRange();
        r.selectNodeContents(n);
        const rect = r.getBoundingClientRect();
        const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
        const t = document.elementFromPoint(x, y) || document.body;
        for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          t.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        }
      }
    }
  });
  await page.waitForTimeout(1200);
  const body = await page.evaluate(() => document.body.innerText);
  console.log('mem chip visible =', body.includes('Recalled:'));

  // click memory chip
  const r = await page.evaluate(() => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode;
      if (n.textContent.includes('Recalled:')) {
        const rng = document.createRange();
        rng.selectNodeContents(n);
        const rect = rng.getBoundingClientRect();
        const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
        const t = document.elementFromPoint(x, y) || document.body;
        for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
          t.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
        }
        return { x, y, tag: t.tagName, cls: t.className && String(t.className).slice(0, 60) };
      }
    }
    return null;
  });
  console.log('clicked at', r);
  await page.waitForTimeout(900);
  const body2 = await page.evaluate(() => document.body.innerText);
  console.log('has "From memory" =', body2.includes('From memory'));
  console.log('has "FROM MEMORY" =', body2.includes('FROM MEMORY'));
  console.log('has quote =', body2.includes('You waited out'));
  await page.screenshot({ path: '/tmp/opencode/s2f-memory-sheet2.png' });
  await browser.close();
  console.log('DONE');
})();
