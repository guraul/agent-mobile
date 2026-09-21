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

async function clickBelow(page, anchor, label) {
  return page.evaluate(
    ({ a, l }) => {
      const rectOf = (node) => {
        const r = document.createRange();
        r.selectNodeContents(node);
        return r.getBoundingClientRect();
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
      const target = document.elementFromPoint(x, y) || document.body;
      for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y }));
      }
      return true;
    },
    { a: anchor, l: label },
  );
}

async function has(page, text) {
  return page.evaluate((t) => document.body.innerText.includes(t), text);
}

async function shot(page, name) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `/tmp/opencode/s2f-${name}.png` });
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
  await page.goto('http://127.0.0.1:9960/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1800);
  await shot(page, 'pulse');

  // A: first impression (covered by pulse shot)

  // B: Direct Talk + send + thinking + reply + back
  await clickText(page, 'Talk to Pulse');
  await page.waitForTimeout(1200);
  await shot(page, 'talk-direct');
  console.log('B: greeting =', await has(page, "What would you like to work through?"));
  // type into TextInput (RN Web renders textarea)
  await page.evaluate(() => {
    const ta = document.querySelector('textarea');
    if (ta) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      setter.call(ta, 'hello there');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.waitForTimeout(300);
  // send button
  await clickText(page, '➤');
  await page.waitForTimeout(500);
  const thinking = await has(page, 'THINKING');
  console.log('B: thinking shown =', thinking);
  await shot(page, 'talk-thinking');
  await page.waitForTimeout(1500);
  console.log('B: reply =', await has(page, "I'm on it."));
  await shot(page, 'talk-reply');
  await clickText(page, '‹');
  await page.waitForTimeout(900);
  console.log('B: back on pulse =', await has(page, 'Good morning, Wei.'));

  // C: Suggested Discuss
  await clickBelow(page, 'I think we should keep an eye on Huabao Medical ETF.', 'Discuss');
  await page.waitForTimeout(1300);
  console.log('C: ctx chip =', await has(page, 'Huabao Medical ETF'));
  await shot(page, 'talk-suggested');
  await clickText(page, '‹');
  await page.waitForTimeout(900);
  console.log('C: back, still proposed =', await has(page, 'Confirm'));

  // D: Confirm
  await clickText(page, 'Confirm');
  await page.waitForTimeout(900);
  await shot(page, 'pulse-confirmed');
  console.log('D: On my plate =', await has(page, 'On my plate'));
  console.log('D: watching line =', await has(page, 'Watching Huabao Medical ETF until'));

  // E: Noticed
  await clickText(page, 'I noticed the fund estimate has declined for three trading days.');
  await page.waitForTimeout(1300);
  console.log('E: noticed ctx =', await has(page, 'Fund estimate trend'));
  await shot(page, 'talk-noticed');

  await browser.close();
  console.log('DONE');
})();
