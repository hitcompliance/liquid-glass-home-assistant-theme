# DASH6 Satin Glass · Anleitung für Agenten

Dieses Repository liefert eine vollständige Home-Assistant-HACS-Integration. Das einzige veröffentlichte Theme ist **DASH6 Satin Glass**. Neue Karten, Views und Beispiele sollen dessen bestehende Materialien und Bedienmuster verwenden.

## Einstiege und Verzeichnisstruktur

| Pfad im Repository | Aufgabe |
| --- | --- |
| `src/dash6/` | Gepflegte Custom Cards, gemeinsame Glasbedienung, Graphen und grafische Editoren |
| `src/vacuum-dock/` | Eigenständige Vacuum Dock Card |
| `themes/liquid-glass.yaml` | Native Theme-Variablen; ausschließlich `DASH6 Satin Glass` |
| `src/dash6/theme-preferences.json` | Vollständige Paketvorgaben für CSS und GUI-Regler |
| `support/theme-defaults.json` | Dokumentierter Snapshot der veröffentlichten Default-Einstellungen |
| `custom_components/liquid_glass/` | HA-Lebenszyklus, sicherer Installer, Browser-Simulation, optionale Testplattformen und Theme-Speicherung |
| `custom_components/liquid_glass/bundle/` | Generiertes, eigenständiges HACS-Laufzeitpaket |
| `dist/` | Generierte Einstiegsmodule, Chunks, Profile, Defaults, Konfigurationen und Lizenzen |
| `examples/domain-blocks.yaml` | Kopierbares kanonisches Domain-Muster: nativer Reiter, heller Rahmen, mehrere dunkle Entity-Karten |
| `examples/demo-dashboard.yaml` | Buildquelle für das native Storage-Dashboard; JSON-Syntax ist gültiges YAML |
| `scripts/build-device-demo.py` | Kombiniert versionierte DASH6-Kopie, separate Galerie, Browser-Beispieldaten, optionale Testplattformen und Kartenkatalog |
| `support/card-catalog.json` | Automatisch erzeugte Galerie-Konfigurationen |
| `frontend/showcase-*` | Öffentliche Browser-Demo: nur native HA-Elemente werden lokal adaptiert |
| `demo/` | Gebaute GitHub-Pages-Demo mit den echten eigenen und fremden Karten |
| `dependencies.lock.json` | Offizielle Downloadquellen, festgelegte Versionen, Dateigrößen und SHA-256 |
| `scripts/install.py`, `scripts/build-integration.py` | Installationsplan und Erzeugung des vollständigen HACS-Bundles |

Auf der HA-Installation liegen die Karten unter `/config/www/liquid-glass/`, die Dokumentation und Beispiele unter `/config/liquid-glass/`. Die installierte Agentenanleitung ist `/config/liquid-glass/AGENTS.md`.

## Zuerst die vollständige Demo ansehen

- Öffentlich: [Alle Karten, Details und GUI](https://hitcompliance.github.io/liquid-glass-home-assistant-theme/).
- Installiert: **LIQUID-GLASS-DEMO**, Einstieg `/liquid-glass-demo/home`: vollständige anonymisierte DASH6-Kopie mit Ultra Card und 28 Views. Die separate Galerie `/liquid-glass-gallery/demo` zeigt alle Karten, Details und GUI-Editoren.
- Danach die Raum-Views und die Bibliotheks-/Strukturansichten ansehen. Florin und private Dashboarddaten gehören nicht in die Veröffentlichung.
- Beide Türkarten vollständig zeigen: Wohnungstür mit Kontakt-/Batteriewarnung und Haustür mit Klingel-/Cancel-Rückmeldung. Dummy-Schalter für diese Zustände nutzen; keine echte Türaktion für Gestaltungstests.
- Schuhschrank mit direkten Szenen, TV/Apple TV und Staubsauger stehen direkt im Einstieg. Licht-/Segmentdetails, Fernbedienungen, Reinigungsplanung, Basisstation, Verschleißteile und Presets müssen bedienbar bleiben.
- **GUI konfigurieren** öffnet den echten Karteneditor, soweit die Klasse `getConfigElement()` anbietet. Dafür keine separate, abweichende Demo-GUI erfinden.

Die Kopie liegt in `examples/dash6-copy.json`, ihre lokalen Beispielzustände in `support/dash6-copy-entities.json`, anonymisierte Raumlader in `support/demo-room-configs.json`. Profile verwenden eingebettete `definition`, damit keine privaten Profildateien nachgeladen werden. Der Importer `scripts/import-dash6-copy.py` ist nur ein bewusster Maintainer-Schritt mit privaten Eingaben außerhalb des Release-Pakets. Normale Builds benötigen diese Eingaben nicht. Installierte Demo, Galerie und Hue-Demo sind native Storage-Dashboards. `editable_dashboard.py` legt sie über Home Assistants vorhandene native Dashboard-Collection an, ohne einen Client-Schreibaufruf. Eigene GUI-Änderungen über Updates und Entladen erhalten; nur unberührte generierte Konfigurationen automatisch erneuern.

Die originalen Hintergrundvorgaben der übernommenen Raum-Views stehen in `support/demo-view-backgrounds.json`. Der Demo-Build übernimmt sie in die installierten Dashboards; der Installer kopiert die zugehörigen Dateien aus `assets/backgrounds/` nach `/config/www/liquid-glass/assets/backgrounds/`. Keine privaten HA-Upload-IDs als portable Hintergrundquelle verwenden.

`custom_components/liquid_glass/hue_dashboard.py` erzeugt die optionale **LIQUID-GLASS-HUE-DEMO** ausschließlich aus den lokalen Registries. Sie steuert echte lokale Entities; den Dummy-Scope dort nicht verwenden. Kein Build darf ein festes privates Geräteverzeichnis als Hue-Quelle übernehmen. Ultra Card, Domain-Hüllen, Heading-Reiter und die Theme-Vorgaben bleiben maßgeblich.

Die Layout-Adapter dürfen ausschließlich bei der äußersten aktuellen View mit `type: panel` und erster Karte `cards[0].type: custom:dash6-ultra-card` greifen, unabhängig von Dashboardname oder URL. Das Satin-Theme allein oder ein verschachtelter Treffer reichen nicht. Native Energie-Views behalten ihr eigenes Raster. Layoutmarkierungen heißen `data-liquid-glass-*`; Theme-Layoutwerte unter `dash6-layout-ha-*` werden nur innerhalb dieser Struktur auf HA-Variablen abgebildet. Die Demo-Ultra-Card verwendet `liquid_glass_demo_mode: browser`, um ihren vollständigen Kartenbaum und Originaleditor direkt zu isolieren.

## Verbindlicher Aufbau der Domain-Blöcke

Die Raum-Views und die Demo-View **Domain-Blöcke & Aufbau** (`/liquid-glass-gallery/domain-bloecke`) sind die Gestaltungsreferenz. Verwende `custom:dash6-domain-card` mit `heading`, `cards`, `combine: true`, eindeutiger `block_id`, passender `area` und `domain`. Das kopierbare Beispiel steht in [examples/domain-blocks.yaml](examples/domain-blocks.yaml).

- **Nativer Heading-Reiter → gemeinsame helle Glashülle → mehrere dunkle Entity-Karten.** Der Reiter gehört zur Hülle. Ein Grid-Titel oder eine einzelne dunkle Karte ersetzt dieses Muster nicht.
- `heading` erzeugt die native Überschrift; `title` ist kein Ersatz. Geräte behalten eigene Titel, Aktionen, Sperren und Detaildialoge. Eine Domain kann mehrere Karten enthalten.
- Hülle und Reiter verwenden helles Glas, Entity-Karten dunkles Glas; die beiden Theme-Regler bleiben unabhängig. Layout-Wrapper transparent, Abstände 8px. Keine zusätzlichen hartcodierten Materialflächen.
- Die Domain-GUI verwaltet Überschrift, Raster, feste Karten, automatische Ergänzung und Ausschlüsse. Die jeweiligen Geräteeditoren bearbeiten die inneren Karten.
- In den festen Dummy-Beispielen ist `auto_entities: false`. Produktive dynamische Blöcke aus den tatsächlichen Bereichs-/Domain-Zuordnungen ergänzen; globale Namensausschlüsse getrennt im Dashboard belassen. Keine privaten Raumlader/Profile als neue Voraussetzung für produktive Raum-Views.

Medien-Muster: genau ein Lautstärkeregler als gemeinsame Glaszeile unter dem Player; keinen zusätzlichen nativen Lautstärkeregler und kein sichtbares Lautstärke-Label einführen. `media-volume.css` wird von den Medienkarten und dem Theme verwendet. Wiedergabefortschritt und vorhandene Geräteaktionen erhalten.

Auto-Entities-Vorlagen müssen über die Verbindung der jeweiligen Karte laufen (`auto-entities-context.js`), auch innerhalb der kopierten Startseite. Der globale card-tools-Zugriff auf die Host-Instanz würde echte Räume und Konfigurationen in die Demo übernehmen. Der Browser-Test verwendet deshalb absichtlich verschiedene Host- und Demo-Kontexte. Strukturierte Template-Ergebnisse bleiben Listen/Objekte.

## Verbindliche Entwicklungsmuster

Bei Live-Arbeit keine eigenen Updates über WebSocket-Verbindungen ausführen; vorgesehene MCP-Werkzeuge beziehungsweise die native HA-GUI verwenden. Höchstens zwei Browser-Tabs gleichzeitig verwenden, einschließlich lokaler Prüftabs; vor einem dritten mindestens einen schließen. Bei einem HA-Neustart zuerst die Nichterreichbarkeit von `homeassistant.local`, dann die erneute Erreichbarkeit und schließlich die von HA gesendete Abschlussmeldung abwarten. Bis diese Meldung empfangen wurde, sind sämtliche anderen HA-Requests strikt verboten; nur die dafür erforderlichen Erreichbarkeitsprüfungen und der Empfang der Abschlussmeldung sind zulässig.

1. Bestehende gemeinsame Materialien und Renderer erweitern. Keine zusätzliche Themevariante und keine zweite Nachbildung einer bereits enthaltenen Karte anlegen.
2. Fähigkeiten aus den tatsächlichen Entities lesen. Geräteaktionen, Sperren, Bestätigungen und Domain-Zuordnungen erhalten. Gestaltungstests verwenden den Browser-Demokontext; keine echten Geräteaktionen.
3. Hintergrundgraphen mindestens 100px hoch halten. Leistung in den gemeinsamen Kopf; keine zusätzlichen Energiezähler auf solchen Karten. Präsenzsymbole absolut unten rechts mit 8px Randabstand. Hauptzustände und tatsächliche Bestätigungen bleiben maßgeblich; ein Szenenaufruf allein beweist keinen aktiven Sollzustand.
4. Native grafische Konfiguration über `getConfigElement()` bereitstellen, wenn es passende Optionen gibt. Grundlegende, spezialisierte und freie JSON-/YAML-Editoren unterscheiden und in der Kartenreferenz korrekt benennen.
5. Neue Funktionen gleichzeitig in **README**, [Karten- und GUI-Leitfaden](docs/CARD-GUIDE.md), installierter Demo und öffentlicher Demo nachvollziehbar machen. Detaildialoge und GUI-Klickpfade ebenfalls aufnehmen.
6. Neue Fremdmodule vollständig mit Chunks, Übersetzungen und Lizenzen im Dependency-Lock erfassen. Automatische, optionale und vom Nutzer selbst einzurichtende Abhängigkeiten ausdrücklich dokumentieren. Keine privaten Zusatzintegrationen voraussetzen.
7. Demo-IDs verwenden ausschließlich `*.liquid_glass_demo_*`. `dash6-demo-scope` verwendet standardmäßig `demo-runtime.js` mit `demo-runtime-data.json`. Jede Karte, dynamische Vorlage und jeder Dialog muss diesen Kontext weiterreichen; keine echten HA-Gerätedienste oder APIs für Demo-IDs aufrufen. Die einzige Host-Ausnahme ist `frontend/get_icons` für öffentliche native Symbol-Metadaten. Mehr-Informationen-Ereignisse bleiben lokal. `demo-context.js` beantwortet zusätzlich native HA-Lit-Kontexte für Entity-Auswahl, Registries und APIs innerhalb der Simulation; diese Grenze auch für Dialoge außerhalb des Kartenbaums erhalten. Neue Gerätefunktionen und Vorlagen in derselben Laufzeit ergänzen und sichtbar demonstrieren. `mode: entities` ist ausschließlich der optionale Altmodus; bestehende Installationen werden dorthin migriert, neue starten ohne HA-Entities.
8. Paket-Defaults kommen aus den versionierten Theme-/Preference-Dateien. Gemeinsame Änderungen eines installierenden Nutzers werden über die eigene Integration mit Sicherung gespeichert und bei Updates erhalten. Keine privaten Browser-Speicher oder produktiven Konfigurationen als Buildvoraussetzung verwenden.

## Bauen und prüfen

```sh
npm ci
npm run build:cards
python3 scripts/build-integration.py
python3 scripts/build-public-demo.py
python3 scripts/package-release.py
```

Die öffentliche Demo enthält die festgelegten Vendor-Dateien. Ein normaler Neubau verwendet und prüft diese vorhandenen Bytes. Für neue Abhängigkeiten einen geprüften Downloadcache über `--cache-dir` angeben oder bewusst `--download` verwenden. Auf der HA-Zielinstallation ist kein npm-Build erforderlich.

Vor Veröffentlichung Installer, Integrationslebenszyklus ohne Standard-Testplattformen, Browser-Simulation, optionale Test-Entities, gemeinsame Theme-Speicherung sowie Chromium und WebKit prüfen. `tests/public-showcase-browser.mjs` prüft insbesondere die sichtbaren Hauptkarten, ihre Detaildialoge und die echten GUI-Editoren. Nur einen echten veröffentlichten Release samt heruntergeladenem ZIP/Prüfsumme als veröffentlicht bezeichnen; lokale Tests, GitHub-CI und produktive Installation getrennt dokumentieren.

Weitere Details: [Installation](docs/INSTALLATION.md), [Abhängigkeiten](docs/DEPENDENCIES.md), [Kartenreferenz](docs/CARDS.md). Builddateien nicht von Hand korrigieren; zuerst die zuständige Quelle ändern und anschließend neu bauen.
