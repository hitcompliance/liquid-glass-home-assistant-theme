#!/usr/bin/env python3
"""Create the complete manual/HACS component archive, without development files."""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

ROOT=Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=ROOT/'release')
args=parser.parse_args()
component=ROOT/'custom_components/liquid_glass'
manifest=json.loads((component/'manifest.json').read_text())
themes=json.loads((component/'bundle/themes.json').read_text())
assert list(themes)==['DASH6 Satin Glass'],'Only Satin may be published'
assert (component/'installer.py').read_bytes()==(ROOT/'scripts/install.py').read_bytes(),'Rebuild the integration first'
assert (component/'bundle/dependencies.lock.json').read_bytes()==(ROOT/'dependencies.lock.json').read_bytes(),'Stale dependency lock'
args.output.mkdir(parents=True,exist_ok=True)
archive=args.output/'liquid_glass.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
    for path in sorted(component.rglob('*')):
        if path.is_symlink(): raise ValueError('Symlink in release: '+str(path))
        if not path.is_file() or '__pycache__' in path.parts or path.suffix=='.pyc': continue
        z.write(path,path.relative_to(ROOT).as_posix())
checksum=hashlib.sha256(archive.read_bytes()).hexdigest()
(args.output/'SHA256SUMS.txt').write_text(f'{checksum}  {archive.name}\n')
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    for required in ['demo-entities.json','theme_store.py','bundle/AGENTS.md','bundle/README.md','bundle/docs/CARD-GUIDE.md','bundle/support/card-catalog.json','bundle/support/demo-inventory.json','bundle/support/theme-defaults.json','bundle/dist/theme-defaults.json','bundle/examples/demo-dashboard.yaml','bundle/examples/domain-blocks.yaml']:
        assert 'custom_components/liquid_glass/'+required in z.namelist(),required
    prefs=json.loads(z.read('custom_components/liquid_glass/bundle/dist/theme-defaults.json'))
    snapshot=json.loads(z.read('custom_components/liquid_glass/bundle/support/theme-defaults.json'))
    assert prefs['themes']['DASH6 Satin Glass']['values']==snapshot['themes']['DASH6 Satin Glass']['values'],'Defaults must agree'
    demo=json.loads(z.read('custom_components/liquid_glass/bundle/examples/demo-dashboard.yaml'))
    assert len(demo['views'])==18,'Incomplete demo'
    entities=json.loads(z.read('custom_components/liquid_glass/demo-entities.json'))
    assert len(entities)==98,'Incomplete virtual devices'
    assert 'custom_components/liquid_glass/bundle/support/shelly/badluefter-backlog-force-on.js' in z.namelist()
print(f'{manifest["version"]}: {archive.name}, {archive.stat().st_size} bytes, SHA256 {checksum}')
