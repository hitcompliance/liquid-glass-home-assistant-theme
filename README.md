# Liquid Glass für Home Assistant

Ein vollständiges Glas-Paket für Home Assistant: dunkle Themes, interaktive Custom-Cards und ein grafischer Materialeditor. **DASH6 Satin Glass** verbindet sanft gefrostetes Rauchglas mit kleinen beleuchteten Schaltern, versenkten Reglern und flachen Glaslinsen. Die ursprünglichen Liquid-Glass-Themes bleiben erhalten.

**[Interaktive Demo](https://hitcompliance.github.io/liquid-glass-home-assistant-theme/)** · [Installation](docs/INSTALLATION.md) · [Karten und Einstellungen](docs/CARDS.md) · [Abhängigkeiten](docs/DEPENDENCIES.md) · [Umstieg](docs/MIGRATION.md)

[![In HACS hinzufügen](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=hitcompliance&repository=liquid-glass-home-assistant-theme&category=integration)

## Was enthalten ist

Das Theme bestimmt Farben und Material. Das zusätzliche Kartenmodul liefert Schalter, Regler, Auswahlgruppen, Dialoge und Anpassungen vorhandener Button-/Mushroom-Karten. Für den vollständigen Satin-Look werden **Theme und Kartenmodul gemeinsam** installiert. Die **HACS-Integration** richtet Themes, alle eigenen Karten und fehlende Karten-Abhängigkeiten automatisch ein. Ein Terminal und manuelle Ressourcen-Einträge sind dafür nicht nötig.

| Bestandteil | Inhalt |
| --- | --- |
| `themes/` | Zwei ursprüngliche Liquid-Glass-Themes und sechs DASH6-Varianten |
| `dist/dash6-cards.js` | Aktuelles Gesamtmodul mit Satin, Kartenadaptern und Editoren |
| `dist/chunks/`, `dist/profiles/` | Zugehörige Module und neutrale Beispielprofile; mitkopieren |
| `dist/dash5-light-cards-v2.js` | Kompatibilitätseinstieg zum aktuellen Hauptmodul; nicht zusätzlich registrieren |
| `dist/vacuum-dock-card.js` | Eigenständige Staubsauger-/Dock-Karte |
| `frontend/dash5-glass.js` | Optional erhaltene SVG-Hintergrundbrechung für die ursprüngliche DASH5-Ansicht |
| `examples/demo-dashboard.yaml` | Interaktives Demo-Dashboard mit isolierten simulierten Werten und Design-Prinzipien; keine Geräte erforderlich |
| `examples/dashboard.yaml` | Portables Gesamtbeispiel mit erfundenen, auszutauschenden Entitäten |

## Interaktives Demo-Dashboard

[examples/demo-dashboard.yaml](examples/demo-dashboard.yaml) enthält drei Views: **Licht und Material**, **Bedienung und Bewegung** sowie **Klima und Prinzipien**. Licht, Lichtgruppe, Steckdose, Ventilator-Schalter, Rollo und Dual-Thermostat sind bedienbar. Die `dash6-demo-card`-Hülle stellt lokale Beispielzustände bereit und fängt Geräteaktionen ab. Es werden keine eigenen Geräte benötigt und keine echten Serviceaufrufe gesendet.

Die Integration zeigt das interaktive Demo-Dashboard automatisch als **Liquid Glass Demo** in der Seitenleiste. Es benötigt keine Geräte. Beide Beispiel-Dateien liegen zusätzlich unter `liquid-glass/examples/` im Konfigurationsverzeichnis; dort lässt sich eine eigene, editierbare Kopie erstellen.

## Themes

| Name in Home Assistant | Gestaltung |
| --- | --- |
| **Liquid Glass** | Ursprüngliches dunkles Glas ohne zusätzliche Bewegungsanimation |
| **Liquid Glass Motion** | Ursprüngliches Glas mit dezenten Einblendungen und Hover-/Fokusübergängen |
| **DASH6 Modern Glass** | Ursprüngliche DASH6-Materialvariante |
| **DASH6 Modern Glass (apple-konform)** | Zurückhaltende DASH6-Variante |
| **DASH6 Modern Glass (stark elastisch)** | DASH6 mit stärkerer elastischer Rückmeldung |
| **DASH6 Modern Glass (apple-konform, stark elastisch)** | Kombination der beiden DASH6-Varianten |
| **DASH6 Modern Glass (Safari SVG-Linsen)** | DASH6-Variante mit SVG-Linsen |
| **DASH6 Satin Glass** | Sanft gefrostetes, flacheres Rauchglas und kompakte Satin-Bedienelemente |

Satin wird durch die aktive Theme-Variable `dash6-satin-enabled: '1'` eingeschaltet. Das öffentliche Gesamtmodul unterstützt beliebige Dashboard-Pfade. Die ältere optionale SVG-Erweiterung hat einen eigenen, engeren Geltungsbereich; siehe [Installation](docs/INSTALLATION.md#optionale-ursprüngliche-svg-optik).

## Die Satin-Bedienung

- **Ein links, Aus rechts:** Der kleine Schalter trägt das vorhandene Icon. Kapsel und Icon leuchten in der Farbe der Hauptentität; die Helligkeit ist sichtbar. Ohne einstellbare Lichtfarbe leuchtet Ein gelb. Hover federt leicht, beim Drücken wird die Linse kurz gequetscht und bewegt sich anschließend zur anderen Seite.
- **Versenkte Slider:** Die rechteckige Glaslinse vergrößert sich bei Klick, Touch und Drag. Während eines Drags bleibt der eingestellte Wert stabil; die neue Einstellung wird beim Loslassen übertragen. Schmale helle Streifen am linken Sliderrand und unteren Kartenrand entfallen.
- **Gemeinsame Auswahlfläche:** Rechteckige Button-Gruppen mit abgerundeten Ecken liegen in einer versenkten Glasfläche. Die aktive Linse liegt plan zur Oberfläche und federt beim Hover. Bestehende Mehrfachauswahl bleibt Mehrfachauswahl.
- **Effekt-Taste:** Unterstützte Lichter erhalten oben rechts eine flache Rauchglastaste. Ein laufender Effekt beleuchtet sie von innen weiß; ein Klick drückt sie sichtbar ein. Der Effektpicker bietet auch das Stoppen des Effekts.
- **Einheitliche Karten:** Dunkle Glasflächen teilen Material, Transparenz und Glanz. Hover-Glanz folgt dem Zeiger. Hintergrundgraphen und strukturelle Layoutcontainer bleiben dort transparent, wo dies zur Karte gehört.
- **Thermostat und Dual-Thermostat:** Nur die bis zu vier Modustasten unten links, die Preset-Taste unten rechts und die Glaslinsen der Temperaturgriffe werden angepasst. Außenfläche, Werte, Ring, Track und Preset-Dialog behalten ihre ursprüngliche Darstellung. Die DASH6-Thermostatkarte bleibt 265px hoch.

Die Animationen berücksichtigen „Bewegung reduzieren“. Auf Touchgeräten benötigt keine Funktion einen Hover.

## Karten für das ganze Dashboard

| Familie | Funktionen |
| --- | --- |
| Govee-/allgemeine Lichtkarte | Kombi- oder Einzelregler, Farbe, Farbtemperatur, Helligkeit, unterstützte Effekte, Segmente und optionale Leistung/Energie |
| Lichtgruppe und Schuhschrank | Detailmodal beim Hintergrundklick, auswählbare Mitglieder, gemeinsame Steuerung, Segmentdarstellungen und Szenen |
| IKEA-/Messsteckdose | Licht/Schalter, Leistung/Energie, optional LED und Kindersicherung, Hintergrundgraph mit externem Tooltip |
| Ventilator und vorhandene Schalterkarten | Satin-Adapter für geeignete Button-/Mushroom-Karten; native Aktionen und zusätzliche Regler bleiben erhalten |
| Cover/Rollo | Vertikale Positionssteuerung und Status, maximal 300px Kartenhöhe |
| Thermostat/Dual-Thermostat | Native ein- oder zweifache Temperaturbedienung, unterstützte Modi und Presets |
| Medien | Native Mediensteuerung, Apple-TV-/Fire-TV-Auswahl, Fernbedienungsmodal und Tastaturbedienung im Modal |
| Staubsauger und Dock | Statusanimation, Start/Stop, Individuell-Dialog, Raum-Mehrfachauswahl, Dock-Funktionen und Wartungsdialog |
| Türen | Schloss oder Türöffner, Kontakt, Batteriewarnung und getrennte Türaktionen |
| Lokale Gerätekamera | Kamera des aktuellen Browsers mit ausdrücklichem Start, ohne Mikrofon; Stop beim Verlassen/Hintergrundwechsel |
| Auswahl, Bereich und Struktur | Segmentauswahl, Bereichsheader mit Uhr, Stack, eingebettete Views, Ultra-Card sowie Render-/Profilwrapper |
| Theme-Editor | Material, Transparenz, Glanz, Elastizität und Bewegungswerte grafisch einstellen, zurücksetzen und exportieren |
| Vacuum Dock Card | Separat nutzbarer Staubsauger-/Dock-Assistent mit deutscher/englischer Oberfläche |

„Govee“ schränkt die Lichtkarte nicht auf diesen Hersteller ein: Entscheidend sind die von der `light`-Entity gemeldeten Funktionen. Roborock-Raumaufträge und Medien-Fernbedienungen benötigen die passenden Geräteintegrationen. Alle Kartentypen und gültigen Schlüssel stehen in [CARDS.md](docs/CARDS.md).

## Installation und erstes Dashboard

**Empfohlen: HACS-Integration ab Home Assistant 2026.9.**

1. Oben **In HACS hinzufügen** öffnen, als Kategorie **Integration** hinzufügen und herunterladen.
2. Home Assistant neu starten.
3. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Liquid Glass** wählen und bestätigen.
4. **Liquid Glass Demo** in der Seitenleiste öffnen; für eigene Views **DASH6 Satin Glass** auswählen.

Die Integration lädt fehlende Frontend-Abhängigkeiten in festgelegten Versionen mit Prüfsummen. Bereits registrierte HACS-Module bleiben aktiv und werden weiter durch HACS aktualisiert. Automatisch geladene Vendor-Kopien werden über Liquid Glass verwaltet, nicht als eigene HACS-Repositories. Optional lässt sich Dual Smart Thermostat mitinstallieren; hierfür sind ein weiterer Neustart und eine eigene Thermostat-Konfiguration nötig. [Details und Umstieg](docs/INSTALLATION.md#automatische-installation-mit-hacs).

Der [Python-Installer](docs/INSTALLATION.md#installation-mit-dem-python-installer) bleibt als Alternative für manuelle Installationen erhalten. Für ein eigenes Dashboard:

1. [Theme, Kartenmodul und benötigte Abhängigkeiten installieren](docs/INSTALLATION.md).
2. **DASH6 Satin Glass** im Profil oder in der View auswählen.
3. Im Karteneditor eine DASH6-Karte hinzufügen und die eigenen Entitäten auswählen.
4. [examples/dashboard.yaml](examples/dashboard.yaml) in den Rohkonfigurationseditor eines neuen Dashboards übernehmen und alle `demo_…`-Entitäten ersetzen. Es ist eine Konfiguration, keine Simulation; ohne passende Entitäten fehlen Daten.

Eine einzelne Lichtkarte:

```yaml
type: custom:dash6-govee-light-card-v2
entity: light.demo_lampe
name: Stehlampe
controls:
  mode: combo
  label: icon
  buttons: group
  density: compact
  position: right
```

Die grafischen Karteneditoren sind der einfachste Einstieg. Lichtkarten innerhalb verschachtelter Dashboards können zusätzliche Einstellungen als Home-Assistant-Benutzerdaten speichern; sie überschreiben nur die jeweilige Karte. Der Theme-Editor speichert Sofortänderungen browserlokal und bietet einen Export für weitere Geräte. [Umstieg und Rücksetzen](docs/MIGRATION.md).

## Bestehende Dashboards weiterverwenden

Die ursprünglichen Themes und Ressourcen können weiterverwendet werden. Das aktuelle Gesamtmodul ersetzt beim Umstieg die ältere DASH6-Ressource: Beide registrieren dieselben `dash6-*`-Elemente und dürfen nicht gleichzeitig geladen werden. Das Gesamtmodul bietet auch die DASH5-v2-Kompatibilität (einschließlich Multi-Light-Aliasnamen); der separate Kompatibilitätseinstieg wird nicht zusätzlich registriert. [MIGRATION.md](docs/MIGRATION.md) erklärt Zuordnung und Rückweg.

Button-/Mushroom-Karten erhalten nur dann einen Satin-Schalter, wenn die vorhandene Icon-Aktion als Ein/Aus-Bedienung erkennbar ist. Gesperrte oder unklare Vendor-Konfigurationen bleiben nativ. Die Adapter erhalten native Aktions-, Bestätigungs- und Sperrwege. Das Paket erstellt keine Geräte und ersetzt keine Geräteintegration.

## Voraussetzungen und Grenzen

Die Karten benötigen unterschiedliche Zusatzmodule. Eine Lichtkarte braucht weniger als ein komplettes Ultra-/Graph-/Medien-Dashboard. [DEPENDENCIES.md](docs/DEPENDENCIES.md) nennt Zuordnung und vom Installer verwendete Versionen. Die HACS-Integration installiert fehlende Frontend-Abhängigkeiten automatisch; eine ältere reine HACS-Theme-Installation tut dies nicht.

Aktuelle Browser mit Custom Elements, Shadow DOM und `<dialog>` werden vorausgesetzt. Chrome/Chromium und Safari/WebKit wurden für Satin-Bedienelemente und Dialoge geprüft. Änderungen an HA-Frontend-Interna und Fremdkarten können Anpassungen nötig machen. Eigene CSS-Regeln und geschlossene Shadow Roots können Styling-Hooks begrenzen; vollständige Umgestaltung sämtlicher Fremdkarten ist nicht pauschal zugesichert.

SVG-Hintergrundbrechung und Satin-Frostung sind getrennte Funktionen. Die ursprüngliche SVG-Optik bricht eine Kopie des Hintergrundbilds, nicht sämtliche Live-Dashboard-Inhalte. Satin verwendet CSS-/SVG-Materialien und die dafür vorgesehenen Kartenadapter.

## Projekt und Lizenzen

Demo, Default-Zuordnungen und Beispiele enthalten neutrale Daten. Für das Dashboard werden eigene Entitäten benötigt; Zugangsdaten und Tokens gehören nicht in die Kartenkonfiguration. Das beigelegte Wohnzimmerbild ist ein für das Projekt erzeugter Hintergrund.

Dieses Projekt ist unabhängig von Apple und Home Assistant. Der Theme-Teil steht unter [MIT](LICENSE); Quell- und Fremdlizenzen der mitgelieferten Karten stehen bei den jeweiligen Modulen und Lizenzhinweisen. Für die ursprüngliche SVG-Optik siehe [THIRD-PARTY-LICENSE.md](frontend/THIRD-PARTY-LICENSE.md).

Weitere Einordnung: [Design-Notizen](docs/DESIGN-NOTES.md) und [ursprüngliche DASH5-Kompatibilität](docs/CARD-COMPATIBILITY.md).



### Lichtgruppen ab Kartenpaket 2.4.0

In den Theme-Einstellungen heißt die optionale Mitgliederanzeige **Lichtgruppen Sonder-Schalter**; sie ist standardmäßig aus. Im visuellen Karteneditor lassen sich Leistung/Energie, die Mindestskala (100 W), Haupt-/Backlight und folgende Zeilen konfigurieren:

```yaml
rows:
  controls: true
  scenes: false
main_back:
  enabled: true
  main_entity: switch.example_main_light
  back_entity: switch.example_backlight
power_entity: sensor.example_power
energy_entity: sensor.example_energy
graph:
  minimum: 100
scenes:
  - entity: scene.example_evening
    name: Abend
    icon: mdi:weather-night
    fill: linear-gradient(90deg, rgba(90,30,120,.7), rgba(20,70,120,.7))
```

Für die Szenen muss `rows.scenes: true` gesetzt werden. Ohne zusätzliche Konfiguration bleibt die Steuerungszeile aktiv. Effekte erscheinen bei entsprechendem Geräteangebot. Zugeordnete Haupt-/Backlights folgen dem zentralen Ein-/Ausschalten; die Zusatzbuttons bleiben einzeln bedienbar.

Bei Haustürkarten können `ring_entities` weitere Klingelsensoren und `cancel_entities` die Öffner/Schlösser angeben, die das Klingelsignal beenden. `contact_entity` verwendet den Wohnungstürkontakt. Die Farbmarkierung verändert keine Tür- oder Schlosszustände.

### HomePod controls (Cards 2.4.1)

With the Satin theme active, native media-control cards whose entity ID or friendly name includes `HomePod` gain previous/play-pause/next buttons and a liquid-glass volume slider. The slider has no visible labels, keeps an accessible name and value, and dims to 50% for off or standby players. Album artwork remains visible; cards without artwork use a transparent background. Optional dashboard scope is respected.

### Refrigerator example

[Refrigerator card configuration](examples/refrigerator-card.json) uses neutral example entities. Place it in its own cooling appliances block and replace the entities with your own. It retains power, energy, refrigerator/freezer temperatures, express-mode status and the door-opening graph. A single lock marker belongs to the glass switch; an open-door indicator appears at the top right only while the door contact is open.

Cards 2.4.4 also add the current glass switch to native light cards when the theme is active, remove light scene gaps, restore light graph hover/portal tooltips, enlarge thermostat lenses during dragging and add 8px below HomePod volume sliders.

Cards 2.4.5 routes HomePod power through the Apple TV remote belonging to the same registry device. This connects/disconnects the HomePod without starting music. An explicit `homepod_remote_entity` can be supplied where entity registry metadata is unavailable; unrelated remotes are never inferred from names.

### HomePod card
Use `custom:dash6-homepod-card` with a media-player `entity`. It preserves native media controls and adds the Satin transport and volume controls. Power uses the Apple TV remote from the same device; `homepod_remote_entity` can explicitly select that remote. Power connects or disconnects Home Assistant and does not start playback.

### Apple TV and television card
`custom:dash6-appletv-card` replaces `custom:dash6-media-card` and keeps its configuration and visual editor: `apple_entity`, `apple_remote`, `fire_entity` and both Firemote device types. HomePod and Apple TV cards show the shared managed Apple switch, device name and playback status within a thick dark glass shell. Preset and wake/sleep controls are flat at rest, raised with pointer-following gloss on hover and deeply recessed while pressed. The remote selector has a nonelastic sliding lens. A fridge button-card can opt in with `satin_fridge: true`; its existing door-status field also identifies the fridge presentation.

Apple-TV-/Fernseherkarten zeigen mit `?edit=1` ein Zahnrad für den GUI-Editor. Er bietet Name, Bereich, Medien-/Remote-Entities und Firemote-Modelle sowie **Automatisch ermitteln**. Eindeutige Geräte im gewählten Bereich werden vorgeschlagen; HomePods und Remote-Entities anderer Geräte werden ausgeschlossen. Der Fernseher benötigt eine Android-TV-ADB-Entity. Mehrdeutige Apple-TV-Treffer bleiben zur Auswahl offen. **Speichern** sichert ausschließlich diese Karte im Home-Assistant-Benutzerprofil; **Abbrechen** verwirft den Entwurf und **Dashboard-Vorgabe** setzt die persönliche Anpassung zurück. Die GUI ist auch der native Karteneditor.

Thermostat-Gauges behalten ihre native Temperaturbedienung mit versenkten Bögen mit Innenschatten und elastischen Glasgriffen. Verbrauchsteilbuttons haben einen transparenten Hoverrahmen und sofort zurückkehrenden Druckschatten. Inaktive Preset-Zeilen sind transparent, bei Hover 30 Prozent weiß und während Druck vertieft; die aktive Auswahl bleibt erhaben und aktualisiert das Kartenicon aus dem tatsächlichen Entity-Zustand.

Cards 2.4.11: Preset-Menüzeilen behalten auch während Druck ihre Größe und Position. Das Menü ist halbtransparent mit deutlichem Schatten und schließt bei Außenklick; der Außenklick bedient keine darunterliegende Karte. Thermostat-Gauge-Bögen erhalten eine versenkte Darstellung mit dunklem oberen Innenrand und heller unterer Innenkante; die elastischen Glasgriffe bleiben erhalten.

Cards 2.4.12: Reset and confirmation buttons in the vacuum maintenance dialog are flat at rest, raised liquid glass with pointer-following gloss on hover and deeply recessed while pressed. The existing two-step reset confirmation and entity mapping remain unchanged.

Cards 2.4.13: Refrigerator button-cards inherit the same shared theme material and pointer gloss as IKEA cards. The earlier refrigerator-only fixed dark material is retired; door status, temperatures, power/energy, graph and 12px values padding remain.

Cards 2.4.14: HomePod and Apple-TV/TV cards show Browse media only as the final transport button, styled like its neighbors and delegating to the current native media-browser action. Their player containers use the theme token dash6-media-player-padding-top (0px), applied with !important.

Cards 2.4.15: HomePod and Apple-TV/TV shells inherit the same transparent material, subtle gloss overlay, and pointer-following hover gloss as IKEA cards. Legacy media-specific material overrides are retired while transport, status, remote controls, and media browsing remain intact.

### Fan modes and metered light cards (2.4.16)

`custom:dash6-fan-card` provides a visual editor for the main fan/switch, optional power and energy sensors, and `force_switch_entity` (switch or input_boolean). Its glass selector uses Automatik (main on, force off), Ein (both on), and Aus (both off). Service calls are sequential; unavailable entities disable the control and inconsistent states have no selected mode. No commands run when the card loads.

```yaml
type: custom:dash6-fan-card
entity: fan.example
force_switch_entity: input_boolean.example_force
name: Fan
power_entity: sensor.example_power
energy_entity: sensor.example_energy
```

An optional `definition` preserves an existing button-card layout and background graph. Native light cards retain their icon action while using the current glass switch. Scene rows in Govee and lightgroup cards use an 8px gap. Metered on/off lights and switches can use `custom:dash6-ikea-card` with `power_entity` and `energy_entity`, regardless of device brand.

All visible dashboard card surfaces share the Govee reference material and pointer-following hover gloss under the active Satin theme. Explicit clear shells, layout layers and embedded background graphs remain transparent; native thermostats inside a themed thermostat shell do not add a second glass layer.
