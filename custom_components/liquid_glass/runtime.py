"""File installation helpers, also testable without Home Assistant."""
from pathlib import Path
import json
from . import installer

ROOT = Path(__file__).parent / 'bundle'

EMBEDDED_ID = 'embedded-view-card'
EMBEDDED_FILE = 'embedded-view-card.js'
EMBEDDED_TAGS = ['embedded-view-card', 'embedded-view-card-editor']

def embedded_resource(existing):
    """Accept one module identity only, never silently pick a conflicting copy."""
    candidates = list(dict.fromkeys(url for url in existing
                                   if installer.resource_basename(url) == EMBEDDED_FILE))
    if len(candidates) > 1:
        raise installer.InstallError('Duplicate Embedded View Card resources: keep exactly one registered embedded-view-card.js URL')
    return candidates[0] if candidates else None

def dependency_url(dep):
    asset = next(a for a in dep['assets'] if a['path'] == dep['entrypoint'])
    return '/local/liquid-glass/vendor/' + dep['id'] + '/' + dep['entrypoint'] + '?v=' + asset['sha256'][:12]

def bootstrap_source(modules):
    """Use canonical ESM URLs; an already loaded original must not be redefined."""
    lines = []
    seen = set()
    for module in modules:
        url = module['url']
        if url in seen:
            continue
        seen.add(url)
        if module['id'] == EMBEDDED_ID:
            lines += [
                'if (!customElements.get("embedded-view-card") && !customElements.get("embedded-view-card-editor")) {',
                '  await import(' + json.dumps(url) + ');',
                '} else if (!customElements.get("embedded-view-card") || !customElements.get("embedded-view-card-editor")) {',
                '  throw new Error("Liquid Glass: incomplete Embedded View Card registration; fully reload Home Assistant.");',
                '}',
            ]
        else:
            lines.append('await import(' + json.dumps(url) + ');')
    return '\n'.join(lines) + '\n'

def bootstrap_url(source):
    return '/local/liquid-glass/integration-bootstrap.js?v=' + installer.digest(source.encode())[:12]

def refresh_embedded_resource(config_dir, existing, modules):
    """Reconcile the original only; preserve themes, backend and other modules."""
    selected_url = embedded_resource(existing)  # Abort before any file changes.
    updated = [dict(module) for module in modules]
    module = next((item for item in updated if item['id'] == EMBEDDED_ID), None)
    if module is None:
        return {'resource_changed': False, 'frontend_modules': updated}
    dep = next(item for item in installer.load_lock(ROOT / 'dependencies.lock.json')['dependencies']
               if item['id'] == EMBEDDED_ID)
    new_url = selected_url or dependency_url(dep)
    if module['url'] == new_url:
        return {'resource_changed': False, 'frontend_modules': updated}
    module['url'] = new_url
    config = Path(config_dir)
    files = []
    if not selected_url:
        files = installer.dependency_files([dep], config / 'liquid-glass' / 'download-cache', False)
    source = bootstrap_source(updated)
    files.append(installer.File('www/liquid-glass/integration-bootstrap.js', source.encode(), 'integration loader'))
    report = installer.apply_files(config, files)
    report.update(resource_changed=True, frontend_modules=updated, bootstrap=bootstrap_url(source))
    return report

def load_themes(config_dir=None):
    from .theme_store import read_stored,resolved_themes
    themes=json.loads((ROOT / 'themes.json').read_text(encoding='utf-8'))
    return resolved_themes(themes,read_stored(config_dir)) if config_dir else themes

def install(config_dir, existing, dual=False):
    """Verify all downloads first; preserve existing HACS frontend modules."""
    config = Path(config_dir)
    lock = installer.load_lock(ROOT / 'dependencies.lock.json')
    selected = installer.selected_dependencies(lock, ['dual_smart_thermostat'] if dual else [])
    embedded_resource(existing)
    by_name = {installer.resource_basename(url): url for url in existing}
    for name in ('dash6-cards.js', 'vacuum-dock-card.js', 'room-loader.js'):
        old = by_name.get(name)
        if old and not old.startswith('/local/liquid-glass/'):
            raise installer.InstallError('Remove the old custom resource ' + old + ' before enabling Liquid Glass')
    missing = []
    modules = []
    for dep in selected:
        if dep['kind'] == 'frontend':
            name = Path(dep['entrypoint']).name
            if name in by_name:
                modules.append({'id': dep['id'], 'url': by_name[name]})
                continue
            modules.append({'id': dep['id'], 'url': dependency_url(dep)})
        elif (config / 'custom_components' / dep['id']).exists():
            # Never take ownership of an existing backend integration.
            continue
        missing.append(dep)
    files = installer.package_files(ROOT)
    from .theme_store import preserve_user_defaults
    files = preserve_user_defaults(config,files,load_themes())
    files += installer.dependency_files(missing, config / 'liquid-glass' / 'download-cache', False)
    for name in ('dash6-cards.js', 'vacuum-dock-card.js', 'room-loader.js'):
        old = by_name.get(name)
        data = next((f.data for f in files if f.path == 'www/liquid-glass/' + name), None)
        if data is None:
            continue
        # Keep an already registered canonical URL so browser ESM loads it once.
        modules.append({'id': name, 'url': old or '/local/liquid-glass/' + name + '?v=' + installer.digest(data)[:12]})
    bootstrap = bootstrap_source(modules)
    files.append(installer.File('www/liquid-glass/integration-bootstrap.js', bootstrap.encode(), 'integration loader'))
    result = installer.apply_files(config, files)
    result['bootstrap'] = bootstrap_url(bootstrap)
    result['frontend_modules'] = modules
    result['dual_installed'] = any(d['kind'] == 'integration' for d in missing)
    return result
