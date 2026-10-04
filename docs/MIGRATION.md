# Umstieg und Kompatibilität

## Bestehende Themes behalten

**Liquid Glass** und **Liquid Glass Motion** bleiben erhalten. Ein Theme-Update allein ersetzt keine Dashboard-Karten. Für Satin werden **DASH6 Satin Glass** und das aktuelle Gesamtmodul `dash6-cards.js` gemeinsam verwendet. Die ursprünglichen DASH6-Varianten bleiben im aktuellen Modul unterstützt; Satin greift erst bei aktivem `dash6-satin-enabled`.

## Ältere DASH6-Ressource ersetzen

1. Dashboard-Konfiguration und bisherige Ressourcenliste sichern.
2. Das neue Paket vollständig kopieren; `chunks/` und `profiles/` gehören dazu.
3. Bisherige DASH6-Ressource durch `/local/liquid-glass/dash6-cards.js` ersetzen und den Browser vollständig neu laden.
4. Eine kopierte Testview zunächst mit dem bisherigen Theme, danach mit **DASH6 Satin Glass** prüfen.

**Alte und neue DASH6-Bundles nie parallel laden:** Sie registrieren dieselben `dash6-*`-Elemente. Unterschiedliche Cacheparameter schaffen keine getrennten Versionen.

Das öffentliche Paket enthält neutrale `sample-*`-Profile. Private Profilnamen aus einem früheren Dashboard werden nicht automatisch erzeugt. Deren eigene vollständige Karte unter `custom:dash6-render-card` → `definition` einbinden oder bewusst eigene Profile übertragen.

## DASH5-v2-Lichtkarten

| Bestehender Typ | Neuer DASH6-Typ |
| --- | --- |
| `custom:dash5-govee-light-card-v2` | `custom:dash6-govee-light-card-v2` |
| `custom:dash5-lightgroup-card-v2` | `custom:dash6-lightgroup-card-v2` |
| `custom:dash5-multi-light-card-v2` | `custom:dash6-lightgroup-card-v2` |
| `custom:dash6-multi-light-card-v2` | `custom:dash6-lightgroup-card-v2` |

Das aktuelle Gesamtmodul stellt die Kompatibilitätstypen bereit. Die mitkopierte `dash5-light-cards-v2.js` ist ein Einstieg zum selben aktuellen Modul. Sie wird **nicht zusätzlich registriert**. Der ursprüngliche DASH5-v2-Quellstand bleibt als historische Quelle erhalten; die öffentliche Laufzeit nutzt die aktuellen Aliasnamen.

Für den vollständigen Satin-Control-Look zuerst die Karte kopieren, den Typ ändern und Hauptentity, Segmente, Ausschlüsse, Sensoren, Szenen und Fähigkeiten im DASH6-Editor prüfen. Alte bereits registrierte Govee-/v2-Module mit überschneidenden Elementnamen vor dem Umstieg entfernen; nicht blind jede Fremdressource löschen.

Per-Karte-Lichteditor-Overrides sind nach Dashboardpfad, Kartentyp und Lichtidentität getrennt. Ein Typ-/Pfadwechsel übernimmt sie nicht automatisch. Gewünschte Einstellungen bewusst übertragen. **Dashboard-Vorgabe** entfernt einen Override und verwendet die umgebende Konfiguration; die ursprüngliche YAML bleibt erhalten.

## Zwei Staubsauger-Schnittstellen

`custom:dash6-vacuum-card` und `custom:vacuum-dock-card` sind verschiedene Familien. Ein bloßer Typwechsel reicht nicht:

| DASH6 `entities` | Vacuum Dock `entities` |
| --- | --- |
| `mode` | `cleaning_mode` |
| `intensity` | `mop_intensity` |
| `route` | `mop_route` |
| `emptyMode` | `emptying_mode` |
| `drying` | `mop_drying` |
| `washing` | `mop_washing` |
| `emptying` | `dust_emptying` |
| `dryTime` | `drying_remaining` |
| `cleanWater` | `clean_water` |
| `dirtyWater` | `dirty_water` |
| `battery`, `progress` | Gleichnamige Schlüssel |

Den jeweiligen grafischen Editor verwenden. Segmentnummern stammen von der aktiven Roborock-Karte des eigenen Geräts. Tank-Entities benötigen Problemsemantik: `off` = OK, `on` = Problem, unbekannt = neutral. Stunden-/Minutensensoren nicht erneut umrechnen. Wartungs-Reset-Zuordnungen der integrierten DASH6-Karte sind keine identische Schnittstelle der Standalone-Karte.

## Vorhandene Button-/Mushroom-Karten

Originale Konfiguration vollständig unter `definition` eines Satin-/Render-Wrappers einbinden. Native Services, Bestätigungen, Hold-/Double-Tap-Aktionen und Editor bleiben zuständig. Nur erkennbare Ein/Aus-Icon-Aktionen erhalten den Schalter; gesperrte/unklare Konfigurationen bleiben nativ. Keine Aktion nur für die Optik in `toggle` umschreiben.

Passende Button-Cards mit Leistungsgraph können über `dash6-satin-graph-card` die IKEA-Graphdarstellung übernehmen. Für neue Messsteckdosen ist `dash6-ikea-card` einfacher. Eigene Zusatzfunktionen vor dem Umstieg an einer Kopie prüfen.

## Thermostat und Dual-Thermostat

Satin ändert ausschließlich untere Modusgruppe, rechte Preset-Taste und Temperaturgriffe. Außenfläche, Werte, Ring, Track, Low-/High-Beschriftung und Preset-Dialog bleiben erhalten. Die DASH6-Karte bleibt 265px hoch. Zwei Setpoints verwendet die native HA-Bedienung der passenden `climate`-Entity; eine optionale Dual-Smart-Thermostat-Backendintegration ist keine Frontend-Card-Abhängigkeit.

## Einstellungen und Rückweg

Der Theme-Editor speichert Sofortänderungen browserlokal. Vor einem Themevergleich **Theme-Vorgaben wiederherstellen** verwenden, damit gespeicherte Werte den Vergleich nicht überlagern. Gewünschte Werte vorher exportieren.

Für den Rückweg ein ursprüngliches Theme auswählen; Satin-Adapter deaktivieren ihre Anpassungen. Soll auch die alte Modulversion zurückkehren, den neuen Eintrag entfernen, den gesicherten Ressourceneintrag wiederherstellen und vollständig neu laden. Jeweils nur eine DASH6-Version registrieren.

Die ursprüngliche SVG-Ressource `frontend/dash5-glass.js` bleibt getrennt und optional. Sie muss für Satin nicht zusätzlich geladen werden.
