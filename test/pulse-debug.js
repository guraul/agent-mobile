const pw = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");
const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox","--disable-gpu"] });
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const errors=[];
  page.on("console",m=>{ if(m.type()==="error") errors.push(m.text()); });
  page.on("pageerror",e=>errors.push("PAGEERROR: "+e.message));
  page.on("response",r=>{ if(/4096/.test(r.url())) console.log("  RESP", r.status(), r.url().replace(/\/session\/status.*/,"/session/status")); });
  await page.goto("http://127.0.0.1:9928/pulse",{waitUntil:"load",timeout:120000});
  await page.waitForTimeout(20000);
  const body = await page.locator("body").innerText().catch(()=>"");
  console.log("body:", body.slice(0,200));
  console.log("=== errors ===", errors.length? errors.slice(0,8):"无");
  await browser.close();
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
