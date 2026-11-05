import type { MessageKey } from "../i18n";

/**
 * 续接块的「多久之前」（PRODUCT_MODEL §24；B1+）。
 *
 * 只按**设备本地日历天**算：跨零点就是「昨天」，不是 24 小时差——用户看的是日历，
 * 不是秒表。纯函数：`now` 显式传入，单测不依赖真实时钟，也不受时区/夏令时影响
 * （本地日界由 Date 的本地构造器给出）。
 *
 * 返回 i18n key + count，由组件决定怎么渲染（本函数不碰 React、不碰主题）。
 */
export interface RelativeDay {
  key: MessageKey;
  count: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function relativeDay(createdAt: number, now: number = Date.now()): RelativeDay {
  // Math.round 吸收夏令时造成的 23/25 小时偏差
  const days = Math.round((startOfLocalDay(now) - startOfLocalDay(createdAt)) / DAY_MS);
  if (days <= 0) return { key: "pulse.continue.when.today", count: 0 }; // 含时钟偏移导致的未来时间
  if (days === 1) return { key: "pulse.continue.when.yesterday", count: 1 };
  if (days <= 7) return { key: "pulse.continue.when.days", count: days };
  return { key: "pulse.continue.when.weeks", count: Math.max(1, Math.round(days / 7)) };
}
