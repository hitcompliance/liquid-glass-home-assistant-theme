#!/usr/bin/env python3
"""HACS copies only the component directory: include every runtime asset there."""
import json
from pathlib import Path
import shutil
import subprocess
root = Path(__file__).resolve().parents[1]
# The shipped Favorites snapshots follow the authored simulated demo cards.
subprocess.run(['python3', str(root / 'scripts' / 'generate-demo-dashboard.py')], check=True)
subprocess.run(['python3', str(root / 'scripts' / 'build-device-demo.py')], check=True)
component = root / 'custom_components' / 'liquid_glass'
bundle = component / 'bundle'
shutil.rmtree(bundle, ignore_errors=True)
bundle.mkdir(parents=True)
for name in ('dist', 'themes', 'examples', 'assets', 'licenses', 'support', 'docs'):
    shutil.copytree(root / name, bundle / name)
for name in ('dependencies.lock.json', 'LICENSE', 'THIRD-PARTY-LICENSES.md', 'AGENTS.md', 'README.md'):
    shutil.copy2(root / name, bundle / name)
# Resolve YAML merge keys at build time; runtime receives unambiguous JSON.
resolved = subprocess.run(['ruby', '-rjson', '-ryaml', '-e', 'puts (YAML.respond_to?(:unsafe_load_file) ? YAML.unsafe_load_file(ARGV[0]) : YAML.load_file(ARGV[0])).to_json', str(root / 'themes' / 'liquid-glass.yaml')], capture_output=True, text=True, check=True)
(bundle / 'themes.json').write_text(resolved.stdout)
shutil.copy2(root / 'scripts' / 'install.py', component / 'installer.py')
print('Built self-contained HACS integration')
