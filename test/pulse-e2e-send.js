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

  await page.locator("text=Review the auth migration").first().dispatchEvent("click", { bubbles: true });
  await page.waitForTimeout(8000);
  await page.locator("text=目前遇到的问题").first().dispatchEvent("click", { bubbles: true });
  await page.waitForTimeout(8000);

  // 输入消息
  const ta = page.locator("textarea").first();
  await ta.click();
  await ta.fill("Reply with exactly: e2e-ok");
  await page.waitForTimeout(500);

  // 点击发送按钮 (Send icon, accessibilityLabel="Send")
  const sendBtn = page.locator('[aria-label="Send"]').first();
  const sendCount = await sendBtn.count();
  console.log("Send 按钮数量:", sendCount);
  if (sendCount > 0) {
    await sendBtn.dispatchEvent("click", { bubbles: true });
  } else {
    // 尝试回车
    await ta.press("Enter");
  }

  console.log("已发送，等待流式回复...");
  await page.waitForTimeout(30000);

  const body = await page.locator("body").innerText().catch(() => "");
  const hasE2e = /e2e-ok/i.test(body);
  console.log("收到回复含 e2e-ok:", hasE2e);
  console.log("=== 最后 400 字 ===");
  console.log(body.slice(-400));
  console.log("=== JS errors ===", errors.length ? errors : "无");
  await browser.close();
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
