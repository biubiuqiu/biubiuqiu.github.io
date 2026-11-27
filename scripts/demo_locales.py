"""Build localized copies of the existing, dependency-free article demonstrations."""
import json
import re
from pathlib import Path

DEMO_FILES = ("context-demos", "tool-demos", "parameter-demos", "sandbox-demos", "sandbox-capacity")
# These files use only quoted strings or simple template literals for UI copy.
STRING = re.compile(r"""(?P<quote>['"`])(?P<text>(?:\\.|(?!(?P=quote)).)*)(?P=quote)""")
HAN = re.compile(r"[\u3400-\u9fff]")


def build_demo_locales(root):
    messages = json.loads((root / "src/demo-messages.json").read_text(encoding="utf-8"))
    used = set()
    for demo in DEMO_FILES:
        name = demo + ".js"
        source = (root / name).read_text(encoding="utf-8")
        for locale in ("en", "ja"):
            def localize(match):
                text = match["text"]
                if not HAN.search(text):
                    return match[0]
                used.add(text)
                translation = messages[text][locale]
                if match["quote"] == "`":
                    if re.findall(r"\$\{[^}]+\}", text) != re.findall(r"\$\{[^}]+\}", translation):
                        raise ValueError(f"Interpolation mismatch in {name}: {text}")
                    return "`" + translation + "`"
                return json.dumps(translation, ensure_ascii=False)
            output = STRING.sub(localize, source)
            (root / locale).mkdir(exist_ok=True)
            (root / locale / name).write_text(output, encoding="utf-8")
    if used != set(messages):
        raise ValueError("Unused translations in src/demo-messages.json")
