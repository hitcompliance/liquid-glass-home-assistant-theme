## 3.1.27 / Cards 2.4.27

- Replace segmented fan modes with one round Satin lens and three positions: Auto, On, Off.
- Preserve main/force service ordering and unavailable guards; animate only genuine state transitions.

## 3.1.26 / Cards 2.4.26

- Add a saved manual Favorites card and heading order with accessible move controls and immediate preview updates.
- Preserve existing source selection, groups and nested layouts; newly selected elements follow deterministically.

## 3.1.25 / Cards 2.4.25

- Restore inset Satin dashboard tabs and a moving glass lens on the native Home Assistant tab group.
- Detect slotted native view tabs and active selection while retaining native keyboard navigation and edit-mode scrolling.
- Restore native indicators when the theme is off or the frozen comparison dashboard is active.
- Add Chromium/WebKit regressions for selection, resizing, scrolling and runtime cleanup.

## 3.1.23 / Cards 2.4.23

- Add direct inline card definitions, combined known/dynamic domain grids and inline layout visibility rules.
- Preserve inline sidebar navigation definitions until the overlay creates its links and widgets.
- Expand direct cards and inline domain queries in the Favorites catalog; retain saved snapshots, known-child IDs and selection exclusions during dynamic discovery.
- Share differing inline templates through one subscription per connection and group, with isolated Jinja macro scopes, reconnect handling and subscription cleanup.
- Decouple card mapping, material and interaction hooks from the compatibility profile store; existing profiles remain available.
- Preserve responsive grids, hidden-entity filtering, first-render material and existing native device controls.
- Scope native prototype extensions and preserve native instance setters in derived layouts.
- Add Chromium/WebKit coverage for direct cards and domain grids, query lifecycle tests and Jinja namespace validation.

## 3.1.22

- Shared native/embedded Sections widths: mobile full width, intermediate 5-column spans and space-aware second-column expansion.
- Opt-in room-slot flush grids and combined known/dynamic domain cards.
- Suppress unchanged-state switch travel during initialization and presentation changes; retain genuine transitions and interaction feedback.
- Remove decorative plates from compact native switches; initialize lighting with the shared glass material.
- Include the opt-in room-loader frontend asset in the package.

## 3.1.21

- Keep native glass switches bound to the current child during nested card reconfiguration and state updates.
- Use single-column dashboard content below 700px, including embedded Sections and card grids.
- Match missing navigation glass defaults to the shared bedroom reference material.

# 3.1.20 / Cards 2.4.20

- Respect configured embedded section widths; empty climate sections no longer collapse the entire desktop layout.
- Supply shared glass lens defaults for active navigation links in sidebar and mobile overlay.
- Add responsive room-slot switch grids with a single outer frame.

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
