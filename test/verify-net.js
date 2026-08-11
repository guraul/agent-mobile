const pw = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");
const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox","--disable-gpu"] });
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const reqs=[];
  page.on("request",r=>{ if(r.url().includes("4096")) reqs.push(r.method()+" "+r.url()+" -> "+(r.headers()["authorization"]?"auth":"NOAUTH")); });
  page.on("response",r=>{ if(r.url().includes("4096")) console.log("  RESP", r.status(), r.url().slice(0,60)); });
  await page.goto("http://106.13.181.13:9928/pulse",{waitUntil:"load",timeout:120000});
  await page.waitForTimeout(20000);
  console.log("=== 页面加载期对 4096 的请求 ===", reqs.length? reqs.slice(0,10):"无(页面未请求4096)");
  // 点事件(用 testID 精准定位, sheet 内的事件) - 点列表里的 migration
  await page.locator('[data-testid="event-migration"]').first().dispatchEvent("click",{bubbles:true});
  await page.waitForTimeout(6000);
  console.log("=== 点击事件后对 4096 的请求 ===", reqs.length? reqs.slice(-6):"无");
  await browser.close();
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
