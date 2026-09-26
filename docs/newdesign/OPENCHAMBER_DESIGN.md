# OpenChamber Design System（移动端视觉参考）

> 用途：作为 Agent Mobile 的视觉参考规范。
>
> 本文档描述 OpenChamber 的视觉语言，不描述其业务语义，也不要求 Agent Mobile 复制 OpenChamber 的产品信息架构。

## 1. 参考范围

当前 OpenChamber 是跨桌面、Web/PWA、VS Code、iOS/Android 的 AI coding workspace。官方仓库将 `packages/ui` 定义为共享 React UI，而 `packages/mobile` 是 Capacitor iOS/Android shell；因此本文件提取的是**视觉与移动交互语言**，而不是要求 Agent Mobile 迁移 OpenChamber 的 Web/Capacitor 实现。

## 2. 核心视觉特征

OpenChamber 的移动端视觉可以概括为：

- 内容优先，而不是装饰优先
- 紧凑但不拥挤
- 大面积中性背景
- 细边框代替厚重卡片
- 层级主要由字体、间距和表面明度建立
- 强调色用于状态、选择和关键操作，而不是大面积铺色
- 技术内容存在，但不应该压过主要对话
- 手机上尽量减少桌面式 overflow 操作
- drawer、sheet、popover 是重要的上下文容器

## 3. Surface Hierarchy

建议把表面理解成 4 个层级：

1. App Background
2. Primary Surface
3. Secondary / Muted Surface
4. Interactive / Selected Surface

规则：

- 不要让每一个区域都成为独立 Card。
- 大多数内容应该直接存在于背景或轻量 surface 上。
- 边框用于划分关系，不用于制造视觉重量。
- 阴影应克制。
- 重要信息优先使用空间与字体层级表达。

## 4. Typography

重点不是复制某一个字体文件，而是保持以下层级：

| 层级 | 用途 |
|---|---|
| Display / Hero | 极少量页面核心标题 |
| Heading | 页面或 section 标题 |
| Body | 对话和主要内容 |
| Label | 控件、状态、分类 |
| Metadata | 时间、模型、目录等辅助信息 |

规则：

- 正文必须保持良好可读性。
- Metadata 不应与正文竞争。
- Technical metadata 使用较小字号，但不能小到影响手机阅读。
- 标题依靠字重和间距形成层级，不依赖大量颜色。

## 5. Spacing

OpenChamber 风格适合采用 4px 基础节奏：

```text
4 / 8 / 12 / 16 / 20 / 24 / 32
```

建议：

- 页面水平 padding：16px 左右
- icon + label：8px
- label + supporting text：4px
- 同组 rows：8–12px
- section：20–24px
- major section：32px

不要为了“看起来差不多”大量产生 13px、17px、19px 之类的随机值。

## 6. Radius

推荐建立有限的 radius token：

```text
small   6
medium  10
large   12
sheet   16
pill    999
```

不是所有元素都使用 pill。

## 7. Borders

推荐：

- 普通 border：细、低对比度
- active/focus：使用 accent
- destructive：使用 semantic error
- 不要给所有卡片增加明显描边

## 8. Color Strategy

Agent Mobile 不应硬编码 OpenChamber 的颜色，而应该建立自己的 semantic tokens。

重点继承：

- 中性背景
- 中性 surface
- 强文本 / 弱文本层级
- 一个受控的 brand accent
- success / warning / error / info

OpenChamber 当前 release 也持续调整 light/dark theme、message box、panels、selected text 等视觉细节，因此这里采用“设计规则”而不是复制某一版的具体颜色值。

## 9. Icons

建议：

- 使用一致的 outline icon family
- navigation：22–24px
- standard action：20–22px
- metadata：16px
- icon 颜色跟随文本层级
- selected 使用 accent
- 不用图标堆砌制造信息量

## 10. Chat Visual Language

核心原则：

> 对话是主内容，技术信息是上下文。

因此：

- AI message 不应该全部包进厚重 bubble
- tool activity 可以用 compact surface 表达
- code / diff 使用独立 technical surface
- user message 可以有轻微 surface 区分
- action controls 应尽量靠近其语义对象
- streaming 内容必须保持稳定滚动行为

## 11. Composer

Composer 是移动端最重要的 persistent control 之一。

应具备：

- 明确的输入区域
- 发送状态
- agent/model 控件
- attachment/context 能力
- keyboard-safe behavior
- agent working 时的 queue/send 状态

OpenChamber 当前移动端已经针对 message box、attachments、model/agent controls、keyboard movement 做了专门优化，因此 Agent Mobile 应把 composer 当成独立的核心组件，而不是普通 TextInput。

## 12. Drawers / Sheets

Drawer：

- 用于跨页面、跨 session 的导航或上下文选择
- 应支持明确的关闭手势
- mobile 上 edge swipe 是重要交互

Sheet：

- 用于查看当前上下文的次级信息
- 不应把用户永久带离当前 context
- 适合 detail、picker、secondary actions

## 13. Touch

所有可交互元素都应满足 Android 可用的 touch target。

尤其：

- session row
- project row
- toolbar action
- send button
- drawer action
- bottom navigation

不要依赖 hover。

## 14. Android

必须考虑：

- system navigation bar
- status bar
- keyboard resize
- safe area
- back button
- edge gestures
- 横竖屏变化

## 15. Agent Mobile 的继承原则

Agent Mobile 可以继承：

- surface hierarchy
- typography hierarchy
- spacing rhythm
- restrained borders
- compact technical surfaces
- drawer/sheet interaction
- composer treatment
- keyboard behavior
- touch target discipline

Agent Mobile 不应继承：

- OpenChamber 的项目/Worktree/Session 信息架构
- OpenChamber 的产品命名
- OpenChamber 的 coding-workspace 心智模型
- OpenChamber 的桌面布局
- Capacitor/WebView 实现

## 16. 一句话视觉定义

> **安静、中性、紧凑、技术感克制，以内容层级和上下文容器表达复杂性。**
