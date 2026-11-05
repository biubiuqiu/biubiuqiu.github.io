# Denis Wen · 个人主页

纯静态、响应式的个人主页，发布在 GitHub Pages。支持中文、英文和日文，所有页面均无需 JavaScript 即可阅读与切换语言。

| 语言 | 地址 |
| --- | --- |
| 中文 | <https://biubiuqiu.github.io/> |
| English | <https://biubiuqiu.github.io/en/> |
| 日本語 | <https://biubiuqiu.github.io/ja/> |

每个版本都有对应的 HTML 语言标记、页面标题、简介、canonical、hreflang 和社交分享信息。页头的原生 HTML 菜单提供语言切换；根地址默认中文，不强制重定向访客。

## 修改内容

- `src/locales.json`：三种语言的文案，使用统一的翻译字段。
- `src/template.html`：共享页面结构。
- `styles.css`：共享样式与各语言的响应式排版。
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

本仓库仅包含公开主页内容，不包含密码、邮箱、公司内部数据或第三方统计脚本。网站展示的 HTML/CSS 可由访客查看。仓库是否私有与已发布网站是否公开是不同的设置；GitHub Free 的 Pages 需要公开仓库。

官方说明：<https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site>

如更换账号或自定义域名，同步更新 `scripts/build.py` 的 `BASE_URL`、模板中的 GitHub 链接，再重新生成页面。
