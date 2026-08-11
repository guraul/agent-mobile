import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
const { chromium } = pw;
const browser = await chromium.launch({headless:true,args:['--no-sandbox']});
const page = await browser.newPage({viewport:{width:430,height:900}});
page.on('pageerror', e=>console.log('PAGEERROR:', e.message.slice(0,200)));
await page.goto('http://127.0.0.1:9928/pulse',{waitUntil:'load',timeout:120000});
await page.waitForTimeout(8000);
// 点击第一个项目
const item = page.locator('[data-testid^="project-"]').first();
await item.dispatchEvent('click',{bubbles:true});
await page.waitForTimeout(6000);
// 尝试读取渲染的消息结构
const body = await page.locator('body').innerText();
console.log('=== BODY (前 3000 字符) ===');
console.log(body.slice(0,3000));
await browser.close();
