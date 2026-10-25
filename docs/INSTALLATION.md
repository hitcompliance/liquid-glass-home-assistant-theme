# Installation von DASH6 Satin Glass

## Empfohlen: HACS-Integration

Voraussetzungen: Home Assistant **2026.9.0 oder neuer**, ein aktueller Browser und [HACS](https://www.hacs.xyz/docs/use/download/download/). HACS muss der Nutzer selbst installieren. Die erste Einrichtung benötigt HTTPS-Zugriff auf GitHub und dessen Downloadserver.

1. [Repository in HACS hinzufügen](https://my.home-assistant.io/redirect/hacs_repository/?owner=hitcompliance&repository=liquid-glass-home-assistant-theme&category=integration). Kategorie **Integration**, herunterladen.
2. Home Assistant neu starten.
3. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Liquid Glass** öffnen.
4. **Interaktives Demo-Dashboard anzeigen** eingeschaltet lassen. **Dual Smart Thermostat** nur auswählen, wenn diese optionale Backendintegration für eigene Thermostate benötigt wird.
5. **Liquid Glass Demo** in der Seitenleiste öffnen. Das Theme **DASH6 Satin Glass** wird als Backendvorgabe für Hell und Dunkel gesetzt. Explizite Benutzer-/View-Auswahlen haben weiterhin Vorrang.

Die Integration installiert die eigenen Karten samt Chunks, Bildern, Profilen und Lizenzen sowie zwölf fehlende Fremdmodule automatisch. Sie registriert die Ressourcen auch bei YAML-Ressourcenverwaltung. Die [vollständige Tabelle](DEPENDENCIES.md) erklärt jede Abhängigkeit und nennt ausdrücklich, was selbst einzurichten ist. `configuration.yaml` und `.storage` werden nicht direkt editiert. Es sind weder Terminalbefehle noch zusätzliche Frontend-HACS-Einträge erforderlich.

Vorhandene passende HACS-Module werden über ihre bestehenden URLs wiederverwendet. Deren Version und Updates bleiben in HACS. Fehlende Module werden anhand des mitgelieferten Locks mit SHA-256 und Dateigröße geprüft und unter `www/liquid-glass/vendor/` installiert; sie erscheinen nicht als eigene HACS-Repositories. Alle benötigten Lazy-Chunks, Übersetzungen und Lizenzen sind im Downloadplan enthalten. Geänderte bestehende Dateien werden vorab unter `backups/liquid-glass/<Zeitstempel>/` gesichert. Download-/Prüfsummenfehler brechen vor Zieländerungen ab; Schreibfehler werden zurückgerollt.

## Demo und virtuelle Entities

Die aktivierte Demo erzeugt **91 virtuelle Entities** unter `*.liquid_glass_demo_*`, mit eigenen Geräten und acht Bereichen `DASH6 Demo · <Raum>`. Dazu gehören Licht, Sensor/Binärsensor, Schalter, Lüfter, Rollo, Klima, Medienplayer, Remote, Roboter, Schloss, Tasten, Auswahl, Zahl, Szenen, Update, Wetter und Kamera. Es werden keine echten Geräte integriert oder angesprochen.

Das Dashboard `/liquid-glass-demo` zeigt Zuhause, Wohnzimmer, Küche, Schlafzimmer, Flur, Badezimmer, Büro, Waschkeller, Energie sowie zusätzliche Karten-/Layoutansichten und Favoriten. Florin und private Gerätekennungen sind ausgeschlossen. Die Dummy-Entities können auch in den Entwicklerwerkzeugen oder in eigenen Testkarten verwendet werden.

- Szenen ändern nur virtuelle Lichter. Die Markierung prüft deren gemeldete Zielzustände.
- Die Demo-Lüftung simuliert Aus/Auto/Ein, Präsenz, Ausgänge und Countdown. Keine Shelly-Hardware nötig.
- Die virtuelle Kamera liefert ein Paketbild; sie fragt keine Webcam-Freigabe an. Die lokale Browser-Kamerakarte bleibt für eigene Dashboards verfügbar.
- Sensoren liefern simulierte aktuelle Werte. Recorder zeichnet sie ab Installation auf, sofern sie nicht ausgeschlossen sind. Historie/Statistiken werden nicht rückdatiert. Einige Graphen brauchen deshalb zunächst Messpunkte.
- Die native Energiekonfiguration bleibt bestehen. Demo-Energiewerte sind ausdrücklich keine echten Verbrauchsmessungen.
- Die Favoriten-GUI speichert ihre Demo-Auswahl browserlokal. **Demo zurücksetzen** setzt die virtuellen Gerätewerte zurück; Neustart setzt sie ebenfalls auf den definierten Ausgangszustand.
- Jede Demo-Karte wird mit `dash6-demo-scope` auf Dummy-Zustände und explizite Dummy-Serviceziele begrenzt. Bereichs-/Geräteziele und ziellose Aktionen sind gesperrt.

Die verwaltete Demo-YAML wird bei Updates ersetzt. Eigene Änderungen deshalb in eine Kopie übernehmen. Demo-Entity-IDs nicht umbenennen, solange die mitgelieferte Konfiguration verwendet wird. Eine bereits belegte Demo-Dashboardadresse wird erhalten; ein fremder Entity-ID-Konflikt stoppt die Einrichtung mit einem Hinweis. Bei ausgeschalteter Demo werden keine Dummy-Entities erzeugt.

Beim Entladen/Entfernen verschwinden Demo-Entities und das eigene Demo-Dashboard aus dem laufenden Zustand. Home Assistants Entity-/Geräte-Registry und Recorder verwalten gespeicherte Metadaten/Historie nach den nativen Regeln. Installierte Dateien, Downloadcache und Sicherungen bleiben erhalten. Fremde Geräte und Dashboards werden nicht entfernt. Backend-Themevorgaben werden soweit verfügbar wiederhergestellt.

## Aktualisieren

1. Update in HACS herunterladen.
2. Home Assistant neu starten.
3. Browser/Companion-Seiten vollständig neu laden.

Der neue Dependency-Lock wird bei jedem Einrichten der bestehenden Integration geprüft. Neue oder geänderte von Liquid Glass verwaltete Abhängigkeiten werden automatisch installiert. Geöffnete Browser können bereits registrierte Custom Elements nicht austauschen; ein vollständiger Reload ist nötig. Ein Downloadfehler führt zu einer erneut versuchbaren Einrichtung. Es ist kein erneuter Konfigurationsdialog nötig.

## Was Nutzer selbst installieren/konfigurieren müssen

- **HACS** vor der HACS-Installation.
- **Integrationen und Einrichtung eigener Hardware** für echte Geräte. Die Demo braucht sie nicht. Beispielsweise Shelly/Matter/Meross/Govee/Tado/Apple TV/Android TV/ESPHome/Roborock entsprechend dem verwendeten Gerät.
- **Dual Smart Thermostat**, falls ausdrücklich ausgewählt: Dateien werden automatisch installiert, aber ein weiterer HA-Neustart und eigene Sensor-/Heizungszuordnung sind erforderlich. Bestehende Installationen werden nicht überschrieben.
- **Spezielle Shelly-Lüftung**, falls genutzt: das mitgelieferte Skript selbst auf geeigneter Shelly-Hardware einrichten, virtuelle Komponenten und Verdrahtung prüfen. [Anleitung](../support/README.md).
- **Eigene TV-Eingangsautomationen, ADB/BLE-/ESPHome-Einrichtung** nur für die jeweilige Hardware. Die Demo nutzt virtuelle Medienquellen und benötigt sie nicht.
- **Ultra Card Connect**, **Browser Mod**, **MQTT/Zigbee2MQTT** nur bei ausdrücklich genutzten Zusatzfunktionen; sie werden nicht durch Liquid Glass installiert. [Genaue Einordnung](DEPENDENCIES.md#selbst-einzurichten).

## Migration

Bisherige HACS-Kategorie **Theme** durch **Integration** ersetzen. Ältere eigenständig registrierte `dash6-cards.js`, Vacuum-Dock-/Govee-/Multi-Light-/DASH5-Lichtmodule mit überlappenden Custom-Element-Namen entfernen. Das Hauptmodul darf nur einmal geladen werden. Ein erkannter fremder `dash6-cards.js`-Eintrag stoppt die Einrichtung mit einem Hinweis.

Ab 3.2 wird nur **DASH6 Satin Glass** ausgeliefert. Bestehende separat installierte Theme-Dateien werden nicht entfernt. Views mit einem alten Theme-Namen müssen vom Nutzer auf Satin umgestellt werden. Vorher eigene Konfiguration sichern. [Details](MIGRATION.md).

## Manuelle Alternative

Den Release-Anhang `liquid_glass.zip` entpacken und den Ordner `custom_components/liquid_glass/` vollständig nach `/config/custom_components/liquid_glass/` kopieren. Home Assistant neu starten und die Integration wie oben hinzufügen. Dieser Weg hat denselben automatischen Installer und dieselbe Demo wie HACS; HACS ist dafür nicht erforderlich.

Für eine reine Frontend-Installation ohne Backend-Demo bleibt `python3 scripts/install.py --config-dir /pfad/zur/config` als Vorschau und mit `--apply` zum Anwenden verfügbar. Dafür das vollständige gebaute Repository verwenden. Der CLI-Installer installiert Dateien und erzeugt Ressourcen-/Theme-Fragmente unter `liquid-glass/`, aktiviert aber keine Integration und legt keine Dummy-Entities an. Für die vollständige Demo ist die Integration erforderlich. Bei YAML-Ressourcen `--existing-resources <datei>` angeben; anschließend die erzeugte `liquid-glass/INSTALLATION.md` befolgen. Python 3.9+ ist nur für diesen manuellen CLI-Weg nötig, Node/npm ausschließlich für Paketentwicklung.

## Fehler eingrenzen

| Problem | Maßnahme |
| --- | --- |
| Einrichtung scheitert beim Download | GitHub-Erreichbarkeit und HA-Protokoll prüfen; Einrichtung erneut versuchen |
| „already defined“ | Doppelte/alte Kartenressource entfernen, Browser vollständig neu laden |
| Custom Element fehlt | Integration eingerichtet? Neustart und Browser-Reload durchgeführt? HA-Protokoll prüfen |
| Graph leer | Recorder aktiv und Demo nicht ausgeschlossen? Erst neue Messpunkte sammeln lassen |
| Eigene Geräte fehlen | Geräteintegration und Entity-Zuordnung einrichten; Demo ist eine getrennte Umgebung |
| Altes Theme sichtbar | Profil-/View-Theme ausdrücklich auf DASH6 Satin Glass setzen |
| Embedded View doppelt | Genau eine Original-`embedded-view-card.js`-URL behalten, neu laden |

Die automatisierten Prüfungen verwenden temporäre HA-Konfigurationen und simulierte Geräte. Sie sind kein Nachweis einer Installation auf einer produktiven Nutzerinstanz.
