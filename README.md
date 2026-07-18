# 栞（しおり）— 日本語チャプターリーダー

仓库即书架：把章节 `txt` 放进仓库，push 即出版。手机浏览器打开即读，天然只读，不会误编辑。

## 快速开始

```bash
npm install
npm run dev      # 本地开发
npm run build    # 构建到 dist/
```

## 添加章节 / 书籍

1. 把 `章节.txt` 放到 `public/books/<book-id>/`（纯文本，**空行分段**）
2. 在 `public/books/manifest.json` 登记：

```json
{ "id": "04", "title": "第四章　……", "file": "books/<book-id>/04.txt" }
```

3. `git push`，GitHub Action 自动部署

manifest 的 `books` 数组已支持多本书，书架界面是下一阶段（v1 读取第一本）。

## 部署（GitHub Pages）

仓库 Settings → Pages → Source 选 **GitHub Actions**，之后每次 push main 自动构建部署（见 `.github/workflows/deploy.yml`）。手机访问 Pages 地址，可「添加到主屏幕」作为 App 使用。

## 功能

- 滚动 / 翻页两种阅读模式（设置内切换）；翻页支持点按左右区域与方向键
- 白 / 纸 / 黑三主题，明朝 / ゴシック书体，字号与行间调节
- 阅读进度按「段落锚点」记忆（本机 localStorage）——换字号、换模式、换设备方向都不丢位置
- 栞（书签）：标记当前位置，段落左侧垂朱色丝带；目次面板内可跳转、删除
- `prefers-reduced-motion` 降级、安全区适配、PWA manifest

## 路线图

- [ ] 书架页（manifest 已就绪）
- [ ] 划线高亮 + 笔记
- [ ] 縦書き（竖排）切换
- [ ] Service Worker 离线缓存
