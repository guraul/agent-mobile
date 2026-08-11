import { chromium } from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/snap/bin/chromium', args: ['--no-sandbox'] });
const p = await b.newPage(); p.on("console", m => { if (m.type() === "error") console.log("CONSOLE-ERR:", m.text().slice(0,120)); });
await p.goto('http://localhost:9928/', { waitUntil: "domcontentloaded", timeout: 20000 });
console.log('final URL:', p.url());
console.log('title:', await p.title());
console.log('body:', (await p.evaluate(() => document.body.innerText.slice(0, 150))).replace(/\n/g, ' | '));
await b.close();
