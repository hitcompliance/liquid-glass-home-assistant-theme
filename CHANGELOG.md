# 3.1.2 / Cards 2.4.2

- Preserve configured scene background and text colors under the flat action material. Explicit scene fills take precedence; hover gloss and inset press feedback remain.

# 3.1.1 / Cards 2.4.1

- Flat scene, door, vacuum action and remote buttons with glossy hover and inset press feedback; individual scene fills remain visible.
- Light graphs reserve at least 90 px above scene and slider rows; header power and energy show rounded integers.
- Portrait apartment lock switch, upright icons and shorter door status labels. Entrance door keeps its framed icon.
- Effect controls use a glass lens without shrinking.
- HomePod native cards add previous/play/next and a glass volume slider, aligned with transport controls, without visible labels. All off/standby HomePods dim the slider to 50%; cards without artwork stay transparent and rounded.

# Changelog

## Integration 3.1.0 / Karten 2.4.0 — 2026-10-05

- Optionaler Lichtgruppen Sonder-Schalter (Standard aus), keine Mitgliederzahlen in der Statuszeile.
- Effekte, Hauptlicht und Backlight in einer gemeinsamen Gruppe mit unabhängigen aktiven Linsen. Zentraler Ein-/Ausschalter synchronisiert die Zusatzlichter.
- GUI/YAML für getrennte Steuerungs- und Szenenzeilen, individuelle Szenenfüllungen und Graph-Mindestskala (100 W).
- Leistungsgrafik und externer Tooltip verwenden die gemeinsame IKEA-Implementierung.
- Native Medienbuttons bleiben unverändert; inaktive Player sind transparent. Fernbedienungsdialog startet immer mit Apple TV.
- Raumkopf-Pills ohne zusätzliche dunkle Kartenhülle. Preset-Menüs bleiben innerhalb des Viewports.
- Türkontakt/Schloss bestimmen die Wohnungstürfarbe; Klingelsignal mit 60-Sekunden-Grenze und Abbruch durch konfigurierte Öffner/Schlossaktionen oder Wohnungstüraktivität.
- Isolierte Chromium-/WebKit-Prüfungen ohne Geräteaktionen.
