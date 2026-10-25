#!/usr/bin/env python3
"""Exercise every virtual device using HA's actual entity platforms and states."""
import asyncio
from datetime import timedelta
import importlib
import json
import logging
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch, AsyncMock
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntries,ConfigEntry
from types import MappingProxyType
from homeassistant.helpers import entity_registry as er, device_registry as dr, area_registry as ar
from homeassistant.helpers.entity_platform import EntityPlatform
from homeassistant.util import dt as dt_util

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from custom_components.liquid_glass.demo import DemoCoordinator,PLATFORMS,load_specs

class DemoTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp=tempfile.TemporaryDirectory()
        self.hass=HomeAssistant(self.temp.name)
        self.hass.config_entries=ConfigEntries(self.hass,{})
        self.entry=ConfigEntry(data={},domain='liquid_glass',source='user',version=1,minor_version=1,options={},unique_id='liquid_glass',title='Liquid Glass',discovery_keys=MappingProxyType({}),subentries_data=[])
        self.hass.config_entries._entries[self.entry.entry_id]=self.entry
        await ar.async_load(self.hass,load_empty=True)
        dr.async_setup(self.hass)
        await dr.async_load(self.hass,load_empty=True)
        await er.async_load(self.hass,load_empty=True)
        self.coordinator=DemoCoordinator(self.hass,load_specs())
        self.platforms=[]
        self.service=patch.object(type(self.hass.services),'async_call',AsyncMock(side_effect=AssertionError('Demo backend called a service')))
        self.service.start()
        for domain in PLATFORMS:
            module=importlib.import_module('custom_components.liquid_glass.'+domain)
            platform=EntityPlatform(hass=self.hass,logger=logging.getLogger('demo-test'),domain=domain,
                platform_name='liquid_glass',platform=module,scan_interval=timedelta(seconds=30),entity_namespace=None)
            platform.config_entry=self.entry
            cls=next(v for k,v in vars(module).items() if k.startswith('Demo') and k!='DemoEntity' and isinstance(v,type))
            await platform.async_add_entities([cls(self.coordinator,s) for s in self.coordinator.specs if s['domain']==domain])
            self.platforms.append(platform)
        self.coordinator.refresh()

    async def asyncTearDown(self):
        self.coordinator.stop()
        for platform in self.platforms: await platform.async_reset()
        self.service.stop()
        await self.hass.async_block_till_done()
        self.temp.cleanup()

    def get(self,domain,key): return self.coordinator.get(domain,key)
    def state(self,domain,key): return self.hass.states.get(f'{domain}.liquid_glass_demo_{key}')

    async def test_every_declared_entity_has_valid_state_and_safe_namespace(self):
        self.assertEqual(len(self.hass.states.async_all()),len(self.coordinator.specs))
        for spec in self.coordinator.specs:
            state=self.hass.states.get(spec['entity_id'])
            self.assertIsNotNone(state,spec['entity_id'])
            if spec['domain'] not in ('button','scene'):
                self.assertNotIn(state.state,('unknown','unavailable'),spec['entity_id'])
            self.assertTrue(state.attributes['liquid_glass_demo'])
        dashboard=json.loads((ROOT/'examples/demo-dashboard.yaml').read_text())
        self.assertTrue(all(v.get('theme')=='DASH6 Satin Glass' for v in dashboard['views']))
        self.assertFalse(any('florin' in v.get('path','').lower() for v in dashboard['views']))
        for view in dashboard['views']:
            for section in view.get('sections',[]):
                self.assertTrue(all(c['type']=='custom:dash6-demo-scope' for c in section['cards']))

    async def test_light_groups_scenes_and_confirmed_feedback(self):
        await self.get('light','gruppe').async_turn_off()
        self.assertEqual(self.state('light','links').state,'off')
        await self.get('light','gruppe').async_turn_on(brightness=80,hs_color=[120,50])
        self.assertEqual(self.state('light','rechts').attributes['brightness'],80)
        await self.get('scene','weiss').async_activate()
        for key in ('schuhschrank','schuhschrank_links','schuhschrank_rechts'):
            self.assertEqual(tuple(self.state('light',key).attributes['hs_color']),(0,0))
        targets=self.state('scene','weiss').attributes['scene_targets']
        self.assertTrue(targets)
        await self.get('light','schuhschrank_links').async_turn_off()
        self.assertEqual(self.state('light','schuhschrank_links').state,'off')

    async def test_fan_countdown_presence_and_energy(self):
        await self.get('switch','anwesenheit').async_turn_on()
        self.assertEqual(self.state('binary_sensor','anwesenheit').state,'on')
        await self.get('number','luftung_restzeit').async_set_native_value(.5)
        await self.get('switch','luftung_force').async_turn_on()
        self.assertEqual(self.state('switch','luftung_ausgang').state,'on')
        await self.coordinator.tick(dt_util.utcnow())
        self.assertEqual(self.state('switch','luftung_force').state,'off')
        self.assertGreater(float(self.state('sensor','lampe_energie').state),0)

    async def test_media_climate_door_vacuum_and_update_never_call_foreign_services(self):
        await self.get('remote','fernseher').async_turn_off()
        self.assertEqual(self.state('media_player','fernseher').state,'off')
        await self.get('media_player','fernseher').async_turn_on()
        await self.get('media_player','fernseher').async_select_source('HDMI 3')
        self.assertEqual(self.state('media_player','fernseher').attributes['source'],'HDMI 3')
        await self.get('climate','thermostat').async_set_temperature(temperature=24)
        self.assertEqual(self.state('climate','thermostat').attributes['temperature'],24)
        await self.get('cover','rollo').async_set_cover_position(position=10)
        self.assertEqual(self.state('cover','rollo').attributes['current_position'],10)
        await self.get('lock','tur').async_open()
        self.assertEqual(self.state('binary_sensor','turkontakt').state,'on')
        await self.get('vacuum','roboter').async_start()
        self.assertEqual(self.state('vacuum','roboter').state,'cleaning')
        await self.get('button','update_verfugbar').async_press()
        self.assertEqual(self.state('update','firmware').state,'on')
        await self.get('update','firmware').async_install(None,False)
        self.assertEqual(self.state('update','firmware').state,'off')
        self.assertTrue((await self.get('camera','kamera').async_camera_image()).startswith(b'\xff\xd8'))
        self.assertEqual(len(await self.get('weather','wetter').async_forecast_daily()),5)

    async def test_reset_and_unload(self):
        await self.get('light','lampe').async_turn_off()
        await self.get('button','zurucksetzen').async_press()
        self.assertEqual(self.state('light','lampe').state,'on')
        self.coordinator.start()
        self.assertIsNotNone(self.coordinator.unsub)
        self.coordinator.stop()
        self.assertIsNone(self.coordinator.unsub)

    async def test_both_doors_contact_battery_ring_and_cancel(self):
        await self.get('switch','turkontakt_simulation').async_turn_on()
        self.assertEqual(self.state('binary_sensor','turkontakt').state,'on')
        await self.get('switch','schloss_batteriewarnung_simulation').async_turn_on()
        self.assertEqual(self.state('binary_sensor','schloss_batteriewarnung').state,'on')
        self.assertEqual(float(self.state('sensor','turkontakt_batterie').state),15)
        self.assertEqual(float(self.state('sensor','schloss_batterie').state),15)
        await self.get('lock','tur').async_lock()
        self.assertEqual(self.state('binary_sensor','turkontakt').state,'off')
        await self.get('button','klingeln').async_press()
        self.assertEqual(self.state('binary_sensor','klingel').state,'on')
        await self.get('button','turoffner').async_press()
        self.assertEqual(self.state('binary_sensor','klingel').state,'off')
        self.assertEqual(self.state('binary_sensor','turkontakt').state,'on')

if __name__=='__main__': unittest.main()
