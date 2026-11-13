"""Render a small, buildless Chinese writing archive from curated post sources."""
import html
import json
from pathlib import Path


def load_posts(root):
    posts = json.loads((root / 'src/posts.json').read_text())
    for post in posts:
        # Publication dates come from post metadata, never from build time.
        if not post['original_datetime'].startswith(post['date']):
            raise ValueError('Original publication date mismatch')
        if not (root / 'src/posts' / (post['slug'] + '.html')).is_file():
            raise ValueError('Missing article body')
    return posts


def featured_writing(root, copy):
    rows = []
    for post in load_posts(root)[:3]:
        rows.append('<li><time datetime="' + post['date'] + '">' + post['date'] + '</time><div><a href="/writing/' + post['slug'] + '/" lang="zh-CN">' + html.escape(post['title']) + '<span aria-hidden="true"> ↗</span></a><p lang="zh-CN">' + html.escape(post['excerpt']) + '</p></div></li>')
    return '<ul class="writing-rows">' + ''.join(rows) + '</ul>'


def build_writing(root, base_url, theme_menu_for, copy):
    posts = load_posts(root)
    bootstrap = (root / 'src/theme-init.js').read_text()
    theme = theme_menu_for(copy)
    def shell(title, description, path, body):
        visual_assets = '<link rel="stylesheet" href="/context-demos.css?v=1"><script src="/context-demos.js?v=1" defer></script>' if path == 'writing/agent-context-management/' else ''
        if path == 'writing/agent-tool-design/':
            visual_assets = '<link rel="stylesheet" href="/context-demos.css?v=1"><link rel="stylesheet" href="/tool-demos.css?v=1"><link rel="stylesheet" href="/parameter-demos.css?v=1"><script src="/tool-demos.js?v=1" defer></script><script src="/parameter-demos.js?v=1" defer></script>'
        return '''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#ffffff">
<title>''' + html.escape(title) + ''' — Denis Wen</title><meta name="description" content="''' + html.escape(description, quote=True) + '''"><link rel="canonical" href="''' + base_url + path + '''"><meta property="og:type" content="''' + ('article' if path != 'writing/' else 'website') + '''"><meta property="og:title" content="''' + html.escape(title, quote=True) + '''"><meta property="og:description" content="''' + html.escape(description, quote=True) + '''"><meta property="og:url" content="''' + base_url + path + '''"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><script>''' + bootstrap + '''</script><link rel="stylesheet" href="/styles.css?v=15"><link rel="stylesheet" href="/writing.css?v=3"><script src="/theme.js?v=6" defer></script>''' + visual_assets + '''</head>
<body class="writing-page"><a class="skip-link" href="#main">跳到正文</a><header class="writing-header writing-width"><a class="writing-brand" href="/">Denis Wen<span class="writing-brand-sub"> / 文章与笔记</span></a><div class="writing-controls"><a href="/">首页 ↗</a>''' + theme + '''</div></header><main class="writing-width writing-main" id="main">''' + body + '''</main><footer class="writing-footer writing-width"><a href="/">← 返回主页</a><span>保持好奇，持续探索。</span><a href="https://github.com/biubiuqiu" target="_blank" rel="noopener noreferrer">GitHub ↗</a></footer></body></html>'''

    rows = []
    for post in sorted(posts, key=lambda p: p['date'], reverse=True):
        rows.append('<li><time datetime="' + post['date'] + '">' + post['date'] + '</time><div><span class="post-category">' + html.escape(post['category']) + '</span><h2><a href="/writing/' + post['slug'] + '/">' + html.escape(post['title']) + '</a></h2><p>' + html.escape(post['excerpt']) + '</p></div></li>')
    intro = '<p class="writing-eyebrow">WRITING / 技术与实践</p><h1>文章与笔记</h1><p class="writing-intro">记录遇到的问题、尝试过的办法，以及逐渐形成的判断。</p><p class="writing-archive-note">技术研究与旧文整理 · 日期按首次发表时间标注 · 文章语言：中文</p><ul class="archive-rows">' + ''.join(rows) + '</ul>'
    routes = ['writing/']
    target = root / 'writing/index.html'
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(shell('文章与笔记', 'Denis Wen 的 Agent 研究、技术实践与问题排查记录。', 'writing/', intro))
    for post in posts:
        content = (root / 'src/posts' / (post['slug'] + '.html')).read_text()
        is_research = post.get('kind') == 'research'
        post_type = '文档与源码研究' if is_research else '旧文整理'
        date_label = '发表于 ' if is_research else '原文发表于 '
        metadata = '<nav class="article-breadcrumb" aria-label="面包屑"><a href="/">首页</a><span aria-hidden="true">/</span><a href="/writing/">文章与笔记</a></nav><header class="article-header"><p class="writing-eyebrow">' + html.escape(post['category']) + ' / ' + post_type + '</p><h1>' + html.escape(post['title']) + '</h1><p class="article-date">' + date_label + '<time datetime="' + post['original_datetime'] + '">' + post['date'] + '</time><span> · Denis Wen</span></p><p class="article-context">' + html.escape(post['context']) + '</p></header>'
        notice = '<aside class="article-notice"><strong>关于这篇旧文</strong><p>日期沿用原博客。本文保留当时的实践过程，整理了结构并补充适用范围说明，移除了具体环境信息和外部截图。原题：' + html.escape(post['original_title']) + '。文中的示例不代表已经按当前环境重新验证。</p></aside>'
        if is_research:
            notice = ''
        related = '<nav class="article-related" aria-label="更多文章"><h2>继续阅读</h2>' + ''.join('<a href="/writing/' + other['slug'] + '/">' + html.escape(other['title']) + ' →</a>' for other in posts if other != post) + '<a href="/writing/">全部文章 →</a></nav>'
        body = metadata + '<article class="article-body">' + content + '</article>' + notice + related
        path = 'writing/' + post['slug'] + '/'
        target = root / path / 'index.html'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(shell(post['title'], post['excerpt'], path, body))
        routes.append(path)
    return routes

