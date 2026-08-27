import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
await page.reload({ waitUntil: 'load', timeout: 120000 });
// 等 wrongmathf4 项目出现在 pulse（需今天活跃 session——新会话正是今天的）
let pid = null;
for (let i = 0; i < 12 && !pid; i++) {
  await page.waitForTimeout(5000);
  pid = await page.evaluate(() => {
    for (const e of document.querySelectorAll('[data-testid^="project-"]')) {
      const t = e.getAttribute('data-testid');
      if (/^project-[0-9a-f]+$/.test(t)) {
        // 尽量选非 agent-mobile 的干净项目（wrongmathf4）
        return t;
      }
    }
    return null;
  });
}
console.log('project:', pid);
if (!pid) { console.log('NO PROJECT'); await browser.close(); process.exit(1); }
// 点击项目看它的最近 session（新创建的 ses_fc7c62a41ffe 是 wrongmathf4 最新）
const box = await page.locator(`[data-testid="${pid}"]`).boundingBox();
await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
await page.waitForTimeout(12000);
// 进入聊天后，先记录当前错误气泡数
const before = await page.evaluate(() => {
  const t = document.body.innerText;
  return t.split('\n').filter(l => l.includes('出错了') || l.includes('APIError')).length;
});
console.log('error bubbles on load (历史):', before);
// 把模型切成 deepseek 官方坏 key 模型：打开 model 弹窗
await page.locator('[aria-label="Select model"]').waitFor({ state: 'visible', timeout: 30000 });
await page.locator('[aria-label="Select model"]').click();
await page.waitForTimeout(1000);
// 选 deepseek: deepseek-chat（坏 key）
const picked = await page.evaluate(() => {
  const els = [...document.querySelectorAll('div')];
  const target = els.find(d => d.textContent && d.textContent.trim() === 'deepseek: deepseek-chat');
  if (target) { target.click(); return true; }
  return false;
});
console.log('picked deepseek-chat:', picked);
await page.waitForTimeout(800);
// 发送 hello
const input = page.locator('input, textarea').first();
await input.waitFor({ state: 'visible', timeout: 20000 });
await input.fill('hello');
await page.locator('[aria-label="Send"]').click();
console.log('sent hello to bad-key deepseek model');
// 轮询：不 reload，看错误气泡是否新增
let countAfter = -1;
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(1000);
  const n = await page.evaluate(() => {
    const t = document.body.innerText;
    return t.split('\n').filter(l => l.includes('出错了') || l.includes('APIError')).length;
  });
  if (n > before) { countAfter = n; console.log(`NEW error bubble after ~${i + 1}s`); break; }
}
console.log('result: before=', before, 'after=', countAfter);
console.log('实时错误气泡出现(不reload):', countAfter > before);
console.log('--- page errors ---');
console.log(logs.filter(l => l.startsWith('[PAGEERROR]')).join('\n') || '(none)');
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/subagent-isolated-error-check.png' });
await browser.close();
