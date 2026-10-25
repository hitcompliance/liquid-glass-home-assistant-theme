#!/usr/bin/env python3
"""Publish the same real-card showroom as the installed HA demo, with local mocks."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cache-dir',type=Path)
parser.add_argument('--download',action='store_true')
args=parser.parse_args()
demo=ROOT/'demo';package=demo/'package'
version=json.loads((ROOT/'package.json').read_text())['version']
lock=json.loads((ROOT/'dependencies.lock.json').read_text())
assets=[];modules=[]
for dep in lock['dependencies']:
    if dep['kind']!='frontend':continue
    modules.append('package/vendor/'+dep['id']+'/'+dep['entrypoint'])
    for asset in dep['assets']:
        relative=Path('vendor')/dep['id']/asset['path']
        sources=[package/relative]
        if args.cache_dir:sources.append(args.cache_dir/asset['sha256'])
        data=next((p.read_bytes() for p in sources if p.is_file() and len(p.read_bytes())==asset['bytes'] and hashlib.sha256(p.read_bytes()).hexdigest()==asset['sha256']),None)
        if data is None and args.download:
            data=urllib.request.urlopen(asset['url'],timeout=60).read()
        if data is None or len(data)!=asset['bytes'] or hashlib.sha256(data).hexdigest()!=asset['sha256']:
            raise SystemExit('Missing verified public demo asset: '+str(relative)+'; provide --cache-dir or --download')
        assets.append((relative,data))
shutil.rmtree(package,ignore_errors=True)
shutil.copytree(ROOT/'dist',package)
shutil.copytree(ROOT/'assets',package/'assets')
for path,data in assets:
    target=package/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
for source,target in [('examples/demo-dashboard.yaml','dashboard.json'),('custom_components/liquid_glass/demo-entities.json','entities.json'),('support/card-catalog.json','catalog.json'),('support/demo-inventory.json','inventory.json')]:
    shutil.copy2(ROOT/source,package/target)
themes=subprocess.check_output(['ruby','-ryaml','-rjson','-e','puts YAML.load_file(ARGV[0]).to_json',str(ROOT/'themes/liquid-glass.yaml')])
(package/'themes.json').write_bytes(themes)
(package/'modules.json').write_text(json.dumps(modules,indent=2)+'\n')
for source,target in [('showcase-app.js','app.js'),('showcase-native.js','native.js'),('showcase.css','showcase.css'),('showcase.html','index.html')]:
    shutil.copy2(ROOT/'frontend'/source,demo/target)
# Entry modules keep stable names, so version their URLs across Pages deployments.
index=(demo/'index.html').read_text().replace('src="app.js"',f'src="app.js?v={version}"').replace('href="showcase.css"',f'href="showcase.css?v={version}"')
index=index.replace('</head>',f'<meta name="liquid-glass-version" content="{version}"></head>')
(demo/'index.html').write_text(index)
app=(demo/'app.js').read_text().replace("'./native.js'",f"'./native.js?v={version}'")
for module in ['dash6-cards.js','vacuum-dock-card.js','room-loader.js']:
    app=app.replace("'./package/"+module+"'", "'./package/"+module+f"?v={version}'")
(demo/'app.js').write_text(app)
shutil.copy2(ROOT/'README.md',demo/'README.md')
print(f'Public demo: {len(assets)} verified vendor files, {len(modules)} modules; real cards, detail dialogs and GUI editors')
