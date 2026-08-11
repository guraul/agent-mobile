const pw = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");
const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox","--disable-gpu"] });
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  let sessionCalls=0;
  page.on("response",r=>{ if(r.url().includes("/session?directory")||r.url().includes("/session/status")){ sessionCalls++; } });
  page.on("console",m=>{ if(m.type()==="error") console.log("CONSOLE ERR:",m.text()); });
  await page.goto("http://127.0.0.1:9928/pulse",{waitUntil:"load",timeout:120000});
  await page.waitForTimeout(25000);
  const body = await page.locator("body").innerText().catch(()=>"");
  console.log("=== 25s 后 body ===", body.slice(0,150));
  console.log("session?directory 请求数:", sessionCalls);
  await browser.close();
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
