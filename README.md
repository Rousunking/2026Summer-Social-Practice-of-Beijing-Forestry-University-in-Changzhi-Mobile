# 云上党 · 古树名木数字地图（手机端）

北京林业大学暑期社会实践 — 长治市上党区古树名木数字地图，手机竖屏适配版。

## 功能

- 高德地图集成 + fallback 点位示意图
- 底部抽屉（Bottom Sheet）列表/详情交互，支持手势拖拽
- 数据大屏：KPI 指标、乡镇排行、树种分布、等级环形图、迷你地图
- 底部 Tab 导航（首页 / 地图 / 大屏）
- 53 条真实古树名木数据

## 目录结构

```
├── index.html          # 入口页（图层选择）
├── map.html            # 地图页（高德地图 + 底部抽屉）
├── 数据大屏.html        # 数据大屏页
├── config.js           # 高德 API Key 配置
├── data.js             # 古树名木数据（53 条）
├── css/
│   └── styles.css      # 手机端竖屏适配样式
└── js/
    ├── app.js          # 地图页逻辑
    └── dashboard.js    # 数据大屏逻辑
```

## 部署

静态站点，直接部署到 Cloudflare Pages / Vercel / GitHub Pages 即可。

Cloudflare Pages 配置：Framework preset: **None**，Build output: **/**

部署后需将域名添加到高德开放平台 Key 的安全域名白名单。

## 相关链接

- PC 端版本：[2026Summer-Social-Practice-of-Beijing-Forestry-University-in-Changzhi](https://github.com/Rousunking/2026Summer-Social-Practice-of-Beijing-Forestry-University-in-Changzhi)
- 在线演示：[beilin-summer-practice.pages.dev](https://beilin-summer-practice.pages.dev)（PC 端）
