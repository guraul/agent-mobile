/**
 * V2 核心流程截图 + 断言（Pulse → Noticed sheet / Talk / 上下文 Talk）
 *
 * 前置：9928 静态服务在跑（systemctl start showcase2-9928）
 * 运行：node test/v2-shots.cjs
 * 输出：/tmp/opencode/v2-*.png（可用 OUT 环境变量覆盖）
 */
const { chromium } = require('/root/.claude/skills/playwright-skill/node_modules/playwright-core');

const EXE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';
const BASE = process.env.URL || 'http://127.0.0.1:9928/';
const OUT = process.env.OUT || '/tmp/opencode/v2-';

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

async function scrollTo(page, top) {
  await page.evaluate((t) => {
    const sc = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 80);
    if (sc[0]) sc[0].scrollTop = t ? 0 : sc[0].scrollHeight;
  }, top);
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: EXE, args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(3000);

  await page.screenshot({ path: OUT + 'pulse-top.png' });

  await scrollTo(page, false);
  await page.screenshot({ path: OUT + 'pulse-bottom.png' });

  const tapped = await clickTextByPos(page, 'Nightly backup finished at 03:12.');
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + 'noticed-sheet.png' });
  await page.mouse.click(195, 120);
  await page.waitForTimeout(700);

  await scrollTo(page, true);
  const entered = await clickTextByPos(page, 'Talk to Pulse…');
  await page.waitForTimeout(1300);
  await page.screenshot({ path: OUT + 'talk-empty.png' });

  await page.locator('textarea, input').first().click();
  await page.keyboard.type('What did you notice overnight?');
  await page.waitForTimeout(400);
  const arrow = await page.evaluate(() => {
    const a = [...document.querySelectorAll('div,span')].find((d) => d.textContent === '➤');
    if (!a) return null;
    const r = a.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (arrow) await page.mouse.click(arrow.x, arrow.y);
  await page.waitForTimeout(2000);
  await page.screenshot({ path: OUT + 'talk-reply.png' });

  await clickTextByPos(page, '‹');
  await page.waitForTimeout(1100);
  await scrollTo(page, true);
  const discussed = await clickTextByPos(page, 'Discuss');
  await page.waitForTimeout(1300);
  await page.screenshot({ path: OUT + 'talk-context.png' });

  console.log('noticed tapped:', tapped, '| entry opened:', entered, '| discuss opened:', discussed);
  console.log('pageerrors:', errors.length ? JSON.stringify(errors) : 'none');
  await browser.close();
  const allOk = tapped && entered && discussed && errors.length === 0;
  if (!allOk) process.exitCode = 1;
  console.log(allOk ? 'PASS' : 'FAIL');
})();
