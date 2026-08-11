const pw = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");
const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox","--disable-gpu"] });
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const errors=[];
  page.on("console",m=>{ if(m.type()==="error") errors.push(m.text()); });
  page.on("pageerror",e=>errors.push("PAGEERROR: "+e.message));
  await page.goto("http://127.0.0.1:9928/pulse",{waitUntil:"load",timeout:120000});
  await page.waitForTimeout(18000);
  const body = await page.locator("body").innerText().catch(()=>"");
  console.log("=== 首页文本 ===");
  console.log(body.slice(0,400));
  console.log("\n=== 分组标题 ===");
  console.log((await page.locator("text=NEEDS YOU").count())>0?"NEEDS YOU 存在":"无 NEEDS YOU");
  console.log((await page.locator("text=TODAY").count())>0?"TODAY 存在":"无 TODAY");
  console.log("=== JS errors ===", errors.length? errors.slice(0,6):"无");
  await browser.close();
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
