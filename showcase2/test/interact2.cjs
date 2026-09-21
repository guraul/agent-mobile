const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright-core');
const EXE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';

// Click the `label` text node that is nearest-below the `anchor` text node (same card).
async function clickBelow(page, anchor, label) {
  return page.evaluate(
    ({ a, l }) => {
      const rectOf = (node) => {
        const r = document.createRange();
        r.selectNodeContents(node);
        const rect = r.getBoundingClientRect();
        return rect;
      };
      const w1 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let anchorY = null;
      while (w1.nextNode()) {
        const n = w1.currentNode;
        if (n.textContent.trim() === a) {
          const r = rectOf(n);
          if (r.width && r.height) {
            anchorY = r.y;
            break;
          }
        }
      }
      if (anchorY === null) return false;
      const w2 = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let best = null;
      while (w2.nextNode()) {
        const n = w2.currentNode;
        if (n.textContent.trim() === l) {
          const r = rectOf(n);
          if (!r.width || !r.height) continue;
          if (r.y >= anchorY - 2 && r.y <= anchorY + 200) {
            if (!best || r.y < best.y) best = r;
          }
        }
      }
      if (!best) return false;
      const x = best.x + best.width / 2;
      const y = best.y + best.height / 2;
      const evTarget = document.elementFromPoint(x, y) || document.body;
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        evTarget.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      }
      return { x, y };
    },
    { a: anchor, l: label },
  );
}

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

async function has(page, text) {
  return page.evaluate((t) => document.body.innerText.includes(t), text);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://127.0.0.1:9960/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);

  // Path C: Discuss inside Suggested card (anchor = proposal text)
  const c = await clickBelow(page, 'I think we should keep an eye on Huabao Medical ETF.', 'Discuss');
  console.log('C: clicked suggested Discuss =', c);
  await page.waitForTimeout(1300);
  console.log('C: context chip ETF =', await has(page, 'Huabao Medical ETF'));
  console.log('C: AI decline msg =', await has(page, 'three trading days'));
  // back
  await clickText(page, '‹');
  await page.waitForTimeout(900);
  console.log('C: back on Pulse =', await has(page, 'Good morning, Wei.'));
  console.log('C: still proposed (Confirm) =', await has(page, 'Confirm'));

  // Path D: Confirm (unique text) -> assignment active
  const d = await clickText(page, 'Confirm');
  console.log('D: clicked Confirm =', d);
  await page.waitForTimeout(900);
  console.log('D: On my plate =', await has(page, 'On my plate'));
  console.log('D: Watching line =', await has(page, 'Watching Huabao Medical ETF until'));

  // Path E: Noticed -> Talk
  const e = await clickText(page, 'I noticed the fund estimate has declined for three trading days.');
  console.log('E: clicked noticed =', e);
  await page.waitForTimeout(1300);
  console.log('E: noticed context =', await has(page, 'Fund estimate trend'));
  await browser.close();
  console.log('DONE');
})();
