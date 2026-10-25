# DASH6 Satin Glass für Home Assistant

Ein vollständiges HACS-Paket mit **DASH6 Satin Glass**, eigenen Custom Cards, grafischen Editoren und einer bedienbaren Demo mit virtuellen Home-Assistant-Geräten. Ab Version 3.2 wird ausschließlich dieses Theme ausgeliefert.

[Browser-Vorschau](https://hitcompliance.github.io/liquid-glass-home-assistant-theme/) · [Installation](docs/INSTALLATION.md) · [Alle Abhängigkeiten](docs/DEPENDENCIES.md) · [Kartenreferenz](docs/CARDS.md) · [Karten, Detailansichten & GUI](docs/CARD-GUIDE.md) · [Anleitung für Agenten](AGENTS.md)

[![In HACS hinzufügen](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=hitcompliance&repository=liquid-glass-home-assistant-theme&category=integration)

## In wenigen Schritten starten

1. Home Assistant **2026.9 oder neuer** und [HACS](https://www.hacs.xyz/docs/use/download/download/) selbst installieren, falls noch nicht vorhanden.
2. Dieses Repository in HACS als **Integration** hinzufügen und herunterladen.
3. Home Assistant neu starten. Unter **Einstellungen → Geräte & Dienste → Integration hinzufügen → Liquid Glass** einrichten. **Interaktives Demo-Dashboard** eingeschaltet lassen.
4. **Liquid Glass Demo** in der Seitenleiste öffnen. Die Einrichtung installiert das Theme, die eigenen Karten und alle fehlenden Frontend-Abhängigkeiten automatisch. Kein npm, kein YAML-Kopieren und kein manuelles Anlegen der Demo-Entities erforderlich.

Bei der ersten Einrichtung ist Internetzugriff auf GitHub erforderlich. Nach einem Update Home Assistant neu starten und den Browser vollständig neu laden. Bereits separat installierte HACS-Fremdkarten werden wiederverwendet und weiter durch HACS aktualisiert.

## Automatisch enthalten

- **Nur DASH6 Satin Glass**, einschließlich Theme-Editor, Hintergrundoptionen und gemeinsamer Glasbedienung.
- Eigene Karten für Lichter/Gruppen/Schuhschrank, Messsteckdosen/Kühlschrank, Drei-Modus-Lüftung, Thermostate, Rollos, HomePod/Apple TV/TV, Türen/Schlösser, Roboter/Dock, Pflanzen und Kamera sowie Raum-, Domain-, Profil-, Struktur- und Favoritenkarten.
- Alle JavaScript-Einstiege, nachgeladenen Chunks, neutralen Profile, Bilder und Lizenzen; HACS lädt ein eigenständiges Laufzeitpaket unter `custom_components/liquid_glass/`.
- **Zwölf automatisch installierte Fremdmodule:** Ultra Card, Button Card, Mushroom, Auto Entities, ApexCharts Card, Mini Graph Card, Card Mod, Layout Card, More Info Card, Vertical Stack In Card, Firemote und Embedded View Card. Die [Abhängigkeitstabelle](docs/DEPENDENCIES.md) nennt Versionen, Zweck und Installationsverhalten.
- Eine vollständige Demo mit **18 Views**: Einstieg **Alle Karten & Details**, Räume nach dem Vorbild von DASH6 ohne Florin, Karten-/Layoutansichten und Favoriten-GUI. Die Integration legt dafür **98 virtuelle Entities** in sieben eigenen Demo-Bereichen an. Licht, Szenen, Medien, Klima, Lüftung, Tür, Rollo, Roboter und Updates sind bedienbar; Verläufe entstehen ab Installation. Die virtuelle Kamera zeigt ein mitgeliefertes Bild.
- [Optionale Geräte-Skripte und Anleitung](support/README.md), insbesondere die Shelly-Lüftungsquelle. Sie werden mitkopiert, aber nicht auf Hardware aktiviert.

Das Demo-Dashboard begrenzt seine Karten zusätzlich auf den Namensbereich `*.liquid_glass_demo_*`. Serviceaufrufe ohne konkrete Dummy-Entity oder mit Bereichs-/Gerätezielen werden blockiert. Die Demo ändert weder echte Geräte noch die native Energiekonfiguration. Die Demo-Favoritenauswahl bleibt im jeweiligen Browser. Die öffentliche Browser-Demo verwendet denselben vollständigen Kartenkatalog und die echten Custom Cards. HA-eigene Basiselemente werden dort lokal adaptiert; Werte und Historie bleiben ausdrücklich simuliert.

## Das DASH6-Grundmuster: Domain-Blöcke

**Ein nativer Heading-Reiter und eine gemeinsame helle Glashülle fassen mehrere dunkle Entity-Karten einer Domain zusammen.** Beispielsweise stehen unter „Licht“ mehrere einzelne Lichtkarten und unter „Medien“ TV und HomePod. Jede innere Karte behält ihre Bedienung, Zustände und Detailansichten. Die Überschrift gehört zum gemeinsamen Rahmen; sie ist kein zusätzlicher dunkler Kartentitel.

Die erste Demo-View zeigt dieses Muster direkt. Die Raum-Views verwenden es für Licht, Medien, Klima, Schalter, Türen und weitere Gerätegruppen. **Domain-Blöcke & Aufbau** (`/liquid-glass-demo/domain-bloecke`) erklärt den Aufbau anhand mehrerer vollständiger Blöcke. Ein kopierbares Beispiel wird als [examples/domain-blocks.yaml](examples/domain-blocks.yaml) beziehungsweise `/config/liquid-glass/examples/domain-blocks.yaml` mitinstalliert.

```yaml
type: custom:dash6-domain-card
dashboard: liquid-glass-demo
view: domain-bloecke
block_id: light
area: DASH6 Demo · Büro
domain: light
heading: Licht
combine: true
columns: 1
auto_entities: false
cards:
  - type: custom:dash6-govee-light-card-v2
    entity: light.liquid_glass_demo_lampe
    name: Leselicht
  - type: custom:dash6-govee-light-card-v2
    entity: light.liquid_glass_demo_tischlicht
    name: Tischlicht
```

`heading` erzeugt das native Heading; `title` ersetzt diesen Reiter nicht. `cards` enthält die dunklen Gerätekarten, `combine: true` hält sie in einer gemeinsamen hellen Hülle. `block_id` identifiziert den Abschnitt innerhalb der View. `area`/`domain` beschreiben die Zuordnung; `auto_entities: false` hält diese Demo bei den ausdrücklich angegebenen Dummy-Karten. Für eigene Räume kann die Domain-GUI zusätzliche Bereichs-Entities automatisch ergänzen und getrennte Ausschlüsse verwalten.

Zwischen den Karten liegen **8px**. Native Headings stehen am Beginn der gemeinsamen Hülle, nicht als separater Grid-Titel darüber. Hülle und Reiter folgen ausschließlich **hellem Glas** (Paketdefault 20 %/8 px), die einzelnen Gerätekarten **dunklem Glas** (70 %/16 px). Transparente Layout-Wrapper erzeugen keine weitere Glasfläche. Die **Domain-GUI** bearbeitet Überschrift, Raster, feste/automatische Karten und deren jeweilige Originaleditoren. Theme-Regler und Domain-GUI haben unterschiedliche Aufgaben.

## Karten, Zusatzansichten und GUI

**Die erste Demo-View zeigt Schuhschrank, TV/Apple TV und Staubsauger direkt.** Die Wegweiser unter den Karten öffnen deren echte Zusatzansichten. Bei Lichtgruppen und TV öffnet auch der Kartenhintergrund den jeweiligen Dialog.

| Karte / Werkzeug | In der Demo ausprobieren | GUI |
| --- | --- | --- |
| Schuhschrank und Lichtgruppen | Direkte Bunt-/Weiß-Szenen mit bestätigtem leuchtendem Rahmen; Einzellichter/Segmente, Farbe, Temperatur und Effekte im Hintergrunddialog | Spezialisierter Licht-/Gruppeneditor |
| TV / Apple TV / Fire TV | Player, Ein/Aus, Quellen; Hintergrunddialog mit Fernbedienungen, Gerätewechsel, Tastaturhilfe und Medienauswahl | Medieneditor |
| Staubsauger | Start, Pause, Stopp, Dock; individuelle Räume/Reinigung, Basisstation/Entleerungsmodus, Verschleißteile mit Verlauf und Zurücksetzen | Spezialisierter mehrstufiger Editor |
| Eigenständige Vacuum Dock Card | Eigene Reinigungs- und Dockansichten | Eigener Editor |
| Licht, Messsteckdose/Kühlschrank, Lüftung | Regler, Effekte, Sperre/LED, Temperatur/Tür, Graphen, Aus/Auto/Ein und Restzeit | Spezialisierte Geräteeditoren |
| Thermostat, Rollo, Tür/Schloss, Pflanzen, Auswahlgruppe | Sollwerte/Presets, Position, Kontakt/Klingel, Sensor-/Zielbereiche und animierte Auswahl | Zugehörige grafische Editoren |
| HomePod, Glasschalter und Bereichsheader | Verbindung/Wiedergabe/Lautstärke, gemeinsamer Glasschalter, Titel/Uhr | Grafische Grundfelder und vollständige Konfiguration |
| Favoriten und Domain-Karten | Karten-/Unterkartenauswahl, Gruppierung/Reihenfolge; Bereich/Domain, dynamische Entities und getrennte Filter | Eigene Favoriten-/Domain-GUI |
| Theme | Material, Farben, Text, Transparenz, Frostung, Bewegung und Graphen; Vorschau, Export, Speichern und Rücksetzen | Vollständiger Theme-Editor |
| Profile, Stacks, Render-/Direct-/Inline- und Embedded-Adapter | Weitere Demo-Views zeigen Einbettung und Strukturmuster | Vorhandene native bzw. freie Editoren |
| Raumlader / Raumlayout und deklarative Übersichtselemente | Öffentliche Raumdefinition, Spalten und eigene Konfigurationsquelle | JSON/YAML, soweit die Klasse keinen eigenen GUI-Editor anbietet |

**GUI konfigurieren** öffnet automatisch den echten Editor jeder Karte, die einen bereitstellt – aktuell **18 Editoren im Haupt-Showcase**. „In Demo übernehmen“ ändert nur diese Vorschau. Eigene Karten werden mit denselben Editor-Klassen in Home Assistants normaler Karten-GUI konfiguriert. Weitere Details, darunter Kamera, Kompatibilitätsnamen und die genaue Abgrenzung freier Editoren: [Karten- und GUI-Leitfaden](docs/CARD-GUIDE.md).

**Medien-Lautstärke:** HomePod-, normale Media-Player- und kombinierte TV-/Apple-TV-Karten verwenden genau einen Glasregler unten. Der zusätzliche native Regler und seine sichtbare „Lautstärke“-Beschriftung entfallen. Der untere Regler bleibt auch beim ersten Laden und beim Playerwechsel erhalten; Wiedergabefortschritt und barrierefreier Reglername bleiben verfügbar.

## Aktuell verwendeter Satin-Stand als Paket-Default

Das Paket installiert die am **25.10.2026 frisch an der aktiven Oberfläche abgeglichenen Einstellungen**: **64 CSS-Vorgaben und 76 GUI-Werte**. Darin enthalten sind helles Glas mit **20 % / 8 px**, dunkles Glas mit **70 % / 16 px**, die aktuellen Farb-/Textvorgaben, Schalter-/Sliderbewegungen und Grapheneinstellungen. Native Theme-YAML und grafische Regler verwenden denselben versionierten Stand. **Theme-Vorgaben wiederherstellen** kehrt zu diesen Paketvorgaben zurück.

**Alles speichern** speichert für den Browser. **Alles für Alle speichern** verwendet die eigene Administrator-Schnittstelle der eingerichteten Integration, erstellt eine Sicherung und erhält die gemeinsamen Nutzer-Defaults über Updates hinweg. Keine zusätzliche private Config-Editor-Integration erforderlich. Die öffentliche Demo simuliert auch diese Speicherung lokal; die installierte Geräte-Demo bietet keine globale Administrator-Speicherung an.

## Wohnungstür und Haustür

Beide Türkarten stehen direkt im Demo-Einstieg und gemeinsam im hellen Domain-Block **Türen** der Flur-View. **Wohnungstür** zeigt den vertikalen Glasschalter, getrennte Öffnen-/Schlossaktionen, bestätigten Türkontakt, Kontaktbatterie und Schloss-Batteriewarnung. **Haustür** zeigt Türöffner, letzte Klingelaktivität, Batterie und die orange Klingelrückmeldung. Öffnen beziehungsweise die konfigurierten Schloss-/Öffneraktionen beenden die Klingelmarkierung.

**Türzustände ausprobieren** bietet ausschließlich virtuelle Kontakte, Batteriewarnung und Klingeln. Damit lassen sich geschlossen/abgeschlossen, aufgeschlossen, geöffnet sowie Batterie- und Klingelwarnungen zeigen. Beide Karten besitzen den grafischen Tür-/Schlosseditor für diese Zuordnungen, zusätzliche Klingelsensoren und Aktionen zum Beenden des Signals. In eigenen Installationen werden vorhandene Matter-/Schloss-/Türöffner-/Klingel-Integrationen zugeordnet; die Demo legt ihre Dummy-Geräte selbst an.

## Orientierung für Agenten

Die mitgelieferte **[AGENTS.md](AGENTS.md)** erklärt Quellen, Builddateien, Integrations-/Demo-Struktur und verbindliche Kartenmuster. Sie verweist auf `/liquid-glass-demo/demo`, den vollständigen Browser-Showcase und das ausschließlich zu verwendende Theme **DASH6 Satin Glass**. Auf der Zielinstallation liegt sie unter `/config/liquid-glass/AGENTS.md`; Kartenkatalog und Leitfaden werden ebenfalls mitinstalliert. Neue Funktionen müssen in README, beiden Demos und dem Installationspaket gemeinsam ergänzt werden.

## Vom Nutzer selbst einzurichten

**HACS und die Integrationen für echte Geräte werden nicht automatisch installiert.** Für eigene Räume müssen Geräte zunächst in Home Assistant eingerichtet sein, etwa über Shelly, Matter, Meross, Govee, Tado, Apple TV, Android TV/ADB, ESPHome oder Roborock – jeweils nur, soweit die eigene Hardware sie benötigt. Die Karten ersetzen diese Integrationen nicht.

**Dual Smart Thermostat** ist optional: im Einrichtungsdialog zusätzlich auswählen, danach erneut starten und die eigenen Sensor-/Heizungs-/Kühlungs-Entities konfigurieren. Für normale oder Demo-Thermostate ist es nicht nötig. **Ultra Card Connect**, **Browser Mod**, HACS selbst, MQTT/Zigbee2MQTT sowie Gerätefirmware werden nicht stillschweigend installiert. Was davon für eine konkrete Zusatzfunktion nötig ist, steht ausdrücklich in [DEPENDENCIES.md](docs/DEPENDENCIES.md#selbst-einzurichten).

Die besondere Shelly-Lüftung braucht die passende Verdrahtung und virtuelle Shelly-Komponenten; der Nutzer richtet sie anhand der [beigelegten Anleitung](support/README.md) selbst ein. Eigene TV-Eingangsautomationen oder BLE-Fernbedienungen sind ebenfalls gerätespezifisch. Für Demo und normale Karten sind keine zusätzlichen privaten HA-Skripte nötig.

## Eigene Dashboards

Für eigene Views **DASH6 Satin Glass** wählen und Karten über die native GUI hinzufügen. [examples/dashboard.yaml](examples/dashboard.yaml) ist ein öffentliches Konfigurationsbeispiel mit Platzhalter-Entities; diese müssen auf eigene Geräte umgestellt werden. Die verwaltete Demo kann in ein eigenes Dashboard kopiert werden; vor echter Gerätesteuerung müssen die `dash6-demo-scope`-Wrapper entfernt und Entity-Zuordnungen bewusst ersetzt werden.

Alte externe DASH6-/Govee-/Multi-Light-Ressourcen mit denselben Custom-Element-Namen vor dem Umstieg entfernen. Das Paket enthält nötige Kompatibilitätsnamen, benötigt aber keine zweite alte Kartenressource. Bereits manuell installierte alte Themes werden nicht gelöscht; das neue Paket installiert und registriert nur Satin. [Migration](docs/MIGRATION.md).

## Entwicklung, Prüfung und Lizenzen

`npm ci && npm run build:cards && python3 scripts/build-integration.py` erzeugt die Veröffentlichung. Auf Home Assistant ist kein Build nötig. Installer-, Integrations-, Dummy-Entity- und Browserprüfungen laufen in isolierten Umgebungen; dabei werden keine produktiven Geräte geschaltet.

Aktuelle Browser mit Custom Elements und Shadow DOM werden vorausgesetzt. Chromium und WebKit werden geprüft. Unabhängiges Projekt ohne Verbindung zu Apple oder Home Assistant. [MIT](LICENSE), [Drittanbieter-Lizenzen](THIRD-PARTY-LICENSES.md). Keine privaten Dashboard-Exporte oder Zugangsdaten im Paket.
