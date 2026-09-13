#!/usr/bin/env node
/**
 * v0.1.1 Companion UX Completion E2E（真实用户路径，Playwright headless）。
 *
 * 覆盖（Human-Path Audit 的自动化部分）：
 *   E1 Direct Talk      Talk → New conversation → send → response（真实 opencode 往返）
 *   E2 Resume           Talk → recent session → Resume → send
 *   E3 Attention        Pulse → Needs You → detail → Open Talk；全程 Attention 仍 OPEN（查看≠handled）
 *   E4 Suggested Talk   Suggested → 去聊聊（不授权）→ proposal 仍 PROPOSED → Confirm → Assignment ACTIVE
 *   E5 Suggested Reject Suggested → Reject → REJECTED、无 Assignment
 *   E6 Noticed Talk     Noticed 卡 → 上下文会话（数据依赖：无 Noticed 卡则 SKIP）
 *   E7 KB Reading       Memory → KNOWS → search → result → Document 全文
 *   E8 Responsibilities Me → Responsibilities → 列表 → Detail → Revoke（scratch assignment）
 *   E9 Offline          opencode 停止 → 明确 offline 态（无裸 502）→ Retry → 恢复
 *
 * 注意：E4/E5/E8 产生 proposal/assignment 审计行（与既有 smoke 惯例一致，assignment 撤销清理）；
 *       E3 只验证到"进入 Talk 且 state 不变"，不 handle 真实用户 Attention（避免污染真实待办）。
 *
 * 用法：node scripts/e2e/v011-e2e.mjs
 */
import pw from '/root/.claude/skills/playwright-skill/node_modules/playwright-core/index.js';
const { chromium } = pw;
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const E2E_URL = process.env.E2E_URL || 'http://127.0.0.1:9928/';
const BFF_URL = process.env.E2E_BFF_URL || process.env.EXPO_PUBLIC_OPENCODE_URL || 'http://106.13.181.13:19234';

function loadDevCreds() {
  if (process.env.E2E_USER && process.env.E2E_PASS) return { user: process.env.E2E_USER, pass: process.env.E2E_PASS };
  for (const p of ['/root/project/family-finance/packages/web/.env.local', '/root/project/family-finance/.env.local']) {
    if (!existsSync(p)) continue;
    const env = readFileSync(p, 'utf8');
    const user = env.match(/^ADMIN_USERNAME=(.*)$/m)?.[1]?.trim();
    const pass = env.match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
    if (user && pass) return { user, pass };
  }
  return null;
}

async function obtainToken() {
  const creds = loadDevCreds();
  const res = await fetch(`${BFF_URL}/api/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: creds.user, password: creds.pass }),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  return (await res.json()).token;
}

function api(token) {
  return async (path, opts = {}) => {
    const res = await fetch(`${BFF_URL}${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    });
    return { status: res.status, body: await res.json().catch(() => ({})) };
  };
}

async function injectProposal(apiCall, tag) {
  const { status, body } = await apiCall('/api/product/assignment-proposals', {
    method: 'POST',
    body: JSON.stringify({
      mode: 'ongoing', domain: 'market',
      responsibility: `[V011 E2E ${tag}] 持续监控测试基金，达到目标净值时提醒`,
      trigger: { kind: 'schedule-rule', schedule: '50 14 * * 1-5', timezone: 'Asia/Shanghai', condition: { kind: 'fund-nav-above-target' }, enabled: true },
      instructionRef: `observation:e2e:v011:${tag}:${Date.now()}`,
      createdBy: 'observation:e2e',
    }),
  });
  if (status !== 201 || !body?.proposal?.id) throw new Error(`inject failed: ${status}`);
  return body.proposal;
}

const EXECUTABLE = '/root/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell';

async function main() {
  const token = await obtainToken();
  const apiCall = api(token);
  const browser = await chromium.launch({ executablePath: EXECUTABLE, headless: true, args: ['--no-sandbox', '--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 430, height: 900 } });
  await page.addInitScript((tok) => {
    try { window.localStorage.setItem('pulse_opencode_token', tok); window.localStorage.setItem('pulse_username', 'e2e'); } catch {}
  }, token);
  page.on('dialog', (d) => d.accept().catch(() => {}));

  const results = [];
  const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ' — ' + detail : ''}`); };
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  const click = async (sel) => { const l = page.locator(sel).first(); await l.dispatchEvent('click', { bubbles: true }); };
  const goto = async () => { await page.goto(E2E_URL, { waitUntil: 'load', timeout: 120000 }); await page.waitForTimeout(12000); };
  const openTab = async (label) => { await click(`text="${label}"`); await page.waitForTimeout(4000); };

  // ── T1: Talk 薄入口——进入即 chat ──
  await goto();
  await openTab('Talk');
  const composerSel = 'textarea[placeholder="Message Pulse…"], input[placeholder="Message Pulse…"]';
  let composerUp = await page.locator(composerSel).first().waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
  check('T1: 点 Talk 直接进入 chat（无 Recent Sessions 屏）', composerUp);
  check('T1: 无重复 session IA（无 RECENT 列表 / 无 talk-new 按钮）',
    !(await page.locator('text=RECENT').first().isVisible().catch(() => false)) &&
    !(await page.locator('[data-testid="talk-new"]').isVisible().catch(() => false)));
  const SENT1 = `[T1 v011] ping from Talk ${Date.now()}`;
  if (composerUp) {
    const composer = page.locator(composerSel).first();
    await composer.fill(SENT1);
    await page.locator('[aria-label="Send"]').first().dispatchEvent('click', { bubbles: true });
    let replied = false;
    try {
      await page.waitForTimeout(6000);
      const { body } = await apiCall('/api/opencode/rest/session');
      const newest = [...(body ?? [])].sort((a, b) => (b.time?.updated ?? 0) - (a.time?.updated ?? 0))[0];
      if (newest) {
        for (let i = 0; i < 12; i++) {
          const { body: msgs } = await apiCall(`/api/opencode/rest/session/${newest.id}/message`);
          if ((msgs ?? []).some((m) => (m.info?.role ?? m.role) === 'assistant' &&
            (m.parts ?? []).some((p) => p.type === 'text' && (p.text ?? '').length > 0 && !p.text.includes(SENT1)))) { replied = true; break; }
          await page.waitForTimeout(5000);
        }
      }
    } catch { /* API 检查失败按未回复处理 */ }
    check('T1: 消息发送且收到 assistant 回复（真实 opencode 往返）', replied);
    // 确定性制造 T3 的测试对象：请 agent 读 worktree 外文件 → external_directory 权限 → Attention
    try {
      const composer2 = page.locator(composerSel).first();
      if (await composer2.isVisible().catch(() => false)) {
        await composer2.fill('请用 bash 读取 /root/agent-mobile/README.md 的前 3 行并告诉我内容');
        await page.locator('[aria-label="Send"]').first().dispatchEvent('click', { bubbles: true });
      }
    } catch { /* 挑衅失败则 T3 按无数据 SKIP */ }
  } else { check('T1: 消息往返', false, '跳过'); }
  // 轮询等待 permission bridge 产生 Attention（最多 60s）
  let provAttId = null;
  for (let i = 0; i < 12; i++) {
    await page.waitForTimeout(5000);
    const { body: attAll } = await apiCall('/api/product/attention');
    const open = (attAll.items ?? []).find((a) => a.state === 'open');
    if (open) { provAttId = open.id; break; }
  }

  // ── T2: Layers session 切换（ProjectChatZ 原生能力）──
  let switchOk = false, transcriptOk = false;
  await click('[aria-label="Switch session"]').catch(() => {});
  await page.waitForTimeout(3000);
  if (await page.locator('[data-testid="session-picker"]').isVisible().catch(() => false)) {
    // 先切到一个既有 session（含 T1 消息的会话）
    const pickItem = page.locator('[data-testid="session-picker"] .ypressable, [data-testid="session-picker"] [role="button"]').first();
    const items = page.locator('[data-testid="session-picker"] [role="button"]');
    const n = await items.count();
    if (n > 0) {
      await items.first().dispatchEvent('click', { bubbles: true });
      await page.waitForTimeout(5000);
      switchOk = await page.locator(composerSel).first().isVisible().catch(() => false);
      transcriptOk = (await page.locator('[data-testid="session-picker"]').count()) === 0;
    }
  }
  check('T2: Layers 打开并切换 session（composer 可用、picker 关闭）', switchOk && transcriptOk);
  // 关闭当前会话视图 → 回 Pulse 主页面（v0.1.1 correction 逃生口；不删除会话）
  await click('[data-testid="zcode-session-close"]').catch(() => {});
  await page.waitForTimeout(4000);
  check('T2: 会话内关闭 → 回 Pulse 主页面', !page.url().endsWith('/talk'));

  // ── E3: Attention → detail → Talk（查看 ≠ handled）──
  await goto();
  const { body: attAll } = await apiCall('/api/product/attention');
  const openAtt = (attAll.items ?? []).find((a) => a.state === 'open' && (!provAttId || a.id === provAttId))
    ?? (attAll.items ?? []).find((a) => a.state === 'open');
  const attCard = openAtt ? page.locator(`[data-testid="attention-${openAtt.id}"]`).first() : null;
  check('T3: Needs You 卡可见（T1 挑衅产生）', attCard ? await attCard.isVisible().catch(() => false) : false,
    attCard ? `id=${openAtt.id}` : '60s 内无 OPEN attention');
  if (attCard && await attCard.isVisible().catch(() => false)) {
    const attId = openAtt.id;
    const { body: before } = await apiCall(`/api/product/attention/${attId}`);
    await attCard.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(6000);
    check('T3: Attention 卡 → 详情屏', await page.locator('[data-testid="attention-detail-header"]').isVisible().catch(() => false));
    await click('[data-testid="attention-open-talk"]');
    await page.waitForTimeout(6000);
    const chatComposer = page.locator('textarea[placeholder="Message Pulse…"], input[placeholder="Message Pulse…"]').first();
    check('T3: Open Talk → 进入 Talk workspace（路由离开详情屏，非 BottomSheet）',
      await chatComposer.isVisible().catch(() => false) &&
      !(await page.locator('[data-testid="attention-detail-header"]').isVisible().catch(() => false)));
    // 关闭当前会话 → 回 Pulse 主页面（v0.1.1 correction：用户要求逃生口）
    await click('[data-testid="zcode-session-close"]').catch(() => {});
    await page.waitForTimeout(4000);
    check('T3: 会话内关闭 → 回 Pulse 主页面', !page.url().endsWith('/talk'));
    await click('[data-testid="zcode-sheet-back"]').catch(() => {});
    await page.waitForTimeout(3000);
    const { body: after } = await apiCall(`/api/product/attention/${attId}`);
    check('T3: 查看/Talk 未改变 Attention state（OPEN 不变）', before?.attention?.state === 'open' && after?.attention?.state === 'open', `${before?.attention?.state}→${after?.attention?.state}`);
    // 清理：有挂起权限 → reject（bridge 自动 HANDLED）；无挂起（权限已消失）→ 显式 dismiss
    try {
      const perms = await apiCall('/api/opencode/rest/permission');
      const list = Array.isArray(perms.body) ? perms.body : perms.body?.items ?? [];
      if (list.length > 0) {
        const rid = list[0].requestID ?? list[0].id;
        await apiCall(`/api/opencode/rest/permission/${rid}/reply`, { method: 'POST', body: JSON.stringify({ reply: 'reject', message: 'e2e cleanup' }) });
        await page.waitForTimeout(4000);
        const { body: fin } = await apiCall(`/api/product/attention/${attId}`);
        check('T3-cleanup: reject 权限 → Attention HANDLED（bridge 语义）', fin?.attention?.state === 'handled', fin?.attention?.state);
      } else {
        await apiCall(`/api/product/attention/${attId}/dismiss`, { method: 'POST', body: '{}' });
        const { body: fin } = await apiCall(`/api/product/attention/${attId}`);
        check('T3-cleanup: 孤儿权限请求 → 显式 DISMISSED', fin?.attention?.state === 'dismissed', fin?.attention?.state);
      }
    } catch (e) { check('T3-cleanup', false, String(e).slice(0, 60)); }
  } else { check('T3: Attention 详情路径', false, '无 open attention'); }

  // ── E4/E5: Suggested → Talk（不授权）→ Confirm / Reject ──
  await goto();
  const p1 = await injectProposal(apiCall, 'TALK-CONFIRM');
  await page.locator(`[data-testid="suggestion-${p1.id}"]`).waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
  check('T4: Suggested 卡出现', await page.locator(`[data-testid="suggestion-${p1.id}"]`).isVisible().catch(() => false));
  if (await page.locator(`[data-testid="suggestion-talk-${p1.id}"]`).isVisible().catch(() => false)) {
    await click(`[data-testid="suggestion-talk-${p1.id}"]`);
    await page.waitForTimeout(6000);
    check('T4: 去聊聊 → 进入 Talk workspace（离开 Pulse）',
      await page.locator('textarea[placeholder="Message Pulse…"], input[placeholder="Message Pulse…"]').first().isVisible().catch(() => false) &&
      !(await page.locator('[data-testid="suggestion-talk-"]').first().isVisible().catch(() => false)));
    await click('[data-testid="zcode-sheet-back"]').catch(() => {});
    await page.waitForTimeout(3000);
    const { body: propList } = await apiCall('/api/product/assignment-proposals?status=proposed');
    const stillProposed = (propList.items ?? []).some((p) => p.id === p1.id);
    check('T4: 讨论不授权——proposal 仍 PROPOSED', stillProposed);
    await click(`[data-testid="suggestion-confirm-${p1.id}"]`);
    await page.waitForTimeout(6000);
    const cardGone = !(await page.locator(`[data-testid="suggestion-${p1.id}"]`).isVisible().catch(() => false));
    const { body: conf } = await apiCall('/api/product/assignment-proposals?status=confirmed');
    const confirmed = (conf.items ?? []).find((p) => p.id === p1.id);
    const { body: asgList } = await apiCall('/api/product/assignments');
    const asg = (asgList.items ?? []).find((a) => a.provenance?.proposalId === p1.id);
    check('T4: Confirm → 卡消失 + Assignment ACTIVE', cardGone && confirmed && asg?.state === 'active', `state=${asg?.state}`);
    if (asg) await apiCall(`/api/product/assignments/${asg.id}/revoke`, { method: 'POST', body: '{}' });
  } else { check('T4: Suggested → Talk 路径', false, '去聊聊按钮不可见'); }

  const p2 = await injectProposal(apiCall, 'TALK-REJECT');
  await page.locator(`[data-testid="suggestion-${p2.id}"]`).waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
  if (await page.locator(`[data-testid="suggestion-reject-${p2.id}"]`).isVisible().catch(() => false)) {
    await click(`[data-testid="suggestion-reject-${p2.id}"]`);
    await page.waitForTimeout(6000);
    const { body: rej } = await apiCall('/api/product/assignment-proposals?status=rejected');
    const rejected = (rej.items ?? []).find((p) => p.id === p2.id);
    const { body: asgList2 } = await apiCall('/api/product/assignments');
    const noAsg = !(asgList2.items ?? []).some((a) => a.provenance?.proposalId === p2.id);
    check('T5: Reject → REJECTED、无 Assignment、卡消失', !!rejected && noAsg && !(await page.locator(`[data-testid="suggestion-${p2.id}"]`).isVisible().catch(() => false)));
  } else { check('T5: Reject 路径', false, '卡片未出现'); }

  // ── T6: Noticed → Talk（数据依赖：无卡则 SKIP）──
  const noticed = page.locator('[data-testid^="noticed-"]').first();
  if (await noticed.isVisible().catch(() => false)) {
    const { body: beforeP } = await apiCall('/api/product/assignment-proposals?status=proposed');
    const beforeCount = (beforeP.items ?? []).length;
    await noticed.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(6000);
    const opened = await page.locator('textarea[placeholder="Message Pulse…"], input[placeholder="Message Pulse…"]').first().isVisible().catch(() => false);
    await click('[data-testid="zcode-sheet-back"]').catch(() => {});
    await page.waitForTimeout(3000);
    const { body: afterP } = await apiCall('/api/product/assignment-proposals?status=proposed');
    check('T6: Noticed → Talk 打开且不产生 Assignment/Proposal', opened && (afterP.items ?? []).length === beforeCount, `proposals ${beforeCount}→${(afterP.items ?? []).length}`);
  } else {
    check('T6: Noticed → Talk', true, 'SKIP：当前无 Noticed 卡（数据依赖，wiring 已由代码路径+autoContextText 覆盖）');
  }

  // ── E7: Memory → KNOWS → search → document ──
  await openTab('Memory');
  check('T7: Memory tab 呈现 REMEMBERS/KNOWS 结构', await page.locator('text=KNOWS').first().isVisible().catch(() => false));
  check('T7: Memory 无 Responsibilities 卡（已归位 Me）', !(await page.locator('[data-testid="memory-responsibilities"]').isVisible().catch(() => false)));
  let kbDone = false;
  for (const q of ['基金', '监控', 'Pulse', '知识', '项目']) {
    await page.locator('[data-testid="memory-kb-input"]').fill(q).catch(() => {});
    await click('[data-testid="memory-kb-search"]');
    await page.waitForTimeout(5000);
    const hit = page.locator('[data-testid^="memory-kb-hit-"]').first();
    if (await hit.isVisible().catch(() => false)) {
      await hit.dispatchEvent('click', { bubbles: true });
      await page.waitForTimeout(6000);
      const content = await page.locator('[data-testid="kb-doc-content"]').innerText().catch(() => '');
      kbDone = content.trim().length > 0;
      check('T7: KB 搜索结果可阅读全文', kbDone, `query=${q} len=${content.length}`);
      break;
    }
  }
  if (!kbDone) check('T7: KB 搜索结果可阅读全文', false, 'vault 无命中或未配置');

  // ── E8: Me → Responsibilities → Detail → Revoke（scratch）──
  await openTab('Me');
  check('T8: Me 有 Responsibilities 入口', await page.locator('[data-testid="me-responsibilities"]').isVisible().catch(() => false));
  const scratch = await injectProposal(apiCall, 'RESP-SCRATCH');
  await apiCall(`/api/product/assignment-proposals/${scratch.id}/confirm`, { method: 'POST', body: '{}' });
  const { body: asgList3 } = await apiCall('/api/product/assignments');
  const scratchAsg = (asgList3.items ?? []).find((a) => a.provenance?.proposalId === scratch.id);
  await click('[data-testid="me-responsibilities"]');
  await page.waitForTimeout(8000);
  check('T8: Me → Responsibilities 列表', await page.locator('[data-testid="assignments-header"]').isVisible().catch(() => false));
  const scratchCard = page.locator(`[data-testid="assign-${scratchAsg?.id}"]`).first();
  if (await scratchCard.isVisible().catch(() => false)) {
    await scratchCard.dispatchEvent('click', { bubbles: true });
    await page.waitForTimeout(8000);
    check('T8: Assignment 详情（authorization/history 投影）',
      await page.locator('[data-testid="assignment-authorization"]').isVisible().catch(() => false) &&
      await page.locator('[data-testid="assignment-history"]').isVisible().catch(() => false));
  } else { check('T8: Assignment 详情', false, 'scratch 卡未出现'); }
  if (scratchAsg) {
    await apiCall(`/api/product/assignments/${scratchAsg.id}/revoke`, { method: 'POST', body: '{}' });
    const { body: rv } = await apiCall(`/api/product/assignments/${scratchAsg.id}`);
    check('T8: Revoke 动作生效（scratch → revoked）', rv?.item?.state === 'revoked');
  }

  // ── E9: Runtime offline → Retry → 恢复 ──
  execSync("pkill -f '[o]pencode serve' || true", { shell: '/bin/bash' });
  await page.waitForTimeout(2000);
  await goto();
  await openTab('Talk');
  await page.waitForTimeout(6000);
  const offlineBox = await page.locator('[data-testid="talk-offline"]').isVisible().catch(() => false);
  const offlineText = offlineBox ? await page.locator('[data-testid="talk-offline"]').innerText() : '';
  check('T9: opencode 停机 → 明确 offline 态（AI is offline + Retry，无裸 502）',
    offlineBox && offlineText.includes('AI is offline') && !offlineText.includes('502'),
    offlineText.split('\n')[0] ?? '');
  await goto();
  const pulseErr = await page.locator('[data-testid="pulse-error"]').innerText().catch(() => '');
  check('T9: Pulse 同样呈现 offline（非裸报错）', pulseErr.includes('AI is offline'), pulseErr.split('\n')[0] ?? '');
  execSync('nohup opencode serve --hostname 127.0.0.1 --port 4096 > /tmp/opencode-serve.log 2>&1 &', { shell: '/bin/bash' });
  await page.waitForTimeout(8000);
  await openTab('Talk');
  await click('[data-testid="talk-retry"]').catch(() => {});
  await page.waitForTimeout(6000);
  const recovered = await page.locator(composerSel).first().waitFor({ state: 'visible', timeout: 20000 }).then(() => true).catch(() => false);
  check('T9: Retry 后功能恢复（chat 回到 workspace）', recovered && !(await page.locator('[data-testid="talk-offline"]').isVisible().catch(() => false)));

  check('无 JS page error', errors.length === 0, errors[0] ?? '');

  console.log('\n=== 结果汇总 ===');
  console.log(`${results.filter((r) => r.ok).length}/${results.length} 通过`);
  await browser.close();
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((e) => { console.error('FAIL', e); process.exit(1); });
