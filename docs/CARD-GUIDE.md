# Karten, Detailansichten und GUI-Konfiguration

Der Einstieg **Alle Karten & Details** ist in beiden vollständigen Demos derselbe: [öffentliche Browser-Demo](https://hitcompliance.github.io/liquid-glass-home-assistant-theme/) und installierte **Liquid Glass Demo** unter `/liquid-glass-demo/demo`. Die Browser-Demo lädt die echten eigenen und fremden Karten. Nur Home Assistants native Basiselemente werden dort lokal adaptiert; die HA-Demo verwendet die originalen nativen Elemente.

## Gerätekarten

| Karte | Im Demo-Einstieg ausprobieren | Grafische Konfiguration |
| --- | --- | --- |
| Schuhschrank | Direkte Bunt-/Weiß-Szenen; bestätigter leuchtender Szenenrahmen; Kartenhintergrund öffnet Lichter/Segmente | Spezialisierter Licht-/Gruppeneditor |
| Licht und Lichtgruppe | Ein/Aus, kombinierte und getrennte Regler, Farbe, Farbtemperatur, Effekte; Hintergrund öffnet Einzellichter und gemeinsame Auswahl | Spezialisierter Licht-/Gruppeneditor; zusätzlich karteneigene Einstellungen |
| TV / Apple TV / Fire TV | Player, Ein/Aus, Quellen; Hintergrund oder **TV & Fernbedienungen** öffnet Player-/Remote-Dialog, Gerätewechsel, Tastaturhilfe und Medienauswahl | Medieneditor mit Player-/Remote-/Quellenzuordnung |
| HomePod | Verbindungsschalter, Wiedergabe, Lautstärke und Medienbild; native Entity-Details | Grafische Grundfelder mit vollständiger Konfiguration |
| Staubsauger | Start/Pause/Stopp/Dock; **Räume & Reinigung** öffnet die individuelle Planung; **Basisstation** zeigt Dockfunktionen und Entleerungsmodus; **Verschleißteile** zeigt Verlauf und bestätigbares Zurücksetzen | Spezialisierter mehrstufiger Staubsaugereditor |
| Eigenständige Vacuum Dock Card | Reinigung und Basisstation als eigenständige Alternative | Eigener mehrstufiger Editor |
| Messsteckdose / Kühlschrank | Glasschalter, Leistung, Hintergrundgraph, Kindersicherung und LED; virtuelle Tür-/Temperaturrückmeldungen in der Küche | Spezialisierter Geräte-/Messsteckdoseneditor |
| Lüftung | Aus/Auto/Ein, Force und Restzeit; tatsächliche virtuelle Ausgangsrückmeldungen, Präsenz und Leistungsanzeige | Lüftereditor mit getrennten Modus-/Force-/Restzeit-/Rückmeldefeldern |
| Thermostat | Native Sollwertbedienung, Heizen/Kühlen/Dual, Preset-Auswahl | Grafischer Editor für Entity, Modi und Optionen |
| Rollo | Öffnen/Schließen/Stopp und Positionsregler | Grafischer Editor |
| Tür / Schloss / Türöffner | Verriegelung, Öffnung, Kontakt, Batterie und Klingelrückmeldung; in der Demo ausschließlich virtuell | Grafischer Tür-/Schlosseditor |
| Pflanzen | Fünf Messwerte, Ziel-/Prüfbereiche, konservativer EC-Hinweis, 24h/7d und Entity-Verlauf | Pflanzeneditor für Sensoren, Substrat, Alter und Bereiche |
| Auswahlgruppe | Animierte exklusive Auswahl; Demo-Auswahl-Entity | Grafischer Auswahl-/Optionseditor |
| Glasschalter | Gemeinsame Schalterbedienung, Zustand und Sperren; außerdem in den Gerätekarten enthalten | Grafische Grundfelder / vollständige Konfiguration |
| Kamera | Die HA-Demo enthält eine virtuelle Kamera mit Paketbild. Die separate lokale Browser-Kamerakarte ist für eigene Dashboards enthalten und startet eine echte Kamera erst nach bewusster Aktion und Browserfreigabe | Grafischer Editor der lokalen Kamerakarte; native Kamera-Kartenkonfiguration für die Dummy-Kamera |

Die Tasten unter den Beispielen sind Wegweiser zu den **echten** Kartendialogen. Der Showcase-Wrapper ersetzt deren Implementierung nicht. Die Kartenhintergründe bleiben dort direkt bedienbar, wo die jeweilige Karte diesen Einstieg besitzt.

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

**GUI konfigurieren** wird dynamisch für jede Beispielkarte angeboten, deren echte Klasse `getConfigElement()` bereitstellt. Aktuell sind im Haupt-Showcase 17 solche Editoren erreichbar. „In Demo übernehmen“ ändert die jeweilige Vorschau, nicht die verwaltete Dashboard-YAML. Für eigene Karten verwendet Home Assistants normaler Karteneditor dieselben Konfigurationsklassen. Freie JSON-/YAML-Eingaben bleiben für zusätzliche Optionen verfügbar.

## Theme-Defaults und Speicherung

Installiert wird ausschließlich **DASH6 Satin Glass** mit dem am 25.10.2026 frisch aus der aktiven Oberfläche abgeglichenen Stand: **64 CSS-Vorgaben und 76 GUI-Werte**, darunter helles Glas 20 %/8 px, dunkles Glas 70 %/16 px sowie die aktuellen Farben, Bewegungs- und Graphenvorgaben. Quellen sind `themes/liquid-glass.yaml`, `src/dash6/theme-preferences.json` und der mitgelieferte Snapshot `support/theme-defaults.json`.

**Alles speichern** ist eine Browservorgabe. **Alles für Alle speichern** nutzt bei eingerichteter Integration deren eigene Administrator-Schnittstelle und sichert vor Änderungen die bisherigen Dateien. Dafür ist keine private Config-Editor-Integration nötig. Gespeicherte gemeinsame Nutzer-Defaults werden bei Paketupdates erhalten. In der öffentlichen Browser-Demo bleibt auch dieser Vorgang eine lokale Simulation; die installierte Geräte-Demo bietet keine globale Administrator-Speicherung an.

## Sicherheit und Grenzen der Demos

Die vollständige HA-Demo legt 94 virtuelle Entities in acht eigenen Bereichen an. Alle Aktionen bleiben auf `*.liquid_glass_demo_*` begrenzt. Demo-Segmentnummern gehören nur zum virtuellen Roboter. Keine realen Geräte, Automationen oder die native Energiekonfiguration werden übernommen.

Die Browser-Demo erzeugt ausdrücklich simulierte Historie zur Darstellung von Graphen. In HA entsteht echte Demo-Recorder-Historie erst ab Installation; sie wird nicht rückdatiert. Live-Kamera, eigene Hardwareintegrationen, TV-/ADB-/BLE-Einrichtung und die spezielle Shelly-Hardwarekonfiguration gehören zu den ausdrücklich selbst einzurichtenden Funktionen: [Abhängigkeiten](DEPENDENCIES.md).

Für Agenten: [Strukturen und verbindliche Muster](../AGENTS.md). Vollständige Optionsreferenz: [CARDS.md](CARDS.md).
