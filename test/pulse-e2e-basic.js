const { chromium } = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");

const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = "http://127.0.0.1:9928/pulse";

async function main() {
  const browser = await chromium.launch({
    executablePath: EXECUTABLE,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto(URL, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(15000); // wait for JS bundle + render

  console.log("标题:", await page.title());
  console.log("body 文本片段:", (await page.locator("body").innerText().catch(()=>"")).slice(0, 200));

  // 1. 找事件列表项（migration）
  const hasList = await page.locator("text=Pulse").first().isVisible().catch(() => false);
  console.log("Pulse 可见:", hasList);

  const events = await page.locator("text=/Review the migration|Needs you|Session handling/").count().catch(() => 0);
  console.log("事件相关文本数量:", events);

  await browser.close();
  console.log("JS console errors:", errors.length ? errors : "无");
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
