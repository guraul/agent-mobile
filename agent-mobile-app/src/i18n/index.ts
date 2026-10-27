import { useSyncExternalStore } from "react";

/**
 * 轻量 i18n（第 0 期：只建能力，不迁移界面）。
 *
 * - 不引第三方依赖：类型化字典 + `t()` 就是全部。
 * - 默认语言 `en`（当前 UI 的实际语言）；`zh` 保留现有中文文案。
 * - 只放界面文案：assignment 标题、记忆正文、项目名、用户数据一律不进字典。
 * - key 命名：`<surface>.<component>.<key>`，例如 `pulse.digest.allClear`。
 */
export type Locale = "en" | "zh";

const en = {
  "pulse.digest.allClear": "Nothing needs you right now.",
  "pulse.header.settings": "Settings",
  "pulse.activity.title": "Lately",
} as const;

type PluralSuffix = "_one" | "_other";
type PluralBase<K> = K extends `${infer Base}${PluralSuffix}` ? Base : never;

/** 字典的 key 集合。复数 key（`_one` / `_other`）同时暴露其基名，便于 `t(key, { count })`。 */
export type MessageKey = keyof typeof en | PluralBase<keyof typeof en>;

/** `zh` 必须实现 `en` 的全部 key —— 缺一条即编译失败。 */
type MessageDict = Record<MessageKey, string>;

const zh = {
  "pulse.digest.allClear": "现在没有需要你处理的事。",
  "pulse.header.settings": "设置",
  "pulse.activity.title": "最近",
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
