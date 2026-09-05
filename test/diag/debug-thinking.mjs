import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
const logs = [];
page.on('pageerror', e => logs.push(`[PAGEERROR] ${e.message}`));
page.on('console', m => { if (m.type() === 'error') logs.push(`[CONSOLE.ERR] ${m.text()}`); });

await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
// 登录
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
await page.reload({ waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(12000);

// 点击 NEEDS YOU 里的 agent-mobile 项目卡片
console.log('点击 agent-mobile 项目...');
try {
  await page.locator('text=agent-mobile').first().click({ timeout: 8000 });
} catch (e) {
  console.log('点击失败:', e.message);
}
// 等聊天弹框(ProjectChatZ)打开 + 加载历史消息
await page.waitForTimeout(10000);

await page.screenshot({ path: '/root/project/agent-mobile/test/diag/thinking-chat.png' });
// 收集聊天区 DOM 关键信息
const dump = await page.evaluate(() => {
  // 找聊天弹框/底部输入区周围的文本
  const text = document.body.innerText;
  // 找所有 step 行的可访问性标签
  const steps = [...document.querySelectorAll('[aria-label]')].map(el => ({
    label: el.getAttribute('aria-label'),
    tag: el.tagName,
    role: el.getAttribute('role'),
    text: (el.textContent || '').slice(0, 120),
  })).filter(x => /步骤|思考|tool|reasoning|Pulse|user|复制|对话|loading/i.test(x.label || '') || /[Tt]hink|[Hh]eader|Assistant|Pulse/.test(x.text));
  return { bodyLen: text.length, bodyTail: text.slice(-1500), steps: steps.slice(0, 30) };
});
console.log('--- 页面尾部文本 ---');
console.log(dump.bodyTail);
console.log('--- 步骤/对话相关 aria ---');
console.log(JSON.stringify(dump.steps, null, 2));
console.log('--- errors ---');
console.log(logs.join('\n') || '(none)');
await browser.close();
