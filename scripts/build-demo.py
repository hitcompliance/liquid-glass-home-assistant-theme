#!/usr/bin/env python3
"""Export the complete local design series as an offline-capable static gallery.

Initial import: --source-root THREAD_DIRECTORY --visualize-render render.py
Subsequent builds need only the checked-in demo/source and demo/assets files.
No Home Assistant data, live screenshots, services, or host runtime are used.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEMO = ROOT / "demo"
DESIGNS = [
    ("dash6-satin-system", "Satin Glass · Kartensystem", "Die gemeinsame Gestaltung für acht Kartenfamilien: Lichtgruppe, Stehlampe, Steckdose, Ventilator, Button, Mushroom und zwei Thermostate.", "8 Kartenfamilien", ["Schalter", "Slider", "Effekte", "Gruppen", "Thermostate"]),
    ("satin-effect-group", "Satin · Effekte und Gruppen", "Kompakter Schalter, Rauchglas-Effekttaste und ein bedienbares Gruppenmodal mit Einzellichtern.", "2 Hintergründe", ["Effekte", "Gruppen", "Farbe", "Helligkeit"]),
    ("satin-raised-switch-rect-modes", "Satin · Runder Schalter", "Erhabene runde Schalterlinse mit rechteckiger, eingelassener Modusgruppe und breitem Clear-Reflex.", "2 Hintergründe", ["Runder Schalter", "Bündige Auswahl", "Kombislider"]),
    ("satin-inset-rect", "Satin · Rechteckig versenkt", "Eingelassener rechteckiger Schalter und bündige rechteckige Auswahl-Linse auf weichem Rauchglas.", "2 Hintergründe", ["Versenkt", "Rechteckig", "Kombislider"]),
    ("satin-gloss-depth", "Satin · Erhaben oder versenkt", "Beide Tiefenwirkungen der kompakten Schalterkapsel, jeweils auf dunklem und fotografischem Hintergrund.", "4 Karten", ["Erhaben", "Versenkt", "Satin"]),
    ("custom-light-three-designs", "Custom Light · Drei Entwürfe", "Contour, Satin und Halo: drei Materialideen mit denselben bedienbaren Lichtreglern auf zwei Hintergründen.", "3 Entwürfe · 6 Karten", ["Contour", "Satin", "Halo"]),
    ("custom-light-flat-glass", "Custom Light · Flat Glass", "Flachere dunkle Glasfläche mit elastischem Icon-Schalter, Kombislider und gelbem Steckdosen-Fallback.", "Licht und Steckdose", ["Flat Glass", "Icon", "Kombislider"]),
    ("black-frost-light", "Black Frost · Licht von unten", "Sanft gefrostetes schwarzes Glas mit farbigem Lichtschein von unten sowie Farbe und Helligkeit.", "Einzelkarte", ["Frostglas", "Lichtschein", "Farbpresets"]),
    ("liquid-lens-surfaces", "Liquid Lens · Vier Oberflächen", "Dieselbe animierte Glaslinse auf Grün, Schwarz, Weiß und Grau. Farbe und Helligkeit sind direkt bedienbar.", "4 Oberflächen", ["Grün", "Schwarz", "Weiß", "Grau"]),
    ("liquid-lens-reference", "Liquid Lens · Referenz", "Die frühe breite Glaslinse mit federnder Bewegung, Farbanzeige, Helligkeit und zuschaltbarer Animation.", "Referenzstudie", ["Glaslinse", "Farbe", "Animation"]),
    ("liquid-light-modern", "Liquid Light · Clear, Flow, Soft", "Drei frühe moderne Schalterideen mit weichen Animationen, Lichtzustand und Helligkeitsreglern.", "3 Entwürfe", ["Clear", "Flow", "Soft"]),
]
PRIVATE = re.compile(r"homeassistant\.local|/Users/|/config/|(?:light|switch|fan|climate|sensor|input_boolean)\.(?:wohnzimmer|kuche|buro|flur|schlafzimmer|badezimmer)[a-z0-9_]*", re.I)


def sanitize(fragment: str) -> str:
    # Remove every embedded source photograph. Keep authored SVG/CSS marks.
    fragment = re.sub(r"data:image/(?:webp|png|jpe?g|avif);base64,[A-Za-z0-9+/=]+", "../assets/living-room.jpg", fragment)
    fragment = fragment.replace("window.openai", "window.demoState").replace("globalThis.openai", "globalThis.demoState")
    fragment = fragment.replace("openai:set_globals", "demo:state")
    # Gallery contexts use the generated project image, not a private room.
    fragment = fragment.replace("Wohnzimmerfoto", "Generierter Wohnraum").replace("Wohnzimmer-Foto", "Generierter Wohnraum")
    if PRIVATE.search(fragment):
        raise ValueError("Private deployment data in visualization source")
    return fragment


def page_document(slug: str, title: str, description: str, fragment: str, position: int) -> str:
    previous = DESIGNS[(position - 1) % len(DESIGNS)][0]
    following = DESIGNS[(position + 1) % len(DESIGNS)][0]
    return f'''<!doctype html>
<html lang="de" data-demo="{slug}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="{html.escape(description, quote=True)}"><meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="default-src 'self' data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'">
<title>{html.escape(title)} · Liquid Glass</title>
<link rel="stylesheet" href="../assets/preview.css"><script src="../assets/lucide.min.js"></script><script src="../assets/runtime.js"></script></head>
<body class="demo-page">
<header class="demo-header"><a class="demo-home" href="../index.html">← Galerie</a><div><span class="demo-kicker">LIQUID GLASS / INTERAKTIVER ENTWURF</span><h1>{html.escape(title)}</h1></div><nav aria-label="Weitere Entwürfe"><a href="{previous}.html" aria-label="Vorheriger Entwurf">←</a><a href="{following}.html" aria-label="Nächster Entwurf">→</a></nav></header>
<main class="demo-main"><div class="demo-stage">{fragment}</div><details class="demo-tweaks" id="demo-design-controls"><summary>Darstellung anpassen</summary><div class="demo-tweak-groups"></div></details></main>
<footer class="demo-footer">Lokale Simulation · keine Verbindung zu Geräten. Fotohintergründe sind für dieses Projekt generiert.</footer>
<script>window.initializeDemo();</script></body></html>
'''


def gallery_document(manifest: list[dict]) -> str:
    cards = []
    for i, item in enumerate(manifest):
        tags = "".join(f"<span>{html.escape(tag)}</span>" for tag in item["tags"])
        cards.append(f'''<article class="gallery-card{' featured' if i == 0 else ''}"><a class="gallery-preview" href="{item['page']}"><img src="{item['preview']}" alt="{html.escape(item['title'])}" loading="{'eager' if i < 3 else 'lazy'}" width="1040" height="660"><span class="gallery-open">Ausprobieren ↗</span></a><div class="gallery-copy"><div class="gallery-meta">{html.escape(item['count'])}{' · FINALER STAND' if i == 0 else ''}</div><h2><a href="{item['page']}">{html.escape(item['title'])}</a></h2><p>{html.escape(item['description'])}</p><div class="gallery-tags">{tags}</div></div></article>''')
    return '''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Alle interaktiven Liquid-Glass-Entwürfe für Home Assistant: Schalter, Slider, Farben, Effekte, Gruppen und Thermostate."><title>Liquid Glass · Interaktive Entwürfe</title><link rel="stylesheet" href="assets/gallery.css"></head>
<body><header class="gallery-header"><a class="wordmark" href="./">LIQUID / GLASS</a><a href="https://github.com/hitcompliance/liquid-glass-home-assistant-theme" rel="noopener">GitHub ↗</a></header><main><section class="gallery-hero"><div class="hero-copy"><span class="eyebrow">HOME ASSISTANT · DESIGN STUDIES</span><h1>Glas, das<br>du bedienen kannst.</h1><p>Alle elf interaktiven Entwürfe der Serie — von den ersten Glaslinsen bis zum gemeinsamen Satin-Kartensystem.</p><a class="hero-action" href="pages/dash6-satin-system.html">Satin Glass ausprobieren <span>↗</span></a><div class="install-actions"><a class="hacs-action" href="https://my.home-assistant.io/redirect/hacs_repository/?owner=hitcompliance&amp;repository=liquid-glass-home-assistant-theme&amp;category=theme" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 2 12h3v9h6v-6h2v6h6v-9h3L12 3Z" fill="currentColor"/></svg>In HACS hinzufügen ↗</a><a class="readme-action" href="https://github.com/hitcompliance/liquid-glass-home-assistant-theme/blob/main/README.md" data-readme-open>README &amp; Installation</a></div><div class="hero-note">HACS installiert die Themes. Karten und Abhängigkeiten ergänzt der Installer.<br><a href="https://github.com/hitcompliance/liquid-glass-home-assistant-theme/blob/main/examples/dashboard.yaml">Beispieldashboard mit sechs Views ↗</a></div></div><div class="hero-visual"><img src="previews/dash6-satin-system.jpg" alt="Satin-Lichtkarten auf dunklem und generiertem Wohnraumhintergrund" width="1040" height="660"><span class="hero-caption">Satin Glass / acht Kartenfamilien</span></div></section><section class="gallery-section" aria-labelledby="gallery-title"><div class="gallery-heading"><h2 id="gallery-title">Die gesamte Entwurfsserie</h2><span>11 interaktive Studien</span></div><div class="gallery-grid">''' + "\n".join(cards) + '''</div></section></main><footer class="gallery-footer"><span>Alle Werte sind simuliert. Kein Zugriff auf Geräte.</span><span>Fotohintergrund für dieses Projekt generiert.</span><a href="https://github.com/hitcompliance/liquid-glass-home-assistant-theme" rel="noopener">Quellcode auf GitHub ↗</a></footer><dialog id="readme-dialog" aria-labelledby="readme-title"><header class="readme-header"><h2 id="readme-title">README &amp; Installation</h2><div><a href="https://github.com/hitcompliance/liquid-glass-home-assistant-theme/blob/main/README.md" target="_blank" rel="noopener">Auf GitHub öffnen ↗</a><button type="button" aria-label="README schließen" data-readme-close>×</button></div></header><article id="readme-content" class="readme-content" aria-live="polite"></article></dialog><script src="assets/readme.js" defer></script></body></html>
'''


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-root", type=Path, help="Import the original conversation fragments")
    parser.add_argument("--visualize-render", type=Path, help="Perform the visualize standalone export before packaging")
    args = parser.parse_args()
    for name in ["source", "pages", "previews", "assets"]:
        (DEMO / name).mkdir(parents=True, exist_ok=True)
    imported = sorted(p.stem for p in args.source_root.glob("*.html")) if args.source_root else []
    expected = sorted(item[0] for item in DESIGNS)
    if args.source_root and imported != expected:
        raise ValueError(f"Uncatalogued/missing source pages: {set(imported) ^ set(expected)}")
    manifest = []
    for i, (slug, title, description, count, tags) in enumerate(DESIGNS):
        source = DEMO / "source" / f"{slug}.html"
        if args.source_root:
            source.write_text(sanitize((args.source_root / f"{slug}.html").read_text()), encoding="utf-8")
        fragment = source.read_text()
        if PRIVATE.search(fragment) or "window.openai" in fragment:
            raise ValueError("Unsafe or host-dependent packaged source")
        if args.visualize_render:
            # Follow the requested visualization export workflow. The final
            # public page replaces host-only shell/bridge with our local runtime.
            with tempfile.TemporaryDirectory(prefix="glass-export-") as temporary:
                subprocess.run(["python3", str(args.visualize_render), str(source.resolve()), str(Path(temporary) / "export.html")], check=True, capture_output=True)
        page = page_document(slug, title, description, fragment, i)
        (DEMO / "pages" / f"{slug}.html").write_text(page, encoding="utf-8")
        manifest.append({"id": slug, "title": title, "description": description, "count": count, "tags": tags, "page": f"pages/{slug}.html", "preview": f"previews/{slug}.jpg", "source": f"source/{slug}.html", "sourceSha256": hashlib.sha256(fragment.encode()).hexdigest()})
    (DEMO / "gallery.json").write_text(json.dumps({"pages": manifest, "sourceCount": len(manifest), "workspaceDuplicates": ["mockups/dash6-satin-system/interactive.html", "mockups/dash6-satin-system/index.html"], "image": {"path": "assets/living-room.jpg", "origin": "Project-generated public image"}}, ensure_ascii=False, indent=2) + "\n")
    (DEMO / "index.html").write_text(gallery_document(manifest), encoding="utf-8")
    (DEMO / "README.md").write_text((ROOT / "README.md").read_text(), encoding="utf-8")
    (DEMO / ".nojekyll").touch()
    print(json.dumps({"pages": len(manifest), "bytes": sum(p.stat().st_size for p in DEMO.rglob('*') if p.is_file()), "directory": str(DEMO)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
