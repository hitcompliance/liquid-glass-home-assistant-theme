"""In-memory demonstration devices. No network, device calls or foreign services."""
from copy import deepcopy
from datetime import timedelta
import json
import math
from pathlib import Path
from homeassistant.helpers.entity import Entity, DeviceInfo
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

PLATFORMS = ['light', 'switch', 'sensor', 'binary_sensor', 'fan', 'cover',
             'climate', 'media_player', 'remote', 'vacuum', 'lock', 'button',
             'select', 'number', 'scene', 'update', 'weather', 'camera']
PREFIX = 'liquid_glass_demo_'

def load_specs():
    return json.loads(Path(__file__).with_name('demo-entities.json').read_text())

def initial(spec):
    key, domain = spec['key'], spec['domain']
    if domain == 'sensor':
        unit, device, state_class, value = ('W', 'power', 'measurement', 24.0)
        if 'temperature' in key or 'temperatur' in key: unit,device,value='°C','temperature',22.1
        elif 'moisture' in key or 'luftfeuchte' in key: unit,device,value='%','humidity',42.0
        elif 'illuminance' in key: unit,device,value='lx','illuminance',18000
        elif 'conductivity' in key: unit,device,value='µS/cm',None,850
        elif 'battery' in key or 'batterie' in key: unit,device,value='%','battery',86
        elif 'energie' in key: unit,device,state_class,value='kWh','energy','total_increasing',0.0
        elif 'fortschritt' in key: unit,device,value='%',None,0
        elif 'restzeit' in key: unit,device,value='h',None,120
        elif 'dauer' in key: unit,device,value='min',None,0
        elif 'aktivitat' in key: unit,device,state_class,value=None,'timestamp',None,dt_util.utcnow()
        if key=='kuhlschrank_temperatur': value=5.2
        return {'value':value,'unit':unit,'device_class':device,'state_class':state_class}
    return {'on': domain in ('light','fan','remote','switch') and not any(x in key for x in ('force','kindersicherung','simulation','ausgang')),
            'brightness':184,'hs_color':(215,70),'color_temp_kelvin':3000,'color_mode':'hs','effect':'Solid',
            'percentage':50,'position':65,'hvac_mode':'heat','temperature':22,'target_temp_low':20,'target_temp_high':24,
            'preset':'comfort','volume':0.35,'media_state':'idle','source':'AppleTV','locked':True,
            'vacuum_state':'docked','fan_speed':'balanced','option':'Lesen','number':0,'available_update':False}

class DemoCoordinator:
    def __init__(self, hass, specs):
        self.hass, self.specs = hass, specs
        self.entities = {}
        self.ticks = 0
        self.unsub = None

    def start(self):
        self.unsub = async_track_time_interval(self.hass, self.tick, timedelta(seconds=30))

    def stop(self):
        if self.unsub: self.unsub()
        self.unsub = None

    def get(self, domain, key):
        return self.entities.get(f'{domain}.{PREFIX}{key}')

    def put(self, domain, key, **changes):
        if item := self.get(domain,key):
            item.data.update(changes)
            if item.hass: item.async_write_ha_state()

    def refresh(self):
        presence = self.get('switch','anwesenheit')
        self.put('binary_sensor','anwesenheit',on=bool(presence and presence.data['on']))
        door = self.get('switch','kuhlschrank_tur_simulation')
        self.put('binary_sensor','kuhlschrank_tur',on=bool(door and door.data['on']))
        fan, force, remaining = self.get('fan','luftung'),self.get('switch','luftung_force'),self.get('number','luftung_restzeit')
        running=bool(force and force.data['on'] or fan and fan.data['on'] and presence and presence.data['on'])
        self.put('switch','luftung_ausgang',on=running)
        self.put('switch','luftung_force_ausgang',on=running)
        self.put('sensor','luftung_leistung',value=18.5 if running else 0)
        for spec in self.specs:
            if spec['domain']!='sensor' or not spec['key'].endswith('_leistung'): continue
            key=spec['key'].removesuffix('_leistung')
            source=self.get('light',key) or self.get('switch',key) or self.get('fan',key)
            if source: self.put('sensor',spec['key'],value=round(24+2*math.sin(self.ticks/3),2) if source.data['on'] else 0)
        # Group cards see confirmed member state, including scene/color changes.
        for group, keys in [('gruppe',['links','rechts']),('schuhschrank',['schuhschrank_links','schuhschrank_rechts'])]:
            members=[self.get('light',key) for key in keys]
            if all(members):
                self.put('light',group,on=any(m.data['on'] for m in members))

    async def tick(self, now):
        self.ticks+=1
        remaining=self.get('number','luftung_restzeit')
        if remaining and remaining.data['number']>0:
            remaining.data['number']=max(0,remaining.data['number']-.5)
            remaining.async_write_ha_state()
            if remaining.data['number']==0: self.put('switch','luftung_force',on=False)
        self.refresh()
        for spec in self.specs:
            item=self.entities.get(spec['entity_id'])
            if not item: continue
            if spec['domain']=='sensor' and item.data['device_class']=='energy':
                power=self.get('sensor',spec['key'].removesuffix('_energie')+'_leistung')
                item.data['value']+=max(0,power.data['value'] if power else 5)/120000
            if spec['domain']=='sensor': item.async_write_ha_state()

    def reset(self):
        for item in self.entities.values():
            item.data=initial(item.spec)
            item.async_write_ha_state()
        self.ticks=0
        self.refresh()

class DemoEntity(Entity):
    _attr_should_poll=False
    def __init__(self, coordinator, spec):
        self.coordinator, self.spec = coordinator, spec
        self.data=initial(spec)
        self.entity_id=spec['entity_id']
        self._attr_unique_id=spec['entity_id']
        self._attr_name=spec['name']
        self._attr_device_info=DeviceInfo(identifiers={('liquid_glass','demo_'+spec['room'])},
            name='DASH6 Demo · '+spec['room'],manufacturer='Liquid Glass',model='Virtual demo device',
            suggested_area='DASH6 Demo · '+spec['room'])

    @property
    def extra_state_attributes(self):
        return {'liquid_glass_demo':True}

    async def async_added_to_hass(self):
        self.coordinator.entities[self.spec['entity_id']]=self

    async def async_will_remove_from_hass(self):
        self.coordinator.entities.pop(self.spec['entity_id'],None)

    def change(self, **changes):
        self.data.update(changes)
        self.async_write_ha_state()
        self.coordinator.refresh()

async def setup_platform(hass, entry, async_add_entities, domain, cls):
    coordinator=hass.data['liquid_glass'][entry.entry_id]['demo_coordinator']
    async_add_entities([cls(coordinator,spec) for spec in coordinator.specs if spec['domain']==domain])
