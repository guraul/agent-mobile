# `src/i18n/` — 轻量 i18n（第 0 期）

零依赖的类型化字典 + `t()`。默认语言 **`en`**（当前 UI 的实际语言），`zh` 保留现有中文文案。

```ts
import { t, useLocale, setLocale, getLocale } from "@/i18n";

t("pulse.digest.allClear"); // "Nothing needs you right now."
t("chat.files", { count: 2 }); // 有 _one/_other 时按 count 选，否则回落 key
const [locale, changeLocale] = useLocale(); // 切换触发重渲染
```

## 怎么加一条文案（三步）

1. 在 `index.ts` 的 `en` 字典里加 key（英文，作为默认文案）。
2. 在 `zh` 字典里补齐同名 key —— `satisfies MessageDict` 会强制对齐，漏了编译失败。
3. 组件里改成 `t("...")`（**本期不迁移组件**，等 1/2/3 期分批做）。

复数：同时提供 `<key>_one` / `<key>_other`，调用 `t("<key>", { count })`；只有 base key 时照常回落。

## 命名规范

`<surface>.<component>.<key>`，小驼峰尾段，例如：

- `pulse.digest.allClear` —— Pulse 首页空态一句话
- `pulse.header.settings` —— Header 的 Settings 入口
- `pulse.activity.title` —— Activity sheet 的 `Lately` 标题
- `chat.handoff.confirm` —— chat 交接确认

## 红线

- **数据不进字典**：assignment 标题、记忆正文、项目名、用户数据一律原样展示，不翻译。
- **不改现有组件文案**（第 0 期只建能力）。
- **不引第三方 i18n 依赖**（i18next / react-i18next / expo-localization 均不用）。
- 缺 key 不抛异常：返回 key 本身并 `console.warn` 一次。

## 当前覆盖范围

第 0 期只放了 3 条样板文案（上表前三条）；其余界面文案仍在组件里硬编码，迁移分 1/2/3 期另开。
