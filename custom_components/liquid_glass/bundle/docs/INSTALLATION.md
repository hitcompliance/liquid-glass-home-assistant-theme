# Installation von DASH6 Satin Glass

## Empfohlen: HACS-Integration

Voraussetzungen: Home Assistant **2026.9.0 oder neuer**, ein aktueller Browser und [HACS](https://www.hacs.xyz/docs/use/download/download/). HACS muss der Nutzer selbst installieren. Die erste Einrichtung benötigt HTTPS-Zugriff auf GitHub und dessen Downloadserver.

1. [Repository in HACS hinzufügen](https://my.home-assistant.io/redirect/hacs_repository/?owner=hitcompliance&repository=liquid-glass-home-assistant-theme&category=integration). Kategorie **Integration**, herunterladen.
2. Home Assistant neu starten.
3. **Einstellungen → Geräte & Dienste → Integration hinzufügen → Liquid Glass** öffnen.
4. **LIQUID-GLASS-DEMO** eingeschaltet und **Demo-Modus: browser** ausgewählt lassen. **Dual Smart Thermostat** nur auswählen, wenn diese optionale Backendintegration für eigene Thermostate benötigt wird.
5. **LIQUID-GLASS-DEMO** in der Seitenleiste öffnen. Das Theme **DASH6 Satin Glass** wird als Backendvorgabe für Hell und Dunkel gesetzt. Explizite Benutzer-/View-Auswahlen haben weiterhin Vorrang.

Die Integration installiert die eigenen Karten samt Chunks, Bildern, Profilen und Lizenzen sowie zwölf fehlende Fremdmodule automatisch. Sie registriert die Ressourcen auch bei YAML-Ressourcenverwaltung. Die [vollständige Tabelle](DEPENDENCIES.md) erklärt jede Abhängigkeit und nennt ausdrücklich, was selbst einzurichten ist. `configuration.yaml` und `.storage` werden nicht direkt editiert. Es sind weder Terminalbefehle noch zusätzliche Frontend-HACS-Einträge erforderlich.

Vorhandene passende HACS-Module werden über ihre bestehenden URLs wiederverwendet. Deren Version und Updates bleiben in HACS. Fehlende Module werden anhand des mitgelieferten Locks mit SHA-256 und Dateigröße geprüft und unter `www/liquid-glass/vendor/` installiert; sie erscheinen nicht als eigene HACS-Repositories. Alle benötigten Lazy-Chunks, Übersetzungen und Lizenzen sind im Downloadplan enthalten. Geänderte bestehende Dateien werden vorab unter `backups/liquid-glass/<Zeitstempel>/` gesichert. Download-/Prüfsummenfehler brechen vor Zieländerungen ab; Schreibfehler werden zurückgerollt.

## Demo ohne HA-Entities

Die aktivierte Option **LIQUID-GLASS-DEMO** registriert `/liquid-glass-demo/home`: die tatsächliche DASH6-Struktur mit 28 Views, denselben Karten einschließlich Ultra Card, Seitenleisten, hellen Heading-/Domain-Hüllen, dunklen Entity-Karten und Hintergrund-Detailansichten. Florin und Florin Inhalt samt Navigation sind entfernt. Lokale Browserzustände ersetzen die Originalgeräte; die mitgelieferten anonymisierten Profile, Büro-Raumdefinitionen und sechs Raumhintergründe machen die Kopie unabhängig von privaten Dateien.

Zusätzlich ist die **Karten-/GUI-Galerie** mit 18 Views unter `/liquid-glass-gallery/demo` verfügbar. Sie zeigt Schuhschrank-Szenen, TV/Apple TV, Staubsauger, beide Türen, Zusatzdialoge und grafische Karteneditoren direkt. Standardmäßig werden **keine HA-Entities, Geräte oder Bereiche** für diese beiden Demos angelegt. Zustände, Dienste, Wetter, Medienauswahl und Beispielverläufe kommen aus einer gemeinsamen lokalen Browser-Laufzeit. Recorder und Hardwareintegrationen sind dafür nicht erforderlich.

Die separate Option **LIQUID-GLASS-HUE-DEMO** registriert `/liquid-glass-hue-demo` mit echten Entities dieser HA-Instanz. Entity-, Geräte- und Bereichsregistry bestimmen Hue-Geräte, alle Light-/Switch-Geräte und ihre zugehörigen Entities. Versteckte, deaktivierte und mitgelieferte Demo-Entities bleiben ausgeschlossen. Je belegtem Raum entsteht ein Ultra-View nach demselben Domain-/Glasmuster; fehlende Zuordnung landet in „Ohne Bereich“. Wartung, Energie, Sicherheit und Surveillance zeigen passende sichtbare System-Entities. Registry-Änderungen aktualisieren die Hue-Demo automatisch, solange sie noch nicht manuell bearbeitet wurde. Danach bleibt die eigene Konfiguration erhalten. Erstellung und Einrichtung rufen keine Geräteaktion auf; spätere Bedienung steuert die echten Geräte.

Unter **Geräte & Dienste → Liquid Glass → Konfigurieren** können beide Dashboard-Optionen nachträglich geändert werden. Beide Demos und die Hue-Demo werden als echte native **Storage-Dashboards** mit Einträgen in Home Assistants Dashboard-Verwaltung angelegt. **Dashboard bearbeiten**, View-Einstellungen, Karteneditoren und der native Rohkonfigurationseditor sind verfügbar. Die äußere Simulationshülle delegiert die grafische Konfiguration an den Originaleditor der inneren Karte. Fremde Dashboards gleichen Pfads bleiben erhalten.

- Szenen ändern nur lokale Beispielzustände. Die Markierung prüft diese simulierten Zielzustände.
- Die Demo-Lüftung simuliert Aus/Auto/Ein, Präsenz, Ausgänge und Countdown. Keine Shelly-Hardware nötig.
- Die virtuelle Kamera liefert ein Paketbild; sie fragt keine Webcam-Freigabe an. Die lokale Browser-Kamerakarte bleibt für eigene Dashboards verfügbar.
- Sensoren und Verläufe liefern ausdrücklich simulierte Beispieldaten. Sie erzeugen keine Recorder-Aufzeichnungen. Die Demo belegt keine echte Geräte-, Automations- oder Messfunktion.
- Die native Energiekonfiguration bleibt bestehen. Demo-Energiewerte sind ausdrücklich keine echten Verbrauchsmessungen.
- Die Favoriten-GUI speichert ihre Demo-Auswahl browserlokal. **Demo zurücksetzen** setzt die virtuellen Gerätewerte zurück; Neuladen der Seite setzt sie ebenfalls auf den definierten Ausgangszustand.
- Jede Demo-Karte erhält über `dash6-demo-scope` einen isolierten lokalen Kontext. Geräteaktionen sowie Zustands-/Verlaufsabfragen bleiben lokal. Nur öffentliche Symbol-Metadaten für native HA-Symbole werden lesend vom Host geladen. Auch Mehr-Informationen-Dialoge bleiben innerhalb der Simulation. Jeder Browser besitzt seinen eigenen Zustand.

Eigene GUI-Änderungen bleiben über Updates und Neustarts erhalten. Unveränderte Paket-Dashboards erhalten neue Paketvorgaben automatisch; nach manueller Bearbeitung wird die gespeicherte Konfiguration nicht ersetzt. Demo-Entity-IDs und Simulationshüllen erhalten, solange virtuelle Geräte verwendet werden. Die Browser-Simulation benötigt keine freien HA-Entity-IDs.

Die nativen Storage-Dashboards bleiben beim Entladen oder Entfernen der Integration mitsamt eigenen Änderungen erhalten und können ausdrücklich in der HA-Dashboardverwaltung gelöscht werden. Das Abschalten einer Einrichtungsoption löscht keine bereits angelegte Benutzerkonfiguration. Der Browsermodus hinterlässt keine Demo-Entities oder Recorder-Historie. Installierte Dateien, Downloadcache und Sicherungen bleiben erhalten. Fremde Geräte und Dashboards werden nicht entfernt.

### Optionaler Altmodus mit HA-Test-Entities

`Demo-Modus: entities` behält die bisherigen registrierten Testplattformen für gezielte HA-Backend-Tests. Nur dieser Modus legt Demo-Entities und virtuelle Geräte/Bereiche an; Recorder zeichnet bei entsprechender Konfiguration ab Installation auf. Verläufe werden in diesem Modus nicht rückdatiert. Fremde Entity-ID-Konflikte stoppen dessen Einrichtung.

Bestehende Einträge vor 3.5 werden beim Update ausdrücklich auf `entities` migriert, damit ihre Testgeräte erhalten bleiben. Unter **Konfigurieren → Demo-Modus: browser** kann auf die lokale Simulation gewechselt werden. Das entlädt die Testplattformen; vorhandene Registry-Metadaten und Recorder-Historie entfernt HA nach seinen nativen Regeln, sie werden nicht ungefragt gelöscht. Neue Installationen verwenden `browser`.

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
| Browser-Demo lädt nicht | Browser vollständig neu laden; `demo-runtime-data.json` und Ressourcen auf derselben Paketversion prüfen. Nur im optionalen Entity-Modus: Recorder und neue Messpunkte prüfen. |
| Eigene Geräte fehlen | Geräteintegration und Entity-Zuordnung einrichten; Demo ist eine getrennte Umgebung |
| Altes Theme sichtbar | Profil-/View-Theme ausdrücklich auf DASH6 Satin Glass setzen |
| Embedded View doppelt | Genau eine Original-`embedded-view-card.js`-URL behalten, neu laden |

Die automatisierten Prüfungen verwenden temporäre HA-Konfigurationen und simulierte Geräte. Sie sind kein Nachweis einer Installation auf einer produktiven Nutzerinstanz.

## Mitgelieferte Defaults und Agenten-Anleitung

Das Paket enthält die abgeglichenen 64 CSS- und 76 GUI-Vorgaben aus dem aktuellen Satin-Stand. Helles Glas startet bei 20 %/8 px, dunkles bei 70 %/16 px. Gemeinsam gespeicherte Nutzer-Defaults werden über Updates erhalten. Die eigene Administrator-Schnittstelle übernimmt „Alles für Alle speichern“ samt Sicherung; eine private Config-Editor-Integration ist dafür nicht nötig.

`/config/liquid-glass/AGENTS.md`, README, Kartenleitfaden, weitere Dokumentation und `support/card-catalog.json` werden mitinstalliert. Die [Agenten-Anleitung](../AGENTS.md) erklärt Struktur, Demo-Einstieg und das verbindliche Theme.

Die kopierten Raum-Panels haben unmittelbar `custom:dash6-ultra-card` als erste Karte. `liquid_glass_demo_mode: browser` isoliert dort den vollständigen Kartenbaum und den Originaleditor; der optionale Altmodus setzt `entities`. Sonstige Demo-Karten verwenden weiterhin `dash6-demo-scope`. Vor bewusster Umstellung einer Kopie auf echte Geräte sowohl diese Wrapper als auch `liquid_glass_demo_mode` entfernen und alle Entity-Zuordnungen ersetzen.
