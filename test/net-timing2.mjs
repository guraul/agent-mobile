import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
const { chromium } = pw;
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:430,height:900}});
const t0 = Date.now();
page.on('response', async r => { const u=r.url(); if (u.includes('/session/status')||u.includes('/session?')||u.includes('/project')) { console.log('resp', Date.now()-t0, u.slice(0,70)); }});
await page.goto('http://127.0.0.1:9928/pulse', { waitUntil:'load', timeout:120000 });
await page.waitForTimeout(1500);
// 测项目条目出现时间
for (let i=0;i<25;i++){
  const cnt = await page.locator('[data-testid^="project-"]').count();
  if (cnt>0){ console.log('PROJECT SHOWN at', Date.now()-t0, 'ms, count', cnt); break; }
  await page.waitForTimeout(500);
}
await browser.close();
