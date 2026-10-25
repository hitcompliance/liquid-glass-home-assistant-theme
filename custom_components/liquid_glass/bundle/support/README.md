# Optionale Geräte-Skripte

Diese Dateien werden von der Integration nach `/config/liquid-glass/support/` kopiert. Sie werden **nicht automatisch auf Geräten ausgeführt**. Für die vollständige Demo und die normalen Karten sind keine zusätzlichen privaten Home-Assistant-Skripte erforderlich.

## Shelly-Lüftung mit Zeitkonto und Dauerbetrieb

`shelly/badluefter-backlog-force-on.js` ist die mitgelieferte Quelle für die spezielle Drei-Modus-Lüftung. Sie ist für Shelly 2PM Gen4 mit dem im Quelltext beschriebenen Aufbau geschrieben. Der Nutzer muss geeignete Hardware, Verdrahtung und Komponenten selbst prüfen und einrichten. Das Skript kann reale Ausgänge schalten; daher erst nach Anpassung an das eigene Gerät aktivieren.

1. Bestehende Shelly-Konfiguration und Skripte sichern. Vorhandene Schutz-/Freigabeschaltungen erhalten.
2. In Shelly eine virtuelle Boolean-Komponente für Präsenz anlegen und deren ID als `PRESENCE_BOOL_ID` eintragen (Beispielwert 200 prüfen).
3. Ausgangs- und Eingangszuordnung im Konfigurationsblock an die echte Verdrahtung anpassen. Der Quelltext beschreibt O1/O2 und die Kaminfreigabe; diese Zuordnung ist keine allgemeine Installationsanweisung für andere Anlagen.
4. `force_on` und `restzeit` werden über den exakten Namen gefunden; fehlende virtuelle Komponenten legt das Skript entsprechend seiner Implementierung an. Vorhandene IDs gegebenenfalls ausdrücklich setzen.
5. Skript im Shelly-Skripteditor einfügen und nach Prüfung starten. Shelly-Integration in HA selbst einrichten; die tatsächlich erzeugten Entity-IDs verwenden.
6. In `dash6-fan-card` Fan-Modus, `force_switch_entity`, `remaining_time_entity`, beide physischen Rückmeldungen, Präsenz und Leistung über die Karten-GUI zuordnen. Keine Rückmelde-Ausgänge als Ersatz für Modusbefehle verwenden.

Die virtuelle Demo bildet Bedienung und Countdown nach, benötigt dieses Hardware-Skript aber nicht. Elektrische Sicherheitsfunktionen lassen sich damit nicht bestätigen.

## Medien, Heizung und sonstige Geräte

TV-Eingangsautomationen, ADB-/BLE-Kommandos und ESPHome-Firmware sind vom konkreten Modell abhängig. Vorhandene eigene Automationen können in der Medienkarten-GUI zugeordnet werden. Diese Veröffentlichung installiert keine fremden Geräte-IDs, kopiert keine privaten Automationen und flasht keine Geräte.

Für Tado, Shelly, Meross, Roborock, Apple TV und andere echte Geräte die jeweilige Home-Assistant-Integration selbst einrichten. Dual Smart Thermostat ist eine getrennte optionale Backendintegration; normale Climate-Entities und Demo-Thermostate funktionieren ohne sie. Siehe [Abhängigkeiten](https://github.com/hitcompliance/liquid-glass-home-assistant-theme/blob/main/docs/DEPENDENCIES.md) im Repository.
