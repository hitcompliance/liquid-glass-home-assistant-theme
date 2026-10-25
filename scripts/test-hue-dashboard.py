#!/usr/bin/env python3
"""Discover arbitrary local registries; exclude hidden/disabled/demo devices."""
import json,sys,unittest
from pathlib import Path
from types import SimpleNamespace as S
from unittest.mock import patch,Mock
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from custom_components.liquid_glass import hue_dashboard as hd
class DiscoveryTests(unittest.TestCase):
    def test_local_registry_rooms_siblings_unassigned_and_additional_views(self):
        def entity(eid,**kw):return S(entity_id=eid,platform='test',device_id=None,area_id=None,hidden_by=None,disabled_by=None,**kw)
        rows={}
        for eid,area,device,platform in [('light.vendor_lamp','room-a','d1','hue'),('sensor.vendor_power',None,'d1','test'),('switch.unknown_area',None,None,'test'),('update.vendor_fw','room-a','d1','test'),('camera.front','room-b','cam','test')]:
            row=entity(eid);row.area_id=area;row.device_id=device;row.platform=platform;rows[eid]=row
        for eid in ('light.hidden','switch.disabled','light.liquid_glass_demo_test'):
            rows[eid]=entity(eid)
        rows['light.hidden'].hidden_by='user';rows['switch.disabled'].disabled_by='integration'
        devices={'d1':S(id='d1',area_id='room-a',config_entries={'hue-entry'}),'cam':S(id='cam',area_id='room-b',config_entries=set())}
        hass=S(config_entries=S(async_entries=lambda:[S(entry_id='hue-entry',domain='hue')]),states=S(get=lambda eid:S(attributes={'device_class':'power'}) if eid=='sensor.vendor_power' else None),services=Mock())
        with patch.object(hd.er,'async_get',return_value=S(entities=rows)),patch.object(hd.dr,'async_get',return_value=S(devices=devices)),patch.object(hd.ar,'async_get',return_value=S(areas={'room-a':S(name='Arbitrary Room')})):
            data=hd.generate(hass)
        self.assertEqual(data['title'],'LIQUID-GLASS-HUE-DEMO')
        paths={v['path'] for v in data['views']};self.assertEqual(paths,{'raum-room-a','raum-ohne-bereich','wartung','energie','sicherheit','surveillance'})
        text=json.dumps(data)
        for eid in ('light.vendor_lamp','sensor.vendor_power','switch.unknown_area','update.vendor_fw','camera.front'):self.assertIn(eid,text)
        for eid in ('light.hidden','switch.disabled','light.liquid_glass_demo_test'):self.assertNotIn(eid,text)
        self.assertTrue(all(v['cards'][0]['type']=='custom:dash6-ultra-card' for v in data['views']))
        hass.services.assert_not_called()
    def test_copy_assets_and_service_namespace(self):
        root=Path(__file__).resolve().parents[1];data=json.loads((root/'examples/demo-dashboard.yaml').read_text());text=json.dumps(data)
        self.assertEqual(len(data['views']),28);self.assertNotIn('florin',text.lower());self.assertNotIn('/dash-6',text)
        self.assertIn('custom:dash6-ultra-card',text);self.assertIn('custom:dash6-shoe-cabinet-card',text);self.assertIn('custom:dash6-appletv-card',text);self.assertIn('custom:dash6-vacuum-card',text);self.assertIn('custom:dash6-door-card',text)
        for v in data['views']:
            for container in (v,*v.get('sections',[])):
                for c in container.get('cards',[]):self.assertEqual(c['type'],'custom:dash6-demo-scope')
if __name__=='__main__':unittest.main()
