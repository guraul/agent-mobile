const { chromium } = require("/root/.claude/skills/playwright-skill/node_modules/playwright-core");

const EXECUTABLE = "/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell";
const URL = "http://127.0.0.1:9928/pulse";

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ["--no-sandbox", "--disable-gpu"] });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));

  await page.goto(URL, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(15000);

  // 点击 "Review the auth migration" 事件
  const target = page.locator("text=Review the auth migration").first();
  await target.waitFor({ state: "visible", timeout: 20000 });
  await target.dispatchEvent("click", { bubbles: true, cancelable: true });
  await page.waitForTimeout(6000);

  const body = await page.locator("body").innerText().catch(() => "");
  console.log("=== 详情 sheet 内文本 ===");
  console.log(body.slice(0, 600));

  const hasSession = await page.locator("text=/Sessions|New session|Loading sessions/").first().isVisible().catch(() => false);
  console.log("出现 Session 面板:", hasSession);

  console.log("=== JS console errors ===", errors.length ? errors : "无");
  await browser.close();
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
