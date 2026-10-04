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
from unittest.mock import patch, AsyncMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from homeassistant.core import HomeAssistant
from homeassistant.components import frontend
from homeassistant.components.lovelace import LovelaceData
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.resources import ResourceYAMLCollection
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
        self.hass.data[frontend.DATA_THEMES] = {'My theme': {'primary-color': '#123456'}}
        self.hass.data[frontend.DATA_DEFAULT_THEME] = 'default'
        self.hass.data[frontend.DATA_EXTRA_MODULE_URL] = frontend.UrlManager(lambda *args: None, [])
        self.hass.data[frontend.DATA_PANELS] = {}
        self.ll = LovelaceData('yaml', {}, ResourceYAMLCollection([]), {})
        self.hass.data[LOVELACE_DATA] = self.ll
        self.entry = SimpleNamespace(entry_id='test', data={'demo_dashboard': True})
        self.payload = b'export const testDependency = true;'
        self.lock = {'schema_version': 1, 'dependencies': [{'id': 'test-card', 'kind': 'frontend', 'version': 'v1.0.0', 'entrypoint': 'test-card.js', 'assets': [{'path': 'test-card.js', 'url': 'https://raw.githubusercontent.com/example/repo/v1.0.0/test-card.js', 'sha256': hashlib.sha256(self.payload).hexdigest(), 'bytes': len(self.payload)}]}]}
        (self.bundle / 'dependencies.lock.json').write_text(json.dumps(self.lock))
        self.calls=[]
        original = runtime.installer.dependency_files
        def dependencies(deps, cache, offline):
            def download(url):
                self.calls.append(url)
                return self.payload
            return original(deps, cache, offline, download)
        self.patches = [patch.object(runtime, 'ROOT', self.bundle), patch.object(integration, 'ROOT', self.bundle), patch.object(runtime.installer, 'dependency_files', dependencies)]
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
        self.assertEqual(len(loaded['views']),3)
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
