"""File installation helpers, also testable without Home Assistant."""
from pathlib import Path
import json
from . import installer

ROOT = Path(__file__).parent / 'bundle'

def load_themes():
    return json.loads((ROOT / 'themes.json').read_text(encoding='utf-8'))

def install(config_dir, existing, dual=False):
    """Verify all downloads first; preserve existing HACS frontend modules."""
    config = Path(config_dir)
    lock = installer.load_lock(ROOT / 'dependencies.lock.json')
    selected = installer.selected_dependencies(lock, ['dual_smart_thermostat'] if dual else [])
    by_name = {installer.resource_basename(url): url for url in existing}
    for name in ('dash6-cards.js', 'vacuum-dock-card.js'):
        old = by_name.get(name)
        if old and not old.startswith('/local/liquid-glass/'):
            raise installer.InstallError('Remove the old custom resource ' + old + ' before enabling Liquid Glass')
    missing = []
    urls = []
    for dep in selected:
        if dep['kind'] == 'frontend':
            name = Path(dep['entrypoint']).name
            if name in by_name:
                urls.append(by_name[name])
                continue
            urls.append('/local/liquid-glass/vendor/' + dep['id'] + '/' + dep['entrypoint'] + '?v=' + next(a['sha256'][:12] for a in dep['assets'] if a['path'] == dep['entrypoint']))
        elif (config / 'custom_components' / dep['id']).exists():
            # Never take ownership of an existing backend integration.
            continue
        missing.append(dep)
    files = installer.package_files(ROOT)
    files += installer.dependency_files(missing, config / 'liquid-glass' / 'download-cache', False)
    for name in ('dash6-cards.js', 'vacuum-dock-card.js'):
        old = by_name.get(name)
        data = next(f.data for f in files if f.path == 'www/liquid-glass/' + name)
        # Keep an already registered canonical URL so browser ESM loads it once.
        urls.append(old or '/local/liquid-glass/' + name + '?v=' + installer.digest(data)[:12])
    bootstrap = '\n'.join('await import(' + json.dumps(url) + ');' for url in dict.fromkeys(urls)) + '\n'
    files.append(installer.File('www/liquid-glass/integration-bootstrap.js', bootstrap.encode(), 'integration loader'))
    result = installer.apply_files(config, files)
    result['bootstrap'] = '/local/liquid-glass/integration-bootstrap.js?v=' + installer.digest(bootstrap.encode())[:12]
    result['dual_installed'] = any(d['kind'] == 'integration' for d in missing)
    return result
