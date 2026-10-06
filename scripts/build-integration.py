#!/usr/bin/env python3
"""HACS copies only the component directory: include every runtime asset there."""
import json
from pathlib import Path
import shutil
import subprocess
root = Path(__file__).resolve().parents[1]
component = root / 'custom_components' / 'liquid_glass'
bundle = component / 'bundle'
shutil.rmtree(bundle, ignore_errors=True)
bundle.mkdir(parents=True)
for name in ('dist', 'themes', 'examples', 'assets', 'frontend', 'licenses'):
    shutil.copytree(root / name, bundle / name)
for name in ('dependencies.lock.json', 'LICENSE', 'THIRD-PARTY-LICENSES.md'):
    shutil.copy2(root / name, bundle / name)
# Resolve YAML merge keys at build time; runtime receives unambiguous JSON.
resolved = subprocess.run(['ruby', '-rjson', '-ryaml', '-e', 'puts (YAML.respond_to?(:unsafe_load_file) ? YAML.unsafe_load_file(ARGV[0]) : YAML.load_file(ARGV[0])).to_json', str(root / 'themes' / 'liquid-glass.yaml')], capture_output=True, text=True, check=True)
(bundle / 'themes.json').write_text(resolved.stdout)
shutil.copy2(root / 'scripts' / 'install.py', component / 'installer.py')
strings = {'title': 'Liquid Glass', 'config': {'step': {'user': {'title': 'Liquid Glass einrichten', 'description': 'Themes und alle fehlenden Karten-Abhängigkeiten werden automatisch installiert (Internet erforderlich). Vorhandene HACS-Ressourcen bleiben erhalten. Das Demo-Dashboard verwendet simulierte Geräte. Dual Smart Thermostat benötigt nach der Installation einen weiteren Neustart und eine Geräte-Konfiguration.', 'data': {'demo_dashboard': 'Interaktives Demo-Dashboard anzeigen', 'dual_smart_thermostat': 'Dual Smart Thermostat zusätzlich installieren'}}}, 'abort': {'already_configured': 'Liquid Glass ist bereits eingerichtet.'}}}
for target in ('strings.json', 'translations/de.json'):
    (component / target).write_text(json.dumps(strings, ensure_ascii=False, indent=2) + '\n')
strings['config']['step']['user'].update(title='Set up Liquid Glass', description='Automatically installs themes and missing card dependencies (internet required). Existing HACS resources are reused. The demo uses simulated devices. Optional Dual Smart Thermostat requires another restart and device configuration.', data={'demo_dashboard': 'Show interactive demo dashboard', 'dual_smart_thermostat': 'Also install Dual Smart Thermostat'})
strings['config']['abort']['already_configured'] = 'Liquid Glass is already configured.'
(component / 'strings.json').write_text(json.dumps(strings, indent=2) + '\n')
(component / 'translations/en.json').write_text(json.dumps(strings, indent=2) + '\n')
print('Built self-contained HACS integration 3.1.7')
