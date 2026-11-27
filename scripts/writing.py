"""Build the writing archive, article metadata, accessible TOCs and Atom feed.
Standard library only. Publication dates are never inferred from build time.
"""
import html
import json
import math
import re
from html.parser import HTMLParser
from urllib.parse import quote
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


def enrich(content, anchor_label, reading_rate):
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
        suffix='<a class="heading-anchor" href="#'+E(h['id'],quote=True)+'" aria-label="'+E(anchor_label + h['label'],quote=True)+'">#</a>'
        content=content[:h['start']]+opening+old[len(h['opening']):-len('</'+h['tag']+'>')]+suffix+'</'+h['tag']+'>'+content[h['end']:]
    text=' '.join(parser.text)
    # Mixed-language count: one CJK character or one Latin/number word is a unit.
    count=len(re.findall(r'[\u3400-\u9fff\u3040-\u30ff]|[A-Za-z0-9]+(?:[\x27-][A-Za-z0-9]+)*',text))
    return content,parser.headings,count,max(1,math.ceil(count/reading_rate))


def load_posts(root, language, ui):
    posts=json.loads((root/'src/posts.json').read_text())
    directory = root / "src/posts"
    if language != "zh-CN":
        directory /= language
        metadata = json.loads((directory / "metadata.json").read_text())
        if set(metadata) != {p["slug"] for p in posts}:
            raise ValueError(f"Incomplete article metadata: {language}")
        for p in posts:
            p.update(metadata[p["slug"]])
    for p in posts:
        if not p['original_datetime'].startswith(p['date']): raise ValueError('Original publication date mismatch')
        raw=(directory/(p['slug']+'.html')).read_text()
        if language != "zh-CN":
            raw = raw.replace('href="/writing/', f'href="/{language}/writing/')
        p['content'],p['headings'],p['words'],p['minutes']=enrich(raw, ui["anchor"], 220 if language == "en" else 300)
        if not (root/p['cover'].lstrip('/')).is_file(): raise ValueError('Missing cover')
        if not (root/p.get('banner',p['cover']).lstrip('/')).is_file(): raise ValueError('Missing banner')
        for key in ('thumbnail', 'mobile_banner'):
            if p.get(key) and not (root / p[key].lstrip('/')).is_file():
                raise ValueError(f"Missing {key} for {p['slug']}")
    return sorted(posts,key=lambda p:(p['date'],p['slug']),reverse=True)


def tags_for(p, home, *, on_photo=False):
    attributes = ' class="glass-control"' if on_photo else ''
    return '<div class="post-tags">'+''.join('<a'+attributes+' href="'+home+'writing/?tag='+quote(t,safe='')+'"># '+E(t)+'</a>' for t in p['tags'])+'</div>'


def title_phrases(title, class_name, separator='<wbr>'):
    parts = re.split(r'(?<=[？：])|(?<=[:?])\s+', title, maxsplit=1)
    return separator.join(f'<span class="{class_name}">{E(part)}</span>' for part in parts if part)


def featured_writing(posts, home, ui):
    rows = []
    for p in posts[:3]:
        meta = ui["read_time"].format(n=p["minutes"]) + " · " + ui["units"].format(n=f'{p["words"]:,}')
        rows.append(f'<li><time datetime="{p["date"]}">{p["date"]}</time><div><a href="{home}writing/{p["slug"]}/">{E(p["title"])}<span aria-hidden="true"> ↗</span></a><p>{E(p["excerpt"])}</p><small class="featured-read-meta">{E(meta)}</small></div></li>')
    return '<ul class="writing-rows">'+''.join(rows)+'</ul>'


def build_writing(root, base_url, language, locales, menu_for, theme_menu_for, copy, ui, posts):
    home = "/" + (locales[language]["path"] + "/" if locales[language]["path"] else "")
    output = root / locales[language]["path"]
    origin = base_url.rstrip("/")
    locale_base = origin + home
    templates = {name: (root / "src/writing" / (name + ".html")).read_text() for name in ("article", "filters", "page")}
    common = {k: E(v) for k, v in (copy | ui).items()}
    bootstrap = (root / "src/theme-init.js").read_text()
    theme = theme_menu_for(copy)
    def shell(title,description,path,body,post=None,hero=''):
        extras = '<link rel="stylesheet" href="/archive-filter.css?v=1">'
        if post:
            slug=post['slug']
            assets={'agent-context-management':(['context-demos'],['context-demos']), 'agent-tool-design':(['context-demos','tool-demos','parameter-demos'],['tool-demos','parameter-demos']), 'agent-sandbox-workspace':(['context-demos','sandbox-demos'],['sandbox-demos']), 'agent-sandbox-economics':(['sandbox-capacity'],['sandbox-capacity'])}
            css,js=assets.get(slug,([],[]))
            extras=''.join('<link rel="stylesheet" href="/'+x+'.css?v=1">' for x in css)+''.join('<script src="'+home+x+'.js?v=1" defer></script>' for x in js)
            schema={'@context':'https://schema.org','@type':'BlogPosting','headline':post['title'],'description':description,'datePublished':post['date'],'author':{'@type':'Person','name':'Denis Wen','url':base_url},'mainEntityOfPage':locale_base+path,'image':origin+post['cover'],'wordCount':post['words'],'timeRequired':'PT'+str(post['minutes'])+'M','inLanguage':language,'keywords':post['tags']}
            if post.get('updated'): schema['dateModified']=post['updated']
            extras+='<meta property="article:published_time" content="'+post['date']+'"><meta property="article:author" content="Denis Wen"><meta property="og:image" content="'+origin+post['cover']+'"><meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">'+json.dumps(schema,ensure_ascii=False).replace('<',r'\u003c')+'</script>'
        alternates = [f'<link rel="alternate" hreflang="{lang}" href="{base_url}{(meta["path"] + "/") if meta["path"] else ""}{path}">' for lang, meta in locales.items()]
        alternates.append(f'<link rel="alternate" hreflang="x-default" href="{base_url}{path}">')
        message_keys = "manual_copy link_copied share_copied share_failed copy_code copy_block copied code_copied results matches single_result single_match filter_count filters saved_position estimate remaining finished".split()
        messages = json.dumps({key: ui[key] for key in message_keys}, ensure_ascii=False).replace("<", r"\u003c")
        return templates["page"].format_map(common | dict(lang=language, home=home, title=E(title), description=E(description), canonical=locale_base+path,
            alternates="\n".join(alternates), og_type="article" if post else "website", og_locale=locales[language]["og_locale"],
            bootstrap=bootstrap, messages=messages, extras=extras, kind="post-page" if post else "archive-page",
            index_current="" if post else ' aria-current="page"', locale_menu=menu_for(language, copy, path), theme_menu=theme, hero=hero, body_html=body))
    def card(p):
        image = E(p.get('thumbnail', p['cover']), quote=True)
        return (f'<a class="related-card" href="{home}writing/{p["slug"]}/">'
                f'<img src="{image}" alt="" width="480" height="360" loading="lazy" decoding="async">'
                f'<span>{E(p["category"])} · {ui["minutes"].format(n=p["minutes"])}</span><strong>{E(p["title"])}</strong></a>')

    categories = sorted({p['category'] for p in posts})
    tags = sorted({tag for p in posts for tag in p['tags']})
    category_options = ''.join(f'<option>{E(c)}</option>' for c in categories)
    tag_options = ''.join(f'<option>{E(t)}</option>' for t in tags)
    filters = templates["filters"].format_map(common | dict(category_options=category_options, tag_options=tag_options, initial_count=ui["results"].format(n=len(posts))))
    rows = []
    for index, p in enumerate(posts):
        slug = p['slug']
        search = E(' '.join([p['title'], p['excerpt'], p['category'], *p['tags']]), quote=True)
        category = E(p['category'], quote=True)
        card_tags = E(json.dumps(p['tags'], ensure_ascii=False), quote=True)
        illustration = ''
        introduction = ''
        feature_class = ''
        if index == 0:
            feature_class = ' issue-lead'
            introduction = f'<p>{E(p["excerpt"])}</p>'
            if diagram := p.get('archive_diagram'):
                steps = ''.join(
                    f'<li><strong>{E(step)}</strong><span>{E(detail)}</span></li>'
                    for step, detail in diagram['steps']
                )
                illustration = (f'<figure class="issue-diagram"><figcaption>{E(diagram["title"])}</figcaption>'
                                f'<ol>{steps}</ol></figure>')
            else:
                image = E(p.get('thumbnail', p['cover']), quote=True)
                illustration = f'<img class="issue-photo" src="{image}" alt="" width="480" height="360">'
        rows.append(f'''<li class="archive-card{feature_class}" data-search="{search}" data-category="{category}" data-tags="{card_tags}">
          <div class="card-meta"><span class="card-category">{category}</span><time datetime="{p["date"]}">{p["date"]}</time>
            <span>{ui["read_time"].format(n=p["minutes"])}</span></div>
          <div class="archive-entry">
            <h2><a href="{home}writing/{slug}/">{title_phrases(p["title"], "card-title-phrase")}</a></h2>{introduction}
          </div>
          {tags_for(p, home)}{illustration}
        </li>''')
    intro = (f'<div class="archive-masthead"><h1>{common["writing_title"]}</h1>'
             + filters + '</div><ul class="archive-grid">' + ''.join(rows) + '</ul>'
             + f'<div class="archive-empty" hidden><p>{common["no_matches"]}</p><button type="reset" form="archive-search">{common["show_all"]}</button></div>')
    routes = ["writing/"]
    target = output / "writing/index.html"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(shell(copy["writing_title"], copy["writing_intro"], "writing/", intro))
    for index,p in enumerate(posts):
        is_research=p.get('kind')=='research'
        toc=[];section=0;sub=0
        for h in p['headings']:
            if h['tag']=='h2':section+=1;sub=0;num=str(section).zfill(2)
            else:sub+=1;num=str(section)+'.'+str(sub)
            label=re.sub(r'^(?:[一二三四五六七八九十]+、|\d+(?:\.\d+)*[.、]?\s+)\s*','',h['label'])
            toc.append('<li class="toc-'+h['tag']+'"><a class="glass-row" href="#'+E(h['id'],quote=True)+'"><span class="toc-number">'+num+'</span><span>'+E(label)+'</span></a></li>')
        updated = f'<span>{ui["updated"]} <time datetime="{p["updated"]}">{p["updated"]}</time></span>' if p.get("updated") else ""
        hero_title = title_phrases(p['title'], 'hero-title-part', separator='')
        banner=p.get('banner',p['cover'])
        photo = '<img class="post-hero-photo" src="'+E(banner,quote=True)+'" alt="'+E(p.get('banner_alt',p['cover_alt']),quote=True)+'" style="object-position:'+E(p.get('banner_position','center'),quote=True)+'" width="1536" height="1024" fetchpriority="high">'
        source = (f'<source media="(max-width: 700px)" type="image/webp" srcset="{E(p["mobile_banner"], quote=True)}">'
                  if p.get('mobile_banner') else '')
        picture = f'<picture class="post-hero-media">{source}{photo}</picture>'
        kind = ui["research" if is_research else "archive"]
        date_label = ui["published" if is_research else "original_date"]
        read_time = copy["read_time_format"].format(minutes=p["minutes"])
        hero = (f'<header class="post-hero" id="article-top">{picture}<div class="post-hero-shade" aria-hidden="true"></div>'
                f'<div class="article-header post-hero-content"><p class="writing-eyebrow">{E(p["category"])} / {kind}</p>'
                f'<h1>{hero_title}</h1><div class="article-meta"><span>{date_label} <time datetime="{p["original_datetime"]}">{p["date"]}</time></span>'
                f'<span aria-hidden="true">·</span><span title="{ui["estimate_tip"]}">{read_time}</span></div>{tags_for(p, home, on_photo=True)}</div></header>')
        notice = ""
        if not is_research:
            detail = common["archive_detail"].format(title=E(p["original_title"]))
            notice = f'<aside class="article-notice"><strong>{ui["archive_note"]}</strong><p>{detail}</p></aside>'
        pager = []
        for position, label in ((index+1, "← " + ui["older"]), (index-1, ui["newer"] + " →")):
            if 0 <= position < len(posts):
                other = posts[position]
                pager.append(f'<a href="{home}writing/{other["slug"]}/"><span>{label}</span><strong>{E(other["title"])}</strong></a>')
        candidates=sorted([q for q in posts if q!=p],key=lambda q:(len(set(q['tags'])&set(p['tags'])),q['date']),reverse=True)[:3]
        path = "writing/" + p["slug"] + "/"
        body = templates["article"].format_map(common | dict(outline="".join(toc), initial_time=ui["estimate"].format(n=p["minutes"]), home_name=ui["home"],
            home=home, reading_minutes=p["minutes"], category_url=home+"writing/?category="+quote(p["category"], safe=""), category_name=E(p["category"]),
            context=E(p["context"]), word_count=ui["units"].format(n=f'{p["words"]:,}'), updated_time=updated,
            content=p["content"], notice=notice, canonical=locale_base+path, pager="".join(pager), related_cards="".join(card(q) for q in candidates)))
        target=output/path/'index.html';target.parent.mkdir(parents=True,exist_ok=True);target.write_text(shell(p['title'],p['excerpt'],path,body,p,hero));routes.append(path)
    ns='http://www.w3.org/2005/Atom';ET.register_namespace('',ns)
    feed=ET.Element('{'+ns+'}feed', {'{http://www.w3.org/XML/1998/namespace}lang': language})
    def node(parent,name,text=None,**attrs):
        x=ET.SubElement(parent,'{'+ns+'}'+name,attrs);x.text=text;return x
    node(feed,'title','Denis Wen · '+copy['writing_title']);node(feed,'id',locale_base+'writing/');node(feed,'link',href=locale_base+'writing/');node(feed,'link',href=locale_base+'atom.xml',rel='self');node(feed,'updated',max(p.get('updated',p['date']) for p in posts)+'T00:00:00+08:00')
    author=node(feed,'author');node(author,'name','Denis Wen')
    for p in posts:
        item=node(feed,'entry');url=locale_base+'writing/'+p['slug']+'/'
        node(item,'title',p['title']);node(item,'id',url);node(item,'link',href=url);node(item,'published',p['date']+'T00:00:00+08:00');node(item,'updated',p.get('updated',p['date'])+'T00:00:00+08:00');node(item,'summary',p['excerpt'])
        for t in p['tags']:node(item,'category',term=t)
    ET.ElementTree(feed).write(output/'atom.xml',encoding='utf-8',xml_declaration=True)
    return [home.lstrip("/") + path for path in routes]
