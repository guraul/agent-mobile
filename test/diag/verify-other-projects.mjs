import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
import { existsSync } from 'node:fs';
const { chromium } = pw;
const exe = ['/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell','/snap/bin/chromium'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox','--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
await page.goto('http://127.0.0.1:9928/', { waitUntil: 'load', timeout: 120000 });
await page.waitForTimeout(3000);
await page.evaluate(async () => {
  const res = await fetch('http://127.0.0.1:19234/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({username:'admin',password:'admin123'}) });
  const body = await res.json();
  if (body.token) localStorage.setItem('pulse_opencode_token', body.token);
});
await page.reload({ waitUntil: 'load', timeout: 120000 });
// 等活跃项目或 other projects 出现
let otherSeen = false;
for (let i = 0; i < 12 && !otherSeen; i++) {
  await page.waitForTimeout(5000);
  otherSeen = await page.evaluate(() => document.body.innerText.includes('OTHER PROJECTS'));
}
console.log('OTHER PROJECTS 栏出现:', otherSeen);
const beforeExpand = await page.evaluate(() => {
  const t = document.body.innerText;
  return {
    hasOther: t.includes('OTHER PROJECTS'),
    projectsCount: (t.match(/project-\w+/g) || []).length,
    bodyHead: t.slice(0, 300),
  };
});
console.log('展开前:', JSON.stringify(beforeExpand, null, 2));
// 点击展开 OTHER PROJECTS
const header = await page.locator('[aria-label="Other projects"]');
const hc = await header.count();
console.log('other projects header count:', hc);
if (hc > 0) {
  await header.click();
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => {
    const t = document.body.innerText;
    const lines = t.split('\n').filter(l => /PROJECT|family|agent-mobile|wrongmath|llm-wiki|wechat/i.test(l));
    return lines.slice(0, 20);
  });
  console.log('展开后可见项目标题:', JSON.stringify(after, null, 2));
  const realProjects = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[data-testid^="project-"]')];
    return [...new Set(els.map(e => e.getAttribute('data-testid')).filter(t => /^project-[0-9a-f]+$/.test(t)))];
  });
  console.log('全部项目 testid:', realProjects.length, realProjects.slice(0, 6));
}
await page.screenshot({ path: '/root/project/agent-mobile/test/diag/other-projects.png' });
await browser.close();
