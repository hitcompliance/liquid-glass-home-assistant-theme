# Abhängigkeiten und automatische Installation

## Was automatisch installiert wird

**HACS installiert die gesamte Liquid-Glass-Integration.** Nach Neustart und Hinzufügen unter Geräte & Dienste installiert die Integration selbst das Satin-Theme, alle eigenen Karten und die nachfolgend aufgeführten **zwölf Frontend-Fremdmodule**. Diese müssen Nutzer **nicht zusätzlich selbst in HACS installieren**. Die vollständigen Chunks, Übersetzungen und Lizenzen werden mitgeladen. Bereits registrierte HACS-Module werden wiederverwendet; deren Versionen und Updates verwaltet weiterhin HACS. Die automatische Vendor-Installation erstellt keine zusätzlichen HACS-Einträge.

Die Demo legt außerdem ihre eigenen virtuellen Entities an. Home Assistants native Karten und Plattformen (Klima, Kamera, Wetter usw.) kommen aus Home Assistant; ihre Python-Abhängigkeiten verwaltet HA. Node/npm und externe Hardwareintegrationen sind für die Demo nicht erforderlich.

## Selbst einzurichten

| Bestandteil | Automatisch? | Was der Nutzer tun muss / wann erforderlich |
| --- | --- | --- |
| HACS | **Nein** | Vor dem empfohlenen HACS-Weg [selbst installieren](https://www.hacs.xyz/docs/use/download/download/). Die manuelle Installation des Integrations-ZIPs funktioniert ohne HACS. |
| Home Assistant ab 2026.9 | **Nein** | Eine unterstützte HA-Installation bereitstellen. Recorder für längerfristige Verläufe aktiv lassen und Demo-Entities nicht ausschließen. |
| Geräteintegrationen (z. B. Shelly, Matter, Meross, Govee, Tado, Apple TV, Android TV/ADB, ESPHome, Roborock) | **Nein** | Für die tatsächlich verwendete Hardware selbst installieren/einrichten und eigene Entities den Karten zuordnen. Für die Demo nicht nötig. |
| Dual Smart Thermostat v0.13.2 | **Nur bei Auswahl** | Im Liquid-Glass-Dialog optional auswählen: Dateien werden automatisch geprüft/installiert. Danach erneut HA starten und eigene Temperatur-/Heiz-/Kühl-Entities konfigurieren. Vorhandene Installation bleibt erhalten. Normale Climate- und Demo-Karten brauchen es nicht. |
| Shelly-Lüftungsskript | **Datei ja, Aktivierung nein** | Quelle wird unter `liquid-glass/support/shelly/` mitkopiert. Geeignete Hardware, virtuelle Komponenten, Verdrahtung und Parameter selbst prüfen/einrichten. [Anleitung](../support/README.md). |
| TV-Eingangsautomationen / ADB / BLE / ESPHome-Firmware | **Nein** | Nur für gerätespezifische Zusatzaktionen selbst einrichten und zuordnen. Native Medienquellen und Demo funktionieren ohne private Automationen. Firemote ist automatisch enthalten, seine echten Remote-/Player-Entities nicht. |
| Ultra Card Connect | **Nein, optional** | Nur für Ultra-Hub-Anmeldung, Pro-/Cloud-/Sync-Funktionen separat nach Upstream-Anleitung einrichten. Normale Ultra-Layouts benötigen es nicht. |
| Browser Mod | **Nein, optional** | Nur erforderlich, wenn eigene zusätzlich eingefügte Karten/Aktionen explizit `browser_mod` verwenden. Paketdialoge und Demo benötigen es nicht. |
| MQTT / Zigbee2MQTT / Gerätefirmware | **Nein** | Nur entsprechend der eigenen Geräte selbst einrichten; keine Abhängigkeit der Demo. |
| Alte private Govee-Segmentkarte / Tado-Proxy | **Nein** | Keine erforderliche Frontend-Abhängigkeit: das Paket enthält Govee-/Gruppenbedienung und nutzt vorhandene Climate-Entities. Eigene spezielle Backend-/Legacy-Konfiguration bleibt in Nutzerverantwortung. |

Für die enthaltenen Karten sind **keine weiteren manuell nachzuinstallierenden Frontend-Custom-Cards** erforderlich. Fremde Karten, die Nutzer später selbst hinzufügen, können eigene Voraussetzungen mitbringen.

## Festgelegte Versionen und Prüfung

The installer installs every frontend dependency used by the supplied cards and
layout adapters by default. Versions, official download URLs, byte sizes and
SHA-256 checksums are fixed in [`dependencies.lock.json`](../dependencies.lock.json).
The original dependency set was downloaded and verified on **2026-10-04**.
Embedded View Card was additionally verified on **2026-10-13**. The lock does
not track “latest” during installation. Release-asset checksums supplied by
GitHub were also compared where available.

The dependency inventory follows the actual card imports, custom-element
adapters and graph factories. Cards installed elsewhere in a Home Assistant
instance are not automatically dependencies of this package. Device entity IDs,
private dashboard configurations and integration credentials are not included.

## Installed frontend modules

Die HACS-Integration lädt fehlende Module automatisch. Der CLI-Installer lädt sie mit `--apply` oder `--download-only`. Files are installed
under `www/liquid-glass/vendor/<id>/`; only each entrypoint is a dashboard
resource. Imported chunks remain next to that entrypoint.

| Module | Fixed version | Used for | Official source |
| --- | --- | --- | --- |
| Ultra-Card | v3.13.0 | Ultra layout, external-card modules and visual editor | [Release](https://github.com/WJDDesigns/Ultra-Card/releases/tag/v3.13.0) |
| Button Card | v7.0.1 | Native button actions, switch adapters and configurable device cards | [Release](https://github.com/custom-cards/button-card/releases/tag/v7.0.1) |
| Mushroom | v5.2.3 | Light/fan/entity/template adapters, fallback light controls and chips | [Release](https://github.com/piitaya/lovelace-mushroom/releases/tag/v5.2.3) |
| Auto Entities | v1.16.1 | Dynamic entity filters and custom auto-entities layouts | [Release](https://github.com/thomasloven/lovelace-auto-entities/releases/tag/v1.16.1) |
| ApexCharts Card | v2.2.3 | Background graphs and chart compatibility | [Release](https://github.com/RomRider/apexcharts-card/releases/tag/v2.2.3) |
| Mini Graph Card | v0.13.0 | Existing mini-graph configurations and theme-off compatibility | [Release](https://github.com/kalkih/mini-graph-card/releases/tag/v0.13.0) |
| Card Mod | v4.2.1 | Shared theme CSS and `custom:mod-card` | [Release](https://github.com/thomasloven/lovelace-card-mod/releases/tag/v4.2.1) |
| Layout Card | v2.4.7 | `grid-layout`, pill and inline layout adapters | [Release](https://github.com/thomasloven/lovelace-layout-card/releases/tag/v2.4.7) |
| More Info Card | commit `c0a9c942851c` | Compatibility with existing non-cover more-info cards | [Pinned source](https://github.com/thomasloven/lovelace-more-info-card/tree/c0a9c942851c1c5370e8de102eb96597fb845d85) |
| Vertical Stack in Card | v1.1.4 | Compatibility with existing stack configurations | [Release](https://github.com/ofekashery/vertical-stack-in-card/releases/tag/v1.1.4) |
| Embedded View Card | commit `739823b9b6f8` | Original embedding engine and editor, with a small Liquid Glass adapter | [Pinned source](https://github.com/redkanoon/embedded-view-card/tree/739823b9b6f89999203504cf13ed7d0247ecb0b8) |
| Firemote | v4.1.9 | Apple TV / Fire TV remote in the media modal | [Release and setup](https://github.com/PRProd/HA-Firemote/releases/tag/v4.1.9), [device prerequisites](https://github.com/PRProd/HA-Firemote#prerequisites) |

Ultra-Card is **not a single-file dependency**. The lock includes all 149 files
of its official release, plus its own MIT license: card, editor, locales,
modules, libraries and license notices. Firemote includes its six `dist/` files
and upstream license; `lit/`, launcher data, translations and supported-device
definitions are required by relative imports. Copying just their main JavaScript
file would leave parts of the UI unavailable.

More Info Card has no tagged GitHub release, so its complete Git commit and
checksum are pinned. Modules whose releases do not attach built files are
retrieved from the exact release commit, never from `main` or `master`.
Upstream license files and release license notices are installed alongside the
modules. Third-party binaries are downloaded from their authors; they are not
rehosted in this repository.

Normal Ultra layouts work without Ultra Card Connect. Connect is separately
optional for Hub authentication, Pro unlock, synchronization and related cloud
features; it is not installed by this frontend installer. See the
[pinned Ultra v3.13.0 README](https://github.com/WJDDesigns/Ultra-Card/blob/50e2f396c6a7a8d276b0dd85368acd7abc88cbac/README.md#ultra-card-connect-recommended-for-hub--pro).

## Bundled cards and native controls

The release supplies `dist/dash6-cards.js`, its adjacent `chunks/` and public
`profiles/`, `dist/vacuum-dock-card.js`, and the legacy
`dist/dash5-light-cards-v2.js` compatibility entry. The installer copies the
whole `dist/` tree. Register the DASH6 and vacuum-dock entrypoints; the DASH5
shim imports the same main module and needs no extra resource registration.

The thermostat display uses Home Assistant's **native thermostat and climate
controls**. It does not require `thermostat-dark-card` or the old Lovelace
thermostat card. Cover and Roborock controls are supplied by this package.
Embedded View Card is downloaded separately from its original upstream with its
version module, seven translation files, translation loader and MIT license.
Only a small Liquid Glass subclass adapter is bundled: it preserves the existing
`custom:dash6-embedded-view-card` name and editor, and adapts the resulting view
to the Liquid Glass sections layout. It does not contain the upstream card
implementation. Its private extension points are checked against the pinned
commit; an incompatible separately installed version must be updated to a
supported version. Existing registered upstream resources are reused. Existing
`climate`, `cover` and `vacuum` entities must still be provided by their device
integrations. Do not add an original frontend card whose custom-element tag is
already supplied by this package.

### Embedded View ownership and later HACS installations

The original owns `embedded-view-card` and `embedded-view-card-editor`.
Liquid Glass owns only its `dash6-embedded-view-card` adapter and editor. It
does not modify the original constructor or globally patch CustomElementRegistry.

When the integration starts, one registered original URL is reused verbatim,
including its version query string. If no original resource exists, the pinned
vendor copy is installed. The bootstrap checks both original element tags before
importing; partially registered originals fail explicitly rather than loading a
second implementation. Identical URL imports share the browser's ESM cache.

For Storage-mode resources, the integration listens to Home Assistant's resource
collection. A later HACS installation or URL update changes only the original
Embedded import and the integration-owned bootstrap URL. Foreign resource rows,
themes, dashboards, other modules and installed originals are not deleted or
rewritten. An initial reconciliation closes the setup/listener race. Unload
removes the listener and only the integration-owned notifications/extra module.

More than one distinct registered `embedded-view-card.js` URL is a conflict;
the integration never silently picks the last entry. Initial setup stops before
file changes. A late conflict suspends only Liquid Glass's bootstrap and reports
the problem, leaving foreign registrations for the user to resolve. Once one
original remains, a collection change restores the owned loader automatically.

**A source change requires a complete browser reload.** An already registered
custom-element constructor cannot be replaced or unregistered. The integration
shows a reload notification; it does not promise a seamless transition within an
already open tab, or suppress failures from foreign code independently loaded
twice. Fresh pages import only the selected canonical original URL. Replacing a
YAML resource collection is reconciled at integration reload/startup; the live
Storage/HACS listener does not apply to YAML resource editing.

A separately installed, older `govee-segment-light-card` is optional legacy
compatibility only. There is no verified public upstream artifact for that
instance-specific module in this package. The bundled Govee controls provide
segments and use Mushroom/native fallback controls when the older module is
absent. They require your existing Govee light/segment entities and device
integration, not that private legacy JavaScript file.


## Optional backend thermostat integration

`--with-dual-smart-thermostat` (or
`--with-integration dual_smart_thermostat`) downloads the complete verified
**Dual Smart Thermostat v0.13.2** source archive and copies only its
`custom_components/dual_smart_thermostat/` directory, plus the upstream license.
It does not create thermostats, change entities or enable devices. Restart Home
Assistant and configure the integration afterward using the
[official integration instructions](https://github.com/swingerman/ha-dual-smart-thermostat/tree/fe0c544b4a2a155cfbfd0863d9bf694accb83920)
and [v0.13.2 release notes](https://github.com/swingerman/ha-dual-smart-thermostat/releases/tag/v0.13.2).
The verified v0.13.2 component manifest has an empty `requirements` list: it
requires no additional Python packages beyond Home Assistant itself. Its climate
entities are created by the integration after you configure your own sensors and
heater/cooler entities.

This backend is optional: the native thermostat card also works with compatible
existing climate entities supplied by other integrations. Existing installations
should retain their current integration/entity configuration.

HACS **Dashboard** repositories contain frontend cards; HACS **Integration**
repositories install backend components under `custom_components`. A theme
repository in HACS does not automatically install either all cards or backend
integrations. This installer handles its explicit locked dependencies without
requiring HACS. HACS itself, Browser Mod and device integrations are not silently
installed. See [HACS Dashboard repositories](https://www.hacs.xyz/docs/use/repositories/type/dashboard/)
and [HACS Integration repositories](https://www.hacs.xyz/docs/use/repositories/type/integration/).

## Installer commands

Python **3.9+**, using its standard library only. Run from a downloaded release
or a complete built checkout containing `dist/` and `themes/`. Paths below are
examples; point `--config-dir` to your Home Assistant config directory or a
staged copy. The script does not connect to a running instance.

```sh
# Preview only: no downloads and no writes.
python3 scripts/install.py --config-dir /path/to/home-assistant-config

# Download, verify, back up and copy all frontend modules, cards and themes.
python3 scripts/install.py --config-dir /path/to/home-assistant-config --apply

# Include the optional backend climate integration.
python3 scripts/install.py --config-dir /path/to/home-assistant-config --apply --with-dual-smart-thermostat

# Prepare a portable offline cache, then use the same cache on the target.
python3 scripts/install.py --download-only --cache-dir /path/to/cache
python3 scripts/install.py --config-dir /path/to/home-assistant-config --apply --offline --cache-dir /path/to/cache

# Existing YAML resources: explicitly supply their current list for duplicate detection.
python3 scripts/install.py --config-dir /path/to/home-assistant-config --apply --existing-resources resources.yaml
```

`--all` is an explicit alias for the default all-frontend installation.
`--with-svg-refraction` additionally registers the optional older SVG module.
`--json` provides a machine-readable summary. To cache/install the optional
integration offline, add its option to **both** commands.

All downloads are verified before any target file is replaced. Changed existing
files are backed up under
`backups/liquid-glass/YYYY-MM-DDTHHMMSS.microsecondsZ/`, preserving their relative
paths. `manifest.json` records old/new hashes and newly created paths. An
unchanged rerun creates no new backup. A write failure restores files changed
in that invocation from the pre-write bytes. An invalid checksum, missing
cache file or escaping/symlink destination stops the installation.

The installer prepares these local files:

| File under the HA config directory | Purpose |
| --- | --- |
| `www/liquid-glass/` | Bundled cards, chunks, profiles and supporting assets |
| `www/liquid-glass/vendor/<id>/` | Complete locked frontend modules and licenses |
| `themes/liquid-glass/` | Supplied YAML themes |
| `liquid-glass/resources.yaml` | Missing resource entries to add once |
| `liquid-glass/resources-all.yaml` | Full pinned resource list for reviewed replacement/migration |
| `liquid-glass/frontend.yaml` | Theme include fragment, for merging into existing frontend settings |
| `liquid-glass/configuration-example.yaml` | Commented configuration example |
| `liquid-glass/INSTALLATION.md` | Exact remaining activation steps and local duplicate count |

The original theme's backdrop alias is copied to
`www/liquid-glass-living-room.jpg` as well. The main resource is
`/local/liquid-glass/dash6-cards.js`; Firemote is
`/local/liquid-glass/vendor/firemote/HA-Firemote.js`. Generated resource URLs
include a content-hash query to refresh the browser when a version changes.

## Activation and existing-resource handling

For UI-managed/storage resources, the installer reads the existing local
`.storage/lovelace_resources` list **without modifying it**. It omits already
registered entrypoints from `resources.yaml`, including their existing HACS
copies. For YAML resources, supply `--existing-resources`; if a resources
section is detected in `configuration.yaml` without this option, installation
stops and requests its explicit source list. Supply `configuration.yaml` itself
if its list is inline. Resource detection accepts ordinary `url`/`type` list
entries; complex templated/flow-form YAML must be converted to a plain list.

This duplicate guard preserves current registrations, not their version. To use
an installer-pinned version instead of an existing HACS copy, **replace** that
module's current URL with the corresponding entry in `resources-all.yaml`.
Registering both copies can cause duplicate custom-element definitions. Remove
old bespoke Govee/multi-light/DASH5 resources before loading the new compatibility
aliases. The DASH5 import shim supplied here is not an old independent bundle.

The script deliberately does not rewrite `configuration.yaml`, dashboard data,
users or `.storage`. It produces reviewable fragments because existing frontend
and dashboard settings vary between installations. To activate them:

1. Merge `themes: !include_dir_merge_named themes` under the existing
   `frontend:` key. Validate configuration; restart if enabling theme inclusion
   for the first time, otherwise run `frontend.reload_themes`.
2. UI-managed resources: in Advanced mode, open **Settings → Dashboards → ⋮ →
   Resources** and add the missing modules from `resources.yaml`.
   YAML-managed resources: merge `resource_mode: yaml` and the resources include
   into the existing `lovelace:` settings. Combine old and new entries in one
   resource list, then run `lovelace.reload_resources`. This does not require
   switching a storage dashboard to YAML dashboard mode.
3. Reload the browser/Companion App frontend, choose a supplied theme in your
   user profile, then adapt the example dashboard's entities to your devices.

Theme includes and per-user selection follow
[Home Assistant's frontend documentation](https://www.home-assistant.io/integrations/frontend/#theme-configuration-splitting).
Resource reload and the UI-managed/YAML distinction follow
[Home Assistant's resource reload documentation](https://www.home-assistant.io/actions/lovelace.reload_resources/).

## Dependencies after an integration update

HACS installs the component directory, including its generated `bundle/` and
exact dependency lock. After downloading a Liquid Glass update and restarting
Home Assistant, every setup of the existing config entry reruns the locked
installer. Newly added frontend dependencies and changed installer-owned pinned
versions are installed automatically before the frontend bootstrap is registered.
The user does not repeat the config flow or manually add these resources. A full
browser reload activates the new modules. New bytes require internet access unless
their exact verified content is already cached.

Registered HACS modules remain owned and updated by HACS; the integration reuses
their exact registered URLs instead of overriding their version. Optional backend
components remain opt-in. Downloads and checksums are completed before target
files change. A failed download/hash check leaves the previous installation
untouched and raises a retryable setup failure; a target-write failure rolls back
that invocation. Integration lifecycle regressions cover adding a dependency,
changing a pinned version, HACS reuse, failure preservation and successful retry.
The installer tests also assert that the HACS component's shipped lock and
installer match the release source, preventing an accidentally stale package.

## Installer verification

```sh
python3 scripts/test-installer.py
```

Tests use temporary fake packages and a checked download-cache interface. They
cover complete lazy-file installation, previews, actual CLI arguments, content
checks, backups, idempotency, rollback, symlink/path rejection, storage-resource
duplicate detection, YAML includes, opt-in integration extraction and optional compatibility
selection. The real locked manifest is also validated, including Ultra editor,
locale and license files. No test contacts Home Assistant or changes a live
configuration.
