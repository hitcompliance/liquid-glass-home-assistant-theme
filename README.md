# DASH6 Satin Glass für Home Assistant

Ein vollständiges HACS-Paket mit **DASH6 Satin Glass**, eigenen Custom Cards, grafischen Editoren und einer bedienbaren Demo mit virtuellen Home-Assistant-Geräten. Ab Version 3.2 wird ausschließlich dieses Theme ausgeliefert.

[Browser-Vorschau](https://hitcompliance.github.io/liquid-glass-home-assistant-theme/) · [Installation](docs/INSTALLATION.md) · [Alle Abhängigkeiten](docs/DEPENDENCIES.md) · [Kartenreferenz](docs/CARDS.md)

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
- Ein Demo-Dashboard mit Räumen nach dem Vorbild von DASH6, ohne Florin, zusätzlichen Karten-/Layoutansichten und Favoriten-GUI. Die Integration legt dafür **91 virtuelle Entities** in acht eigenen Demo-Bereichen an. Licht, Szenen, Medien, Klima, Lüftung, Tür, Rollo, Roboter und Updates sind bedienbar; Verläufe entstehen ab Installation. Die virtuelle Kamera zeigt ein mitgeliefertes Bild.
- [Optionale Geräte-Skripte und Anleitung](support/README.md), insbesondere die Shelly-Lüftungsquelle. Sie werden mitkopiert, aber nicht auf Hardware aktiviert.

Das Demo-Dashboard begrenzt seine Karten zusätzlich auf den Namensbereich `*.liquid_glass_demo_*`. Serviceaufrufe ohne konkrete Dummy-Entity oder mit Bereichs-/Gerätezielen werden blockiert. Die Demo ändert weder echte Geräte noch die native Energiekonfiguration. Die Demo-Favoritenauswahl bleibt im jeweiligen Browser. Die Browser-Vorschau ist eine separate lokale Simulation.

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
