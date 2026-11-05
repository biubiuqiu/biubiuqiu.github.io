# Denis Wen · 个人主页

纯 HTML / CSS 的响应式个人主页，面向 GitHub Pages。无需安装依赖或执行构建，关闭 JavaScript 仍可使用。

目标地址：<https://biubiuqiu.github.io/>

## 发布

1. 在 GitHub 账号 `biubiuqiu` 下新建公开仓库 `biubiuqiu.github.io`。
2. 把本目录中的 `index.html`、`styles.css`、`favicon.svg`、`.nojekyll` 和本文件放在仓库根目录并提交到 `main`。
3. 打开 **Settings → Pages → Build and deployment**，Source 选择 **Deploy from a branch**，Branch 选择 **main**，目录选择 **/(root)**，点击 **Save**。
4. 等待 Pages 部署完成，打开页面上返回的网站地址。以后向 `main` 提交修改即可更新。

官方说明：<https://docs.github.com/en/pages/quickstart>

## 修改内容

- `index.html`：名字、介绍、项目、技术关注、兴趣、GitHub 链接和 SEO 信息。
- `styles.css`：`:root` 中的颜色与字体变量；下方包含平板、手机和减少动态效果的样式。
- `favicon.svg`：浏览器标签页图标。

链接统一指向已核实的公开 GitHub 主页、Lester 仓库与文档，不包含邮箱、公司内部数据或第三方统计脚本。

如换用其他账号或自定义域名，同步修改 HTML 中的 canonical、og:url 以及所有 GitHub 链接。

## 本地预览

在本目录执行 `python3 -m http.server 8000`，然后访问 <http://localhost:8000>。
