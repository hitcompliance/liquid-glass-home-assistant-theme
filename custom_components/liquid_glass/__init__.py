"""Automatic Liquid Glass themes, frontend assets and isolated demo dashboard."""
from pathlib import Path
import asyncio
import logging
from homeassistant.components import frontend, persistent_notification
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.dashboard import LovelaceYAML
from homeassistant.const import EVENT_THEMES_UPDATED
from homeassistant.exceptions import ConfigEntryNotReady
from .runtime import ROOT, install, load_themes, refresh_embedded_resource, EMBEDDED_FILE
from .installer import resource_basename, InstallError
from .demo import DemoCoordinator, PLATFORMS, load_specs
from homeassistant.helpers import entity_registry as er

DOMAIN = 'liquid_glass'
DEMO = 'liquid-glass-demo'
from .hue_dashboard import DiscoveryDashboard,HUE_DEMO,TITLE as HUE_TITLE
GALLERY='liquid-glass-gallery'
DEFAULT_THEME = 'DASH6 Satin Glass'
_LOGGER = logging.getLogger(__name__)

def _module_urls(hass, resources):
    return [r['url'] for r in resources.async_items()
            if r.get('type', 'module') == 'module'] + list(hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)

async def _watch_embedded_resources(hass, entry, state):
    """Follow HACS resource changes without polling or taking over foreign rows."""
    resources = hass.data[LOVELACE_DATA].resources
    lock = asyncio.Lock()
    async def reconcile(changes=None):
        if changes is not None and not any(resource_basename(change.item.get('url', '')) == EMBEDDED_FILE for change in changes):
            return
        async with lock:
            if not state['active']:
                return
            current = hass.data[LOVELACE_DATA].resources
            try:
                update = await hass.async_add_executor_job(
                    refresh_embedded_resource, hass.config.config_dir,
                    _module_urls(hass, current), state['report']['frontend_modules'])
            except Exception as err:
                if not state['active']:
                    return
                # A duplicate original is not safe to extend with our loader.
                # Preserve all user/HACS rows and stop only our extra import.
                if isinstance(err, InstallError) and 'Duplicate Embedded View Card' in str(err):
                    if state['bootstrap'] is not None:
                        frontend.remove_extra_js_url(hass, state['bootstrap'])
                        state['bootstrap'] = None
                _LOGGER.warning('Embedded View resource reconciliation failed: %s', err)
                persistent_notification.async_create(hass,
                    'Die Embedded-View-Ressourcen konnten nicht sicher übernommen werden: '
                    + str(err) + '. Behalte genau einen Original-Ressourceneintrag und lade anschließend Home Assistant vollständig neu.',
                    title='Liquid Glass: Embedded View prüfen', notification_id='liquid_glass_embedded_conflict_' + entry.entry_id)
                return
            if not state['active']:
                return
            if not update['resource_changed'] and state['bootstrap'] is not None:
                return
            next_url = update.get('bootstrap', state['report']['bootstrap'])
            if state['bootstrap'] is not None:
                frontend.remove_extra_js_url(hass, state['bootstrap'])
            frontend.add_extra_js_url(hass, next_url)
            state['bootstrap'] = next_url
            state['report'].update(update)
            persistent_notification.async_dismiss(hass, 'liquid_glass_embedded_conflict_' + entry.entry_id)
            persistent_notification.async_create(hass,
                'Die Quelle der Embedded View Card wurde automatisch angepasst. '
                'Lade geöffnete Home-Assistant-Seiten vollständig neu, damit nur die neue Quelle geladen wird. '
                'Eine bereits registrierte Browserklasse wird erst beim Neuladen ersetzt.',
                title='Liquid Glass: Browser neu laden', notification_id='liquid_glass_embedded_reload_' + entry.entry_id)
    subscribe = getattr(resources, 'async_add_change_set_listener', None)
    if subscribe is not None:
        state['resource_unsub'] = subscribe(reconcile)
    # Close the setup race between the first resource read and listener creation.
    await reconcile()

async def async_setup_entry(hass, entry):
    """Install in executor, then register only integration-owned runtime objects."""
    if hass.config.safe_mode or hass.config.recovery_mode:
        return False
    ll = hass.data[LOVELACE_DATA]
    await ll.resources.async_get_info()
    existing = _module_urls(hass, ll.resources)
    www = Path(hass.config.path('www'))
    had_www = await hass.async_add_executor_job(www.is_dir)
    try:
        themes = await hass.async_add_executor_job(load_themes, hass.config.config_dir)
        themes = frontend._validate_themes(themes)
        if not themes:
            raise ValueError('No valid bundled themes found')
        if DEFAULT_THEME not in themes:
            raise ValueError('Bundled Satin default theme is missing')
        report = await hass.async_add_executor_job(install, hass.config.config_dir, existing, getattr(entry,'options',{}).get('dual_smart_thermostat',entry.data.get('dual_smart_thermostat', False)))
    except Exception as err:
        # Download/hash/path failures leave frontend registration untouched.
        raise ConfigEntryNotReady(f'Liquid Glass installation failed: {err}') from err
    if not had_www and not hass.data.get(DOMAIN + '_local_registered'):
        await hass.http.async_register_static_paths([StaticPathConfig('/local', str(www), True)])
        hass.data[DOMAIN + '_local_registered'] = True
    previous = {name: hass.data[frontend.DATA_THEMES].get(name) for name in themes}
    def publish_themes(event=None):
        if not state['active']:
            return
        table = hass.data[frontend.DATA_THEMES]
        # Theme reload replaces the native theme table; re-add only missing themes.
        for name, theme in themes.items():
            table.setdefault(name, theme)
    default_themes = {frontend.DATA_DEFAULT_THEME: hass.data.get(frontend.DATA_DEFAULT_THEME, 'default'),
                      frontend.DATA_DEFAULT_DARK_THEME: hass.data.get(frontend.DATA_DEFAULT_DARK_THEME)}
    state = {'themes': themes, 'previous': previous, 'default_themes': default_themes,
             'defaults_selected': False, 'unsub': None, 'resource_unsub': None,
             'active': True, 'bootstrap': None, 'demo': None, 'report': report,
             'demo_coordinator': None, 'demo_platforms': False, 'additional_dashboards':{},'registry_unsubs':[]}
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = state
    try:
        from .theme_store import register_websocket
        register_websocket(hass)
        publish_themes()
        state['unsub'] = hass.bus.async_listen(EVENT_THEMES_UPDATED, publish_themes)
        hass.bus.async_fire(EVENT_THEMES_UPDATED)
        frontend.add_extra_js_url(hass, report['bootstrap'])
        state['bootstrap'] = report['bootstrap']
        await _watch_embedded_resources(hass, entry, state)
        if getattr(entry,'options',{}).get('demo_dashboard',entry.data.get('demo_dashboard', True)):
            if DEMO in ll.dashboards or frontend.async_panel_exists(hass, DEMO):
                _LOGGER.warning('Existing %s dashboard preserved; demo not registered', DEMO)
            else:
                mode = getattr(entry,'options',{}).get('demo_mode',entry.data.get('demo_mode','browser'))
                if mode == 'entities':
                    specs = await hass.async_add_executor_job(load_specs)
                    registry = er.async_get(hass)
                    for spec in specs:
                        existing_entity = registry.async_get(spec['entity_id'])
                        if existing_entity and (existing_entity.platform != DOMAIN or existing_entity.unique_id != spec['entity_id']):
                            raise ValueError('Demo entity ID already belongs to another integration: ' + spec['entity_id'])
                        if not existing_entity and hass.states.get(spec['entity_id']):
                            raise ValueError('Demo entity ID is already in use: ' + spec['entity_id'])
                    coordinator = DemoCoordinator(hass, specs)
                    state['demo_coordinator'] = coordinator
                    state['demo_platforms'] = True
                    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
                    coordinator.assign_areas()
                    coordinator.refresh()
                    coordinator.start()
                conf = {'mode': 'yaml', 'filename': str(ROOT / 'examples' / ('demo-dashboard-entities.yaml' if mode == 'entities' else 'demo-dashboard.yaml')), 'title': 'LIQUID-GLASS-DEMO', 'icon': 'mdi:layers-outline', 'show_in_sidebar': True, 'require_admin': False}
                demo = LovelaceYAML(hass, DEMO, conf)
                state['demo'] = demo
                ll.dashboards[DEMO] = demo
                frontend.async_register_built_in_panel(hass, 'lovelace', sidebar_title=conf['title'], sidebar_icon=conf['icon'], frontend_url_path=DEMO, config={'mode': 'yaml'})
        if state['demo'] is not None and GALLERY not in ll.dashboards and not frontend.async_panel_exists(hass,GALLERY):
            conf={'mode':'yaml','filename':str(ROOT/'examples'/('gallery-dashboard-entities.yaml' if mode == 'entities' else 'gallery-dashboard.yaml')),'title':'Liquid Glass · Karten & GUI','icon':'mdi:view-grid-plus','show_in_sidebar':True,'require_admin':False}
            gallery=LovelaceYAML(hass,GALLERY,conf)
            state['additional_dashboards'][GALLERY]=gallery
            ll.dashboards[GALLERY]=gallery
            frontend.async_register_built_in_panel(hass,'lovelace',sidebar_title=conf['title'],sidebar_icon=conf['icon'],frontend_url_path=GALLERY,config={'mode':'yaml'})
        if getattr(entry,'options',{}).get('hue_dashboard',entry.data.get('hue_dashboard',False)):
            if HUE_DEMO in ll.dashboards or frontend.async_panel_exists(hass,HUE_DEMO):
                _LOGGER.warning('Existing %s dashboard preserved',HUE_DEMO)
            else:
                conf={'mode':'yaml','title':HUE_TITLE,'icon':'mdi:lightbulb-group','show_in_sidebar':True,'require_admin':False}
                discovered=DiscoveryDashboard(hass,HUE_DEMO,conf)
                ll.dashboards[HUE_DEMO]=discovered
                state['additional_dashboards'][HUE_DEMO]=discovered
                frontend.async_register_built_in_panel(hass,'lovelace',sidebar_title=HUE_TITLE,sidebar_icon=conf['icon'],frontend_url_path=HUE_DEMO,config={'mode':'yaml'})
                for event_type in ('entity_registry_updated','device_registry_updated','area_registry_updated'):
                    state['registry_unsubs'].append(hass.bus.async_listen(event_type,lambda event:discovered._config_updated()))
        if hasattr(entry,'add_update_listener'):
            state['registry_unsubs'].append(entry.add_update_listener(_reload_options))
        # The native service persists both backend preferences and informs open
        # clients. This runs on first setup and after an integration update.
        # Explicit per-user or per-view theme choices remain native HA overrides.
        state['defaults_selected'] = True
        await hass.services.async_call('frontend', 'set_theme',
                                      {'name': DEFAULT_THEME, 'name_dark': DEFAULT_THEME},
                                      blocking=True)
    except Exception as err:
        await async_unload_entry(hass, entry)
        raise ConfigEntryNotReady(f'Liquid Glass frontend registration failed: {err}') from err
    if report['dual_installed']:
        persistent_notification.async_create(hass, 'Dual Smart Thermostat wurde installiert. Bitte Home Assistant erneut starten und anschließend die Thermostat-Entitäten konfigurieren. Es wurde kein Gerät automatisch verändert.', title='Liquid Glass: Neustart erforderlich', notification_id='liquid_glass_dual_restart')
    return True

async def _reload_options(hass,entry):
    await hass.config_entries.async_reload(entry.entry_id)

async def async_unload_entry(hass, entry):
    """Detach runtime objects; preserve installed files and backups for recovery."""
    state = hass.data.get(DOMAIN, {}).get(entry.entry_id)
    if state is None:
        return True
    if state['demo_platforms']:
        if not await hass.config_entries.async_unload_platforms(entry, PLATFORMS):
            return False
        state['demo_platforms'] = False
    if state['demo_coordinator'] is not None:
        state['demo_coordinator'].stop()
    hass.data[DOMAIN].pop(entry.entry_id, None)
    state['active'] = False
    for unsubscribe in state['registry_unsubs']:unsubscribe()
    if state['resource_unsub'] is not None:
        state['resource_unsub']()
    if state['unsub'] is not None:
        state['unsub']()
    if state['bootstrap'] is not None:
        frontend.remove_extra_js_url(hass, state['bootstrap'])
    for suffix in ('conflict_', 'reload_'):
        persistent_notification.async_dismiss(hass, 'liquid_glass_embedded_' + suffix + entry.entry_id)
    table = hass.data[frontend.DATA_THEMES]
    for name, theme in state['themes'].items():
        if table.get(name) == theme:
            old = state['previous'][name]
            if old is None:
                table.pop(name, None)
            else:
                table[name] = old
    restore = {}
    for key, field in ((frontend.DATA_DEFAULT_THEME, 'name'),
                       (frontend.DATA_DEFAULT_DARK_THEME, 'name_dark')):
        current = hass.data.get(key)
        owned = state['defaults_selected'] and current == DEFAULT_THEME
        missing = current not in table and current not in ('default', None)
        if owned or missing:
            old = state['default_themes'][key]
            target = old if old in table or old == 'default' else ('default' if field == 'name' else None)
            if current != target:
                restore[field] = target if target is not None else 'none'
    if restore:
        # Persist recovery through HA too; keep a user's later manual selection.
        await hass.services.async_call('frontend', 'set_theme', restore, blocking=True)
    ll = hass.data[LOVELACE_DATA]
    if state['demo'] is not None and ll.dashboards.get(DEMO) is state['demo']:
        ll.dashboards.pop(DEMO)
        frontend.async_remove_panel(hass, DEMO, warn_if_unknown=False)
    for path,dashboard in state['additional_dashboards'].items():
        if ll.dashboards.get(path) is dashboard:
            ll.dashboards.pop(path)
            frontend.async_remove_panel(hass,path,warn_if_unknown=False)
    hass.bus.async_fire(EVENT_THEMES_UPDATED)
    return True

async def async_migrate_entry(hass, entry):
    """Keep existing HA test entities opt-in; new installs default to the browser."""
    if entry.version == 1:
        hass.config_entries.async_update_entry(entry, data={**entry.data, 'demo_mode': 'entities'}, version=2)
    return entry.version <= 2
