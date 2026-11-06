# Denis Wen · 个人主页

围绕 Lester、AI Agent 探索、高原徒步和 F1 的响应式静态个人主页。支持中文、英文、日文，以及浅色、深色和跟随系统三种外观。正文和语言切换无需 JavaScript；手动主题切换使用小型脚本。

| 语言 | 地址 |
| --- | --- |
| 中文 | <https://biubiuqiu.github.io/> |
| English | <https://biubiuqiu.github.io/en/> |
| 日本語 | <https://biubiuqiu.github.io/ja/> |

每个版本都有对应的 HTML 语言标记、页面标题、简介、canonical、hreflang 和社交分享信息。页头的原生 HTML 菜单提供语言切换；根地址默认中文，不强制重定向访客。

## 修改内容

- `src/locales.json`：三种语言的文案，使用统一的翻译字段。
- `src/template.html`：共享页面结构。
- `styles.css`：暖白/森林绿与炭绿/鼠尾草绿主题，以及响应式排版。
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

点击页头半圆图标，选择「跟随系统」「浅色」「深色」。选择保存在 localStorage（`denis-theme`），刷新和切换语言后保留。跟随系统时响应系统外观变化；标签页间同步选择。存储不可用时仍可切换当前页面。禁用 JavaScript 时隐藏手动外观菜单，使用系统配色，正文和语言导航照常可用。

衬线字体使用系统字库，不同设备的中文字形可能略有差异。不加载第三方字体或统计脚本。


## 内容结构

- 简介与兴趣导航。
- Lester：项目介绍、协作、执行与成果预览。
- AI Agent：产品体验与设计问题。
- 高原徒步：梅里北坡、虎跳峡、阿布吉措、哈巴西坡、麦理浩径。
- F1：红牛车队与 Max Verstappen。

三种语言共享模板与字号体系，兴趣段落使用自然换行，不包含虚构文章或游记链接。
