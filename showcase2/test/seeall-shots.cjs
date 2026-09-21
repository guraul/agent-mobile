/**
 * See All 路径验证（Noticed > 5 条时出现）
 *
 * 前置：9928 静态服务在跑；mock 里 notified 超过 5 条（临时在 mock/actions.ts 的
 * noticed 数组加 3 条即可，验证后 git checkout -- mock/actions.ts 回退并重新 export）。
 * 默认 mock 只有 3 条 → 脚本会 SKIP（exit 0）。
 * 运行：node test/seeall-shots.cjs
 */
const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright-core');

const EXE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';
const BASE = process.env.URL || 'http://127.0.0.1:9928/';
const OUT = process.env.OUT || '/tmp/opencode/seeall-';

async function clickTextByPos(page, text) {
  const pos = await page.evaluate((t) => {
    const els = [...document.querySelectorAll('div,span')];
    const leafExact = els.filter((d) => (d.textContent || '').trim() === t && d.children.length === 0);
    const exact = els.filter((d) => (d.textContent || '').trim() === t);
    const leafPartial = els.filter((d) => (d.textContent || '').includes(t) && d.children.length === 0);
    const el = leafExact[0] || exact[exact.length - 1] || leafPartial[0];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + Math.min(r.width / 2, 80), y: r.y + r.height / 2 };
  }, text);
  if (!pos) return false;
  await page.mouse.click(pos.x, pos.y);
  return true;
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.evaluate(() => {
    const sc = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 80);
    if (sc[0]) sc[0].scrollTop = sc[0].scrollHeight;
  });
  await page.waitForTimeout(700);
  await page.screenshot({ path: OUT + 'pulse-bottom.png' });

  const hasSeeAll = await page.evaluate(() =>
    [...document.querySelectorAll('div,span')].some(
      (d) => (d.textContent || '').trim() === 'See All' && d.children.length === 0,
    ),
  );
  if (!hasSeeAll) {
    console.log('SKIP: Noticed <= 5 (See All hidden). Temporarily add noticed mock items to test.');
    await browser.close();
    return;
  }

  const clicked = await clickTextByPos(page, 'See All');
  await page.waitForTimeout(900);
  await page.screenshot({ path: OUT + 'sheet.png' });

  const count = await page.evaluate(() => {
    const rows = [...document.querySelectorAll('div')].filter(
      (d) => d.children.length === 0 && /ago$|^yesterday$|^\d+d$/.test((d.textContent || '').trim()),
    );
    return rows.length;
  });

  console.log('see-all clicked:', clicked, '| time labels in sheet:', count);
  console.log('pageerrors:', errors.length ? JSON.stringify(errors) : 'none');
  await browser.close();
  const ok = clicked && count >= 6 && errors.length === 0;
  if (!ok) process.exitCode = 1;
  console.log(ok ? 'PASS' : 'FAIL');
})();
