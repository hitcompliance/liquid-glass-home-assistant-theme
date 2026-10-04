# Interaktive Entwurfsgalerie

Elf eigenständige Studien aus der gesamten Liquid-Glass-Entwurfsserie. Frühe
Varianten, vier Oberflächen, drei Kartenentwürfe, erhaben/versenkt und das finale
Satin-Kartensystem bleiben enthalten. Doppelte Kopien derselben letzten Quelle
sind im Inventar vermerkt.

Alle Seiten laufen als statische lokale Simulationen, ohne Codex oder Home
Assistant. Gemeinsame Navigation, Auswahlgruppen, lokale Zustandsspeicherung und
die vorhandenen Darstellungsoptionen werden durch `assets/runtime.js` bereitgestellt.
Icons und das für dieses Projekt generierte Foto sind lokal eingebunden. Keine
privaten Live-Screenshots, Hostnamen oder Geräte-Entity-IDs werden veröffentlicht.

`index.html` ist der Galerie-Einstieg; `pages/` enthält die eigenständigen Demos.
`source/` enthält die bereinigten editierbaren Fragmente, `gallery.json` das
vollständige Inventar. Die Lucide-Icons unterliegen der beigefügten Lizenz.

Aus der Repository-Wurzel:

```sh
python3 scripts/build-demo.py
node tests/demo-gallery.mjs
python3 -m http.server 8080 --directory demo
```

Die Browserprüfung verwendet ausschließlich diesen lokalen statischen Inhalt,
blockiert externe Anforderungen und prüft auch die Mobilansicht. Ein Erstimport
zusätzlicher Gesprächsentwürfe ist über `--source-root` möglich; unbekannte oder
fehlende Entwürfe brechen den Build ab, statt unbemerkt aus dem Inventar zu fallen.
