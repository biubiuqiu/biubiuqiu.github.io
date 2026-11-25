"""Build the personal photography index using the originals and home photo catalogues."""
from html import escape
import json
from pathlib import Path

LANGS = ("zh-CN", "en", "ja")


def album_content(root, language, count_format):
    archive = json.loads((root / "src/albums.json").read_text())
    directory = root / "assets/hiking"
    photos = {}
    for photo in json.loads((root / "src/photos.json").read_text()):
        photos[Path(photo["file"]).stem] = (photo["file"], photo["full"], photo["width"], photo["height"], photo[language])
    manifest = json.loads((directory / "originals/manifest.json").read_text())
    for photo in manifest["images"]:
        key = Path(photo["file"]).stem
        caption = archive["original_captions"][key][LANGS.index(language)]
        photos[key] = (f"reading/{key}.webp", "originals/" + photo["file"], photo["width"], photo["height"], caption)

    sections, links, shown = [], [], []
    for group in archive["groups"]:
        anchor, title = group["id"], escape(group[language])
        count = sum(map(len, group["rows"]))
        links.append(f'<a href="#{anchor}">{title}</a>')
        sections.append(f'<section id="{anchor}" class="album-group interest-story" aria-labelledby="{anchor}-title"><header><h2 class="interest-title" id="{anchor}-title">{title}</h2><span>{count_format.format(count=count)}</span></header>')
        for row in group["rows"]:
            sections.append('<div class="album-row">')
            for key in row:
                preview, full, width, height, caption = photos[key]
                if not all((directory / path).is_file() for path in (preview, full)):
                    raise ValueError(f"Missing photograph or preview for {key}")
                loading = 'fetchpriority="high"' if not shown else 'loading="lazy"'
                shown.append(key)
                caption = escape(caption)
                sections.append(f'<figure style="--ratio:{width/height:.5f}"><a class="photo-link" href="/assets/hiking/{full}" data-caption="{caption}"><img src="/assets/hiking/{preview}" width="{width}" height="{height}" {loading} decoding="async" alt="{caption}"></a><figcaption>{caption}</figcaption></figure>')
            sections.append('</div>')
        sections.append('</section>')
    if sorted(shown) != sorted(photos):
        raise ValueError("Each personal photograph must appear in exactly one album")
    return {"album_sections":"\n".join(sections), "album_links":"\n".join(links), "album_count":count_format.format(count=len(shown))}
