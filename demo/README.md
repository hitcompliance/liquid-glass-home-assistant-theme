# Liquid Glass für Home Assistant

Ein vollständiges Glas-Paket für Home Assistant: dunkle Themes, interaktive Custom-Cards und ein grafischer Materialeditor. **DASH6 Satin Glass** verbindet sanft gefrostetes Rauchglas mit kleinen beleuchteten Schaltern, versenkten Reglern und flachen Glaslinsen. Die ursprünglichen Liquid-Glass-Themes bleiben erhalten.

**[Interaktive Demo](https://hitcompliance.github.io/liquid-glass-home-assistant-theme/)** · [Installation](docs/INSTALLATION.md) · [Karten und Einstellungen](docs/CARDS.md) · [Abhängigkeiten](docs/DEPENDENCIES.md) · [Umstieg](docs/MIGRATION.md)

[![In HACS hinzufügen](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=hitcompliance&repository=liquid-glass-home-assistant-theme&category=theme)

## Was enthalten ist

Das Theme bestimmt Farben und Material. Das zusätzliche Kartenmodul liefert Schalter, Regler, Auswahlgruppen, Dialoge und Anpassungen vorhandener Button-/Mushroom-Karten. Für den vollständigen Satin-Look werden **Theme und Kartenmodul gemeinsam** installiert. HACS als Theme-Repository installiert den YAML-Teil; die JavaScript-Dateien werden über den Installer oder manuell ergänzt.

| Bestandteil | Inhalt |
| --- | --- |
| `themes/` | Zwei ursprüngliche Liquid-Glass-Themes und sechs DASH6-Varianten |
| `dist/dash6-cards.js` | Aktuelles Gesamtmodul mit Satin, Kartenadaptern und Editoren |
| `dist/chunks/`, `dist/profiles/` | Zugehörige Module und neutrale Beispielprofile; mitkopieren |
| `dist/dash5-light-cards-v2.js` | Kompatibilitätseinstieg zum aktuellen Hauptmodul; nicht zusätzlich registrieren |
| `dist/vacuum-dock-card.js` | Eigenständige Staubsauger-/Dock-Karte |
| `frontend/dash5-glass.js` | Optional erhaltene SVG-Hintergrundbrechung für die ursprüngliche DASH5-Ansicht |
| `examples/dashboard.yaml` | Portables Gesamtbeispiel mit erfundenen, auszutauschenden Entitäten |

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

Der [Python-Installer](docs/INSTALLATION.md#installation-mit-dem-python-installer) kopiert das Paket in das angegebene Home-Assistant-Konfigurationsverzeichnis und hilft bei Ressourcen und optionalen Abhängigkeiten. Er benötigt keinen Build auf dem Home-Assistant-Server. Alternativ lassen sich Themes über HACS und die fertigen Module manuell installieren.

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

Die Karten benötigen unterschiedliche Zusatzmodule. Eine Lichtkarte braucht weniger als ein komplettes Ultra-/Graph-/Medien-Dashboard. [DEPENDENCIES.md](docs/DEPENDENCIES.md) nennt Zuordnung und vom Installer verwendete Versionen. HACS-Theme-Installation allein lädt diese Abhängigkeiten nicht.

Aktuelle Browser mit Custom Elements, Shadow DOM und `<dialog>` werden vorausgesetzt. Chrome/Chromium und Safari/WebKit wurden für Satin-Bedienelemente und Dialoge geprüft. Änderungen an HA-Frontend-Interna und Fremdkarten können Anpassungen nötig machen. Eigene CSS-Regeln und geschlossene Shadow Roots können Styling-Hooks begrenzen; vollständige Umgestaltung sämtlicher Fremdkarten ist nicht pauschal zugesichert.

SVG-Hintergrundbrechung und Satin-Frostung sind getrennte Funktionen. Die ursprüngliche SVG-Optik bricht eine Kopie des Hintergrundbilds, nicht sämtliche Live-Dashboard-Inhalte. Satin verwendet CSS-/SVG-Materialien und die dafür vorgesehenen Kartenadapter.

## Projekt und Lizenzen

Demo, Default-Zuordnungen und Beispiele enthalten neutrale Daten. Für das Dashboard werden eigene Entitäten benötigt; Zugangsdaten und Tokens gehören nicht in die Kartenkonfiguration. Das beigelegte Wohnzimmerbild ist ein für das Projekt erzeugter Hintergrund.

Dieses Projekt ist unabhängig von Apple und Home Assistant. Der Theme-Teil steht unter [MIT](LICENSE); Quell- und Fremdlizenzen der mitgelieferten Karten stehen bei den jeweiligen Modulen und Lizenzhinweisen. Für die ursprüngliche SVG-Optik siehe [THIRD-PARTY-LICENSE.md](frontend/THIRD-PARTY-LICENSE.md).

Weitere Einordnung: [Design-Notizen](docs/DESIGN-NOTES.md) und [ursprüngliche DASH5-Kompatibilität](docs/CARD-COMPATIBILITY.md).
