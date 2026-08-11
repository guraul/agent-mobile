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

  // 详情 sheet 完整文本
  const body = await page.locator("body").innerText().catch(() => "");
  console.log("=== sheet 完整文本 (后 800 字) ===");
  console.log(body.slice(-800));

  // 找 session 列表项 "目前遇到的问题"
  const hasSessionItem = await page.locator("text=目前遇到的问题").first().isVisible().catch(() => false);
  console.log("存在已有 session 条目:", hasSessionItem);

  // 检查 "New session" 按钮
  const hasNew = await page.locator("text=New session").first().isVisible().catch(() => false);
  console.log("存在 New session 按钮:", hasNew);

  // 尝试点击 session 条目进入对话
  if (hasSessionItem) {
    await page.locator("text=目前遇到的问题").first().dispatchEvent("click", { bubbles: true });
    await page.waitForTimeout(8000);
    const body2 = await page.locator("body").innerText().catch(() => "");
    console.log("=== 对话面板文本 ===");
    console.log(body2.slice(-500));
    const hasInput = await page.locator("input[placeholder*='Message opencode']").count().catch(() => 0);
    const hasInputRN = await page.locator("textarea").count().catch(() => 0);
    console.log("输入框 (input):", hasInput, "(textarea):", hasInputRN);
  }

  console.log("=== JS errors ===", errors.length ? errors : "无");
  await browser.close();
}
main().catch((e) => { console.error("FAIL", e); process.exit(1); });
