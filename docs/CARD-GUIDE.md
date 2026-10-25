# Karten, Detailansichten und GUI-Konfiguration

Der Einstieg **Alle Karten & Details** ist in beiden vollständigen Demos derselbe: [öffentliche Browser-Demo](https://hitcompliance.github.io/liquid-glass-home-assistant-theme/) und installierte **Liquid Glass Demo** unter `/liquid-glass-gallery/demo`. Die Browser-Demo lädt die echten eigenen und fremden Karten. Nur Home Assistants native Basiselemente werden dort lokal adaptiert; die installierte HA-Demo verwendet die originalen nativen Karten mit lokalem Simulationskontext. Mehr-Informationen-Ereignisse öffnen einen lokalen Demo-Dialog.

## Das DASH6-Grundmuster: Domain-Blöcke

**Ein nativer Heading-Reiter und eine gemeinsame helle Glashülle fassen mehrere dunkle Entity-Karten einer Domain zusammen.** Beispielsweise stehen unter „Licht“ mehrere einzelne Lichtkarten und unter „Medien“ TV und HomePod. Jede innere Karte behält ihre Bedienung, Zustände und Detailansichten. Die Überschrift gehört zum gemeinsamen Rahmen; sie ist kein zusätzlicher dunkler Kartentitel.

Die erste Demo-View zeigt dieses Muster direkt. Die Raum-Views verwenden es für Licht, Medien, Klima, Schalter, Türen und weitere Gerätegruppen. **Domain-Blöcke & Aufbau** (`/liquid-glass-gallery/domain-bloecke`) erklärt den Aufbau anhand mehrerer vollständiger Blöcke. Ein kopierbares Beispiel wird als [examples/domain-blocks.yaml](../examples/domain-blocks.yaml) beziehungsweise `/config/liquid-glass/examples/domain-blocks.yaml` mitinstalliert.

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

## Gerätekarten

| Karte | Im Demo-Einstieg ausprobieren | Grafische Konfiguration |
| --- | --- | --- |
| Schuhschrank | Direkte Bunt-/Weiß-Szenen; bestätigter leuchtender Szenenrahmen; Kartenhintergrund öffnet Lichter/Segmente | Spezialisierter Licht-/Gruppeneditor |
| Licht und Lichtgruppe | Ein/Aus, kombinierte und getrennte Regler, Farbe, Farbtemperatur, Effekte; Hintergrund öffnet Einzellichter und gemeinsame Auswahl | Spezialisierter Licht-/Gruppeneditor; zusätzlich karteneigene Einstellungen |
| TV / Apple TV / Fire TV | Player, Ein/Aus, Quellen; Hintergrund oder **TV & Fernbedienungen** öffnet Player-/Remote-Dialog, Gerätewechsel, Tastaturhilfe und Medienauswahl | Medieneditor mit Player-/Remote-/Quellenzuordnung |
| HomePod | Verbindungsschalter, Wiedergabe, Lautstärke und Medienbild; lokale Demo-Entity-Details | Grafische Grundfelder mit vollständiger Konfiguration |
| Staubsauger | Start/Pause/Stopp/Dock; **Räume & Reinigung** öffnet die individuelle Planung; **Basisstation** zeigt Dockfunktionen und Entleerungsmodus; **Verschleißteile** zeigt Verlauf und bestätigbares Zurücksetzen | Spezialisierter mehrstufiger Staubsaugereditor |
| Eigenständige Vacuum Dock Card | Reinigung und Basisstation als eigenständige Alternative | Eigener mehrstufiger Editor |
| Messsteckdose / Kühlschrank | Glasschalter, Leistung, Hintergrundgraph, Kindersicherung und LED; virtuelle Tür-/Temperaturrückmeldungen in der Küche | Spezialisierter Geräte-/Messsteckdoseneditor |
| Lüftung | Aus/Auto/Ein, Force und Restzeit; simulierte Ausgangsrückmeldungen, Präsenz und Leistungsanzeige | Lüftereditor mit getrennten Modus-/Force-/Restzeit-/Rückmeldefeldern |
| Thermostat | Native Sollwertbedienung, Heizen/Kühlen/Dual, Preset-Auswahl | Grafischer Editor für Entity, Modi und Optionen |
| Rollo | Öffnen/Schließen/Stopp und Positionsregler | Grafischer Editor |
| Wohnungstür und Haustür | Beide direkt im Einstieg und gemeinsam im Flur-Block **Türen**. Vertikaler Glasschalter, Öffnen/Schloss, Kontakt, Kontaktbatterie/Schlosswarnung; Türöffner, Aktivitätszeit und orange Klingelrückmeldung. **Türzustände ausprobieren** simuliert Kontakt, Batteriewarnung und Klingeln | Tür-/Schlosseditor einschließlich zusätzlicher Klingelsensoren und Cancel-Aktionen |
| Pflanzen | Vier feste Zielplätze `… / 4`, Batterie, Tageslichtmittel vor Momentanwert, tägliches Lichtbudget Heute/Gestern mit Mindest-/Ideal-Orientierung, konservativer EC-Hinweis, 24h/7d | Pflanzeneditor für Sensoren, Substrat, Alter, Bereiche und tägliche Lichtziele; eigenständige Ressource `plant-dist/` |
| Auswahlgruppe | Animierte exklusive Auswahl; Demo-Auswahl-Entity | Grafischer Auswahl-/Optionseditor |
| Glasschalter | Gemeinsame Schalterbedienung, Zustand und Sperren; außerdem in den Gerätekarten enthalten | Grafische Grundfelder / vollständige Konfiguration |
| Kamera | Die HA-Demo enthält eine virtuelle Kamera mit Paketbild. Die separate lokale Browser-Kamerakarte ist für eigene Dashboards enthalten und startet eine echte Kamera erst nach bewusster Aktion und Browserfreigabe | Grafischer Editor der lokalen Kamerakarte; native Kamera-Kartenkonfiguration für das Kamera-Beispiel |

Die Tasten unter den Beispielen sind Wegweiser zu den **echten** Kartendialogen. Der Showcase-Wrapper ersetzt deren Implementierung nicht. Die Kartenhintergründe bleiben dort direkt bedienbar, wo die jeweilige Karte diesen Einstieg besitzt.

Medienkarten zeigen im Satin-Theme ausschließlich den unteren Glas-Lautstärkeregler. Native doppelte Lautstärkeregler samt Label sind ausgeblendet; dies gilt auch für die kombinierten TV-/Apple-TV-Karten und ihre Player. Wiedergabefortschritt, Transport, Quellen und Ein/Aus behalten ihre Funktion. Außerhalb des Satin-Themes bleibt die native Lautstärkesteuerung erhalten.

## Struktur, Raum- und Theme-Werkzeuge

| Werkzeug | Demo und Konfigurationsweg |
| --- | --- |
| Favoriten | Auswahl, Unterkarten, Gruppierung und Reihenfolge über die echte Favoriten-GUI; Demo-Auswahl bleibt im Browser |
| Domain-Karten | Bereich, Domain, dynamische Entities, eigene Karten sowie getrennte Integrations-/Klassen-/Entityfilter über den Domain-Editor |
| Theme | Grafischer Material-, Farb-, Text-, Unschärfe-, Bewegungs- und Grapheneditor mit Vorschau, Export und Rücksetzen |
| Profile, Stack, Render-/Direct-/Inline-Adapter | Vorhandene native bzw. freie Konfigurationseditoren; Strukturansichten zeigen die jeweiligen Einbettungen |
| Bereichsheader | Grafische Grundfelder für Titel, Uhr und Zeitzone |
| Raumlader / Raumlayout | Öffentliche Demo-Definition und `config_source`; diese Klassen besitzen aktuell keinen eigenen grafischen Editor. Eigene komplexe Definitionen werden per JSON/YAML konfiguriert |
| Home-Übersicht / Klima-Hintergrund | Vorhandene deklarative Konfiguration nach Kartenreferenz; nur tatsächlich vorhandene `getConfigElement()`-Editoren als GUI ausweisen |
| Ultra, Auto Entities, ApexCharts, Mini Graph, Layout, Button, Mushroom, More Info, Vertical Stack und Embedded View | Die installierten Originalmodule und ihre verfügbaren Originaleditoren; zusätzliche Struktur-/Bibliotheksansichten zeigen die Integration |

**GUI konfigurieren** wird dynamisch für jede Beispielkarte angeboten, deren echte Klasse `getConfigElement()` bereitstellt. Aktuell sind im Haupt-Showcase 18 solche Editoren erreichbar. „In Demo übernehmen“ ändert die jeweilige Vorschau, nicht die verwaltete Dashboard-YAML. Für eigene Karten verwendet Home Assistants normaler Karteneditor dieselben Konfigurationsklassen. Freie JSON-/YAML-Eingaben bleiben für zusätzliche Optionen verfügbar.

## Theme-Defaults und Speicherung

Installiert wird ausschließlich **DASH6 Satin Glass** mit dem am 25.10.2026 frisch aus der aktiven Oberfläche abgeglichenen Stand: **64 CSS-Vorgaben und 76 GUI-Werte**, darunter helles Glas 20 %/8 px, dunkles Glas 70 %/16 px sowie die aktuellen Farben, Bewegungs- und Graphenvorgaben. Quellen sind `themes/liquid-glass.yaml`, `src/dash6/theme-preferences.json` und der mitgelieferte Snapshot `support/theme-defaults.json`.

**Alles speichern** ist eine Browservorgabe. **Alles für Alle speichern** nutzt bei eingerichteter Integration deren eigene Administrator-Schnittstelle und sichert vor Änderungen die bisherigen Dateien. Dafür ist keine private Config-Editor-Integration nötig. Gespeicherte gemeinsame Nutzer-Defaults werden bei Paketupdates erhalten. In der öffentlichen Browser-Demo bleibt auch dieser Vorgang eine lokale Simulation; die installierte Geräte-Demo bietet keine globale Administrator-Speicherung an.

## Sicherheit und Grenzen der Demos

DASH6-Kopie und Galerie simulieren ihre Geräte standardmäßig vollständig im Browser, ohne HA-Entities oder Bereiche anzulegen. Alle Aktionen bleiben auf `*.liquid_glass_demo_*` begrenzt. Demo-Segmentnummern gehören nur zum virtuellen Roboter. Keine realen Geräte, Automationen oder die native Energiekonfiguration werden übernommen.

Öffentliche und installierte Browser-Demo verwenden dieselbe Simulation einschließlich Beispielverläufen. Sie prüfen keine echte Gerätewirkung, Automationen oder Messhistorie. Der optionale Altmodus `entities` benötigt für Verläufe neue Recorder-Messpunkte. Live-Kamera, eigene Hardwareintegrationen, TV-/ADB-/BLE-Einrichtung und die spezielle Shelly-Hardwarekonfiguration gehören zu den ausdrücklich selbst einzurichtenden Funktionen: [Abhängigkeiten](DEPENDENCIES.md).

Für Agenten: [Strukturen und verbindliche Muster](../AGENTS.md). Vollständige Optionsreferenz: [CARDS.md](CARDS.md).

### Eigene Dashboards mit Liquid-Glass-Layout

Die gemeinsamen Sections-/Mobil-Layouts werden anhand der aktuellen äußeren View freigegeben, unabhängig vom Dashboardnamen: `type: panel` und als erste Karte `cards[0].type: custom:dash6-ultra-card`. Verschachtelte Treffer, spätere Karten oder das Satin-Theme allein aktivieren diese Layout-Eingriffe nicht. Andere native Views, insbesondere Energie, behalten ihr eigenes Raster. Theme-Layoutwerte unter `dash6-layout-ha-*` gelten nur innerhalb dieser Struktur.
