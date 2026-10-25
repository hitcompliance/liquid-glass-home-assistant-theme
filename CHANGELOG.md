# 3.2.1 · DASH6 Satin Glass als vollständige Integration

- Veröffentlichung auf das Theme DASH6 Satin Glass und die aktuelle Satin-Browservorschau begrenzt.
- Aktuellen lokalen DASH6-Kartenstand samt sämtlichen Chunks, Profilen, Pflanzen-/Medien-/Lüftungsmodulen und Lizenzen aufgenommen.
- Backend-Demo mit 14 Views, acht eigenen Bereichen und 91 virtuellen Entities; keine Florin-View. Zusätzliche Frontend-Begrenzung auf explizite Dummy-Serviceziele.
- Zwölf Frontend-Abhängigkeiten automatisch mit festgelegten Versionen und Prüfsummen. Vorhandene HACS-Ressourcen bleiben bei HACS; neue/aktualisierte Vendor-Abhängigkeiten werden bei jedem Integrationsstart abgeglichen.
- Mitgelieferte optionale Shelly-Skriptquelle und ausdrückliche Dokumentation aller manuell einzurichtenden Voraussetzungen.
- Slider-Größenanpassung außerhalb der ResizeObserver-Benachrichtigung, damit WebKit beim Themewechsel keine Layout-Rückkopplung meldet.
- Eigenständiges Integrations-ZIP, Prüfsumme und validierter Release-Workflow. Installer-, Lifecycle-, Dummy-Entity- und Chromium-/WebKit-Tests für die Veröffentlichung.

[Installation](docs/INSTALLATION.md) · [Abhängigkeiten](docs/DEPENDENCIES.md) · [Release-Hinweise](docs/RELEASE-NOTES.md)
