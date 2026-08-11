const pw = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");
const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox","--disable-gpu"] });
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const errors=[];
  page.on("console",m=>{ if(m.type()==="error") errors.push(m.text()); });
  page.on("pageerror",e=>errors.push("PAGEERROR: "+e.message));
  await page.goto("http://127.0.0.1:9928/pulse",{waitUntil:"load",timeout:120000});
  await page.waitForTimeout(30000);
  await page.locator("text=agent-mobile").first().dispatchEvent("click",{bubbles:true});
  await page.waitForTimeout(10000);
  const ta = page.locator("textarea").first();
  await ta.click(); await ta.fill("Reply with exactly: flow-ok");
  await page.waitForTimeout(500);
  const send = page.locator('[aria-label="Send"]').first();
  if (await send.count()>0) await send.dispatchEvent("click",{bubbles:true}); else await ta.press("Enter");
  console.log("已发送, 等待流式...");
  let got=false;
  for (let i=0;i<12;i++){ await page.waitForTimeout(5000); const b=await page.locator("body").innerText().catch(()=>""); if(/flow-ok/i.test(b)){got=true;break;} }
  console.log("收到 flow-ok:", got);
  console.log("=== errors ===", errors.length? errors.slice(0,6):"无");
  await browser.close();
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
