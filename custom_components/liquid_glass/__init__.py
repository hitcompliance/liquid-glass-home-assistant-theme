"""Automatic Liquid Glass themes, frontend assets and isolated demo dashboard."""
from pathlib import Path
import logging
from homeassistant.components import frontend, persistent_notification
from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.dashboard import LovelaceYAML
from homeassistant.const import EVENT_THEMES_UPDATED
from homeassistant.exceptions import ConfigEntryNotReady
from .runtime import ROOT, install, load_themes

DOMAIN = 'liquid_glass'
DEMO = 'liquid-glass-demo'
_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass, entry):
    """Install in executor, then register only integration-owned runtime objects."""
    if hass.config.safe_mode or hass.config.recovery_mode:
        return False
    ll = hass.data[LOVELACE_DATA]
    await ll.resources.async_get_info()
    existing = [r['url'] for r in ll.resources.async_items()]
    existing += list(hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)
    www = Path(hass.config.path('www'))
    had_www = await hass.async_add_executor_job(www.is_dir)
    try:
        themes = await hass.async_add_executor_job(load_themes)
        themes = frontend._validate_themes(themes)
        if not themes:
            raise ValueError('No valid bundled themes found')
        report = await hass.async_add_executor_job(install, hass.config.config_dir, existing, entry.data.get('dual_smart_thermostat', False))
    except Exception as err:
        # Download/hash/path failures leave frontend registration untouched.
        raise ConfigEntryNotReady(f'Liquid Glass installation failed: {err}') from err
    if not had_www and not hass.data.get(DOMAIN + '_local_registered'):
        await hass.http.async_register_static_paths([StaticPathConfig('/local', str(www), True)])
        hass.data[DOMAIN + '_local_registered'] = True
    previous = {name: hass.data[frontend.DATA_THEMES].get(name) for name in themes}
    def publish_themes(event=None):
        table = hass.data[frontend.DATA_THEMES]
        # Theme reload replaces the native theme table; re-add only missing themes.
        for name, theme in themes.items():
            table.setdefault(name, theme)
    state = {'themes': themes, 'previous': previous, 'unsub': None, 'bootstrap': None, 'demo': None, 'report': report}
    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = state
    try:
        publish_themes()
        state['unsub'] = hass.bus.async_listen(EVENT_THEMES_UPDATED, publish_themes)
        hass.bus.async_fire(EVENT_THEMES_UPDATED)
        frontend.add_extra_js_url(hass, report['bootstrap'])
        state['bootstrap'] = report['bootstrap']
        if entry.data.get('demo_dashboard', True):
            if DEMO in ll.dashboards or frontend.async_panel_exists(hass, DEMO):
                _LOGGER.warning('Existing %s dashboard preserved; demo not registered', DEMO)
            else:
                conf = {'mode': 'yaml', 'filename': str(ROOT / 'examples' / 'demo-dashboard.yaml'), 'title': 'Liquid Glass Demo', 'icon': 'mdi:layers-outline', 'show_in_sidebar': True, 'require_admin': False}
                demo = LovelaceYAML(hass, DEMO, conf)
                state['demo'] = demo
                ll.dashboards[DEMO] = demo
                frontend.async_register_built_in_panel(hass, 'lovelace', sidebar_title=conf['title'], sidebar_icon=conf['icon'], frontend_url_path=DEMO, config={'mode': 'yaml'})
    except Exception as err:
        await async_unload_entry(hass, entry)
        raise ConfigEntryNotReady(f'Liquid Glass frontend registration failed: {err}') from err
    if report['dual_installed']:
        persistent_notification.async_create(hass, 'Dual Smart Thermostat wurde installiert. Bitte Home Assistant erneut starten und anschließend die Thermostat-Entitäten konfigurieren. Es wurde kein Gerät automatisch verändert.', title='Liquid Glass: Neustart erforderlich', notification_id='liquid_glass_dual_restart')
    return True

async def async_unload_entry(hass, entry):
    """Detach runtime objects; preserve installed files and backups for recovery."""
    state = hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    if state is None:
        return True
    if state['unsub'] is not None:
        state['unsub']()
    if state['bootstrap'] is not None:
        frontend.remove_extra_js_url(hass, state['bootstrap'])
    table = hass.data[frontend.DATA_THEMES]
    for name, theme in state['themes'].items():
        if table.get(name) == theme:
            old = state['previous'][name]
            if old is None:
                table.pop(name, None)
            else:
                table[name] = old
    for key in (frontend.DATA_DEFAULT_THEME, frontend.DATA_DEFAULT_DARK_THEME):
        if hass.data.get(key) not in table and hass.data.get(key) not in ('default', None):
            hass.data[key] = 'default' if key == frontend.DATA_DEFAULT_THEME else None
    ll = hass.data[LOVELACE_DATA]
    if state['demo'] is not None and ll.dashboards.get(DEMO) is state['demo']:
        ll.dashboards.pop(DEMO)
        frontend.async_remove_panel(hass, DEMO, warn_if_unknown=False)
    hass.bus.async_fire(EVENT_THEMES_UPDATED)
    return True
