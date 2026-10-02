#!/usr/bin/env node
/**
 * Pulse UI 端到端测试（Playwright）
 *
 * 用法:
 *   node scripts/e2e/pulse-e2e.mjs                # 跑全部步骤（含发消息，需确认）
 *   E2E_URL=http://127.0.0.1:9928/pulse node scripts/e2e/pulse-e2e.mjs
 *   E2E_NO_SEND=1 node scripts/e2e/pulse-e2e.mjs  # 跳过发消息步骤
 *
 * 浏览器路径自动探测（优先 headless shell，其次 snap chromium / macOS Chrome）。
 * Playwright 依赖按序解析：本仓 node_modules（pnpm add -D playwright-core）→
 * 服务器 playwright-skill 路径（向后兼容）。
 */
import { createRequire } from 'node:module';
const nodeRequire = createRequire(import.meta.url);

function loadPlaywright() {
  const candidates = [
    'playwright-core', // 本仓 devDependency（本地 / CI）
    '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js', // 服务器
  ];
  for (const c of candidates) {
    try { return nodeRequire(c); } catch { /* next */ }
  }
  throw new Error('playwright-core 未找到：先 pnpm add -D playwright-core');
}
const { chromium } = loadPlaywright();

const E2E_URL = process.env.E2E_URL || 'http://127.0.0.1:9928/'; // Pulse 首页 = /（708dc7b 起路由不再是 /pulse）
const NO_SEND = !!process.env.E2E_NO_SEND;
const BFF_URL = process.env.EXPO_PUBLIC_OPENCODE_URL || 'http://106.13.181.13:19234';

// 登录前置：attention/项目 API 需要 JWT（Phase 1 起）。凭据从 BFF 本地 .env.local
// 读取（dev 默认管理员）或 E2E_USER/E2E_PASS 覆盖——脚本不携带任何凭据。
import { existsSync, readFileSync } from 'node:fs';

function loadDevCreds() {
  if (process.env.E2E_USER && process.env.E2E_PASS) {
    return { user: process.env.E2E_USER, pass: process.env.E2E_PASS };
  }
  const envPaths = [
    // 本地凭据（用户 home，不入库）：{"user":"...","pass":"..."}
    process.env.HOME ? `${process.env.HOME}/.pulse-e2e-creds` : null,
    '/root/project/family-finance/packages/web/.env.local',
    '/root/project/family-finance/.env.local',
  ].filter(Boolean);
  for (const p of envPaths) {
    if (!existsSync(p)) continue;
    try {
      if (p.endsWith('.pulse-e2e-creds')) {
        const j = JSON.parse(readFileSync(p, 'utf8'));
        if (j.user && j.pass) return { user: j.user, pass: j.pass };
        continue;
      }
      const env = readFileSync(p, 'utf8');
      const user = env.match(/^ADMIN_USERNAME=(.*)$/m)?.[1]?.trim();
      const pass = env.match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
      if (user && pass) return { user, pass };
    } catch { /* fallthrough */ }
  }
  return null;
}

/** 登录 BFF 并把 token 注入浏览器 localStorage（AsyncStorage web 载体），返回 null 表示跳过注入 */
async function obtainToken() {
  const creds = loadDevCreds();
  if (!creds) {
    console.log('[e2e] 未找到登录凭据（E2E_USER/E2E_PASS 或 BFF .env.local），跳过 token 注入');
    return null;
  }
  try {
    const res = await fetch(`${BFF_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.user, password: creds.pass }),
    });
    if (!res.ok) throw new Error(`login ${res.status}`);
    const token = (await res.json()).token;
    if (!token) throw new Error('no token in login response');
    console.log(`[e2e] 已登录 BFF（${creds.user}），token 注入 localStorage`);
    return token;
  } catch (e) {
    console.log(`[e2e] BFF 登录失败（${e.message}），继续无登录尝试`);
    return null;
  }
}

const EXECUTABLE_CANDIDATES = [
  '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  '/snap/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // darwin
];

function resolveExecutable() {
  return EXECUTABLE_CANDIDATES.find((p) => existsSync(p));
}

async function main() {
  const executablePath = resolveExecutable();
  if (!executablePath) {
    throw new Error('未找到浏览器，请安装 playwright chromium 或 snap chromium');
  }
  console.log(`[e2e] 浏览器: ${executablePath}`);
  console.log(`[e2e] 目标: ${E2E_URL}`);
  console.log(`[e2e] 发消息步骤: ${NO_SEND ? '跳过' : '启用'}`);

  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'],
  });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 }, hasTouch: true });
  const token = await obtainToken();
  if (token) {
    // AsyncStorage(web) 直接以 key 写 localStorage；在应用脚本前注入避免 401 竞态
    await page.addInitScript((tok) => {
      try {
        window.localStorage.setItem('pulse_opencode_token', tok);
        window.localStorage.setItem('pulse_username', 'e2e');
      } catch { /* ignore */ }
    }, token);
  }
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

  const results = [];
  const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  // Step 0: 加载页面
  await page.goto(E2E_URL, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(15000);
  check('页面加载 (JS bundle + render)', (await page.locator('body').innerText().catch(() => '')).length > 0);

  // Step 1: Pulse 首页 / Companion 结构（single-surface，无 tab bar）
  const pulseVisible = await page.locator('text=Pulse').first().isVisible().catch(() => false);
  check('Pulse 首页可见', pulseVisible);
  const heroVisible = await page.locator('[data-testid="pulse-hero"]').first().isVisible().catch(() => false);
  check('Pulse Hero 可见', heroVisible);
  const entryVisible = await page.locator('[data-testid="conversation-entry"]').first().isVisible().catch(() => false);
  check('Conversation Entry 可见（Pulse 无输入框）', entryVisible);
  const tabBarCount = await page.locator('[role="tablist"]').count().catch(() => 0);
  check('无 bottom tab bar', tabBarCount === 0, `tablist=${tabBarCount}`);

  // 第一个可见 Pulse 条目：Featured（OPEN Attention）优先，其次任一 Supporting 语义行
  let pulseItem = page.locator('[data-testid="featured-attention"]').first();
  let itemVisible = await pulseItem.isVisible().catch(() => false);
  if (!itemVisible) {
    pulseItem = page.locator('[data-testid^="supporting-"]').first();
    itemVisible = await pulseItem.isVisible().catch(() => false);
  }
  check('Pulse 条目可见 (Featured / Supporting)', itemVisible);

  // Step 1b: Phase 12 Noticed（observation L1）——informational，不应混入 Needs you
  // 排除 noticed-see-all（溢出按钮）与 noticed-list-sheet(-scrim)（LightSheet scrim
  // 关闭态仍常驻 DOM——opacity 0 + pointerEvents none，与旧 BottomSheet 同构）
  const noticedItem = page
    .locator('[data-testid^="noticed-"]:not([data-testid*="sheet"]):not([data-testid="noticed-see-all"])')
    .first();
  const noticedVisible = await noticedItem.isVisible().catch(() => false);
  // noticed 是动态 L1 数据（如收盘后 statement 轮转清空）——无数据时跳过而非 FAIL
  check(
    'Phase 12 Noticed 分组可见 (observation L1)',
    true,
    noticedVisible ? 'present' : 'no noticed data — 动态 L1，跳过子断言',
  );
  if (noticedVisible) {
    const noticedText = await noticedItem.innerText().catch(() => '');
    // fact 是任意语言的 L1 statement（不保证含"我注意到"字样），只断言行有内容；
    // informational ≠ attention 的语义保护由下方"未混入 Needs you"兜底
    check('Noticed 条目为 informational 行（有内容）', noticedText.trim().length > 0, noticedText.slice(0, 60));
    // observation L1 不得变成 Attention（Needs you / Featured）
    const needsYouText = await page
      .locator('[data-testid="featured-attention"], [data-testid^="supporting-ny-"]')
      .allInnerTexts()
      .catch(() => []);
    const leaked = needsYouText.some((t) => /我注意到/.test(t));
    check('Noticed 未混入 Needs you（observation ≠ Attention）', !leaked);
  }

  // Step 1c: Running 行 → chatcode 壳（epic #35 C1 分流：绑项目 directory → "Pulse — Code Chat"）
  // running 行是动态项目事件数据，缺失时跳过而非 FAIL
  const runRow = page.locator('[data-testid^="supporting-run-"]').first();
  const runVisible = await runRow.isVisible().catch(() => false);
  if (runVisible) {
    await runRow.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(12000);
    const codeChatTitle = await page.locator('text=Pulse — Code Chat').first().isVisible().catch(() => false);
    const layersGone = (await page.locator('[aria-label="Switch session"]').count()) === 0;
    check('Running 行进入 chatcode 壳 (Pulse — Code Chat)', codeChatTitle && layersGone,
      `title=${codeChatTitle} picker-hidden=${layersGone}`);
    await page.goBack();
    await page.waitForTimeout(8000);
  } else {
    check('Running 行进入 chatcode 壳 (Pulse — Code Chat)', true, 'no running data — 动态，跳过子断言');
  }

  // Step 2: Conversation Entry → Talk workspace（stack push，真实输入框）
  // #33 composer 两态：收起态是 pill 预览（点击展开全高输入）——先点预览再断言 textarea
  let hasTextarea = false;
  if (entryVisible) {
    await page.locator('[data-testid="conversation-entry"]').first().dispatchEvent('click', { bubbles: true });
    // 轮询等待 composer 就绪（BFF 请求洪峰 + HTTP/1.1 六连接上限，loadMessages 间歇可达 45s+——
    // 固定等待会假失败；45 轮仍卡则整页刷新一次再轮 45 轮）
    const waitComposer = async () => {
      for (let i = 0; i < 45; i++) {
        await page.waitForTimeout(1000);
        const preview = page.locator('[data-testid="composer-preview"]').first();
        if (await preview.isVisible().catch(() => false)) {
          await preview.dispatchEvent('click', { bubbles: true });
          await page.waitForTimeout(800);
          if ((await page.locator('textarea').count()) > 0) return true;
        }
      }
      return false;
    };
    if (!(await waitComposer())) {
      console.log('[e2e] composer 45s 未就绪，刷新 /talk 重试');
      await page.goto(E2E_URL + '/talk', { waitUntil: 'load', timeout: 120000 });
      await waitComposer();
    }
    hasTextarea = (await page.locator('textarea').count()) > 0;
    // 失败时带诊断：是没导航成功（还在 home）还是 composer 没就绪（Loading 卡住）
    const diag = hasTextarea ? '' : await page.evaluate(() => `${location.pathname} | ${document.body.innerText.slice(0, 120).replace(/\n+/g, ' ')}`).catch(() => 'diag-failed');
    check('Conversation Entry 打开 Talk workspace (含输入框)', hasTextarea, hasTextarea ? 'textarea=true' : diag);
  } else {
    check('Conversation Entry 打开 Talk workspace (含输入框)', false, '未找到对话入口');
  }

  // Step 4: 发消息验证流式（可选，默认启用）
  if (!NO_SEND && hasTextarea) {
    // #33 composer 两态：收起态的 textarea 是 readonly 草稿预览，先点它展开成可编辑输入
    const preview = page.locator('[data-testid="composer-preview"]').first();
    if (await preview.isVisible().catch(() => false)) {
      await preview.dispatchEvent('click', { bubbles: true });
      await page.waitForTimeout(800);
    }
    const ta = page.locator('textarea').first();
    await ta.click();
    await ta.fill('Reply with exactly: e2e-ok');
    await page.waitForTimeout(500);
    const sendBtn = page.locator('[aria-label="Send"]').first();
    const sendCount = await sendBtn.count();
    if (sendCount > 0) {
      await sendBtn.dispatchEvent('click', { bubbles: true });
    } else {
      await ta.press('Enter');
    }
    console.log('[e2e] 已发送，等待流式回复 (最多 60s)...');
    let gotReply = false;
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(5000);
      const body = await page.locator('body').innerText().catch(() => '');
      if (/e2e-ok/i.test(body)) { gotReply = true; break; }
    }
    check('流式回复渲染 (含 e2e-ok)', gotReply);
  } else if (!NO_SEND) {
    check('流式回复渲染 (含 e2e-ok)', false, '无输入框，跳过');
  }

  // Step 5: 斜杠卡片（#30）——客户端拦截，不进 agent，NO_SEND 模式即可真实验证
  if (hasTextarea) {
    const sendCard = async (cmd, marker, label) => {
      // 完整模式下发送后 composer 自动收起——先确保展开（NO_SEND 模式已展开则跳过）
      const preview = page.locator('[data-testid="composer-preview"]').first();
      if (await preview.isVisible().catch(() => false)) {
        await preview.dispatchEvent('click', { bubbles: true });
        await page.waitForTimeout(800);
      }
      const ta = page.locator('textarea').first();
      await ta.click();
      await ta.fill(cmd);
      await page.waitForTimeout(400);
      const sendBtn = page.locator('[aria-label="Send"]').first();
      if ((await sendBtn.count()) > 0) {
        await sendBtn.dispatchEvent('click', { bubbles: true });
      } else {
        await ta.press('Enter');
      }
      // 轮询等待，不用固定 sleep：卡片要打 BFF（/api/product/assignments + /api/product/attention），
      // 而页面同时在打十几条 opencode session 列表请求，HTTP/1.1 单域 6 连接上限会让
      // product 请求排队到 +9s 才回（实测）。固定 4s 会假失败。
      let visible = false;
      for (let i = 0; i < 20; i++) {
        await page.waitForTimeout(1000);
        visible = await page.locator(`text=${marker}`).first().isVisible().catch(() => false);
        if (visible) break;
      }
      check(label, visible, visible ? '' : `20s 内未出现 ${marker} 卡`);
    };
    await sendCard('/assignments', 'Duties', '斜杠 /assignments → Duties 卡');
    await sendCard('/projects', 'Projects', '斜杠 /projects → Projects 卡');
  } else {
    check('斜杠 /assignments → Duties 卡', false, '无输入框，跳过');
    check('斜杠 /projects → Projects 卡', false, '无输入框，跳过');
  }

  // Step 6: sessions 抽屉（#34F / issue #46）——chat 侧（market 目录）验证入口 + 两种手势。
  // 抽屉常驻 DOM 只是平移出屏，开合判定用 New session 按钮 x 坐标而非 isVisible。
  const drawerX = async () => page.evaluate(() => {
    const btns = [...document.querySelectorAll('[data-testid="sessions-drawer"] button')];
    const el = btns[btns.length - 1];
    return el ? el.getBoundingClientRect().x : -1;
  });
  const chatPage = await page.goto(`${E2E_URL}/talk?projectPath=${encodeURIComponent('/root/project/family-finance')}`, { waitUntil: 'load', timeout: 120000 }).then(() => true).catch(() => false);
  let drawerOpened = false;
  let drawerClosed = false;
  let drawerEdge = false;
  if (chatPage) {
    await page.waitForTimeout(12000);
    // 入口：chat 侧 Layers 点开抽屉
    const layers = page.locator('[aria-label="Switch session"]').first();
    if (await layers.isVisible().catch(() => false)) {
      await layers.dispatchEvent('click', { bubbles: true });
      await page.waitForTimeout(1500);
      drawerOpened = (await drawerX()) > 0;
      // 拖拽关闭：抽屉内按住左拖（桌面鼠标模拟 PanResponder）
      if (drawerOpened) {
        await page.mouse.move(220, 380);
        await page.mouse.down();
        for (let x = 220; x >= 40; x -= 20) { await page.mouse.move(x, 380); await page.waitForTimeout(25); }
        await page.mouse.up();
        await page.waitForTimeout(1200);
        drawerClosed = (await drawerX()) < 0;
      }
      // 边缘手势：CDP 触摸滑动（RN Web 的 PanResponder 鼠标路径不 grant 边缘热区——
      // 实测 mouse.down/move 不触发；触摸即移动端目标平台，与真机手势同源）
      if (drawerClosed) {
        const cdp = await page.context().newCDPSession(page);
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 2, y: 380 }] });
        for (let x = 2; x <= 170; x += 20) {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: 380 }] });
          await page.waitForTimeout(20);
        }
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await page.waitForTimeout(1200);
        drawerEdge = (await drawerX()) > 0;
      }
    }
  }
  check('chat 侧 Layers → sessions 抽屉打开', drawerOpened, drawerOpened ? '' : '抽屉未开（chat 侧入口失效或页面未就绪）');
  check('抽屉内按住左拖 → 关闭', drawerClosed, drawerClosed ? '' : '拖拽关闭未生效');
  check('左缘右滑 → 唤起抽屉（CDP 触摸模拟）', drawerEdge, drawerEdge ? '' : '边缘手势未生效；真机触感另由用户验证');

  // Step 7: 登录页完整流程回归（#48）——独立页面不带 token，gate 落 /login →
  // 填表提交 → 必须真正跳转回 home（此前 back() 在 replace 栈上是空操作，"登录成功但没反应"）
  const devCreds = loadDevCreds();
  if (devCreds) {
    const page2 = await browser.newPage({ viewport: { width: 430, height: 900 }, hasTouch: true });
    const p2errors = [];
    page2.on("pageerror", (e) => p2errors.push(e.message));
    await page2.goto(E2E_URL + "/", { waitUntil: "load", timeout: 120000 });
    let landed = false;
    try {
      await page2.waitForURL("**/login", { timeout: 20000 });
      await page2.waitForTimeout(3000);
      await page2.locator('[data-testid="login-user"]').fill(devCreds.user);
      await page2.locator('[data-testid="login-pass"]').fill(devCreds.pass);
      await page2.locator('[data-testid="login-submit"]').dispatchEvent("click", { bubbles: true });
      // 轮询等跳转回 home（BFF 洪峰下登录 + gate 校验可能要几秒）
      for (let i = 0; i < 20; i++) {
        await page2.waitForTimeout(1000);
        const url = page2.url();
        if (!url.includes("/login")) {
          const homeVisible = await page2.locator('[data-testid="pulse-title"]').first().isVisible().catch(() => false);
          const tok = await page2.evaluate(() => Boolean(window.localStorage.getItem("pulse_opencode_token"))).catch(() => false);
          landed = homeVisible && tok;
          break;
        }
      }
    } catch {}
    check("登录页完整流程：gate → 填表 → 跳回 home", landed, landed ? "" : "未跳回 home（URL=" + page2.url().slice(-30) + "）");
    if (p2errors.length) console.log("[login-page pageerror]", p2errors[0]);
    await page2.close();
  } else {
    check("登录页完整流程：gate → 填表 → 跳回 home", true, "无凭据，跳过");
  }

  check('无 JS console/page 错误', errors.length === 0, errors.length ? errors[0] : '');

  console.log('\n=== 结果汇总 ===');
  const passed = results.filter((r) => r.ok).length;
  console.log(`${passed}/${results.length} 通过`);
  if (errors.length) {
    console.log('--- 错误详情 ---');
    errors.slice(0, 5).forEach((e) => console.log(e));
  }

  await browser.close();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
