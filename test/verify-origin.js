const pw = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");
const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox","--disable-gpu"] });
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const logs=[]; page.on("console",m=>{ logs.push(m.type()+": "+m.text()); });
  page.on("pageerror",e=>logs.push("PAGEERROR: "+e.message));
  // 以公网 origin 访问，模拟手机
  await page.goto("http://106.13.181.13:9928/pulse",{waitUntil:"load",timeout:120000});
  await page.waitForTimeout(20000);
  // 点击事件打开 sheet -> SessionPanel 会请求 /session
  await page.locator("text=Review the auth migration").first().dispatchEvent("click",{bubbles:true});
  await page.waitForTimeout(8000);
  const body = await page.locator("body").innerText().catch(()=>"");
  console.log("=== sheet 内容(应含 session) ===");
  console.log(body.slice(0,600));
  // 抓取 fetch 请求结果
  const netFail = logs.filter(l=>/failed to fetch|Failed to fetch|net::|fetch/i.test(l));
  console.log("=== 网络相关日志 ===", netFail.length? netFail.slice(0,8):"无");
  await browser.close();
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
