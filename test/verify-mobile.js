const pw = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");
const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
(async () => {
  const browser = await pw.chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox","--disable-gpu"] });
  const page = await browser.newPage({ viewport:{width:430,height:900} });
  const logs=[]; page.on("console",m=>{ if(m.type()==="error"||m.text().includes("fetch")) logs.push(m.type()+": "+m.text()); });
  page.on("pageerror",e=>logs.push("PAGEERROR: "+e.message));
  await page.goto("http://127.0.0.1:9928/pulse",{waitUntil:"load",timeout:120000});
  await page.waitForTimeout(15000);
  // 拦截 console 中 fetch 相关错误
  const body = await page.locator("body").innerText().catch(()=>"");
  console.log("页面渲染片段:", body.slice(0,150));
  // 检查是否有网络错误(通过 page console already captured)
  console.log("=== 错误日志 ===", logs.length? logs.slice(0,8) : "无");
  await browser.close();
})().catch(e=>{console.error("FAIL",e);process.exit(1);});
