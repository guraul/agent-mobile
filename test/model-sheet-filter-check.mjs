import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const consoleErr = [];
const netFail = [];
page.on('console', m => { if (m.type() === 'error') consoleErr.push(m.text()); });
page.on('requestfailed', r => netFail.push(r.url()));
page.on('response', r => { if (r.status() >= 400) netFail.push(`${r.status()} ${r.url()}`); });
await page.goto('http://106.13.181.13:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);

const BFF = 'http://106.13.181.13:19234';
const loginRes = await page.evaluate(async (BFF) => {
  const res = await fetch(`${BFF}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
  return { ok: res.ok, hasToken: !!body.token, status: res.status };
}, BFF);
console.log('login:', JSON.stringify(loginRes));
await page.reload({ waitUntil: 'load', timeout: 120000 });

let projects = [];
for (let attempt = 0; attempt < 6; attempt++) {
  await page.waitForTimeout(5000);
  projects = await page.evaluate(() => {
    const els = document.querySelectorAll('[data-testid^="project-"]');
    return [...els].map(e => e.getAttribute('data-testid')).filter(t => t && /^project-[0-9a-f]+$/.test(t));
  });
  if (projects.length > 0) break;
  console.log(`attempt ${attempt + 1}: no project yet`);
}
console.log('projects found:', projects.length, projects.slice(0, 5));
if (projects.length === 0) {
  console.log('NO PROJECTS — dumping body text head:');
  console.log((await page.evaluate(() => document.body.textContent)).slice(0, 800));
  console.log('console errors:', consoleErr.slice(0, 10));
  console.log('net failures:', netFail.slice(0, 10));
  await browser.close();
  process.exit(1);
}
const pid = projects[0];
const box = await page.locator(`[data-testid="${pid}"]`).boundingBox();
await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
await page.waitForTimeout(9000);

const modelPill = page.locator('[aria-label="Select model"]');
console.log('model pill text:', (await modelPill.textContent()).trim());
await modelPill.click();
await page.waitForTimeout(1000);

const sheetText = (await page.evaluate(() => document.body.textContent)) || '';
console.log('弹出框标题存在:', sheetText.includes('选择模型'));

// collect items inside the model sheet: find "选择模型" title, walk to its sheet container,
// then collect leaf texts that follow the title within that container
const items = await page.evaluate(() => {
  const all = [...document.querySelectorAll('div')];
  const titleEl = all.find(d => d.textContent.trim() === '选择模型');
  if (!titleEl) return { found: false, rows: [] };
  // the sheet container is the BottomSheet Animated.View: an ancestor with absolute positioning
  let container = titleEl.parentElement;
  while (container && getComputedStyle(container).position !== 'absolute') {
    container = container.parentElement;
  }
  if (!container) container = titleEl.parentElement;
  const rows = [...container.querySelectorAll('*')]
    .filter(e => e.children.length === 0 && e.textContent && e.textContent.trim() && e.textContent.trim().length < 80)
    .map(e => e.textContent.trim());
  return { found: true, rows: [...new Set(rows)] };
});
console.log('sheet found:', items.found);
console.log('模型选项(弹出框内叶子文本):', JSON.stringify(items.rows, null, 2));
const modelRows = items.rows.filter(t => t.includes(': ') && /deepseek/i.test(t));
const nonDeepseekRows = items.rows.filter(t => t !== '选择模型' && !t.includes(': '));
console.log('模型选项数(含provider前缀):', modelRows.length);
console.log('DeepSeek 选项数:', modelRows.length);
console.log('非 DeepSeek 选项:', JSON.stringify(nonDeepseekRows, null, 2));
const excludedProviders = modelRows.filter(t => /openrouter|siliconflow/i.test(t));
console.log('含 openrouter/siliconflow 的选项:', JSON.stringify(excludedProviders, null, 2));
const providers = [...new Set(modelRows.map(t => t.split(': ')[0]))];
console.log('出现过的 provider:', JSON.stringify(providers, null, 2));

console.log('console errors:', consoleErr.slice(0, 5));
await page.screenshot({ path: '/root/project/agent-mobile/test/model-sheet-filtered.png', fullPage: false });
await browser.close();
