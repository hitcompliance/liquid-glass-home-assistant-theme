#!/usr/bin/env python3
"""Generate safe Favorites snapshots from the authored, simulated demo views.

Uses the same catalog model as the native Favorites editor. Ruby/YAML is also
used by the integration bundle build; Node runs the existing pure JS model.
"""
import argparse
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
MARKER = '  # Generated Favorites demo; rebuild with scripts/generate-demo-dashboard.py.\n'


def generate(source):
    authored = source.split(MARKER, 1)[0].rstrip() + '\n'
    parsed = subprocess.run(
        ['ruby', '-rjson', '-ryaml', '-e', 'puts YAML.load(STDIN.read).to_json'],
        input=authored, text=True, capture_output=True, check=True)
    dashboard = json.loads(parsed.stdout)
    catalog = subprocess.run(['node', '--input-type=module', '-e', '''
import {extractCatalog} from './src/dash6/favorites-model.js';
let input=''; for await (const chunk of process.stdin) input+=chunk;
const dashboard=JSON.parse(input), sources=[];
for (const [viewOrder,view] of dashboard.views.entries()) {
  const nodes=extractCatalog(view,{dashboard:'liquid-glass-demo',view:view.path,title:view.title,viewOrder},{view:true});
  sources.push(...nodes.filter(node=>node.card.type==='custom:dash6-demo-card'));
}
const selected=[];
function walk(nodes){for(const node of nodes){selected.push(node.id);walk(node.children||[]);}}
walk(sources);
process.stdout.write(JSON.stringify({sources,selected}));
'''], input=json.dumps(dashboard), text=True, capture_output=True, check=True, cwd=ROOT)
    favorites = {'type': 'custom:dash6-favorites-card', 'title': 'Favoriten',
                 'dashboard': 'liquid-glass-demo', 'demo_gui': True,
                 'grouping': 'source_view', 'sort': 'domain_alpha',
                 'domainOrder': 'source_view_order', 'headings': True,
                 **json.loads(catalog.stdout)}
    view = {'title': 'Favoriten', 'path': 'favoriten', 'icon': 'mdi:star-outline',
            'type': 'sections', 'max_columns': 1, 'theme': 'DASH6 Satin Glass',
            'sections': [{'type': 'grid', 'cards': [
                {'type': 'markdown', 'content': '# Favoriten auswählen\n'
                 'Eine vorbereitete Auswahl aus den Demo-Views. Öffne **Favoriten bearbeiten**, '
                 'um Karten und Unterkarten auszuwählen, zu gruppieren und zu sortieren. '
                 'Die Änderungen gelten für diese Demo; alle Gerätewerte bleiben simuliert.'},
                favorites]}]}
    dumped = subprocess.run(['ruby', '-rjson', '-ryaml', '-e', 'puts [JSON.parse(STDIN.read)].to_yaml'],
                            input=json.dumps(view), text=True, capture_output=True, check=True)
    yaml = dumped.stdout.removeprefix('---\n')
    return authored + '\n' + MARKER + ''.join('  ' + line + '\n' for line in yaml.splitlines())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if checked-in output is stale')
    args = parser.parse_args()
    path = ROOT / 'examples' / 'demo-dashboard.yaml'
    current = path.read_text(encoding='utf-8')
    generated = generate(current)
    if args.check:
        if generated != current:
            raise SystemExit('Demo Favorites snapshots are stale; run scripts/generate-demo-dashboard.py')
    elif generated != current:
        path.write_text(generated, encoding='utf-8')
    print('Demo Favorites snapshots: OK')


if __name__ == '__main__':
    main()
