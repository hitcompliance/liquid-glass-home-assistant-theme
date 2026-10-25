# DASH6 Satin Glass 3.5.4

Die vollständige DASH6-Kopie und Karten-/GUI-Galerie funktionieren jetzt standardmäßig ohne angelegte Home-Assistant-Dummy-Entities. Die installierte Demo und GitHub-Pages-Vorschau verwenden dieselbe isolierte Browser-Simulation mit lokalen Zuständen, Reglern, Szenen, Türen, Medien, Staubsauger, Countdown und Beispielverläufen. Mehr-Informationen-Dialoge bleiben ebenfalls lokal; es werden keine Geräteservices oder Recorder-Schreibzugriffe ausgelöst.

- Die Dashboard-Defaults schließen zusätzlich `demo` in Tasten (`button`), Kontakte & Zustände (`binary_sensor`) und Sensoren (`sensor`) aus. Die kopierte Konfiguration enthält diese Einträge ebenfalls. Die native Ausschluss-GUI steht auch in Demo, Galerie und Hue-Demo bereit; frei bearbeitbare und ausdrücklich leere Listen bleiben möglich.
- Demo, Galerie und Hue-Demo sind native Storage-Dashboards mit vollständiger Dashboard-/View-/Karten-GUI. Vorhandene YAML-Installationen werden beim Update erstmals in Storage angelegt; eigene Storage-Bearbeitungen bleiben bei Updates und Entladen erhalten. Unveränderte generierte Hue-Views folgen weiterhin Registry-Änderungen. Die Demo-Hülle delegiert die Karten-GUI an den Originaleditor.
- Auto-Entities-Vorlagen verwenden die lokale Verbindung der jeweiligen Karte. Damit übernimmt auch die kopierte Startseite keine echten Host-Räume oder privaten Template-Ergebnisse; Florin bleibt vollständig entfernt. Strukturierte Vorlagenergebnisse bleiben Listen und Objekte.
- Native Entity-Auswahllisten erhalten in HA 2026.10 ebenfalls lokale Zustands-/Registry-Kontexte, damit Beispiel-IDs in den echten Karteneditoren bekannt sind.
- Die übernommenen Raum-Views unter `/liquid-glass-demo` erhalten die originalen DASH6-Hintergrundbilder als installierte Standardvorgaben, einschließlich Zuhause und Wohnzimmer. Alle Bilddateien werden mitinstalliert; private Upload-IDs sind dafür nicht erforderlich.
- Die Hue-Demo bettet native Navigationsstapel korrekt über den Direct-Adapter in Ultra Card ein; der Frontend-Adapter unterstützt auch bereits erzeugte Konfigurationen. Gefundene Schalter erhalten benannte Entity-Karten.
- Native HA-Symbole laden ihre öffentlichen Symbol-Metadaten vom installierten HA. Ausschließlich diese Leseabfrage darf den Host erreichen; Geräte- und Verlaufsabfragen bleiben lokal.
- Neue Einrichtung: **Demo-Modus browser**. Vorhandene Einträge behalten über Migration den optionalen Altmodus **entities**. Modi sind nachträglich konfigurierbar.
- **LIQUID-GLASS-HUE-DEMO** verwendet weiterhin die echten sichtbaren Entities der installierenden Instanz; sie wird ausschließlich auf Wunsch aktiviert.
- Unvollständiges Energiebeispiel und leere Klima-Hintergrund-Beispielhülle aus der Galerie entfernt. Die dekorative Funktion bleibt im Paket.
- Verschachtelte Jinja-Vorlagen und der Galerie-Raumlader werden vollständig aus den enthaltenen Beispieldaten aufgelöst, auch über HTTP ohne WebCrypto.
- README, Installations-, Karten-, Abhängigkeits- und Agentenleitfaden erklären den Standard ohne HA-Entities, den Altmodus und die Simulationsgrenzen. Ultra Card, zwölf Frontend-Abhängigkeiten und bestehende Satin-Defaults bleiben enthalten.

Die Demo zeigt Bedienung und Gestaltung mit Beispieldaten; sie prüft keine echte Hardwarewirkung, Automation oder Messhistorie. Gerätezustände sind pro Browser lokal und werden beim Neuladen zurückgesetzt. Die Hue-Demo steuert bei Bedienung echte Geräte.
