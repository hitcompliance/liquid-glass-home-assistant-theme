# 3.1.19 / Cards 2.4.19

- Add the Favorites visual editor, group selection links, type labels, scrollable preview, dashboard/manual view ordering and selected descendants without unchecked wrappers.
- Keep shared glass controls mounted and synchronized through independent native-card renders and on/off updates.
- Install newly listed dependencies during integration upgrades; reuse HACS-owned resources and prevent competing Embedded View registrations.
- Preserve previously deployed card refinements, media artwork/controls and overview cards.
- Validate installer upgrades, upstream Embedded compatibility and native control lifecycle in Chromium/WebKit.

# 3.1.3 / Cards 2.4.3

- Make flat action button borders transparent immediately during press, retaining inset shadows and button geometry.
- Explicitly clear scene-row container backgrounds, borders and shadows without changing individual scene fills.

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
