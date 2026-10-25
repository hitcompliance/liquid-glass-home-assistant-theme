#!/usr/bin/env python3
"""Published defaults and native integration-owned saving, isolated from live HA."""
import asyncio
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch,Mock

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from homeassistant.core import HomeAssistant
from homeassistant.components import frontend,websocket_api
from custom_components.liquid_glass import runtime
from custom_components.liquid_glass import theme_store as store

class ThemeStoreTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp=tempfile.TemporaryDirectory();self.config=Path(self.temp.name)
        self.hass=HomeAssistant(str(self.config));self.themes=runtime.load_themes()
    async def asyncTearDown(self):
        await self.hass.async_block_till_done();self.temp.cleanup()

    def test_shipped_preferences_match_native_theme_and_snapshot(self):
        values=json.loads((ROOT/'src/dash6/theme-preferences.json').read_text())
        snapshot=json.loads((ROOT/'support/theme-defaults.json').read_text())['themes'][store.THEME]['values']
        self.assertEqual(values,snapshot)
        self.assertEqual(len(values['_controls']),76)
        for key,value in values.items():
            if key!='_controls':self.assertEqual(self.themes[store.THEME][key],value,key)
        self.assertEqual(values['dash6-light-glass-opacity'],'0.2')
        self.assertEqual(values['dash6-dark-glass-blur'],'16px')

    def test_save_is_backed_up_and_survives_reinstallation(self):
        values={'dash6-light-glass-opacity':'0.33','_controls':{'light_glass_opacity':33}}
        first=store.save_defaults(self.config,self.themes,values)
        self.assertEqual(first['theme']['dash6-light-glass-opacity'],'0.33')
        second=store.save_defaults(self.config,self.themes,{'dash6-light-glass-opacity':'0.44'})
        self.assertTrue(second['backup'])
        self.assertEqual(json.loads((Path(second['backup'])/store.STORE).read_text()),first['shared'])
        self.assertEqual(runtime.load_themes(self.config)[store.THEME]['dash6-light-glass-opacity'],'0.44')
        files=store.preserve_user_defaults(self.config,runtime.installer.package_files(runtime.ROOT),self.themes)
        native=next(f for f in files if f.path=='themes/liquid-glass/liquid-glass.yaml')
        self.assertEqual(json.loads(native.data)[store.THEME]['dash6-light-glass-opacity'],'0.44')

    def test_invalid_variable_cannot_write_other_config(self):
        with self.assertRaises(runtime.installer.InstallError):store.save_defaults(self.config,self.themes,{'../../configuration.yaml':'bad'})
        self.assertFalse((self.config/store.STORE).exists())

    async def test_websocket_requires_admin_for_save(self):
        captured=[]
        self.hass.data['liquid_glass']={'test':{'themes':self.themes}}
        self.hass.data[frontend.DATA_THEMES]=self.themes.copy()
        with patch.object(websocket_api,'async_register_command',side_effect=lambda h,fn:captured.append(fn)):
            store.register_websocket(self.hass)
        handler=captured[0]
        conn=SimpleNamespace(user=SimpleNamespace(is_admin=False),send_error=Mock(),send_result=Mock(),logger=Mock())
        handler(self.hass,conn,{'id':1,'type':'liquid_glass/theme_defaults','values':{'dash6-light-glass-opacity':'0.31'}})
        await self.hass.async_block_till_done()
        conn.send_error.assert_called_once_with(1,'unauthorized','Administrator permission required')
        self.assertFalse((self.config/store.STORE).exists())
        conn.user.is_admin=True
        done=asyncio.Event()
        conn.send_result.side_effect=lambda *args:done.set()
        conn.send_error.side_effect=lambda *args:done.set()
        handler(self.hass,conn,{'id':2,'type':'liquid_glass/theme_defaults','values':{'dash6-light-glass-opacity':'0.31'}})
        await asyncio.wait_for(done.wait(),5)
        self.assertEqual(conn.send_result.call_args.args[1]['theme']['dash6-light-glass-opacity'],'0.31')
        self.assertEqual(self.hass.data[frontend.DATA_THEMES][store.THEME]['dash6-light-glass-opacity'],'0.31')

if __name__=='__main__':unittest.main()
