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
| `custom:dash6-favorites-card` | Hierarchische Kartenauswahl mit gespeicherten Snapshots; Einrichtung im GUI-Editor |
| `custom:dash6-embedded-view-card` | Vorhandene View einbetten; `view` oder dynamisches Ziel |
| `custom:dash6-ultra-card` | Ultra-Card mit integrierten DASH6-Editoren; native Ultra-Konfiguration |
| `custom:dash6-render-card` | Bestehende Karte mit DASH6-Adapter; `definition` |
| `custom:dash6-direct-card` | Vollständige Inline-Karte mit Material-/Bedienungsadaptern; `card` |
| `custom:dash6-domain-card` | Bekannte und dynamische Inline-Karten; `cards`, optional `query` |
| `custom:dash6-inline-layout` | Inline-Layout mit Template-Sichtbarkeitsregeln; `card`, `query`, `visibility` |
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

## Direkte Inline-Konfiguration

Eigene Spezialkarten können direkt in einer View stehen. `custom:dash6-direct-card` verwendet unter `card` die vollständige native oder fremde Konfiguration und stellt die gemeinsamen Material- und Interaktionsadapter bereit. Fremdkarten müssen weiterhin separat installiert sein. Der native Karteneditor und die vollständige Konfiguration bleiben über den Wrapper-Editor erreichbar.

```yaml
type: custom:dash6-direct-card
card:
  type: entities
  entities:
    - sensor.demo_temperature
```

Für eine bekannte Kartenliste und spätere dynamische Ergänzungen dient `custom:dash6-domain-card`. [Ein vollständiges Rasterbeispiel steht unten](#gemeinsame-raumabfrage).

| Schlüssel | Bedeutung |
| --- | --- |
| `cards` | Vollständige bekannte Kartendefinitionen; werden vor der ersten Template-Antwort dargestellt |
| `known_entity_ids` | Aus dynamischen Ergänzungen ausgeschlossene IDs; ohne Angabe werden sie aus `cards` ermittelt |
| `query.template` | Inline gespeichertes HA-Jinja-Template; liefert eine Kartenliste oder mit `index` eine Liste von Ergebnissen |
| `query.index` | Optionaler Index der Kartenliste innerhalb der Template-Ausgabe |
| `query.canonical` | `true`, wenn die gewählte Ausgabe bereits vollständige Kartenobjekte enthält; JSON-Strings innerhalb der Karten bleiben unverändert |
| `query.group` | Freier Gruppenname; unterschiedliche Templates derselben Gruppe teilen pro Verbindung eine Subscription |
| `combine` | `true` führt bekannte und dynamische Karten in einem gemeinsamen Raster zusammen |
| `columns`, `mobile_columns` | Eine bis zehn Desktopspalten und gewünschte Mobilspalten; bei einem kombinierten Raster jeweils mindestens eine |
| `mobile_breakpoint` | Wechsel zur mobilen Spaltenzahl; Standard `700` |
| `edge_alignment` | `flush`: bündiges Desktop-Raster mit äußerer Überschrift; Mobilansicht mit 8px Innenabstand |
| `container`, `card_param` | Bei getrennten Listen: Container für dynamische Karten und Zielfeld; Standard vertikaler Stack und `cards` |
| `grid_options` | Native HA-Grid-Angaben des Containers |

Die Template-Ausgabe bestimmt nach dem ersten Ergebnis auch, welche bekannten Entity-Karten weiterhin zur Liste gehören. Fehlende und ausgeblendete Entities werden ausgeschlossen. Ein leerer Domain-Block signalisiert der Sections-Ansicht, dass er entfallen kann. Identische Ergebnisse und Zustandsupdates erzeugen keine neue Container-Karte.

`custom:dash6-inline-layout` enthält das vollständige Layout unter `card`. Seine `query` verwendet dieselben Template-/Gruppenschlüssel. `visibility` ist eine Liste aus `{id, indices, mode}`: Die referenzierten Ergebnispositionen müssen boolesche Werte liefern; `mode: any` verlangt mindestens einen wahren Wert, sonst müssen alle wahr sein. Betroffene vorhandene Layoutelemente tragen die Klasse `responsive-row-<id>`, `responsive-col-<id>` oder `responsive-mod-<id>`. Diese Adapteroption ist für bestehende Layouts mit solchen IDs gedacht; native HA-Sichtbarkeit bleibt für einfache neue Layouts die passende Wahl.

Direkte Karten und Templates benötigen keine Profil- oder Raumkonfigurationsdatei. Die vorhandenen Beispielprofile und ihre API bleiben für bestehende Konfigurationen verfügbar.

## Favoriten aus direkten Karten

Der Favoriten-Editor löst `dash6-direct-card` transparent auf: Die enthaltene Karte und ihre Unterkarten behalten dieselbe Auswahlhierarchie wie eine zuvor expandierte Profilkarte. Bei `dash6-domain-card` werden die bekannten Karten sofort angeboten. **Enthaltene Karten ermitteln** liest die inline konfigurierte Abfrage auf Wunsch, verwendet gegebenenfalls eine bereits aktive Gruppen-Subscription und erstellt eine statische Auswahl der aktuell verfügbaren Karten.

Bekannte abgewählte Unterkarten bleiben beim Ermitteln abgewählt; neue Unterkarten folgen dem Auswahlzustand ihres Containers. Ausgeblendete Entities entfallen. Bereits gespeicherte Favoriten-Snapshots werden beim Aktualisieren des Katalogs beibehalten. Die Vorschau bleibt schreibgeschützt; Quell-Views werden durch die Auswahl nicht verändert.

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
| `rows.controls`, `rows.scenes` | Regler-/Szenenzeile; Standard `true` / `false` |
| `scenes` | `scene.*`-IDs oder Objekte mit `entity`, `name`, `icon`, optional `fill` |
| `graph.minimum` | Mindestmaximum der Leistungsachse; Standard 100W |
| `presence_entity` | Optionaler Präsenz-Binärsensor; Anzeige nur bei aktueller Präsenz |
| `graph.show`, `.source` | Graph aktivieren; Quelle `auto`, `power`, `energy` |
| `graph.span`, `.interval`, `.update_interval` | Standard `24h`, `15min`, `5min`; Intervalle `5min`, `15min`, `30min`, `1h` |
| `graph.opacity`, `.hover_opacity` | Optionale Deckkraft-Multiplikatoren 0–1 für gezeichnete Kurven/Flächen, Standard 0.5 / 0.8; leer = Theme. In den GUI-Editoren jeder Graph-Kartenfamilie verfügbar. |
| `graph.min_height` | Mindesthöhe der Karte mit randfüllendem Hintergrundgraph, GUI 90–1000px; Lichtstandard 90px. Legacy `graph.height` wird weiter gelesen. |
| `switch_style` | `liquid_glass`, `classic` |
| `child_lock`, `child_lock_entity` | Bedienung sperren, siehe Schalter |

Nur gemeldete Fähigkeiten erscheinen. Im Einzelreglermodus werden RGB und Farbtemperatur nicht gleichzeitig angezeigt. Das aktive `color_mode` entscheidet über die Farbanzeige; alte RGB-Attribute überdecken keinen aktuellen Weiß-/Temperaturmodus. Ausnahme: HS mit null Kelvin und weißlichtähnlichem RGB wird innerhalb der gemeldeten Kelvin-Grenzen ausschließlich für die Anzeige als Farbtemperatur angenähert. Die letzte Temperaturanforderung in derselben Karte bleibt 30 Sekunden stehen, solange keine neuere Anforderung folgt; aktuelle Helligkeit wird übernommen. Diese Erkennung sendet keinen Dienst. Der Effektpicker zeigt gemeldete Effekte und bietet „Kein Effekt · stoppen“.

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

## Diagramm-Einstellungen

Der Theme-Editor bietet getrennte globale Vorgaben für Hintergrunddiagramme und Seitenleiste/Overlay: `graph_background_*` und `graph_sidebar_*`. Zeitspanne standardmäßig `24h`, getrennte Auflösung für `energy`, `power` und `other`, aktuelle Legendenwerte sowie `diagram`-/`series`-Hover mit Schatten, Elastizität, Wachstum, Deckkraft und CSS-Deklarationen. Serien-Hover unterstützt zusätzlich gemeinsame Zeitmarkierung und Abdunkeln anderer Zeitpunkte. Theme-Export verwendet entsprechende Tokens `dash6-graph-background-*` / `dash6-graph-sidebar-*`. Vorgaben bleiben wie der bisherige Theme-Editor browserbezogen.

Im Bearbeitungsmodus öffnet das mittig über dem Graphen sichtbare Diagrammsymbol den Instanzeditor. Er speichert Ausnahmen im HA-Benutzerspeicher; die Dashboard-Konfiguration wird dafür nicht umgeschrieben. Leer bedeutet erben, false/0 sind ausdrückliche Ausnahmen. „Alle Ausnahmen auf globale Vorgaben zurücksetzen“ speichert `inherit: true`. Dauerhafte Konfigurationsvorgaben können alternativ so angegeben werden:

```yaml
dash6_graph:
  span: 24h
  legend_value: true
  series_hover:
    shadow: 4
    elasticity: 1
    growth: 20
    opacity: 1
    crosshair: true
    dim: false
    css: "filter: brightness(1.1);"
  series:
    - entity: sensor.example_power
      name: Beispiel
      color: "#6ec7ff"
      type: line
      resolution: 5min
```

Pro Reihe sind `entity`, `name`, `color`, `type` und `resolution` optional. Darstellungen: `column`, `stacked`, `line`, `area`, `step`; Auflösungen: `1min`, `5min`, `10min`, `15min`, `30min`, `1h`. Ein Entity-Wechsel entfernt quellgebundene Generatoren/Transformationen und übernimmt die neue native Quelle. Bereits konfigurierte Achsen bleiben bestehen. Energie wird aus nativen Verbrauchsstatistiken summiert; bei solchen Quellen ist 1 Minute effektiv mindestens 5 Minuten. Es wird keine Energie aus Leistung erzeugt. Für den von IKEA-Karten erzeugten Hintergrundgraphen heißt der entsprechende Abschnitt `graph.settings`.

Auslieferungsstand und Live-Abnahme stehen im projektinternen Änderungsjournal. Lokale Tests allein belegen keine installierte Browserfassung.

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

Der Graph füllt als absolute Hintergrundebene die gesamte innere Kartenfläche. Ausnahme für sichtbare Slider/Kombi-Slider oder Szenen-Buttons: Graphende mindestens 8px über dem obersten dieser Elemente, auch bei reinen Szenenzeilen, Schuhschrank-Karten und nach Größen-/Modusänderungen. `graph.min_height` ist in der GUI je Instanz einstellbar; IKEA/Messsteckdose und Lüfter starten mit 118px, abgeleitete Karten erhalten eine größere vorhandene Höhe. Bestehendes IKEA-`height` bleibt als Mindesthöhe lesbar. Die Karte kann mit ihrem Inhalt wachsen. Sein Tooltip erscheint außerhalb der Card. Ohne `power_entity` wird dieser Hintergrundgraph nicht angelegt. `graph.minimum` setzt eine Mindestobergrenze der Skala, keinen Messwert.

Die Theme-Werte `dash6-graph-opacity` (0.5) und `dash6-graph-hover-opacity` (0.8) multiplizieren die bisherige Kurven-/Flächenoptik; Kartenwerte `graph.opacity`/`graph.hover_opacity` haben Vorrang. Bei leerem GUI-Feld wird wieder das Theme genutzt. Nur die SVG-Plotgruppe wird gedämpft, keine Tooltip-Fläche und kein Geräte-/Statuswert. Header-Elemente besitzen 12px Innenabstand links/oben wie die Licht-Referenzkarten; Zusatzwerte bleiben erhalten.

Die Theme-Werte `dash6-graph-fill-opacity` (0.16), `dash6-graph-line-opacity` (0.65) und `dash6-graph-glow` bestimmen die dezente Liquid-Glass-Optik ausschließlich für gezeichnete Kurven. Die externe Tooltip-Ebene bleibt voll lesbar und unverändert bedienbar.

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

Satin verwendet eine gemeinsame äußere Glasfläche mit transparenter nativer Anzeige, versenkten Gauge-Bögen, Modusgruppe, Preset-Menü und unabhängigen elastischen Glasgriffen. Ruhedurchmesser der Griffe 120% der nativen Balkenbreite, Hover 150% der Ruhegröße, Klick/Drag 200%; die native Ziehfläche bleibt eingabeführend. Preset-Zeilen bleiben beim Drücken gleich groß; Außenklick schließt ohne eine darunterliegende Karte zu bedienen. Zwei Sollwerte brauchen keine zusätzliche Frontend-Dual-Thermostat-Karte; die Backendintegration liefert die Climate-Entity.

## Medien

| Schlüssel | Bedeutung |
| --- | --- |
| `apple_entity` | Apple-TV-`media_player` |
| `apple_remote` | Apple-TV-`remote` |
| `fire_entity` | Fire-/Android-TV-`media_player` mit ADB-Unterstützung |
| `apple_device_type` | Firemote-Modell, z. B. `appletv-4k-gen2` |
| `fire_device_type` | Firemote-Modell, z. B. `fire_tv_4_series` |
| `name` | Kartentitel |

Die Hauptkarte bevorzugt aktives Apple TV und zeigt native Mediensteuerung. Das Modal enthält Geräteauswahl, Fernbedienungen und Transporttasten. Firemote ist die erweiterte Fernbedienung; bei fehlendem Modul gibt es einfache Tasten. Apple-TV-Befehle verwenden die konfigurierte Remote; Xiaomi-Tasten verwenden explizite ESPHome-Button-Zuordnungen. `tv_entity` liefert TV-Status und Eingänge. Die optionalen `tv_source_appletv_automation`, `tv_source_hdmi_1_automation` und `tv_source_hdmi_3_automation` verbinden die Quellenwahl direkt mit Automationen. Sobald zugeordnet, ersetzen diese Einträge die native App-/Quellenliste. Auswahl startet genau `automation.trigger` mit `skip_condition: true`; deren Verfügbarkeit bestimmt die Bedienbarkeit, auch bei unbekanntem TV-Status. Mit `tv_remote` verwendet Ein/Aus die Remote; bei fehlender/unbekannter/nicht erreichbarer Remote gelten `tv_power_on_button` und `tv_power_off_button` als BLE-Ersatz. Ohne `tv_remote` bleibt Ein/Aus über den Medienplayer erhalten.

TV-/Apple-TV-Karten zeigen ihren konfigurierten `name` unabhängig vom aktiven Mediengerät. Optionales `tv_status_command` liest den TV-Schaltzustand über `androidtv.adb_command` (Shell-Befehl ohne `adb shell`). Leer deaktiviert Zusatzabfragen; bei sichtbarer Karte im Minutenabstand und nach Ein/Aus. Der TV-Schalter bleibt bei erreichbarer `tv_remote` auch mit unbekanntem Medienplayerstatus bedienbar; bestehende BLE-Ersatzwege bleiben erhalten.

`custom:dash6-homepod-card` verwendet `entity: media_player.*` und optional `homepod_remote_entity`; automatisch wird ausschließlich die Remote desselben Registry-Geräts zugeordnet. Ein/Aus verbindet oder trennt die HomePod-Remote, ohne Wiedergabe zu starten. Bei konfiguriertem `tv_entity` nutzt der vorhandene Glasschalter den TV-Steuerweg (optionale `tv_remote` mit `tv_power_on_button`/`tv_power_off_button` als Ersatz) mit sofortiger optimistischer Anzeige und Rückkehr bei neuer abweichender Rückmeldung, Fehler oder 12s ohne Bestätigung. Aufwecken/Ruhezustand bedient weiterhin Apple TV entsprechend dem gewählten Fernbedienungsmodus. Ohne `tv_entity` bleibt die bisherige Apple-TV-Schaltersteuerung erhalten. HomePod zeigt vorhandenes Cover im Hintergrund. Die Apple-TV-/TV-Karte zeichnet das Medienbild in der nativen Ebene `ha-card > div.background` hinter Status und Bedienelementen (zentriert, `cover`, gedämpft, pointertransparent); eine separate Inline-Bildzeile entfällt. Transport, Medienbrowser, Fernbedienung und Lautstärke sind ohne Hover 30%, bei Hover oder sichtbarem Tastaturfokus 80% sichtbar. Lautstärke ist 21px hoch (Griff 19px), ausgeschaltet 50% Deckkraft, ohne sichtbare Beschriftung bei erhaltenem zugänglichem Wert.

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

Türkarte: `kind: apartment` braucht `entity: lock.*`; `kind: entrance` braucht einen `button.*`-Türöffner. Optional: `name`, `contact_entity`, `battery_entity`, `contact_battery_entity`, `battery_warning_entity`, `activity_entity`, `ring_entity`, zusätzliche `ring_entities` und `cancel_entities` zum Beenden der Klingelanzeige. Optische Aktivität verändert keine Schlosszustände.

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

`custom:dash6-demo-card` enthält eine `card:` mit einer eigenen DASH6-Karte. Sie stellt lokale Beispielzustände bereit und fängt Service-, API- und WebSocket-Zugriffe ab. Die Demo benötigt keine Geräte. `examples/demo-dashboard.yaml` enthält vier Views einschließlich Favoriten mit lokaler GUI. Für echte Geräte die Hülle weglassen und eigene Entitäten verwenden.

### Manuelle Reihenfolge

Im Favoriten-Editor unter **Kartensortierung → Manuell** erscheinen die ausgewählten Karten und Überschriften mit Auf-/Ab-Tasten. Die Vorschau folgt jeder Änderung; der native Speichern-Button übernimmt sie dauerhaft. Die Reihenfolge steht in `manualCardOrder` als Liste der Auswahl-IDs. Gruppen behalten ihre eigene konfigurierte View-/Domain-Reihenfolge; innerhalb eines Containers können Karten desselben Kartenarrays verschoben werden. Neu ausgewählte Elemente folgen deterministisch. Quell-Views und gespeicherte Auswahlen bleiben unverändert.

### Drei-Zustands-Lüfterschalter

`custom:dash6-fan-card` verwendet eine runde Satin-Linse mit drei gleichmäßig verteilten Moduszielen. Der bestätigte aktive Modus steht links; alternative Ziele bleiben direkt per Pointer und Tastatur erreichbar. Hauptentity aus bedeutet Aus, Hauptentity ein bei ausgeschaltetem `force_switch_entity` bedeutet Auto, beide ein bedeutet Ein. Force-Schalter per YAML und GUI konfigurieren. Identische Zustandsmeldungen und Initialisierung starten keine Wechselanimation. Unbekannte oder nicht verfügbare Schaltzustände sperren die Bedienung.

`remaining_time_entity` verweist auf eine schreibbare Zahl in Minuten: Ein setzt 60 und aktiviert Force, Auto/Aus deaktivieren Force und setzen 0. Hauptentity steuert weiterhin Aus/Auto. `running_switch_entity` und `running_force_switch_entity` sind getrennte, nur gelesene physische Ausgangszustände für Rotor/Leuchten und Aktiv-Anzeige. `presence_entity` zeigt nur aktuelle Präsenzdauer. Statusblöcke umbrechen vor der rechten Messwertspalte; Graph ist an allen vier Innenkanten bündig.

Ohne Minuten-Entity bleibt `timer_entity` als Kompatibilität zu vorhandenen nativen HA-Timern unterstützt. Die Karte startet/pausiert diesen Timer nicht; die bestehende Anlage braucht eigene Automationen. Pausiert bleibt die Restzeit stabil, idle bedeutet 0, unbekannt `—`. Diese Alternative ist keine Anweisung, eine bestehende Zahl-/Shelly-Kette parallel mit einer zweiten Timerkette zu betreiben.

## Gemeinsame Raumabfrage

Vollständige Kartendefinitionen können direkt in der View stehen. Die bestehenden Spezialkarten werden mit ihrer normalen Konfiguration verwendet. Für eine native oder fremde Karte mit den gemeinsamen Material- und Bedienungsadaptern steht `dash6-direct-card` zur Verfügung:

```yaml
type: custom:dash6-direct-card
card:
  type: media-control
  entity: media_player.demo_player
```

`dash6-domain-card` verbindet früh angezeigte bekannte Karten mit dynamisch ermittelten Karten. Im folgenden Beispiel gehören die Demo-Steckdose und weitere Schalter zu einem gemeinsam gerahmten Raster. Die Überschrift steht außerhalb des Rasters; ab 700px sind zwei Spalten sichtbar, darunter eine.

```yaml
type: custom:dash6-domain-card
combine: true
columns: 2
mobile_columns: 1
mobile_breakpoint: 700
edge_alignment: flush
cards:
  - type: custom:vertical-stack-in-card
    cards:
      - type: heading
        heading: Schalter
      - type: tile
        entity: switch.demo_socket
known_entity_ids:
  - switch.demo_socket
query:
  group: example-room
  index: 0
  canonical: true
  template: |
    {% set ns = namespace(cards=[]) %}
    {% for id in area_entities('Beispielraum') | sort %}
      {% if id.startswith('switch.') %}
        {% set ns.cards = ns.cards + [{'type': 'tile', 'entity': id}] %}
      {% endif %}
    {% endfor %}
    {{ [ns.cards] | to_json }}
```

Entitäten und Bereichsname sind erfundene Platzhalter. `query.template` liefert hier eine äußere Liste; `index: 0` wählt deren erste Kartenliste. `canonical: true` bedeutet, dass die Ausgabe bereits vollständige Kartenobjekte enthält. Die bekannten Entities werden aus den dynamischen Ergänzungen ausgeschlossen; fehlende und in der Registry ausgeblendete Entities entfallen.

Mehrere Karten mit derselben `query.group` teilen pro Home-Assistant-Verbindung eine Template-Subscription, auch mit unterschiedlichen inline gespeicherten Templates. Der Gruppenname ist frei wählbar; alle Templates und Karten bleiben in der Dashboard-Konfiguration. Ohne Gruppe teilen identische Templates eine Subscription. Unveränderte Listen und reine Zustandsupdates verwenden bestehende Karten weiter. Weitere Optionen und die inline konfigurierbare Layoutsichtbarkeit stehen in [Direkte Inline-Konfiguration](#direkte-inline-konfiguration).


### TV power, inputs and Xiaomi remote

`dash6-appletv-card` / `dash6-media-card` accept `tv_entity` (media_player), `tv_sources` (comma/newline-separated names), and `fire_remote_style` (`XM1` or `XM2`). TV state and source selection use `tv_entity`. Optional `tv_remote` routes power through remote.turn_on/turn_off; missing/unknown/unavailable remotes fall back to the explicit `tv_power_on_button` / `tv_power_off_button` entities. Without `tv_remote`, legacy media_player power services remain. The existing glass switch owns TV power, with optimistic animated feedback and reconciliation against fresh TV reports; the duplicate power button is removed. All entries of a non-empty live source_list take precedence; tv_sources is only used when no usable live list exists. An HDMI button in the transport row opens the Liquid Glass source menu. `fire_entity` is an optional legacy playback fallback. Artwork is a centered cover background in the native player layer `ha-card > div.background`, behind status and controls; no separate inline image row is rendered. The remote dialog stacks media and remote on mobile; its keyboard table follows a separated full-width section. Wake/sleep actions are plain until pressed.

Xiaomi commands use `fire_button_power`, `up`, `down`, `left`, `right`, `select`, `back`, `home`, `enter`, `voice`, `volume_up`, `volume_down`, `mi_home`, `movie`, `android_tv`, `netflix`, `prime_video` (prefix every key with `fire_button_`). Values are button entity IDs. Missing bindings never fall back to ADB. All fields are available in the GUI. Apple TV retains `apple_entity`, `apple_remote` and `apple_device_type`; each remote view shows its own keyboard table.


## Virtuelle Demo und portabler Raumlader

Die installierte Demo verwendet die regulären Karten mit Backend-Entities unter `*.liquid_glass_demo_*`. `custom:dash6-demo-scope` umschließt jede oberste Demo-Karte und begrenzt Zustände, Registries und Serviceziele auf diesen Namensbereich. Der Wrapper ist für die Demo gedacht; für eigene echte Geräte bewusst entfernen.

`room-loader.js` und `room-loader-configs.json` werden gemeinsam installiert und automatisch geladen. Die enthaltene Definition `room: demo`, `slot: lights` ist ein öffentliches Beispiel mit Dummy-Entities. Private Raumdefinitionen werden nicht exportiert. Eigene Definitionen außerhalb des Paketordners speichern und über `config_source: /local/meine-raumdefinitionen.json` an `dash6-room-slot-card` bzw. `dash6-room-layout-card` übergeben; andernfalls würden Paketupdates eigene Änderungen überschreiben. Für neue Räume ist die native Domain-GUI der einfachere Weg.
