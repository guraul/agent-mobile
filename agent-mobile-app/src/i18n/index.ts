import { useSyncExternalStore } from "react";

/**
 * 轻量 i18n（第 0 期建能力，第 1 期已迁移 Pulse / Settings / Attention / 各 sheet 的界面文案）。
 *
 * - 不引第三方依赖：类型化字典 + `t()` 就是全部。
 * - 默认语言 `en`（当前 UI 的实际语言）；`zh` 保留现有中文文案。
 * - 只放界面文案：assignment 标题、记忆正文、项目名、用户数据一律不进字典。
 * - key 命名：`<surface>.<component>.<key>`，例如 `pulse.digest.allClear`。
 */
export type Locale = "en" | "zh";

const en = {
  // ── 全局：Alert 按钮与跨屏共用的失败文案 ────────────────────────────────
  "app.common.cancel": "Cancel",
  "app.common.sessionGoneTitle": "That conversation is gone",
  "app.common.sessionGoneBody":
    "The conversation this item points to no longer exists. My runtime may have restarted.",
  "app.common.sessionGoneAction": "Open Talk instead",
  "app.common.cannotOpenTalk": "Can't open Talk",

  // ── Sheet 原语 ─────────────────────────────────────────────────────────
  "sheet.common.close": "Close sheet",

  // ── Pulse：Header ──────────────────────────────────────────────────────
  "pulse.header.settings": "Settings",
  "pulse.header.presenceOffline": "Offline",
  "pulse.header.presenceNeedsYou": "Needs you",
  "pulse.header.presenceAttentive": "Attentive",

  // ── Pulse：首页 ────────────────────────────────────────────────────────
  "pulse.home.greetingMorning": "Good morning",
  "pulse.home.greetingAfternoon": "Good afternoon",
  "pulse.home.greetingEvening": "Good evening",
  "pulse.home.greetingAlone": "{greeting}.",
  "pulse.home.greetingWithName": "{greeting}, {name}.",
  "pulse.home.offlineVoice": "I'm having trouble reaching my runtime.",
  "pulse.home.seeAll": "See All",
  "pulse.home.more": "More ({n})",
  "pulse.home.moreTitle": "More",
  "pulse.home.emptyVoice": "All's been calm while you were away.",
  "pulse.home.startChat": "Start New Chat",

  // ── Pulse：今日摘要（第 0 期 key，复用）────────────────────────────────
  "pulse.digest.allClear": "Nothing needs you right now.",

  // ── Pulse：Settings sheet ──────────────────────────────────────────────
  "pulse.settings.responsibilities": "RESPONSIBILITIES",
  "pulse.settings.responsibilitiesRow": "What I am responsible for",
  "pulse.settings.responsibilitiesDetail": "Active / completed / revoked",
  "pulse.settings.activityRow": "What I've been doing",
  "pulse.settings.activityDetail": "Last 7 days · read-only",
  "pulse.settings.connection": "CONNECTION",
  "pulse.settings.online": "Online",
  "pulse.settings.offline": "Offline",
  "pulse.settings.account": "Account",
  "pulse.settings.notSignedIn": "Not signed in",
  "pulse.settings.signIn": "Sign in",
  "pulse.settings.signOut": "Sign out",
  "pulse.settings.advancedA11y": "Advanced connection settings",
  "pulse.settings.advanced": "Advanced · BFF address",
  "pulse.settings.defaultSuffix": " (default)",
  "pulse.settings.save": "Save",
  "pulse.settings.reset": "Reset to default",
  "pulse.settings.savedHint": "Takes effect after a restart (refresh on web).",
  "pulse.settings.preferences": "PREFERENCES",
  "pulse.settings.modelPreferenceFor": "Model preference for {agent}",
  "pulse.settings.whatIKnow": "WHAT I KNOW",
  "pulse.settings.memoryDetail": "Memory about you and your projects",
  "pulse.settings.knowledgeRow": "Knowledge sources",
  "pulse.settings.knowledgeDetail": "Search what I can draw on",
  "pulse.settings.modelPickerTitle": "Choose a model for {agent}",
  "pulse.settings.modelSearchPlaceholder": "Search models…",
  "pulse.settings.confirm": "Confirm",

  // ── Pulse：Memory sheet ────────────────────────────────────────────────
  "pulse.memory.title": "What I remember",
  "pulse.memory.caption":
    "Durable understanding about you and your projects. Forgetting acts on the canonical store.",
  "pulse.memory.loading": "Loading…",
  "pulse.memory.empty":
    "Nothing in memory yet. memx distills durable understanding from conversations.",
  "pulse.memory.forgetTitle": "Forget this memory?",
  "pulse.memory.forgetBody":
    "{title}\n\nProject memories move to .trash and leave the index; user memories are marked deprecated.",
  "pulse.memory.forget": "Forget",
  "pulse.memory.forgetFailed": "Couldn't forget this memory",
  "pulse.memory.forgetA11y": "Forget {title}",
  "pulse.memory.source": "Source: {source}",

  // ── Pulse：Knowledge sheet ─────────────────────────────────────────────
  "pulse.knowledge.title": "Knowledge",
  "pulse.knowledge.caption":
    "Sources I can draw on. Search, read, or bring one into a conversation.",
  "pulse.knowledge.backToSearch": "Back to search",
  "pulse.knowledge.open": "Open",
  "pulse.knowledge.askAboutThis": "Ask about this",
  "pulse.knowledge.searchPlaceholder": "Search sources…",
  "pulse.knowledge.search": "Search",
  "pulse.knowledge.unconfigured": "Knowledge vault is not configured (LLM_WIKI_VAULT).",
  "pulse.knowledge.empty": "No matches.",

  // ── Pulse：Market sheet（FundSheet）────────────────────────────────────
  "pulse.market.title": "Market",
  "pulse.market.caption": "Estimates I am keeping an eye on. Informational only.",
  "pulse.market.prev": "prev {nav}",

  // ── Pulse：Noticed（首页分组 / 列表 sheet / 详情 sheet）────────────────
  "pulse.noticed.title": "Noticed",
  "pulse.noticed.discuss": "Discuss",

  // ── Pulse：Activity sheet（Lately）─────────────────────────────────────
  "pulse.activity.title": "Lately",
  "pulse.activity.caption":
    "Read-only record of what I did under your authority. Looking changes nothing.",
  "pulse.activity.today": "Today",
  "pulse.activity.loading": "Loading…",
  "pulse.activity.loadError": "Couldn't load this right now",
  "pulse.activity.retry": "Try again",
  "pulse.activity.emptyToday": "Nothing needed doing today",

  // ── Attention：详情屏 ──────────────────────────────────────────────────
  "attention.detail.back": "Back",
  "attention.detail.refresh": "Refresh",
  "attention.detail.loading": "Loading…",
  "attention.detail.relatedResponsibility": "Related responsibility",
  "attention.detail.state": "State",
  "attention.detail.evidence": "Evidence",
  "attention.detail.noEvidence": "No supporting events.",
  "attention.detail.attempt": "attempt {n}",
  "attention.detail.note": "Viewing never changes state.",
  "attention.detail.renewSent":
    "QR code sent to WeCom. Scan it to renew; I'll remind you again if it's not scanned in 10 minutes.",
  "attention.detail.retryNoAssignment": "This attention has no retryable responsibility",
  "attention.detail.retryFailed": "Retry failed (attempt {n}): {error}",
  "attention.detail.renewed": "Resent",
  "attention.detail.renewing": "Sending…",
  "attention.detail.renew": "Resend QR code",
  "attention.detail.openTalk": "Open Talk",
  "attention.detail.retrying": "Retrying…",
  "attention.detail.retry": "Retry",
  "attention.detail.dismissing": "Dismissing…",
  "attention.detail.dismiss": "Dismiss",
  "attention.detail.dismissTitle": "Dismiss this item?",
  "attention.detail.dismissBody": "This only steps back from the item. The responsibility stays.",
} as const;

type PluralSuffix = "_one" | "_other";
type PluralBase<K> = K extends `${infer Base}${PluralSuffix}` ? Base : never;

/** 字典的 key 集合。复数 key（`_one` / `_other`）同时暴露其基名，便于 `t(key, { count })`。 */
export type MessageKey = keyof typeof en | PluralBase<keyof typeof en>;

/** `zh` 必须实现 `en` 的全部 key —— 缺一条即编译失败。 */
type MessageDict = Record<MessageKey, string>;

const zh = {
  "app.common.cancel": "取消",
  "app.common.sessionGoneTitle": "原会话已不存在",
  "app.common.sessionGoneBody": "该事项引用的会话已丢失（agent runtime 可能重启过）。",
  "app.common.sessionGoneAction": "去 Talk 默认会话",
  "app.common.cannotOpenTalk": "无法进入 Talk",

  "sheet.common.close": "关闭面板",

  "pulse.header.settings": "设置",
  "pulse.header.presenceOffline": "离线",
  "pulse.header.presenceNeedsYou": "需要你",
  "pulse.header.presenceAttentive": "留意中",

  "pulse.home.greetingMorning": "早上好",
  "pulse.home.greetingAfternoon": "下午好",
  "pulse.home.greetingEvening": "晚上好",
  "pulse.home.greetingAlone": "{greeting}。",
  "pulse.home.greetingWithName": "{greeting}，{name}。",
  "pulse.home.offlineVoice": "我暂时连不上我的 runtime。",
  "pulse.home.seeAll": "查看全部",
  "pulse.home.more": "更多（{n}）",
  "pulse.home.moreTitle": "更多",
  "pulse.home.emptyVoice": "你不在的时候，一切都很平静。",
  "pulse.home.startChat": "开始新对话",

  "pulse.digest.allClear": "现在没有需要你处理的事。",

  "pulse.settings.responsibilities": "职责",
  "pulse.settings.responsibilitiesRow": "我负责的事",
  "pulse.settings.responsibilitiesDetail": "生效中 / 已完成 / 已撤销",
  "pulse.settings.activityRow": "我最近在做什么",
  "pulse.settings.activityDetail": "最近 7 天 · 只读",
  "pulse.settings.connection": "连接",
  "pulse.settings.online": "在线",
  "pulse.settings.offline": "离线",
  "pulse.settings.account": "账号",
  "pulse.settings.notSignedIn": "未登录",
  "pulse.settings.signIn": "去登录",
  "pulse.settings.signOut": "登出",
  "pulse.settings.advancedA11y": "高级连接设置",
  "pulse.settings.advanced": "高级 · BFF 地址",
  "pulse.settings.defaultSuffix": "（默认）",
  "pulse.settings.save": "保存",
  "pulse.settings.reset": "恢复默认",
  "pulse.settings.savedHint": "保存后重启生效（web 刷新即可）",
  "pulse.settings.preferences": "偏好",
  "pulse.settings.modelPreferenceFor": "{agent} 的 model 偏好",
  "pulse.settings.whatIKnow": "我知道什么",
  "pulse.settings.memoryDetail": "关于你和你的项目的记忆",
  "pulse.settings.knowledgeRow": "知识来源",
  "pulse.settings.knowledgeDetail": "搜索我可以引用的资料",
  "pulse.settings.modelPickerTitle": "为 {agent} 选择 model",
  "pulse.settings.modelSearchPlaceholder": "搜索 model…",
  "pulse.settings.confirm": "确认",

  "pulse.memory.title": "我记得什么",
  "pulse.memory.caption": "关于你和你的项目的持久理解。忘记会直接作用于权威存储。",
  "pulse.memory.loading": "加载中…",
  "pulse.memory.empty": "还没有 Memory——memx 会在会话中提炼持久理解。",
  "pulse.memory.forgetTitle": "忘记这条记忆？",
  "pulse.memory.forgetBody":
    "{title}\n\nproject 记忆将移入 .trash 并从索引移除；user 记忆将被标记弃用。",
  "pulse.memory.forget": "忘记",
  "pulse.memory.forgetFailed": "忘记失败",
  "pulse.memory.forgetA11y": "忘记 {title}",
  "pulse.memory.source": "来源：{source}",

  "pulse.knowledge.title": "知识",
  "pulse.knowledge.caption": "我可以引用的资料。搜索、阅读，或带进一次对话。",
  "pulse.knowledge.backToSearch": "返回搜索",
  "pulse.knowledge.open": "打开",
  "pulse.knowledge.askAboutThis": "就此提问",
  "pulse.knowledge.searchPlaceholder": "搜索资料…",
  "pulse.knowledge.search": "搜索",
  "pulse.knowledge.unconfigured": "知识库 vault 未配置（LLM_WIKI_VAULT）",
  "pulse.knowledge.empty": "无匹配结果",

  "pulse.market.title": "市场",
  "pulse.market.caption": "我在关注的估算。仅供参考。",
  "pulse.market.prev": "前值 {nav}",

  "pulse.noticed.title": "注意到",
  "pulse.noticed.discuss": "讨论",

  "pulse.activity.title": "最近",
  "pulse.activity.caption": "在你授权下我做过什么的只读记录。查看不会改变任何东西。",
  "pulse.activity.today": "今天",
  "pulse.activity.loading": "加载中…",
  "pulse.activity.loadError": "暂时读不到记录",
  "pulse.activity.retry": "重试",
  "pulse.activity.emptyToday": "今天没有需要做的事",

  "attention.detail.back": "返回",
  "attention.detail.refresh": "刷新",
  "attention.detail.loading": "加载中…",
  "attention.detail.relatedResponsibility": "关联的职责",
  "attention.detail.state": "状态",
  "attention.detail.evidence": "依据",
  "attention.detail.noEvidence": "没有可支撑的事件。",
  "attention.detail.attempt": "第 {n} 次尝试",
  "attention.detail.note": "查看不会改变状态。",
  "attention.detail.renewSent": "已发送二维码到企业微信，请扫码续期；10 分钟未扫会再提醒你",
  "attention.detail.retryNoAssignment": "该 Attention 未关联可重试的 responsibility",
  "attention.detail.retryFailed": "重试失败（第 {n} 次）：{error}",
  "attention.detail.renewed": "已重发",
  "attention.detail.renewing": "发送中…",
  "attention.detail.renew": "重发二维码",
  "attention.detail.openTalk": "打开 Talk",
  "attention.detail.retrying": "重试中…",
  "attention.detail.retry": "重试",
  "attention.detail.dismissing": "退出中…",
  "attention.detail.dismiss": "退出",
  "attention.detail.dismissTitle": "退出这条事项？",
  "attention.detail.dismissBody": "仅代表显式退出，不影响 responsibility。",
} satisfies MessageDict;

export type MessageVars = Record<string, string | number>;

const dictionaries: Record<Locale, MessageDict> = { en, zh };

let locale: Locale = "en";

const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return locale;
}

export function setLocale(next: Locale): void {
  if (next === locale) return;
  locale = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * 语言订阅 hook：切换语言时触发重渲染。
 * 用 `useSyncExternalStore` 而非 `useEffect` + `setState`：外部 store 的读取发生在渲染期（无
 * 首帧旧值 / 额外一轮渲染），且天然满足 `react-hooks/set-state-in-effect`。
 */
export function useLocale(): [Locale, (next: Locale) => void] {
  const current = useSyncExternalStore(subscribe, getLocale, getLocale);
  return [current, setLocale];
}

const warned = new Set<string>();

function warnMissing(key: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(`[i18n] missing message key: ${key}`);
}

/**
 * 纯函数翻译引擎（`t` 的内部实现，单独导出便于测试）。
 *
 * - `{name}` 占位符用 `vars.name` 插值；未提供的占位符原样保留。
 * - `vars.count` 为 number 时优先取 `${key}_one`（count === 1）/ `${key}_other`，找不到回落到 `key`。
 * - 缺 key：返回 key 本身并回调 `onMissing`，绝不抛异常。
 */
export function translate(
  dict: Readonly<Record<string, string>>,
  key: string,
  vars?: MessageVars,
  onMissing?: (key: string) => void,
): string {
  const count = vars?.count;
  let template: string | undefined;
  if (typeof count === "number") {
    template = dict[`${key}_${count === 1 ? "one" : "other"}`];
  }
  template ??= dict[key];

  if (template === undefined) {
    onMissing?.(key);
    return key;
  }

  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
    const value = vars[name];
    return value === undefined ? placeholder : String(value);
  });
}

/** 当前语言下取文案；缺 key 返回 key 本身并 warn 一次（同一 key 不重复刷屏）。 */
export function t(key: MessageKey, vars?: MessageVars): string {
  return translate(dictionaries[locale], key, vars, warnMissing);
}
