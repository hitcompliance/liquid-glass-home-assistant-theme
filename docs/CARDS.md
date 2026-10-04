# Karten und Einstellungen

`dist/dash6-cards.js` registriert die DASH6-Karten und die DASH5-v2-Kompatibilitätsnamen. `chunks/` und `profiles/` gehören zum Hauptmodul. Die eigenständige Vacuum Dock Card hat eine zusätzliche Ressource. Alle IDs hier sind erfundene Beispiele; die Karten erzeugen keine Entitäten. [Installation](INSTALLATION.md) · [Abhängigkeiten](DEPENDENCIES.md) · [Gesamtbeispiel](../examples/dashboard.yaml).

## Vollständiges Inventar

| Typ | Zweck / Pflichtangabe |
| --- | --- |
| `custom:dash6-govee-light-card-v2` | Einzellicht mit optionalen Segmenten; `entity: light.*` |
| `custom:dash6-lightgroup-card-v2` | Lichtgruppe mit Detailmodal; `entity: light.*` |
| `custom:dash6-multi-light-card-v2` | Kompatibilitätsname der aktuellen Lichtgruppenfamilie |
| `custom:dash6-shoe-cabinet-card` | Lichtgruppe mit Szenenzeile; Lichtschlüssel plus `scenes` |
| `custom:dash6-glass-switch` | Einzel-Schalter; `light`, `switch`, `fan` oder `input_boolean` |
| `custom:dash6-ikea-card` | Licht/Messsteckdose mit Graph; `entity: light.* / switch.*` |
| `custom:dash6-cover-card` | Vertikaler Rollo-Regler; `entity: cover.*` |
| `custom:dash6-thermostat-card` | Thermostat, auch zwei Setpoints; `entity: climate.*` |
| `custom:dash6-media-card` | Medien/Fernbedienung; Apple-/Fire-TV-Zuordnungen |
| `custom:dash6-vacuum-card` | Integrierte Staubsauger-/Dock-Karte; `entity: vacuum.*` |
| `custom:dash6-door-card` | Schloss/Türöffner; `kind` und passende `entity` |
| `custom:dash6-local-camera-card` | Kamera des aktuellen Browsers; keine Entity erforderlich |
| `custom:dash6-segmented-control-card` | Select oder lokale Auswahl; `entity` oder `options` |
| `custom:dash6-area-header` | Bereichsname/Uhr/Datum; `title` |
| `custom:dash6-theme-editor-card` | Grafischer Materialeditor; optionale Vorgaben |
| `custom:dash6-stack-card` | Gemeinsamer Stack; `cards` |
| `custom:dash6-embedded-view-card` | Vorhandene View einbetten; `view` oder dynamisches Ziel |
| `custom:dash6-ultra-card` | Ultra-Card mit integrierten DASH6-Editoren; native Ultra-Konfiguration |
| `custom:dash6-render-card` | Bestehende Karte mit DASH6-Adapter; `definition` |
| `custom:dash6-profile-card` | Neutrales Beispielprofil; `profile`, optional `overrides` |
| `custom:dash6-satin-native-card` | Button-/Mushroom-Icon-Schalter; Vendor-Karte unter `definition` |
| `custom:dash6-satin-graph-card` | Button-Karte mit Hintergrundgraph; Vendor-Karte unter `definition` |
| `custom:dash6-auto-entities` | Auto-Entities-Adapter; native Konfiguration |
| `custom:dash6-apexcharts-card` | ApexCharts-Adapter; native Konfiguration |
| `custom:dash5-govee-light-card-v2` | Kompatibilitätsname der aktuellen Lichtkarte |
| `custom:dash5-lightgroup-card-v2` | Kompatibilitätsname der aktuellen Lichtgruppe |
| `custom:dash5-multi-light-card-v2` | Weiterer Lichtgruppen-Kompatibilitätsname |
| `custom:vacuum-dock-card` | Eigenständiges Modul mit Einrichtungsassistent; `entity: vacuum.*` |
| `custom:liquid-glass-card` | Optionaler ursprünglicher SVG-Wrapper; `card` und `glass` |

`dash6-glass-segments`, Slider-Linsen, Dialogelemente und Editoren sind interne Komponenten. Sie werden von den Karten aufgebaut. `custom:dash6-pill-layout` und `custom:dash6-inline-pill-layout` sind Layouttypen für Layout Card; `custom:dash6-sections-view` ist ein Viewtyp, keine Card.

## Licht, Lichtgruppe und Schuhschrank

Die drei Familien verwenden dieselbe Lichtkonfiguration. Die normale Lichtkarte kann Segmente enthalten. Die Gruppenkarte öffnet beim Hintergrundklick ihr Detailmodal; Schalter und Regler bedienen weiter das Licht. Gemeinsame Änderungen betreffen ausgewählte verfügbare Blatt-Lichter. „Alle/Keins“ und „Invertieren“ verändern die Auswahl.

| Schlüssel | Bedeutung / gültige Werte |
| --- | --- |
| `entity` | Pflicht: Hauptlicht oder HA-Lichtgruppe |
| `name`, `icon` | Anzeigename, `mdi:…`-Icon |
| `power_entity`, `energy_entity` | Optionale Leistung-/Energie-Sensoren |
| `detail_path` | Optionaler vorhandener Detailpfad |
| `segments` | Licht-IDs oder Objekte mit `entity`, optional Name/Icon/Sensoren/eigenen Segmenten |
| `segment_excludes` | Licht-IDs von automatischen Vorschlägen ausschließen |
| `discovery.enabled` | Segmenterkennung; Standard `true` |
| `discovery.include_hidden` | Ausgeblendete Entities; Standard `false` |
| `segment_display.placement` | `detail` (Standard), `inline` |
| `segment_display.style` | `list`, `strip`, `ceiling-square`, `ceiling-round` |
| `segment_display.columns` | `auto` oder Spaltenzahl |
| `controls.mode` | `combo` (Standard), `separate` |
| `controls.label` | `icon` (Standard), `text` |
| `controls.buttons` | `group` (Standard), `individual` |
| `controls.density` | `compact` (Standard), `normal` |
| `controls.position` | `right` (Standard), `left`, `top`, `bottom` |
| `controls.brightness`, `.color`, `.color_temp`, `.white_channels`, `.effects` | Jeweilige Funktion mit `false` ausblenden |
| `show_color_temp`, `show_effects` | Farbtemperatur/Effekte mit `false` ausblenden |
| `main_back.enabled` | Haupt-/Hintergrundlichtauswahl; Standard `false` |
| `main_back.main_entity`, `.back_entity` | Explizite `light`-/`switch`-Zuordnungen |
| `main_back.placement` | `detail`, `header` |
| `scenes` | `scene.*`-IDs oder Objekte mit `entity`, `name`, `icon` |
| `graph.show`, `.source` | Graph aktivieren; Quelle `auto`, `power`, `energy` |
| `graph.span`, `.interval`, `.update_interval` | Standard `24h`, `15min`, `5min`; Intervalle `5min`, `15min`, `30min`, `1h` |
| `graph.height` | 64–120px; Standard 80px |
| `switch_style` | `liquid_glass`, `classic` |
| `child_lock`, `child_lock_entity` | Bedienung sperren, siehe Schalter |

Nur gemeldete Fähigkeiten erscheinen. Im Einzelreglermodus werden RGB und Farbtemperatur nicht gleichzeitig angezeigt. Das aktive `color_mode` entscheidet über die Farbanzeige; alte RGB-Attribute überdecken keinen aktuellen Weiß-/Temperaturmodus. Der Effektpicker zeigt gemeldete Effekte und bietet „Kein Effekt · stoppen“.

```yaml
type: custom:dash6-lightgroup-card-v2
entity: light.demo_gruppe
name: Lichtgruppe
segments:
  - entity: light.demo_lampe_links
    name: Links
  - entity: light.demo_lampe_rechts
    name: Rechts
discovery:
  enabled: false
segment_display:
  placement: detail
  style: list
controls:
  mode: combo
  buttons: group
  label: icon
  density: compact
  position: right
```

Der grafische Lichteditor bietet Erkennung, Reihenfolge und Ausschlüsse. Im Dashboard-Bearbeitungsmodus ist er auch bei verschachtelten Karten erreichbar. Per-Karte-Anpassungen werden als HA-Benutzerdaten gespeichert, getrennt nach Dashboardpfad, Kartentyp und Lichtidentität. Sie schreiben die umgebende YAML nicht um. **Dashboard-Vorgabe** entfernt den Override.

## Einzelner Schalter und native Karten

```yaml
type: custom:dash6-glass-switch
entity: switch.demo_steckdose
icon: mdi:power-socket-eu
switch_style: liquid_glass
child_lock: false
```

Der Schalter unterstützt Licht, Schalter, Lüfter und boolesche Helfer. `child_lock: true` sperrt die Bedienung. Bei `child_lock_entity` ist ausschließlich der bestätigte Zustand `off` entsperrt; unbekannte/nicht verfügbare Zustände bleiben gesperrt.

Vorhandene Button-/Mushroom-Karten mit vollständiger Vendor-Konfiguration einbinden:

```yaml
type: custom:dash6-satin-native-card
definition:
  type: custom:mushroom-light-card
  entity: light.demo_lampe
  name: Tischlicht
  show_brightness_control: true
  show_color_control: true
  tap_action:
    action: toggle
```

Geeignete Ein/Aus-Icon-Aktionen erhalten den Satin-Schalter. Zusatzregler, Hintergrundaktionen, Hold-/Double-Tap-Aktionen, native Bestätigungen und Editor bleiben beim ursprünglichen Kartentyp. Aktive, templatisierte oder unklare Button-Card-Sperren und momentane Press-/Release-Aktionen werden nicht in Toggle umgewandelt. Ungeeignete Karten bleiben nativ.

Es gibt keinen separaten `dash6-fan-card`-Typ. Lüfter werden als vorhandene Button-/Mushroom-Karten mit nativen Geschwindigkeits-/Oszillationsfunktionen eingebunden. [Das Beispiel](../examples/dashboard.yaml) zeigt eine Mushroom-Fan-Karte und eine Button-Karte mit Graph.

## IKEA/Messsteckdose und Hintergrundgraph

`dash6-ikea-card` benötigt ein Licht oder einen Schalter. Optionale Schlüssel: `name`, `icon`, `room`, `power_entity`, `energy_entity`, `led_entity`, `child_lock_entity`, `child_lock`, `switch_style`, `hold_action`. `height` ist standardmäßig 118px. `room` entfernt einen Bereichsnamen aus der Beschriftung.

```yaml
type: custom:dash6-ikea-card
entity: switch.demo_steckdose
name: Messsteckdose
power_entity: sensor.demo_steckdose_leistung
energy_entity: sensor.demo_steckdose_energie
height: 118
graph:
  show: true
  span: 24h
  interval: 15min
  update_interval: 15min
  minimum: 100
  color: '#6ec7ff'
```

Der Graph liegt vollbreit unten; die Referenzhöhe ist 80px. Sein Tooltip erscheint außerhalb der Card. Ohne `power_entity` wird dieser Hintergrundgraph nicht angelegt. `graph.minimum` setzt eine Mindestobergrenze der Skala, keinen Messwert.

Der Satin-Graph-Adapter übernimmt diese Graph-/Tooltip-Darstellung für passende Button-Cards mit `custom_fields.values` und Leistungsgraph unter `custom_fields.graph.card`. Quellen können Mini Graph Card oder ApexCharts sein; zusätzliche Serien/Einheiten bleiben erhalten. Die vollständige Vendor-Karte gehört unter `definition`. Für eine neue Messsteckdose ist die IKEA-Karte einfacher.

## Cover und Thermostat

```yaml
type: custom:dash6-cover-card
entity: cover.demo_rollo
name: Rollo
```

Der vertikale Regler benötigt die HA-Funktion `set_cover_position`. Unverfügbare Entities bzw. Covers ohne Positionsunterstützung erhalten keinen aktiven Positionsregler. Das Icon öffnet native Details. Die Karte bleibt maximal 300px hoch.

```yaml
type: custom:dash6-thermostat-card
entity: climate.demo_thermostat
modes:
  - 'off'
  - heat
  - cool
  - heat_cool
```

Die Karte verwendet das native HA-Temperaturinstrument. Zwei Setpoints erscheinen bei entsprechender Unterstützung der Climate-Entity. `modes` wird auf deren `hvac_modes` begrenzt, Presets stammen aus `preset_modes`. Ohne Presets entfällt die rechte Taste. Die sichtbare Karte bleibt 265px hoch, der native Innenbereich 205px.

**Satin ändert ausschließlich untere Modusgruppe, rechte Preset-Taste und Temperaturgriffe.** Griffe bekommen Glasmaterial und wachsen bei Klick/Drag. Außenfläche, Ring, Track, Werte, Low-/High-Beschriftung und Preset-Dialog werden nicht zusätzlich umgestaltet. Zwei Sollwerte brauchen keine weitere Frontend-Dual-Thermostat-Karte; eine optionale Dual-Smart-Thermostat-Backendintegration liefert gegebenenfalls die Climate-Entity.

## Medien

| Schlüssel | Bedeutung |
| --- | --- |
| `apple_entity` | Apple-TV-`media_player` |
| `apple_remote` | Apple-TV-`remote` |
| `fire_entity` | Fire-/Android-TV-`media_player` mit ADB-Unterstützung |
| `apple_device_type` | Firemote-Modell, z. B. `appletv-4k-gen2` |
| `fire_device_type` | Firemote-Modell, z. B. `fire_tv_4_series` |
| `name` | Kartentitel |

Die Hauptkarte bevorzugt aktives Apple TV und zeigt native Mediensteuerung. Das Modal enthält Geräteauswahl, Fernbedienungen und Transporttasten. Firemote ist die erweiterte Fernbedienung; bei fehlendem Modul gibt es einfache Tasten. Apple-TV-Befehle verwenden die Remote, Fire-TV-Befehle die ADB-Aktion der Integration.

Im geöffneten Modal: Pfeile, Enter, Zurück/Entf, `+`/`−`, Leertaste sowie kurzer/langer Druck auf `#`. Außerhalb wird die Tastatur nicht übernommen. Schließen, Escape und Außenklick bleiben verfügbar.

## DASH6 Staubsauger und Dock

Die integrierte `dash6-vacuum-card` bietet Statusanimation, Start/Stop, Individuell-, Dock- und Wartungsdialoge. `entity: vacuum.*` ist Pflicht. Optionale Zuordnungen im Objekt `entities`:

| Schlüssel | Funktion |
| --- | --- |
| `battery`, `progress` | Batterie-/Fortschrittsensor |
| `mode`, `intensity`, `route` | Selects für Reinigung, Wischintensität, Wischroute |
| `emptyMode` | Entleerungsmodus-Select |
| `drying`, `washing`, `emptying` | Dock-Switches |
| `dryTime` | Trocknungsrestzeit |
| `cleanWater`, `dirtyWater` | Tank-Problemzustände |

`stats.default` und `stats.cleaning`: Listen mit `entity`, `title`, `unit`, `scale` (Nachkommastellen). Die Einheit wird angezeigt, der Sensorwert nicht umgerechnet. `reset_buttons` ordnet Statistiktitel einer `button`-Entity zu; Reset braucht weitere Bestätigung. `areas`: Liste mit HA-`area_id` und bestätigter `roborock_area_id`. Segmentnummern müssen zur aktiven Roborock-Karte des eigenen Geräts passen.

`defaults` enthält `mode`, `intensity`, `route`, `fan`, `repeat`; bevorzugt `vac_and_mop`, `moderate`, `standard`, `balanced`, `1`. Der Individuell-Dialog erlaubt Raum-Mehrfachauswahl; erst der abschließende Start sendet den Auftrag. Ohne geeignete Roborock-Unterstützung ist Segmentreinigung nicht zugesichert. Fortsetzen ändert keine laufenden Reinigungsparameter.

## Eigenständige Vacuum Dock Card

Die separate `vacuum-dock-card` benötigt weder Button Card noch Card Mod noch Roborock Vacuum Card; Lit ist gebündelt. Ein grafischer Assistent richtet Deutsch/Englisch, Dock-Zuordnungen, Wartungswerte und Räume ein.

```yaml
type: custom:vacuum-dock-card
entity: vacuum.demo_roboter
name: Roboter
language: auto
entities:
  battery: sensor.demo_roboter_batterie
  progress: sensor.demo_roboter_fortschritt
  mop_drying: switch.demo_dock_trocknung
  mop_washing: switch.demo_dock_wasche
  dust_emptying: switch.demo_dock_entleerung
  clean_water: binary_sensor.demo_dock_frischwasser_problem
  dirty_water: binary_sensor.demo_dock_schmutzwasser_problem
```

**Diese Entity-Schlüssel unterscheiden sich vom DASH6-Vacuum.** Weitere Schlüssel: `cleaning_mode`, `mop_intensity`, `mop_route`, `drying_remaining`, `emptying_mode`. `drying_time_unit`: `auto`, `s`, `min`, `h`. `stats` unterstützt außerdem einen positiven `divide_by`, der zur realen Sensoreinheit passen muss. Tanks: `off` = OK, `on` = Problem, unbekannt = neutral. Räume benötigen bestätigte `roborock_area_id` und `name` oder `area_id`. Segmentreinigung nutzt Roborock `app_segment_clean`; andere Integrationen erhalten verfügbare Standardfunktionen.

## Türen und lokale Kamera

Türkarte: `kind: apartment` braucht `entity: lock.*`; `kind: entrance` braucht einen `button.*`-Türöffner. Optional: `name`, `contact_entity`, `battery_entity`, `contact_battery_entity`, `battery_warning_entity`, `activity_entity`, `ring_entity`.

```yaml
type: custom:dash6-door-card
kind: apartment
entity: lock.demo_tur
name: Eingang
contact_entity: binary_sensor.demo_turkontakt
```

Öffnen und Schlossaktionen sind getrennt. Schloss-Öffnen benötigt einen bestätigt geschlossenen Kontakt. Die Karte verwendet die Dienste der Integration; sie ersetzt keine Zutrittsverwaltung.

```yaml
type: custom:dash6-local-camera-card
name: Kamera dieses Geräts
facing_mode: user
```

Dies ist die Webcam/Front-/Rückkamera des aktuellen Browsers, keine HA-Kamera-Entity. `facing_mode`: `user` oder `environment`. Start erst auf Klick mit Browserfreigabe in sicherem Kontext (HTTPS), ohne Mikrofon. Stop, Viewwechsel und Hintergrundwechsel beenden den Stream. Die Karte bietet keine Aufnahme-/Uploadfunktion.

## Auswahl, Header, Struktur und Profile

Segmentauswahl: `entity: select.* / input_select.*` verwendet gemeldete Optionen und setzt sie über den passenden Dienst. `options` kann eindeutige `value` mit `label`, `icon`, optional `disabled` definieren; `label: icon` zeigt Icons. Ohne Entity und mit `options` bleibt die Auswahl lokal ohne Dienstaufruf. `default` legt deren Startwert fest; `animation: false` deaktiviert die Animation.

Bereichsheader: `title`, `show_clock` (Standard `true`), `time_zone` (z. B. `Europe/Berlin`). Stack: `cards`, optional `mode: horizontal`.

Embedded View: `mode: static`, `view`, optional `dashboard` (sonst aktuelles Dashboard). Dynamisch: `mode: dynamic` mit `target_entity`, deren Zustand den Zielpfad enthält. `ha_card: false` entfernt den zusätzlichen Rahmen. `bleed`, `bleed_inline`, `bleed_block` erlauben bewusstes Überstehen. Alte `view_path`-/`view_path_entity`-Felder bleiben Kompatibilität; neu `view`/`target_entity` verwenden. Keine Selbstreferenz einbetten.

Ultra-Card behält die native `layout.rows[].columns[].modules[]`-Konfiguration. Custom-Cards werden als `external_card` mit `card_type` und `card_config` eingebettet. Die DASH6-Editoren ersetzen nicht den Ultra-Card-Editor. Eine vollständige Struktur steht im Gesamtbeispiel.

Render-Wrapper:

```yaml
type: custom:dash6-render-card
definition:
  type: entities
  entities:
    - sensor.demo_temperatur
```

`definition` bleibt die vollständige Originalkonfiguration. Optionale Felder `skin.css` und `skin.classes` bestimmen eigene Darstellung. Fremdkarten müssen installiert sein. Der Profilwrapper lädt neutrale `sample-*`-Profile und akzeptiert `overrides` sowie optional `area`. Overrides werden auf oberster Ebene zusammengeführt; verschachtelte Objekte bewusst vollständig ersetzen. Private Raumprofile sind nicht enthalten. Mitgeliefert werden `sample-button`, `sample-fan`, `sample-scenes`, `sample-thermostat`, `sample-chart` und `sample-entities`; ihre Demo-Entities bei Verwendung durch `overrides` ersetzen.

## Theme-Editor und ursprüngliche SVG-Karte

```yaml
type: custom:dash6-theme-editor-card
title: Glas einstellen
expanded: true
```

Der Editor bietet Satin-Glanz/Frostung, Hover, Transparenz, Buttons, Icons und Bewegung. Sofortänderungen werden browserlokal gespeichert. **Theme-Vorgaben wiederherstellen** entfernt sie, **Werte exportieren** liefert Theme-Werte für die eigene Konfiguration. Das ist ein Styling-Editor, kein Geräteservice-Editor.

`custom:liquid-glass-card` stammt aus der optionalen ursprünglichen SVG-Ressource. Er verwendet `card` plus `glass`, z. B. `enabled`, `optics.strength`, `optics.curvature`, `optics.frost`, `tint`, `outline`, `radius`. Die Hintergrundoptik bleibt auf die ursprüngliche DASH5-Ansicht begrenzt. [Installation und Geltungsbereich](INSTALLATION.md#optionale-ursprüngliche-svg-optik).

## Herkunft aller Kartenprojekte

| Quellprojekt | Rolle |
| --- | --- |
| `dash6-satin-cards` | Aktueller Gesamtstand mit Satin und erhaltenen ursprünglichen Varianten |
| `dash6-cards` | Ursprünglicher DASH6-Stand mit denselben Tags; keine zweite parallele Ressource |
| `dash5-light-cards-v2` | Archivierter ursprünglicher v2-Lichtstand; aktuelle öffentliche Kompatibilität über Aliasnamen im Gesamtmodul |
| `vacuum-dock-card` | Eigenständiges Staubsauger-/Dock-Modul |

Die mitkopierte `dash5-light-cards-v2.js` ist ein Kompatibilitätseinstieg zum aktuellen Hauptmodul, kein zweites separates Laufzeitsystem. In einer normalen Gesamtinstallation genügt der Haupteintrag. Details: [Migration](MIGRATION.md).

## Interaktive Demo-Karte

`custom:dash6-demo-card` enthält eine `card:` mit einer eigenen DASH6-Karte. Sie stellt lokale Beispielzustände bereit und fängt Service-, API- und WebSocket-Zugriffe ab. Die Demo benötigt keine Geräte. `examples/demo-dashboard.yaml` zeigt acht Kartenbeispiele in drei Views mit den Design-Prinzipien. Für echte Geräte die Hülle weglassen und eigene Entitäten verwenden.
