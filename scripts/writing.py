"""Build the writing archive, article metadata, accessible TOCs and Atom feed.
Standard library only. Publication dates are never inferred from build time.
"""
import html
import json
import math
import re
from html.parser import HTMLParser
from pathlib import Path
import xml.etree.ElementTree as ET

E = html.escape
VOID = {'area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'}

class Outline(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.offsets = [0]
        for m in re.finditer('\n', source): self.offsets.append(m.end())
        self.stack, self.headings, self.text, self.current = [], [], [], None
    def position(self):
        line, col = self.getpos()
        return self.offsets[line-1] + col
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        excluded = any(t in ('figure','pre','nav','button','script','style') or c.intersection({'tool-map','sandbox-overview','demo-jumps'}) for t,c in self.stack)
        if tag in ('h2','h3') and not excluded:
            self.current = {'tag':tag,'id':attrs.get('id'),'start':self.position(),'text':[],'opening':self.get_starttag_text()}
        if tag not in VOID: self.stack.append((tag,set(attrs.get('class','').split())))
    def handle_startendtag(self, tag, attrs): pass
    def handle_endtag(self, tag):
        if self.current and tag == self.current['tag']:
            self.current['end'] = self.position() + len('</'+tag+'>')
            self.current['label'] = ''.join(self.current.pop('text')).strip()
            self.headings.append(self.current)
            self.current = None
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break
    def handle_data(self, data):
        if self.current: self.current['text'].append(data)
        if not any(t in ('nav','button','script','style','pre') for t,c in self.stack): self.text.append(data)


def enrich(content):
    content = re.sub(r'<nav\b[^>]*class="article-toc"[^>]*>.*?</nav>', '', content, flags=re.S)
    parser = Outline(content); parser.feed(content)
    used = set(re.findall(r'\bid="([^"]+)"',content))
    for i,h in enumerate(parser.headings):
        if not h['id']:
            ident = 'section-'+str(i+1)
            while ident in used: ident += '-heading'
            h['id']=ident;used.add(ident)
    for h in reversed(parser.headings):
        old=content[h['start']:h['end']]
        opening=h['opening']
        if 'id=' not in opening: opening=opening[:-1]+' id="'+h['id']+'">'
        suffix='<a class="heading-anchor" href="#'+E(h['id'],quote=True)+'" aria-label="链接到：'+E(h['label'],quote=True)+'">#</a>'
        content=content[:h['start']]+opening+old[len(h['opening']):-len('</'+h['tag']+'>')]+suffix+'</'+h['tag']+'>'+content[h['end']:]
    text=' '.join(parser.text)
    # Mixed-language count: one CJK character or one Latin/number word is a unit.
    count=len(re.findall(r'[\u3400-\u9fff\u3040-\u30ff]|[A-Za-z0-9]+(?:[\x27-][A-Za-z0-9]+)*',text))
    return content,parser.headings,count,max(1,math.ceil(count/300))


def load_posts(root):
    posts=json.loads((root/'src/posts.json').read_text())
    for p in posts:
        if not p['original_datetime'].startswith(p['date']): raise ValueError('Original publication date mismatch')
        raw=(root/'src/posts'/(p['slug']+'.html')).read_text()
        p['content'],p['headings'],p['words'],p['minutes']=enrich(raw)
        if not (root/p['cover'].lstrip('/')).is_file(): raise ValueError('Missing cover')
        if not (root/p.get('banner',p['cover']).lstrip('/')).is_file(): raise ValueError('Missing banner')
        for key in ('thumbnail', 'mobile_banner'):
            if p.get(key) and not (root / p[key].lstrip('/')).is_file():
                raise ValueError(f"Missing {key} for {p['slug']}")
    return sorted(posts,key=lambda p:(p['date'],p['slug']),reverse=True)


def tags_for(p):
    return '<div class="post-tags">'+''.join('<a class="glass-control" href="/writing/?tag='+E(t,quote=True)+'"># '+E(t)+'</a>' for t in p['tags'])+'</div>'


def title_phrases(title, class_name):
    parts = re.split(r'(?<=[？：])', title, maxsplit=1)
    return '<wbr>'.join(f'<span class="{class_name}">{E(part)}</span>' for part in parts if part)


def featured_writing(posts):
    rows=[]
    for p in posts[:3]:
        rows.append('<li><time datetime="'+p['date']+'">'+p['date']+'</time><div><a href="/writing/'+p['slug']+'/" lang="zh-CN">'+E(p['title'])+'<span aria-hidden="true"> ↗</span></a><p lang="zh-CN">'+E(p['excerpt'])+'</p><small class="featured-read-meta" lang="zh-CN">'+str(p['minutes'])+' 分钟阅读 · '+format(p['words'],',')+' 字</small></div></li>')
    return '<ul class="writing-rows">'+''.join(rows)+'</ul>'


def build_writing(root,base_url,theme_menu_for,copy,posts):
    bootstrap=(root/'src/theme-init.js').read_text();theme=theme_menu_for(copy)
    def shell(title,description,path,body,post=None,hero=''):
        extras=''
        if post:
            slug=post['slug']
            assets={'agent-context-management':(['context-demos'],['context-demos']), 'agent-tool-design':(['context-demos','tool-demos','parameter-demos'],['tool-demos','parameter-demos']), 'agent-sandbox-workspace':(['context-demos','sandbox-demos'],['sandbox-demos']), 'agent-sandbox-economics':(['sandbox-capacity'],['sandbox-capacity'])}
            css,js=assets.get(slug,([],[]))
            extras=''.join('<link rel="stylesheet" href="/'+x+'.css?v=1">' for x in css)+''.join('<script src="/'+x+'.js?v=1" defer></script>' for x in js)
            schema={'@context':'https://schema.org','@type':'BlogPosting','headline':post['title'],'description':description,'datePublished':post['date'],'author':{'@type':'Person','name':'Denis Wen','url':base_url},'mainEntityOfPage':base_url+path,'image':base_url.rstrip('/')+post['cover'],'wordCount':post['words'],'timeRequired':'PT'+str(post['minutes'])+'M','inLanguage':'zh-CN','keywords':post['tags']}
            if post.get('updated'): schema['dateModified']=post['updated']
            extras+='<meta property="article:published_time" content="'+post['date']+'"><meta property="article:author" content="Denis Wen"><meta property="og:image" content="'+base_url.rstrip('/')+post['cover']+'"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<','\\u003c')+'</script>'
        nav = ('<nav class="liquid-nav writing-nav" aria-label="文章导航">'
               '<canvas class="liquid-optics" aria-hidden="true"></canvas>'
               '<span class="liquid-lens" aria-hidden="true"><canvas></canvas></span>'
               '<a class="writing-index-link" href="/writing/"'+('' if post else ' aria-current="page"')+'>文章</a>'
               '<a href="/atom.xml" aria-label="订阅 Atom RSS">RSS</a></nav>')
        return '<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#ffffff"><title>'+E(title)+' — Denis Wen</title><meta name="description" content="'+E(description,quote=True)+'"><link rel="canonical" href="'+base_url+path+'"><meta property="og:type" content="'+('article' if post else 'website')+'"><meta property="og:title" content="'+E(title,quote=True)+'"><meta property="og:description" content="'+E(description,quote=True)+'"><meta property="og:url" content="'+base_url+path+'"><link rel="alternate" type="application/atom+xml" title="Denis Wen 的文章" href="/atom.xml"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><script>'+bootstrap+'</script><link rel="stylesheet" href="/styles.css?v=18"><link rel="stylesheet" href="/writing.css?v=10"><link rel="stylesheet" href="/liquid-nav.css?v=3"><script src="/liquid-nav.js?v=3" defer></script><script src="/theme.js?v=6" defer></script><script src="/writing.js?v=4" defer></script>'+extras+'</head><body class="writing-page '+('post-page' if post else 'archive-page')+'"><a class="skip-link" href="#main">跳到正文</a><header class="writing-header writing-width"><a class="writing-brand" href="/" aria-label="Denis Wen 首页">Denis Wen<span class="writing-brand-sub"> / 文章与笔记</span></a><div class="writing-controls">'+nav+theme+'</div></header>'+hero+'<main class="writing-width writing-main" id="main">'+body+'</main><footer class="writing-footer writing-width"><a href="/">← 返回主页</a><span>© Denis Wen · 保持好奇，持续探索。</span><a href="/atom.xml">RSS 订阅 ↗</a></footer><p class="writing-toast" role="status" aria-live="polite"></p></body></html>'
    def card(p):
        image = E(p.get('thumbnail', p['cover']), quote=True)
        return (f'<a class="related-card" href="/writing/{p["slug"]}/">'
                f'<img src="{image}" alt="" width="480" height="360" loading="lazy" decoding="async">'
                f'<span>{E(p["category"])} · {p["minutes"]} 分钟</span><strong>{E(p["title"])}</strong></a>')

    categories = sorted({p['category'] for p in posts})
    tags = sorted({tag for p in posts for tag in p['tags']})
    category_options = ''.join(f'<option>{E(c)}</option>' for c in categories)
    tag_options = ''.join(f'<option>{E(t)}</option>' for t in tags)
    filters = f'''<form class="archive-filters" id="archive-search" role="search" hidden>
      <div class="filter-bar">
        <label class="archive-search"><span class="sr-only">搜索文章</span>
          <input type="search" name="q" placeholder="搜索标题、摘要或标签" enterkeyhint="search" autocomplete="off">
        </label>
        <button type="button" class="filter-toggle glass-control" aria-expanded="false" aria-controls="archive-options">
          <span class="filter-adjust" aria-hidden="true"></span>筛选<span class="filter-count" hidden></span>
        </button>
      </div>
      <div class="filter-panel" id="archive-options" hidden>
        <div class="filter-field"><span class="filter-label" id="category-label">分类</span>
          <select name="category" aria-labelledby="category-label"><option value="">全部分类</option>{category_options}</select></div>
        <div class="filter-field"><span class="filter-label" id="tag-label">标签</span>
          <select name="tag" aria-labelledby="tag-label"><option value="">全部标签</option>{tag_options}</select></div>
      </div>
    </form>
    <div class="archive-state">
      <p class="archive-result" role="status" aria-live="polite" aria-atomic="true">共 {len(posts)} 篇文章</p>
      <button class="filter-clear" type="reset" form="archive-search" hidden>清除条件</button>
    </div>'''
    rows = []
    for p in posts:
        slug = p['slug']
        search = E(' '.join([p['title'], p['excerpt'], p['category'], *p['tags']]), quote=True)
        category = E(p['category'], quote=True)
        card_tags = E(json.dumps(p['tags'], ensure_ascii=False), quote=True)
        image = E(p.get('thumbnail', p['cover']), quote=True)
        rows.append(f'''<li class="archive-card" data-search="{search}" data-category="{category}" data-tags="{card_tags}">
          <div class="card-meta"><span class="card-category">{category}</span><time datetime="{p["date"]}">{p["date"]}</time>
            <span>{p["minutes"]} 分钟阅读<span class="card-words"> · {p["words"]:,} 字</span></span></div>
          <div class="archive-entry">
            <h2><a href="/writing/{slug}/">{title_phrases(p["title"], "card-title-phrase")}</a></h2>
            <p>{E(p["excerpt"])}</p>
            <img class="archive-thumb" src="{image}" alt="" width="480" height="360" loading="lazy" decoding="async">
          </div>
          {tags_for(p)}
        </li>''')
    intro = ('<div class="archive-intro"><h1>文章与笔记</h1>'
             '<p class="writing-intro">记录遇到的问题、尝试过的办法，以及逐渐形成的判断。</p></div>'
             + filters + '<ul class="archive-grid">' + ''.join(rows) + '</ul>'
             '<div class="archive-empty" hidden><p>没有找到匹配的文章</p>'
             '<button type="reset" form="archive-search">查看全部文章</button></div>')
    routes=['writing/'];target=root/'writing/index.html';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(shell('文章与笔记','Denis Wen 的 Agent 研究、技术实践与问题排查记录。','writing/',intro))
    for index,p in enumerate(posts):
        is_research=p.get('kind')=='research'
        toc=[];section=0;sub=0
        for h in p['headings']:
            if h['tag']=='h2':section+=1;sub=0;num=str(section).zfill(2)
            else:sub+=1;num=str(section)+'.'+str(sub)
            label=re.sub(r'^(?:[一二三四五六七八九十]+、|\d+(?:\.\d+)*[.、]?\s+)\s*','',h['label'])
            toc.append('<li class="toc-'+h['tag']+'"><a class="glass-row" href="#'+E(h['id'],quote=True)+'"><span class="toc-number">'+num+'</span><span>'+E(label)+'</span></a></li>')
        sidebar='<aside class="reading-sidebar"><details class="toc-panel glass-panel" open><summary><span>文章目录</span><span class="toc-mobile-progress">0%</span><span class="toc-chevron" aria-hidden="true">⌄</span></summary><div class="toc-content"><p class="toc-current">从第一节开始阅读</p><nav aria-label="文章目录"><ol>'+''.join(toc)+'</ol></nav><div class="reading-status"><div><span>阅读进度</span><strong data-progress-text>0%</strong></div><progress max="100" value="0" aria-label="文章阅读进度"></progress><span data-remaining>预计 '+str(p['minutes'])+' 分钟</span></div><div class="toc-actions"><a href="/writing/">← 全部文章</a><a href="#article-top">↑ 回到顶部</a></div></div></details></aside>'
        updated='<span>更新 <time datetime="'+p['updated']+'">'+p['updated']+'</time></span>' if p.get('updated') else ''
        hero_title = title_phrases(p['title'], 'hero-title-part')
        banner=p.get('banner',p['cover'])
        photo = '<img class="post-hero-photo" src="'+E(banner,quote=True)+'" alt="'+E(p.get('banner_alt',p['cover_alt']),quote=True)+'" style="object-position:'+E(p.get('banner_position','center'),quote=True)+'" width="1536" height="1024" fetchpriority="high">'
        source = (f'<source media="(max-width: 700px)" type="image/webp" srcset="{E(p["mobile_banner"], quote=True)}">'
                  if p.get('mobile_banner') else '')
        picture = f'<picture class="post-hero-media">{source}{photo}</picture>'
        hero='<header class="post-hero" id="article-top">'+picture+'<div class="post-hero-shade" aria-hidden="true"></div><div class="article-header post-hero-content"><p class="writing-eyebrow">'+E(p['category'])+' / '+('文档与源码研究' if is_research else '旧文整理')+'</p><h1>'+hero_title+'</h1><div class="article-meta"><span>'+('发表于 ' if is_research else '原文发表于 ')+'<time datetime="'+p['original_datetime']+'">'+p['date']+'</time></span><span aria-hidden="true">·</span><span title="按每分钟约 300 字估算；动画和代码实践时间另计">约 '+str(p['minutes'])+' 分钟阅读</span></div>'+tags_for(p)+'</div></header>'
        byline = ('<div class="post-byline"><a href="/">Denis Wen</a>'
                  f'<span>{p["words"]:,} 字</span>{updated}</div>')
        metadata='<div class="article-intro"><nav class="article-breadcrumb" aria-label="面包屑"><a href="/">首页</a><span aria-hidden="true">/</span><a href="/writing/">文章与笔记</a><span aria-hidden="true">/</span><a href="/writing/?category='+E(p['category'],quote=True)+'">'+E(p['category'])+'</a></nav><p class="article-context">'+E(p['context'])+'</p>'+byline+'<div class="reading-resume" hidden><span>上次读到 <strong></strong></span><button type="button" data-resume>继续阅读 →</button><button type="button" data-dismiss-resume aria-label="忽略上次阅读位置">×</button></div></div>'
        notice='' if is_research else '<aside class="article-notice"><strong>关于这篇旧文</strong><p>日期沿用原博客。本文保留当时的实践过程，整理了结构并补充适用范围说明，移除了具体环境信息和外部截图。原题：'+E(p['original_title'])+'。文中的示例不代表已经按当前环境重新验证。</p></aside>'
        canonical=base_url+'writing/'+p['slug']+'/'
        end='<section class="article-end"><p class="end-mark">— 全文完 —</p><div class="article-attribution"><strong>Denis Wen</strong><p>保持好奇，持续探索。记录 Agent、工程实践，以及沿途的思考。</p><small>本文链接</small><a class="canonical-link" href="'+canonical+'">'+canonical+'</a><p class="copyright-note">© Denis Wen · 转载文字请注明作者与原文链接；文中引用内容归原作者所有。</p></div><div class="article-share"><button type="button" data-copy-link>复制文章链接 ↗</button><button type="button" data-share>分享文章</button><a href="#article-top">回到顶部 ↑</a></div></section>'
        prev=posts[index+1] if index+1<len(posts) else None;nextp=posts[index-1] if index else None
        pager='<nav class="article-pagination" aria-label="上一篇与下一篇">'+('' if not prev else '<a href="/writing/'+prev['slug']+'/"><span>← 上一篇 · 较早</span><strong>'+E(prev['title'])+'</strong></a>')+('' if not nextp else '<a href="/writing/'+nextp['slug']+'/"><span>下一篇 · 较新 →</span><strong>'+E(nextp['title'])+'</strong></a>')+'</nav>'
        candidates=sorted([q for q in posts if q!=p],key=lambda q:(len(set(q['tags'])&set(p['tags'])),q['date']),reverse=True)[:3]
        related='<section class="article-related"><div class="related-heading"><h2>继续阅读</h2><a href="/writing/">全部文章 ↗</a></div><div class="related-grid">'+''.join(card(q) for q in candidates)+'</div></section>'
        body='<div class="reading-progress-track" aria-hidden="true"><span></span></div><div class="article-layout">'+sidebar+'<div class="article-column" data-reading-minutes="'+str(p['minutes'])+'">'+metadata+'<article class="article-body" aria-label="文章正文">'+p['content']+'</article>'+notice+end+pager+related+'</div></div>'
        path='writing/'+p['slug']+'/';target=root/path/'index.html';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(shell(p['title'],p['excerpt'],path,body,p,hero));routes.append(path)
    ns='http://www.w3.org/2005/Atom';ET.register_namespace('',ns)
    feed=ET.Element('{'+ns+'}feed')
    def node(parent,name,text=None,**attrs):
        x=ET.SubElement(parent,'{'+ns+'}'+name,attrs);x.text=text;return x
    node(feed,'title','Denis Wen · 文章与笔记');node(feed,'id',base_url+'writing/');node(feed,'link',href=base_url+'writing/');node(feed,'link',href=base_url+'atom.xml',rel='self');node(feed,'updated',max(p.get('updated',p['date']) for p in posts)+'T00:00:00+08:00')
    author=node(feed,'author');node(author,'name','Denis Wen')
    for p in posts:
        item=node(feed,'entry');url=base_url+'writing/'+p['slug']+'/'
        node(item,'title',p['title']);node(item,'id',url);node(item,'link',href=url);node(item,'published',p['date']+'T00:00:00+08:00');node(item,'updated',p.get('updated',p['date'])+'T00:00:00+08:00');node(item,'summary',p['excerpt'])
        for t in p['tags']:node(item,'category',term=t)
    ET.ElementTree(feed).write(root/'atom.xml',encoding='utf-8',xml_declaration=True)
    return routes
