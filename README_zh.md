# Agent Mobile

AI 编码代理（OpenCode、Claude Code、Codex）的移动端遥控应用。

一个以设计为先的项目：为"在手机上监控和控制 AI 代理"的移动应用定义视觉体系、组件系统和界面——"AI 代理的 Mission Control（任务控制中心）"。

## 设计理念

> 沉稳的密度。一瞥可读的状态，清晰可读的细节，自信的交互。

## 仓库结构

```
├── src/                      React/TSX 源码
│   ├── components/           UI 基础组件
│   ├── screens/              应用界面（Agents、Activity、Settings 等）
│   └── theme/                设计令牌（颜色、字体、间距等）
├── showcase/                 最终 UI 的静态 HTML 预览
│   └── README.md             展示站使用方法与结构
└── docs/
    └── knowledge_base/       设计规范与评审文档
        ├── DESIGN.md         完整设计系统规范（令牌、组件、界面）
        ├── DESIGN_DIRECTION.md  设计方向（为什么 & 怎么做）
        ├── VISION_REVIEW.md  产品愿景评审
        ├── AI_INTERACTION_DESIGN.md  首页交互设计（事件流版）
        ├── SHOWCASE_*.md     展示站实现与评审文档
        └── *_REVIEW.md       组件与界面评审文档
```

## 展示站

在浏览器中打开 `showcase/index.html` 即可预览最终 UI（iPhone 16 Pro 机型，393x852）。

## 文档

- English: [README.md](README.md)
- 中文: [README_zh.md](README_zh.md)
