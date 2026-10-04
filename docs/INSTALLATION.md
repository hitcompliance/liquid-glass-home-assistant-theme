# Installation

Für den vollständigen Satin-Look sind YAML-Theme **und** JavaScript-Kartenmodul nötig. Fertige Dateien sind enthalten; auf Home Assistant ist kein Node-/npm-Build erforderlich. Siehe [DEPENDENCIES.md](DEPENDENCIES.md) für die zu den gewünschten Karten passenden Fremdmodule.

## Installation mit dem Python-Installer

Das Repository herunterladen oder klonen und ein Terminal in diesem Verzeichnis öffnen. Python 3.9 oder neuer wird benötigt. `--config-dir` bezeichnet das tatsächlich erreichbare Home-Assistant-Konfigurationsverzeichnis, nicht eine Webadresse.

Zuerst die geplanten Änderungen anzeigen:

```sh
python3 scripts/install.py --config-dir /pfad/zur/ha-konfiguration
```

Anschließend anwenden:

```sh
python3 scripts/install.py --config-dir /pfad/zur/ha-konfiguration --apply
```

Der Installer legt das Paket unter `www/liquid-glass/`, Theme-YAML unter `themes/liquid-glass/` und Fremdmodule unter `www/liquid-glass/vendor/` ab. Zugehörige Chunks und neutrale Profile werden mitkopiert. Er prüft die festgelegten Downloadgrößen und SHA-256-Prüfsummen und erzeugt unter `liquid-glass/` eine Ressourcenliste, Frontend-/Konfigurationsbeispiele und einen Installationsbericht.

**`configuration.yaml` und Home Assistants `.storage` werden nicht automatisch verändert.** Die erzeugten Hinweise anschließend lesen, Themes aktivieren und Ressourcen passend zur eigenen Dashboard-Verwaltung registrieren.

Bei bereits vorhandenen YAML-Ressourcen deren Liste angeben, damit sie berücksichtigt wird:

```sh
python3 scripts/install.py --config-dir /pfad/zur/ha-konfiguration --existing-resources resources.yaml --apply
```

UI-Ressourcen werden aus der bestehenden Liste gelesen; deren URLs bleiben aktiv. Für einen bewussten Wechsel von einer HACS-Kopie zur vom Installer festgelegten Version den vorhandenen Eintrag anhand von `resources-all.yaml` **ersetzen**, nicht zusätzlich registrieren. Nach Änderungen an YAML-Ressourcen `lovelace.reload_resources` aufrufen.

Weitere Optionen:

```sh
# Erst Downloads sammeln, später aus dem Cache installieren:
python3 scripts/install.py --download-only --cache-dir /pfad/zum/downloadcache
python3 scripts/install.py --config-dir /pfad/zur/ha-konfiguration --cache-dir /pfad/zum/downloadcache --offline --apply

# Optional: Dual-Smart-Thermostat-Backendintegration:
python3 scripts/install.py --config-dir /pfad/zur/ha-konfiguration --with-integration dual_smart_thermostat --apply

# Optional: ursprüngliche SVG-Ressource zusätzlich registrieren lassen:
python3 scripts/install.py --config-dir /pfad/zur/ha-konfiguration --with-svg-refraction --apply
```

Die optionale Backendintegration ist keine zusätzliche Frontend-Dual-Thermostat-Karte. Sie wird nur benötigt, wenn sie die eigene Climate-Entity bereitstellen soll. Die vollständigen Optionen sind mit `python3 scripts/install.py --help` verfügbar.

## Themes aktivieren

Vor einer eigenen YAML-Änderung die bestehende Konfiguration sichern. Falls Themes noch nicht eingerichtet sind:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

Existiert bereits `frontend:`, nur `themes:` in diesen Block einfügen. Nach einer erstmals geänderten Frontend-Konfiguration die Konfiguration prüfen und Home Assistant neu starten. Bei bereits aktivierter Theme-Einbindung genügt anschließend **Entwicklerwerkzeuge → Aktionen → `frontend.reload_themes`**.

Im Benutzerprofil **DASH6 Satin Glass** auswählen. Alternativ in der View `theme: DASH6 Satin Glass` setzen. Die ursprünglichen Varianten bleiben auswählbar.

## Ressourcen registrieren

Bei Dashboards im Speicher-/UI-Modus: **Einstellungen → Dashboards → Ressourcen** öffnen, ggf. den erweiterten Modus im Profil aktivieren. Die vom Installer erzeugte Ressourcenliste verwenden und die Einträge als **JavaScript-Modul** ergänzen. YAML-Dashboards können stattdessen die erzeugte Ressourcen-YAML in ihre bestehende Ressourcenverwaltung übernehmen.

Die Paket-Einstiege:

| URL | Zweck |
| --- | --- |
| `/local/liquid-glass/dash6-cards.js` | Gesamtmodul; erforderlich für DASH6/Satin und dessen Kompatibilitätstypen |
| `/local/liquid-glass/vacuum-dock-card.js` | Eigenständige Vacuum Dock Card |
| `/local/liquid-glass/dash5-glass.js` | Nur die optionale ursprüngliche SVG-Erweiterung |

Fremdmodule ebenfalls registrieren, entweder über HACS oder über die vom Installer bereitgestellten Vendor-URLs. Dasselbe Fremdmodul nicht doppelt über beide Wege laden. Chunks und Profile werden vom Hauptmodul nachgeladen; sie sind keine einzelnen Ressourcen-Einträge.

Die mitkopierte `dash5-light-cards-v2.js` ist ein Kompatibilitätseinstieg zum aktuellen Hauptmodul. **Nicht zusätzlich registrieren**, da die Kompatibilitätstypen im Hauptmodul vorhanden sind. Alte DASH6- sowie alte Govee-/v2-Lichtressourcen vor einer Migration gegen ihre tatsächlich verwendeten Elementnamen prüfen und Überschneidungen entfernen. Siehe [MIGRATION.md](MIGRATION.md).

Browser vollständig neu laden. Bei einem Update kann ein neuer Versionsparameter wie `?v=2.3.0-satin` Cacheprobleme vermeiden. Es darf weiterhin nur ein Eintrag pro Modul bestehen.

## HACS und manuelle Installation

### Themes über HACS

1. Dieses Repository über den [HACS-Link](https://my.home-assistant.io/redirect/hacs_repository/?owner=hitcompliance&repository=liquid-glass-home-assistant-theme&category=theme) oder als benutzerdefiniertes Repository der Kategorie **Theme** hinzufügen.
2. Installieren, Themes aktivieren und neu laden wie oben.
3. Für das Gesamtpaket die Kartenmodule zusätzlich über den Python-Installer oder manuell installieren.

HACS als Theme-Repository kopiert die Theme-Dateien. Es installiert hierüber nicht automatisch die eigenen JavaScript-Karten, alle Fremdmodule oder das optionale Hintergrundbild. Fremdkarten in HACS separat installieren; [Abhängigkeiten](DEPENDENCIES.md).

### Alles manuell

1. Alle benötigten YAML-Dateien aus `themes/` nach `/config/themes/liquid-glass/` kopieren.
2. Den Inhalt von `dist/` einschließlich `chunks/`, `profiles/` und Lizenzhinweisen nach `/config/www/liquid-glass/` kopieren.
3. Benötigte Fremdmodule installieren und Ressourcen registrieren wie oben.
4. Optional `assets/liquid-glass-living-room.jpg` nach `/config/www/liquid-glass-living-room.jpg` kopieren; URL `/local/liquid-glass-living-room.jpg`.
5. Themes neu laden, Browser vollständig neu laden und das Theme auswählen.

Beim ersten Anlegen von `www/` kann ein Home-Assistant-Neustart erforderlich sein. Für eine separate Vacuum-Dock-Installation werden deren Modul, das vollständige zugehörige `chunks/`-Verzeichnis und die Lizenzhinweise gemeinsam benötigt. Der Licht-Kompatibilitätseinstieg lädt das Hauptmodul und benötigt daher ebenfalls dessen Chunks/Profile.

## Beispiel-Dashboard

[examples/dashboard.yaml](../examples/dashboard.yaml) enthält die Kartenfamilien, Layoutadapter und Kompatibilitätsbeispiele. Alle `demo_…`-IDs sind Platzhalter. In ein **neues** Dashboard übernehmen, Entitäten ersetzen und zunächst die gewünschten Abschnitte behalten.

- Hauptlichter, Gruppenmitglieder, Sensoren und Helfer auf eigene vorhandene Entities umstellen.
- Für Thermostate eine geeignete `climate`-Entity verwenden; zwei Sollwerte erscheinen nur bei unterstütztem Modus.
- Für Medien die eigenen Player/Remotes und passenden Firemote-Modellnamen zuordnen.
- Für Roborock keine fremden Segmentnummern übernehmen. Das Beispiel lässt die Raumzuordnung bewusst leer.
- Beim Embedded-Beispiel existiert die Ziel-Subview bereits in derselben Datei; eigener Dashboardpfad ist nicht nötig.
- Das Kamerabeispiel zeigt die lokale Kamera des Browsers und startet erst auf Klick mit Browserfreigabe.

Das Dashboard-YAML enthält keine Ressourcenliste für UI-Dashboards. Ressourcen separat registrieren.

## Optionale ursprüngliche SVG-Optik

Die bestehende Erweiterung `frontend/dash5-glass.js` bleibt optional. Sie kopiert das Hintergrundbild in eine optische Ebene und verwendet SVG-Verzerrung ohne WebGL. Die native Karte liegt darüber und bleibt bedienbar.

1. Die Datei nach `/config/www/liquid-glass/dash5-glass.js` kopieren, sofern nicht schon vom Installer kopiert.
2. Als Modulressource registrieren.
3. Das Hintergrundbild kopieren.
4. Die ursprüngliche Ansicht **`/dash-5/wohnzimmer`** mit **Liquid Glass** oder **Liquid Glass Motion** öffnen.

Nur in diesem Geltungsbereich startet die ältere Optik. Der ✦-Button öffnet ihren eigenen Editor; Werte werden browserlokal gespeichert und als JSON exportiert. Der Wrapper `custom:liquid-glass-card` akzeptiert die ursprüngliche innere Karte unter `card` und optische Einstellungen unter `glass`. Details stehen in [CARDS.md](CARDS.md). Diese Ressource ist für Satin nicht erforderlich.

## Probleme eingrenzen

| Symptom | Prüfen |
| --- | --- |
| „Custom element doesn't exist“ | Richtiger Ressourceneintrag, Modultyp, vollständiger Reload und benötigte Fremdkarte |
| Fehlende Module/Profile | `chunks/` und `profiles/` vollständig im selben Paketordner; keine privaten Profilnamen erwarten |
| „already been defined“ | Doppelte/alte DASH6- oder Lichtressource entfernen, vollständig neu laden |
| Farbe oder Regler fehlt | Entity-Fähigkeiten und Zuordnung; ohne RGB-/Temperaturunterstützung erscheint kein entsprechender Regler |
| Nur allgemeines Theme sichtbar | Satin-Theme aktiv und Hauptmodul geladen; harte eigene CSS-Regeln prüfen |
| Kein Graph | Sensor vorhanden und verfügbar, Graph aktiviert, passende Graph-Abhängigkeit geladen |
| Kein Kamera-Start | HTTPS, Browserfreigabe und lokale Kamera verfügbar |
| Abweichende Materialwerte | Browserlokale Theme-Overrides über „Theme-Vorgaben wiederherstellen“ zurücksetzen |

Nach Installation die gewünschte View auf Desktop und Smartphone prüfen: Ein/Aus-Richtung, Reglerfreigabe, Lichtgruppenmodal, Modi/Presets und vorhandene Spezialaktionen. Die Demo simuliert diese Gestaltung; sie steuert keine Geräte.

## Demo-Dashboard mit Design-Prinzipien

Der Installer kopiert `examples/demo-dashboard.yaml` nach `liquid-glass/examples/demo-dashboard.yaml`. Nach Laden des Hauptmoduls und der Abhängigkeiten ein neues Dashboard erstellen und dessen Rohkonfiguration durch diese YAML ersetzen. Die drei Views zeigen interaktive Karten mit simulierten lokalen Zuständen; eigene Entitäten sind nicht erforderlich. Gerätebefehle werden von `dash6-demo-card` abgefangen. Das vollständige Beispiel `examples/dashboard.yaml` bleibt für echte eigene Geräte verfügbar.
