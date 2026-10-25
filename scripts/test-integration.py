#!/usr/bin/env python3
"""Integration lifecycle tests against real HA 2026.9 classes, isolated config."""
import asyncio
import hashlib
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from types import SimpleNamespace
from unittest.mock import patch, AsyncMock, Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from homeassistant.core import HomeAssistant
from homeassistant.components import frontend
from homeassistant.components.lovelace import LovelaceData
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.resources import ResourceYAMLCollection, ResourceStorageCollection
from homeassistant.exceptions import ConfigEntryNotReady
from custom_components.liquid_glass import runtime
import custom_components.liquid_glass as integration
from custom_components.liquid_glass.config_flow import LiquidGlassConfigFlow

class IntegrationTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.bundle = self.root / 'package'
        shutil.copytree(runtime.ROOT, self.bundle)
        self.config = self.root / 'config'
        self.config.mkdir()
        self.hass = HomeAssistant(str(self.config))
        self.hass.http = SimpleNamespace(async_register_static_paths=AsyncMock())
        # Initialize the actual native schema/service and event behavior, while
        # keeping theme persistence in memory for the isolated test config.
        self.theme_store = SimpleNamespace(async_load=AsyncMock(return_value=None),
                                          async_delay_save=Mock())
        with patch.object(frontend, 'Store', return_value=self.theme_store):
            await frontend._async_setup_themes(self.hass, {'My theme': {'primary-color': '#123456'}})
        self.hass.data[frontend.DATA_EXTRA_MODULE_URL] = frontend.UrlManager(lambda *args: None, [])
        self.hass.data[frontend.DATA_PANELS] = {}
        self.ll = LovelaceData('yaml', {}, ResourceYAMLCollection([]), {})
        self.hass.data[LOVELACE_DATA] = self.ll
        self.hass.config_entries = SimpleNamespace(async_forward_entry_setups=AsyncMock(), async_unload_platforms=AsyncMock(return_value=True))
        self.entry = SimpleNamespace(entry_id='test', data={'demo_dashboard': True})
        self.payload = b'export const testDependency = true;'
        self.lock = {'schema_version': 1, 'dependencies': [{'id': 'test-card', 'kind': 'frontend', 'version': 'v1.0.0', 'entrypoint': 'test-card.js', 'assets': [{'path': 'test-card.js', 'url': 'https://raw.githubusercontent.com/example/repo/v1.0.0/test-card.js', 'sha256': hashlib.sha256(self.payload).hexdigest(), 'bytes': len(self.payload)}]}]}
        (self.bundle / 'dependencies.lock.json').write_text(json.dumps(self.lock))
        self.calls=[]
        self.download_payloads={}
        original = runtime.installer.dependency_files
        def dependencies(deps, cache, offline):
            def download(url):
                self.calls.append(url)
                return self.download_payloads.get(url, self.payload)
            return original(deps, cache, offline, download)
        self.patches = [patch.object(runtime, 'ROOT', self.bundle), patch.object(integration, 'ROOT', self.bundle), patch.object(runtime.installer, 'dependency_files', dependencies), patch.object(self.hass.config_entries, 'async_forward_entry_setups', AsyncMock()), patch.object(self.hass.config_entries, 'async_unload_platforms', AsyncMock(return_value=True)), patch.object(integration.er, 'async_get', return_value=SimpleNamespace(async_get=lambda key: None))]
        for p in self.patches: p.start()

    async def asyncTearDown(self):
        if self.entry.entry_id in self.hass.data.get(integration.DOMAIN, {}):
            await integration.async_unload_entry(self.hass, self.entry)
        await self.hass.async_block_till_done()
        for p in reversed(self.patches): p.stop()
        self.temp.cleanup()

    async def test_install_real_native_dashboard_and_unload(self):
        self.assertTrue(await integration.async_setup_entry(self.hass,self.entry))
        self.assertEqual(len(self.calls),1)
        self.assertIn('DASH6 Satin Glass',self.hass.data[frontend.DATA_THEMES])
        frontend._validate_themes(self.hass.data[frontend.DATA_THEMES])
        loaded = await self.ll.dashboards[integration.DEMO].async_load(False)
        self.assertGreaterEqual(len(loaded['views']), 12)
        self.assertTrue(all(v.get('theme') == 'DASH6 Satin Glass' for v in loaded['views']))
        self.assertFalse(any('florin' in v.get('path', '').lower() for v in loaded['views']))
        self.hass.config_entries.async_forward_entry_setups.assert_awaited_once()
        self.assertTrue(frontend.async_panel_exists(self.hass,integration.DEMO))
        self.assertEqual(len(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls),1)
        self.assertFalse((self.config/'configuration.yaml').exists())
        self.assertFalse((self.config/'.storage').exists())
        self.assertEqual(self.hass.http.async_register_static_paths.await_count,1)
        await integration.async_unload_entry(self.hass,self.entry)
        self.assertFalse(frontend.async_panel_exists(self.hass,integration.DEMO))
        self.assertNotIn(integration.DEMO,self.ll.dashboards)
        self.assertEqual(self.hass.data[frontend.DATA_THEMES],{'My theme': {'primary-color':'#123456'}})
        self.assertFalse(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)
        self.assertTrue((self.config/'www/liquid-glass/dash6-cards.js').exists())

    async def test_first_install_persists_satin_for_both_backend_modes(self):
        self.hass.data[frontend.DATA_DEFAULT_THEME] = 'My theme'
        self.hass.data[frontend.DATA_DEFAULT_DARK_THEME] = 'My theme'
        await integration.async_setup_entry(self.hass, self.entry)
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_THEME], integration.DEFAULT_THEME)
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_DARK_THEME], integration.DEFAULT_THEME)
        self.theme_store.async_delay_save.assert_called()
        save, delay = self.theme_store.async_delay_save.call_args.args
        self.assertEqual(save(), {frontend.DATA_DEFAULT_THEME: integration.DEFAULT_THEME,
                                  frontend.DATA_DEFAULT_DARK_THEME: integration.DEFAULT_THEME})
        self.assertEqual(delay, frontend.THEMES_SAVE_DELAY)
        await integration.async_unload_entry(self.hass, self.entry)
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_THEME], 'My theme')
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_DARK_THEME], 'My theme')
        self.assertEqual(self.theme_store.async_delay_save.call_args.args[0](),
                         {frontend.DATA_DEFAULT_THEME: 'My theme', frontend.DATA_DEFAULT_DARK_THEME: 'My theme'})

    async def test_update_selects_satin_without_reconfiguring_existing_entry(self):
        await integration.async_setup_entry(self.hass, self.entry)
        await self.hass.services.async_call('frontend', 'set_theme',
                                           {'name': 'My theme', 'name_dark': 'My theme'}, blocking=True)
        await integration.async_unload_entry(self.hass, self.entry)
        await integration.async_setup_entry(self.hass, self.entry)
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_THEME], integration.DEFAULT_THEME)
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_DARK_THEME], integration.DEFAULT_THEME)
        self.assertEqual(self.entry.data, {'demo_dashboard': True})

    async def test_unload_preserves_later_manual_theme_choice(self):
        await integration.async_setup_entry(self.hass, self.entry)
        await self.hass.services.async_call('frontend', 'set_theme',
                                           {'name': 'My theme', 'name_dark': 'My theme'}, blocking=True)
        await integration.async_unload_entry(self.hass, self.entry)
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_THEME], 'My theme')
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_DARK_THEME], 'My theme')

    async def test_unload_restores_native_no_dark_preference(self):
        await integration.async_setup_entry(self.hass, self.entry)
        await integration.async_unload_entry(self.hass, self.entry)
        await self.hass.async_block_till_done()
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_THEME], 'default')
        self.assertIsNone(self.hass.data.get(frontend.DATA_DEFAULT_DARK_THEME))
        self.assertNotIn(integration.DEFAULT_THEME, self.hass.data[frontend.DATA_THEMES],
                         'a queued setup/theme event cannot republish after unload')

    async def test_existing_frozen_and_same_named_theme_preserved(self):
        frozen = {'primary-color': '#112233'}
        local_satin = {'primary-color': '#223344'}
        self.hass.data[frontend.DATA_THEMES].update({'Local Frozen Comparison': frozen,
                                                   integration.DEFAULT_THEME: local_satin})
        await integration.async_setup_entry(self.hass, self.entry)
        self.assertEqual(self.hass.data[frontend.DATA_THEMES]['Local Frozen Comparison'], frozen)
        self.assertEqual(self.hass.data[frontend.DATA_THEMES][integration.DEFAULT_THEME], local_satin)
        await integration.async_unload_entry(self.hass, self.entry)
        self.assertEqual(self.hass.data[frontend.DATA_THEMES]['Local Frozen Comparison'], frozen)
        self.assertEqual(self.hass.data[frontend.DATA_THEMES][integration.DEFAULT_THEME], local_satin)

    async def test_missing_satin_aborts_before_install_or_default_selection(self):
        path = self.bundle / 'themes.json'
        themes = json.loads(path.read_text())
        themes.pop(integration.DEFAULT_THEME)
        path.write_text(json.dumps(themes))
        with self.assertRaisesRegex(ConfigEntryNotReady, 'Satin default theme is missing|No valid bundled themes found'):
            await integration.async_setup_entry(self.hass, self.entry)
        self.assertEqual(self.calls, [])
        self.assertFalse((self.config / 'www').exists())
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_THEME], 'default')
        self.theme_store.async_delay_save.assert_not_called()

    async def test_only_satin_is_bundled(self):
        themes = runtime.load_themes()
        self.assertEqual(list(themes), ['DASH6 Satin Glass'])
        self.assertTrue(all('Satin' in name or name.endswith(' (outdated)') for name in themes))
        self.assertTrue(all(theme['card-mod-theme'] == name for name, theme in themes.items()))

    def release_dependency(self, dep_id, payload, revision='b' * 40):
        url = 'https://raw.githubusercontent.com/example/' + dep_id + '/' + revision + '/' + dep_id + '.js'
        self.download_payloads[url] = payload
        return {'id': dep_id, 'kind': 'frontend', 'version': 'commit:' + revision, 'entrypoint': dep_id + '.js', 'assets': [{'path': dep_id + '.js', 'url': url, 'sha256': hashlib.sha256(payload).hexdigest(), 'bytes': len(payload)}]}

    async def test_release_update_automatically_installs_new_locked_dependency(self):
        await integration.async_setup_entry(self.hass, self.entry)
        await integration.async_unload_entry(self.hass, self.entry)
        new = self.release_dependency('new-required-card', b'export const newDependency = true;')
        self.lock['dependencies'].append(new)
        (self.bundle / 'dependencies.lock.json').write_text(json.dumps(self.lock))
        self.assertTrue(await integration.async_setup_entry(self.hass, self.entry))
        self.assertEqual(self.calls, [self.lock['dependencies'][0]['assets'][0]['url'], new['assets'][0]['url']])
        self.assertEqual((self.config / 'www/liquid-glass/vendor/new-required-card/new-required-card.js').read_bytes(), self.download_payloads[new['assets'][0]['url']])
        bootstrap = (self.config / 'www/liquid-glass/integration-bootstrap.js').read_text()
        self.assertLess(bootstrap.index('/vendor/new-required-card/'), bootstrap.index('/dash6-cards.js'))
        self.assertEqual(self.entry.data, {'demo_dashboard': True}, 'existing setup does not require a new config flow')

    async def test_release_update_replaces_installer_owned_pinned_dependency(self):
        await integration.async_setup_entry(self.hass, self.entry)
        previous = (self.config / 'www/liquid-glass/vendor/test-card/test-card.js').read_bytes()
        before_url = next(iter(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls))
        await integration.async_unload_entry(self.hass, self.entry)
        upgraded = self.release_dependency('test-card', b'export const upgraded = 2;')
        self.lock['dependencies'][0] = upgraded
        (self.bundle / 'dependencies.lock.json').write_text(json.dumps(self.lock))
        await integration.async_setup_entry(self.hass, self.entry)
        updated = self.config / 'www/liquid-glass/vendor/test-card/test-card.js'
        self.assertEqual(updated.read_bytes(), self.download_payloads[upgraded['assets'][0]['url']])
        report = self.hass.data[integration.DOMAIN][self.entry.entry_id]['report']
        self.assertIsNotNone(report['backup'])
        self.assertEqual((self.config / report['backup'] / 'www/liquid-glass/vendor/test-card/test-card.js').read_bytes(), previous)
        self.assertNotIn(before_url, self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)
        self.assertEqual(len(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls), 1)

    async def test_release_update_reuses_existing_hacs_for_new_dependency(self):
        await integration.async_setup_entry(self.hass, self.entry)
        await integration.async_unload_entry(self.hass, self.entry)
        new = self.release_dependency('new-required-card', b'export const newDependency = true;')
        self.lock['dependencies'].append(new)
        (self.bundle / 'dependencies.lock.json').write_text(json.dumps(self.lock))
        hacs = '/hacsfiles/new-required-card/new-required-card.js?hacstag=123'
        self.ll.resources.data = [{'url': hacs, 'type': 'module'}]
        await integration.async_setup_entry(self.hass, self.entry)
        self.assertEqual(len(self.calls), 1, 'existing HACS and prior cached dependency need no new downloads')
        self.assertFalse((self.config / 'www/liquid-glass/vendor/new-required-card').exists())
        self.assertIn(hacs, (self.config / 'www/liquid-glass/integration-bootstrap.js').read_text())
        self.assertEqual(self.ll.resources.data, [{'url': hacs, 'type': 'module'}])

    async def test_release_update_bad_dependency_keeps_old_files_then_retries(self):
        await integration.async_setup_entry(self.hass, self.entry)
        await integration.async_unload_entry(self.hass, self.entry)
        original_files = {str(p.relative_to(self.config)): p.read_bytes() for p in (self.config / 'www').rglob('*') if p.is_file()}
        new = self.release_dependency('new-required-card', b'export const valid = true;')
        self.lock['dependencies'].append(new)
        (self.bundle / 'dependencies.lock.json').write_text(json.dumps(self.lock))
        self.download_payloads[new['assets'][0]['url']] = b'corrupt download'
        with self.assertRaises(ConfigEntryNotReady):
            await integration.async_setup_entry(self.hass, self.entry)
        self.assertEqual({str(p.relative_to(self.config)): p.read_bytes() for p in (self.config / 'www').rglob('*') if p.is_file()}, original_files)
        self.assertFalse(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)
        self.assertNotIn(self.entry.entry_id, self.hass.data.get(integration.DOMAIN, {}))
        self.download_payloads[new['assets'][0]['url']] = b'export const valid = true;'
        self.assertTrue(await integration.async_setup_entry(self.hass, self.entry))
        self.assertTrue((self.config / 'www/liquid-glass/vendor/new-required-card/new-required-card.js').exists())

    async def test_reload_idempotent_cache_and_backup(self):
        await integration.async_setup_entry(self.hass,self.entry)
        await integration.async_unload_entry(self.hass,self.entry)
        await integration.async_setup_entry(self.hass,self.entry)
        self.assertEqual(len(self.calls),1)
        report=self.hass.data[integration.DOMAIN]['test']['report']
        self.assertEqual(report['changed'],0)
        self.assertIsNone(report['backup'])
        self.assertEqual(len(self.ll.dashboards),1)

    async def test_existing_hacs_dependency_reused(self):
        url='/hacsfiles/test-card/test-card.js?hacstag=123'
        self.ll.resources.data=[{'url':url,'type':'module'}]
        await integration.async_setup_entry(self.hass,self.entry)
        self.assertEqual(self.calls,[])
        self.assertFalse((self.config/'www/liquid-glass/vendor/test-card').exists())
        boot=(self.config/'www/liquid-glass/integration-bootstrap.js').read_text()
        self.assertIn(url,boot)
        self.assertEqual(self.ll.resources.data,[{'url':url,'type':'module'}])

    def use_storage_resources(self):
        """Use HA's real observable collection instead of a listener-shaped fake."""
        dependency = self.lock['dependencies'][0]
        dependency.update(id='embedded-view-card', entrypoint='embedded-view-card.js')
        dependency['assets'][0]['path'] = 'embedded-view-card.js'
        (self.bundle / 'dependencies.lock.json').write_text(json.dumps(self.lock))
        resources = ResourceStorageCollection(self.hass, SimpleNamespace(async_load=AsyncMock(return_value={})))
        resources.loaded = True
        self.ll.resources = resources
        self.ll.resource_mode = 'storage'
        return resources

    async def test_storage_hacs_first_preserves_foreign_registration(self):
        resources = self.use_storage_resources()
        hacs = await resources.async_create_item({'url': '/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=123', 'res_type': 'module'})
        unrelated = await resources.async_create_item({'url': '/local/foreign-controller.js?v=7', 'res_type': 'module'})
        before = [dict(item) for item in resources.async_items()]
        await integration.async_setup_entry(self.hass, self.entry)
        self.assertEqual(self.calls, [])
        self.assertEqual(resources.async_items(), before)
        boot = (self.config / 'www/liquid-glass/integration-bootstrap.js').read_text()
        self.assertIn(hacs['url'], boot)
        self.assertNotIn('/vendor/embedded-view-card/', boot)
        await integration.async_unload_entry(self.hass, self.entry)
        self.assertEqual(resources.async_items(), before)
        self.assertIn(unrelated, resources.async_items())

    async def test_storage_hacs_later_refreshes_vendor_owner_without_redownload(self):
        resources = self.use_storage_resources()
        foreign_extra = '/local/foreign-controller.js?v=3'
        frontend.add_extra_js_url(self.hass, foreign_extra)
        await integration.async_setup_entry(self.hass, self.entry)
        boot_path = self.config / 'www/liquid-glass/integration-bootstrap.js'
        self.assertIn('/vendor/embedded-view-card/', boot_path.read_text())
        self.assertEqual(len(self.calls), 1)
        hacs = await resources.async_create_item({'url': '/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=456', 'res_type': 'module'})
        await self.hass.async_block_till_done()
        self.assertIn(hacs['url'], boot_path.read_text())
        self.assertNotIn('/vendor/embedded-view-card/', boot_path.read_text())
        self.assertEqual(len(self.calls), 1, 'resource change must not download unrelated modules')
        self.assertIn(hacs, resources.async_items())
        # Updating a HACS cache key must replace the exact ESM URL.
        updated = await resources.async_update_item(hacs['id'], {'url': '/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=789'})
        await self.hass.async_block_till_done()
        self.assertIn(updated['url'], boot_path.read_text())
        self.assertNotIn(hacs['url'], boot_path.read_text())
        self.assertEqual(len(self.calls), 1)
        self.assertIn(foreign_extra, self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)
        self.assertEqual(len(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls), 2, 'refresh replaces only its own extra-JS URL')
        await integration.async_unload_entry(self.hass, self.entry)
        self.assertEqual(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls, frozenset({foreign_extra}))
        before = boot_path.read_bytes()
        await resources.async_create_item({'url': '/local/after-unload.js', 'res_type': 'module'})
        await self.hass.async_block_till_done()
        self.assertEqual(boot_path.read_bytes(), before, 'unloaded listener must not rewrite bootstrap')

    async def test_setup_race_rereads_resource_added_after_initial_install(self):
        resources = self.use_storage_resources()
        hacs_url = '/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=race'
        executor = self.hass.async_add_executor_job
        async def interleave(func, *args):
            result = await executor(func, *args)
            if func is integration.install:
                # HACS completed after the first snapshot but before subscription.
                await resources.async_create_item({'url': hacs_url, 'res_type': 'module'})
            return result
        with patch.object(self.hass, 'async_add_executor_job', side_effect=interleave):
            await integration.async_setup_entry(self.hass, self.entry)
        self.assertEqual(len(self.calls), 1)
        bootstrap = (self.config / 'www/liquid-glass/integration-bootstrap.js').read_text()
        self.assertIn(hacs_url, bootstrap)
        self.assertNotIn('/vendor/embedded-view-card/', bootstrap)
        self.assertEqual([item['url'] for item in resources.async_items()], [hacs_url])

    async def test_late_duplicate_stops_only_owned_loader_and_recovers_after_correction(self):
        resources = self.use_storage_resources()
        foreign_extra = '/local/foreign-extra.js'
        frontend.add_extra_js_url(self.hass, foreign_extra)
        hacs = await resources.async_create_item({'url': '/hacsfiles/embedded-view-card/embedded-view-card.js?hacstag=1', 'res_type': 'module'})
        await integration.async_setup_entry(self.hass, self.entry)
        boot = self.config / 'www/liquid-glass/integration-bootstrap.js'
        before = boot.read_bytes()
        duplicate = await resources.async_create_item({'url': '/local/manual/embedded-view-card.js?v=2', 'res_type': 'module'})
        await self.hass.async_block_till_done()
        self.assertEqual(boot.read_bytes(), before, 'conflicting registration must not rewrite bootstrap')
        self.assertEqual(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls, frozenset({foreign_extra}))
        self.assertIn(hacs, resources.async_items())
        self.assertIn(duplicate, resources.async_items())
        self.assertEqual(self.calls, [])
        await resources.async_delete_item(duplicate['id'])
        await self.hass.async_block_till_done()
        self.assertEqual(len(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls), 2)
        self.assertIn(foreign_extra, self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)
        self.assertEqual(boot.read_bytes(), before)
        self.assertEqual(resources.async_items(), [hacs])
        integration.persistent_notification.async_create(self.hass, 'Keep me', notification_id='foreign-notification')
        notifications = integration.persistent_notification._async_get_or_create_notifications(self.hass)
        self.assertIn('liquid_glass_embedded_reload_' + self.entry.entry_id, notifications)
        self.assertNotIn('liquid_glass_embedded_conflict_' + self.entry.entry_id, notifications)
        await integration.async_unload_entry(self.hass, self.entry)
        self.assertIn('foreign-notification', notifications)
        self.assertNotIn('liquid_glass_embedded_reload_' + self.entry.entry_id, notifications)
        self.assertNotIn('liquid_glass_embedded_conflict_' + self.entry.entry_id, notifications)

    async def test_unrelated_storage_resource_addition_preserves_dependency_and_downloads(self):
        resources = self.use_storage_resources()
        await integration.async_setup_entry(self.hass, self.entry)
        before = (self.config / 'www/liquid-glass/integration-bootstrap.js').read_bytes()
        foreign = await resources.async_create_item({'url': '/local/foreign-controller.js?v=8', 'res_type': 'module'})
        await self.hass.async_block_till_done()
        self.assertEqual((self.config / 'www/liquid-glass/integration-bootstrap.js').read_bytes(), before)
        self.assertEqual(len(self.calls), 1)
        self.assertIn(foreign, resources.async_items())

    async def test_native_theme_reload_preserves_unrelated_theme(self):
        await integration.async_setup_entry(self.hass,self.entry)
        self.hass.data[frontend.DATA_THEMES]={'Reloaded': {'primary-color':'red'}}
        self.hass.bus.async_fire('themes_updated')
        await self.hass.async_block_till_done()
        self.assertIn('DASH6 Satin Glass',self.hass.data[frontend.DATA_THEMES])
        self.assertIn('Reloaded',self.hass.data[frontend.DATA_THEMES])

    async def test_dashboard_collision_preserved(self):
        existing=object()
        self.ll.dashboards[integration.DEMO]=existing
        await integration.async_setup_entry(self.hass,self.entry)
        self.assertIs(self.ll.dashboards[integration.DEMO],existing)
        await integration.async_unload_entry(self.hass,self.entry)
        self.assertIs(self.ll.dashboards[integration.DEMO],existing)

    async def test_bad_download_no_target_writes_or_registration(self):
        self.payload=b'corrupted'
        with self.assertRaises(ConfigEntryNotReady):
            await integration.async_setup_entry(self.hass,self.entry)
        self.assertFalse((self.config/'www').exists())
        self.assertEqual(self.ll.dashboards,{})
        self.assertFalse(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)
        self.assertNotIn('DASH6 Satin Glass',self.hass.data[frontend.DATA_THEMES])

    async def test_legacy_own_bundle_rejected_before_download(self):
        self.ll.resources.data=[{'url':'/local/old/dash6-cards.js?v=1','type':'module'}]
        with self.assertRaises(ConfigEntryNotReady):
            await integration.async_setup_entry(self.hass,self.entry)
        self.assertFalse((self.config/'www').exists())
        self.assertEqual(self.calls,[])

    async def test_optional_demo_disabled(self):
        self.entry.data={'demo_dashboard':False}
        await integration.async_setup_entry(self.hass,self.entry)
        self.assertEqual(self.ll.dashboards,{})

    async def test_changed_existing_file_backed_up_before_update(self):
        target=self.config/'www/liquid-glass/dash6-cards.js'
        target.parent.mkdir(parents=True)
        target.write_bytes(b'old bundle')
        await integration.async_setup_entry(self.hass,self.entry)
        report=self.hass.data[integration.DOMAIN]['test']['report']
        self.assertEqual((Path(report['backup'])/'www/liquid-glass/dash6-cards.js').read_bytes(),b'old bundle')
        self.assertNotEqual(target.read_bytes(),b'old bundle')

    async def test_existing_backend_integration_not_overwritten(self):
        folder=self.config/'custom_components/dual_smart_thermostat'
        folder.mkdir(parents=True)
        (folder/'manifest.json').write_text('existing managed integration')
        backend={'id':'dual_smart_thermostat','kind':'integration','version':'v1.0.0','assets':[{'path':'manifest.json','url':'https://raw.githubusercontent.com/example/repo/v1.0.0/manifest.json','sha256':hashlib.sha256(self.payload).hexdigest(),'bytes':len(self.payload)}]}
        self.lock['dependencies'].append(backend)
        (self.bundle/'dependencies.lock.json').write_text(json.dumps(self.lock))
        self.entry.data['dual_smart_thermostat']=True
        await integration.async_setup_entry(self.hass,self.entry)
        self.assertEqual((folder/'manifest.json').read_text(),'existing managed integration')
        self.assertEqual(len(self.calls),1)
        self.assertFalse(self.hass.data[integration.DOMAIN]['test']['report']['dual_installed'])

    async def test_registration_failure_unwinds_runtime(self):
        with patch.object(frontend,'async_register_built_in_panel',side_effect=ValueError('panel failure')):
            with self.assertRaises(ConfigEntryNotReady):
                await integration.async_setup_entry(self.hass,self.entry)
        self.assertEqual(self.ll.dashboards,{})
        self.assertFalse(self.hass.data[frontend.DATA_EXTRA_MODULE_URL].urls)
        self.assertNotIn('DASH6 Satin Glass',self.hass.data[frontend.DATA_THEMES])
        self.assertNotIn('test',self.hass.data[integration.DOMAIN])
        self.assertEqual(self.hass.data[frontend.DATA_DEFAULT_THEME], 'default')
        self.assertIsNone(self.hass.data.get(frontend.DATA_DEFAULT_DARK_THEME))
        self.theme_store.async_delay_save.assert_not_called()

    async def test_config_flow_defaults_and_single_instance(self):
        flow=LiquidGlassConfigFlow()
        flow.hass=self.hass
        with patch.object(flow,'async_set_unique_id',AsyncMock()), patch.object(flow,'_abort_if_unique_id_configured') as guard:
            result=await flow.async_step_user()
            self.assertEqual(result['type'],'form')
            self.assertEqual(result['data_schema']({}),{'demo_dashboard':True,'dual_smart_thermostat':False})
            result=await flow.async_step_user({'demo_dashboard':True,'dual_smart_thermostat':False})
            self.assertEqual(result['type'],'create_entry')
            guard.assert_called()

if __name__=='__main__':unittest.main()
