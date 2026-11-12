# Denis Wen · 个人主页

全景雪山封面、白底与陶红点缀、杂志式双栏排版的响应式个人主页，围绕 Lester、AI Agent、高原徒步、电影、游戏和 F1。支持中文、英文、日文，以及浅色、深色和跟随系统三种外观。正文和语言切换无需 JavaScript；手动主题切换使用小型脚本。

| 语言 | 地址 |
| --- | --- |
| 中文 | <https://biubiuqiu.github.io/> |
| English | <https://biubiuqiu.github.io/en/> |
| 日本語 | <https://biubiuqiu.github.io/ja/> |

每个版本都有对应的 HTML 语言标记、页面标题、简介、canonical、hreflang 和社交分享信息。页头的原生 HTML 菜单提供语言切换；根地址默认中文，不强制重定向访客。

## 修改内容

- `src/locales.json`：三种语言的文案，使用统一的翻译字段。
- `src/template.html`：共享页面结构。
- `styles.css`：白底/陶红浅色主题与炭黑深色主题，以及响应式排版。
- `theme.js`：外观菜单、系统外观变化与跨标签页同步。
- `src/theme-init.js`：首屏渲染前恢复主题，避免跨语言导航时闪烁。
- `scripts/build.py`：仅依赖 Python 标准库的生成脚本，同时检查翻译字段是否完整。
- `index.html`、`en/index.html`、`ja/index.html`、`sitemap.xml`：生成后的发布文件。
- `favicon.svg`：标签页图标。

修改模板或翻译后，在仓库根目录运行：

```bash
python3 scripts/build.py
```

将源文件和生成的 HTML 一起提交到 `main`，GitHub Pages 会自动发布。没有包管理依赖或前端构建工具。

## 本地预览

在仓库根目录运行 `python3 -m http.server 8000`，然后访问 <http://localhost:8000>。

## 发布配置

GitHub Pages 使用 **Deploy from a branch → main → /(root)**；`.nojekyll` 跳过 Jekyll 处理。

本仓库仅包含个人公开内容，不包含任职经历、内部项目、密码、邮箱或第三方统计脚本。网站展示的 HTML/CSS 可由访客查看。仓库是否私有与已发布网站是否公开是不同的设置；GitHub Free 的 Pages 需要公开仓库。

官方说明：<https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site>

如更换账号或自定义域名，同步更新 `scripts/build.py` 的 `BASE_URL`、模板中的 GitHub 链接，再重新生成页面。

## 外观行为

未保存外观偏好时默认显示浅色主题。点击页头半圆图标，选择「跟随系统」「浅色」「深色」。选择保存在 localStorage（`denis-theme`），刷新和切换语言后保留。跟随系统时响应系统外观变化；标签页间同步选择。存储不可用时仍可切换当前页面。禁用 JavaScript 时隐藏手动外观菜单，使用默认浅色配色，正文和语言导航照常可用。

无衬线字体使用系统字库，不同设备的中文字形可能略有差异。不加载第三方字体或统计脚本。


## 内容结构

- 简介与兴趣导航。
- Lester：目前正在做的项目，保留简短介绍与源码链接。
- AI Agent：产品体验与设计问题。
- 高原徒步：梅里北坡、虎跳峡、阿布吉措、哈巴西坡、麦理浩径。
- F1：红牛车队与 Max Verstappen。

三种语言共享模板与字号体系，兴趣段落使用自然换行，不包含虚构文章或游记链接。

## 阅读与图标

五个兴趣章节使用原生 HTML details，全部带 open 属性，进入页面时完整展开，可以自然向下滚动阅读；也可手动收起。关闭 JavaScript 时正文、章节开合和语言导航仍然可用。

图标使用 Phosphor Icons；本地 SVG 及 MIT 许可位于 assets/icons/，无需外部字体或图标服务。

## 徒步相册

8 张真实旅行照片保存在 assets/hiking/，WebP 版本按原比例展示，不添加未经确认的地名。src/photos.json 维护三语言图注与图片尺寸。图片懒加载；点击打开原生 dialog，Escape 或关闭按钮退出。不支持 dialog 时保留图片链接。

## 电影与游戏

电影章节使用 AI 生成的空影院氛围图，不代表个人实拍。游戏章节包含《荒野大镖客》、GTA V、GTA VI 与《最后生还者》，每张游戏图附官方来源链接，素材出处记录在 assets/interests/SOURCES.md。GTA VI 以关注中的作品介绍，不表述个人通关经历或发售日期。

## 图片查看器

徒步、电影和游戏配图均可点击查看；同一章节内分组浏览。全屏暗底按原比例适配屏幕，提供前后切换、张数、方向键、手机单指横滑、Escape/按钮/空白关闭与图片单独打开。打开时锁定背景，关闭后恢复滚动位置和焦点；加载失败有提示。不支持 dialog 或关闭 JavaScript 时保留标准图片链接。

## Horizon Journal 布局

首页使用真实徒步照片全景封面。正文为简介/Lester 与徒步的双栏，接电影/游戏、AI Agent/F1 两组开放内容，手机上自然变为单栏。所有内容默认可读；八张徒步照片通过主图和七张缩略图保留。五张游戏官方封面均可放大，分别包含《最后生还者》1 和 2。现有主题选择继续保留，默认白底，支持深色与跟随系统。
