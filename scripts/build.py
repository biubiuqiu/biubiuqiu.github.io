#!/usr/bin/env python3
"""Render all locale pages with Python's standard library."""
from __future__ import annotations

import hashlib
import html
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
from albums import album_content
from demo_locales import build_demo_locales
from writing import featured_writing, build_writing, load_posts, title_phrases

ROOT = Path(__file__).resolve().parents[1]
BASE_URL = "https://biubiuqiu.github.io/"
LANGUAGES = {
    "zh-CN": {"label": "中文", "path": "", "og_locale": "zh_CN"},
    "en": {"label": "English", "path": "en", "og_locale": "en_US"},
    "ja": {"label": "日本語", "path": "ja", "og_locale": "ja_JP"},
}
TOKENS = re.compile(r"\{\{([a-z_0-9]+)\}\}")
RAW_KEYS = {"alternates", "og_alternates", "locale_menu", "theme_menu", "theme_bootstrap", "hiking_gallery", "featured_writing", "latest_title", "album_sections", "album_links", "album_alternates"}
SYSTEM_KEYS = RAW_KEYS | {"lang", "canonical", "asset_prefix", "og_locale", "latest_slug", "latest_excerpt", "latest_read_time", "album_count", "album_path", "album_canonical", "home_path"}


def url_for(language: str) -> str:
    path = LANGUAGES[language]["path"]
    return BASE_URL + (path + "/" if path else "")


def menu_for(current: str, copy: dict[str, str], suffix: str = "") -> str:
    label = html.escape(LANGUAGES[current]["label"])
    accessible = html.escape(copy["switch_label"] + ": " + LANGUAGES[current]["label"], quote=True)
    lines = [
        '          <details class="language-switcher">',
        f'            <summary aria-label="{accessible}"><span>{label}</span><span class="icon icon-caret language-chevron" aria-hidden="true"></span></summary>',
        '            <div class="language-menu">',
    ]
    for language, meta in LANGUAGES.items():
        path = "/" + (meta["path"] + "/" if meta["path"] else "")
        path += suffix
        active = ' aria-current="page"' if language == current else ""
        lines.append(
            f'              <a href="{path}" lang="{language}" hreflang="{language}"{active}>{html.escape(meta["label"])}</a>'
        )
    lines.extend(['            </div>', '          </details>'])
    return "\n".join(lines)


def theme_menu_for(copy: dict[str, str]) -> str:
    accessible = html.escape(copy["theme_label"], quote=True)
    lines = [
        f'            <details class="theme-switcher" data-theme-control data-theme-menu-label="{accessible}" hidden>',
        f'              <summary aria-label="{accessible}" title="{accessible}"><span class="icon icon-appearance" aria-hidden="true"></span></summary>',
        f'              <div class="theme-menu" role="group" aria-label="{accessible}">',
    ]
    for choice in ("system", "light", "dark"):
        label = html.escape(copy["theme_" + choice])
        lines.append(
            f'                <button type="button" data-theme-choice="{choice}" aria-pressed="false"><span>{label}</span><span class="icon icon-check theme-check" aria-hidden="true"></span></button>'
        )
    lines.extend(['              </div>', '            </details>'])
    return "\n".join(lines)


def gallery_for(language, copy):
    prefix = "../" if LANGUAGES[language]["path"] else "./"
    items = json.loads((ROOT / "src" / "photos.json").read_text())
    items.sort(key=lambda item: item["file"] != "img_2146.webp")
    rows = ['<section class="hiking-gallery" id="hiking-photos" aria-label="'+html.escape(copy["gallery_title"],quote=True)+'">', '<p class="sr-only">'+html.escape(copy["gallery_hint"])+'</p>']
    for i, item in enumerate(items):
        caption = html.escape(item[language], quote=True)
        path = prefix + "assets/hiking/" + item["file"]
        full_path = prefix + "assets/hiking/" + item.get("full", item["file"])
        srcset = f' srcset="{path} {item["width"]}w, {full_path} {item["full_width"]}w" sizes="(max-width: 680px) 100vw, 65vw"' if i == 0 and item.get("full") else ""
        if i == 1:
            rows.append('<div class="photo-thumbnails">')
        kind = "featured-photo" if i == 0 else "thumbnail-photo"
        rows.append(f'<a class="photo-link {kind}" href="{full_path}" data-caption="{caption}"><figure><img src="{path}"{srcset} alt="{caption}" width="{item["width"]}" height="{item["height"]}" loading="lazy" decoding="async"><figcaption class="sr-only">{caption}</figcaption></figure></a>')
    if len(items) > 1:
        rows.append('</div>')
    rows.append('</section>')
    return "\n".join(rows)


def build() -> None:
    image_manifest = json.loads((ROOT / "scripts/image-quality-manifest.json").read_text(encoding="utf-8"))
    for image in image_manifest["files"]:
        path = ROOT / image["path"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != image["sha256"]:
            raise ValueError(f"Full-resolution image checksum mismatch: {image['path']}")

    template = (ROOT / "src" / "template.html").read_text(encoding="utf-8")
    viewer = (ROOT / "src/viewer.html").read_text().rstrip()
    template = template.replace("{{viewer}}", viewer)
    album_template = (ROOT / "src/album.html").read_text().replace("{{viewer}}", viewer)
    translations = json.loads((ROOT / "src" / "locales.json").read_text(encoding="utf-8"))
    writing_ui = json.loads((ROOT / "src/writing/ui.json").read_text())
    writing_routes = []
    build_demo_locales(ROOT)
    required = (set(TOKENS.findall(template + album_template)) - SYSTEM_KEYS) | {"gallery_hint", "switch_label", "theme_label", "theme_system", "theme_light", "theme_dark", "read_time_format", "album_count_format"}
    if set(translations) != set(LANGUAGES):
        raise ValueError("Translations and configured language routes must match")
    for language, meta in LANGUAGES.items():
        copy = translations[language]
        ui = writing_ui[language]
        home = "/" + (meta["path"] + "/" if meta["path"] else "")
        posts = load_posts(ROOT, language, ui)
        latest = posts[0]
        if set(copy) != required:
            raise ValueError(f"{language}: missing={required - set(copy)}, extra={set(copy) - required}")
        if not all(isinstance(value, str) and value for value in copy.values()):
            raise ValueError(f"{language}: translations must be non-empty strings")
        alternates = [
            f'    <link rel="alternate" hreflang="{other}" href="{url_for(other)}">'
            for other in LANGUAGES
        ]
        alternates.append(f'    <link rel="alternate" hreflang="x-default" href="{BASE_URL}">')
        og_alternates = [
            f'    <meta property="og:locale:alternate" content="{other_meta["og_locale"]}">'
            for other, other_meta in LANGUAGES.items() if other != language
        ]
        values = {
            **copy,
            "lang": language,
            "home_path": home,
            "album_path": url_for(language).removeprefix(BASE_URL.rstrip("/")) + "gallery/",
            "canonical": url_for(language),
            "asset_prefix": "../" if meta["path"] else "./",
            "og_locale": meta["og_locale"],
            "alternates": "\n".join(alternates),
            "og_alternates": "\n".join(og_alternates),
            "locale_menu": menu_for(language, copy),
            "theme_menu": theme_menu_for(copy),
            "hiking_gallery": gallery_for(language, copy),
            "featured_writing": featured_writing(posts[1:], home, ui),
            "latest_slug": latest["slug"],
            "latest_title": title_phrases(latest["title"], "card-title-phrase"),
            "latest_excerpt": re.split(r"(?<=[。！？])|(?<=[.!?])\s+", latest["excerpt"], maxsplit=1)[0],
            "latest_read_time": copy["read_time_format"].format(minutes=latest["minutes"]),
            "theme_bootstrap": (ROOT / "src" / "theme-init.js").read_text(encoding="utf-8"),
        }
        def substitute(match: re.Match[str]) -> str:
            key = match.group(1)
            return values[key] if key in RAW_KEYS else html.escape(values[key], quote=True)
        page = TOKENS.sub(substitute, template)
        if "{{" in page or "}}" in page:
            raise ValueError(f"{language}: unresolved template placeholder")
        output = ROOT / meta["path"] / "index.html"
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(page, encoding="utf-8")
        values.update(album_content(ROOT, language, copy["album_count_format"]))
        values.update(
            album_canonical=url_for(language) + "gallery/",
            album_alternates="\n".join(
                f'<link rel="alternate" hreflang="{other}" href="{url_for(other)}gallery/">'
                for other in LANGUAGES
            ),
            locale_menu=menu_for(language, copy, "gallery/"),
        )
        album_dir = output.parent / "gallery"
        album_dir.mkdir(exist_ok=True)
        (album_dir / "index.html").write_text(TOKENS.sub(substitute, album_template), encoding="utf-8")
        print(f"Built {output.relative_to(ROOT)} ({language})")
        writing_routes.extend(build_writing(ROOT, BASE_URL, language, LANGUAGES, menu_for, theme_menu_for, copy, ui, posts))
    namespace = "http://www.sitemaps.org/schemas/sitemap/0.9"
    ET.register_namespace("", namespace)
    sitemap = ET.Element(f"{{{namespace}}}urlset")
    for language in LANGUAGES:
        for suffix in ("", "gallery/"):
            item = ET.SubElement(sitemap, f"{{{namespace}}}url")
            ET.SubElement(item, f"{{{namespace}}}loc").text = url_for(language) + suffix
    for route in writing_routes:
        item = ET.SubElement(sitemap, f"{{{namespace}}}url")
        ET.SubElement(item, f"{{{namespace}}}loc").text = BASE_URL + route
    ET.ElementTree(sitemap).write(ROOT / "sitemap.xml", encoding="utf-8", xml_declaration=True)


if __name__ == "__main__":
    build()



