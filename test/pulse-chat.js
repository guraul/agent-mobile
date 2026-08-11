const pw = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");
const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox","--disable-gpu"] });
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const errors=[];
  page.on("console",m=>{ if(m.type()==="error") errors.push(m.text()); });
  page.on("pageerror",e=>errors.push("PAGEERROR: "+e.message));
  await page.goto("http://127.0.0.1:9928/pulse",{waitUntil:"load",timeout:120000});
  await page.waitForTimeout(30000); // 等 per-project sessions 加载
  const hasAgent = await page.locator("text=agent-mobile").first().isVisible().catch(()=>false);
  console.log("agent-mobile 可见:", hasAgent);
  if (hasAgent) {
    await page.locator("text=agent-mobile").first().dispatchEvent("click",{bubbles:true});
    await page.waitForTimeout(10000);
    const body = await page.locator("body").innerText().catch(()=>"");
    console.log("=== 点击后(对话)文本 ===");
    console.log(body.slice(-500));
    const hasInput = await page.locator("textarea").count();
    console.log("输入框(textarea)数量:", hasInput);
  }
  console.log("=== errors ===", errors.length? errors.slice(0,6):"无");
  await browser.close();
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
