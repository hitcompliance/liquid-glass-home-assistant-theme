"""Instance-local discovery dashboard. Reading registries never calls devices."""
from collections import defaultdict
from copy import deepcopy
from homeassistant.components.lovelace.dashboard import LovelaceConfig
from homeassistant.helpers import area_registry as ar,device_registry as dr,entity_registry as er
from homeassistant.helpers.json import json_bytes,json_fragment

HUE_DEMO='liquid-glass-hue-demo'
TITLE='LIQUID-GLASS-HUE-DEMO'
THEME='DASH6 Satin Glass'
DOMAINS={'light':'Licht','switch':'Schalter','climate':'Klima','fan':'Ventilatoren','cover':'Verdunklungen','media_player':'Medien','lock':'Türen','vacuum':'Staubsauger','scene':'Szenen','sensor':'Sensoren','binary_sensor':'Meldungen','update':'Updates','button':'Aktionen','select':'Auswahl','number':'Einstellungen','camera':'Kameras','event':'Ereignisse','alarm_control_panel':'Alarmanlage','siren':'Sirenen'}

def block(path,domain,ids,area=None):
    cards=[]
    for eid in ids:
        kind='tile'
        extra={}
        if domain=='light':kind='custom:dash6-govee-light-card-v2';extra={'discovery':{'enabled':False}}
        elif domain=='switch':kind='custom:dash6-ikea-card'
        elif domain=='media_player':kind='custom:dash6-homepod-card'
        elif domain=='fan':kind='custom:dash6-fan-card'
        elif domain=='vacuum':kind='custom:dash6-vacuum-card'
        elif domain=='climate':kind='thermostat'
        elif domain=='alarm_control_panel':kind='alarm-panel'
        elif domain=='camera':kind='picture-entity';extra={'camera_view':'auto'}
        elif domain=='scene':extra={'tap_action':{'action':'perform-action','perform_action':'scene.turn_on','target':{'entity_id':eid}}}
        cards.append({'type':kind,'entity':eid,**extra})
    return {'type':'custom:dash6-domain-card','dashboard':HUE_DEMO,'view':path,'block_id':domain,'domain':domain,'area':area,'heading':DOMAINS.get(domain,domain),'combine':True,'auto_entities':False,'columns':1,'mobile_columns':1,'cards':cards}

def ultra(cards,links):
    """Same Ultra content/sidebar layout, native headings and domain glass shells."""
    nav={'type':'vertical-stack','cards':[{'type':'custom:button-card','name':title,'icon':icon,'tap_action':{'action':'navigate','navigation_path':'/'+HUE_DEMO+'/'+path},'styles':{'card':[{'background':'transparent','box-shadow':'none','height':'40px'}]}} for path,title,icon in links]}
    sidebar=[{'type':'custom:dash6-theme-editor-card','expanded':False},nav]
    toggle={'type':'custom:dash6-direct-card','card':{'type':'custom:button-card','name':'Seitenleiste öffnen','icon':'mdi:dock-right','show_name':False,'tap_action':{'action':'fire-dom-event'},'custom_fields':{'overlay_hook':'[[[ return window.__dash6Cards.overlay(this,hass,html); ]]]'},'variables':{'room_title':cards[0].get('title','Geräte'),'sidebar_cards':deepcopy(sidebar)},'dash6_css':{'class':'dash6-sidebar-toggle'}}}
    def module(identifier,card):
        # Ultra's external-card module resolves custom elements. HA-native
        # stacks/markdown use the same direct adapter as the DASH6 copy.
        if not card['type'].startswith('custom:'):card={'type':'custom:dash6-direct-card','card':card}
        return {'id':identifier,'type':'external_card','card_type':card['type'].removeprefix('custom:'),'card_config':card}
    return {'type':'custom:dash6-ultra-card','_config_version':3,'card_padding':16,'card_border_width':0,'card_border_radius':0,'layout':{'rows':[{'id':'embedded-room-layout','column_layout':'custom','custom_column_sizing':'minmax(0,1fr) 250px','gap':16,'gap_unit':'px','columns':[{'id':'embedded-content','width':'100%','modules':[module('sidebar-toggle',toggle),*[module('content-'+str(i),c) for i,c in enumerate(cards)]]},{'id':'embedded-sidebar','width':'250px','modules':[module('sidebar-'+str(i),c) for i,c in enumerate(sidebar)]}]}]}}

def generate(hass):
    entities=er.async_get(hass).entities;devices=dr.async_get(hass).devices;areas=ar.async_get(hass).areas
    entries={e.entry_id:e.domain for e in hass.config_entries.async_entries()}
    visible={eid:e for eid,e in entities.items() if not e.hidden_by and not e.disabled_by and e.platform!='liquid_glass' and not eid.split('.',1)[1].startswith('liquid_glass_demo_')}
    hue_devices={d.id for d in devices.values() if any(entries.get(i)=='hue' for i in d.config_entries)}
    selected_devices={e.device_id for eid,e in visible.items() if eid.split('.')[0] in ('light','switch') or e.platform=='hue' or e.device_id in hue_devices}
    selected_devices.discard(None)
    selected={eid:e for eid,e in visible.items() if eid.split('.')[0] in ('light','switch') or e.platform=='hue' or e.device_id in selected_devices}
    rooms=defaultdict(lambda:defaultdict(list))
    for eid,e in selected.items():
        domain=eid.split('.')[0]
        if domain not in DOMAINS:continue
        device=devices.get(e.device_id);area=e.area_id or (device.area_id if device else None)
        rooms[area][domain].append(eid)
    room_keys=sorted(rooms,key=lambda key:(areas[key].name.casefold() if key in areas else '\uffff'))
    links=[('raum-'+(key or 'ohne-bereich'),areas[key].name if key in areas else 'Ohne Bereich','mdi:floor-plan') for key in room_keys]
    links += [('wartung','Wartung','mdi:wrench'),('energie','Energie','mdi:lightning-bolt'),('sicherheit','Sicherheit','mdi:shield-home'),('surveillance','Surveillance','mdi:cctv')]
    views=[]
    for key,(path,title,icon) in zip(room_keys,links):
        cards=[{'type':'custom:dash6-area-header','title':title,'area':key,'show_clock':True}]
        cards.extend(block(path,domain,sorted(ids),key) for domain,ids in sorted(rooms[key].items()))
        views.append({'title':title,'path':path,'icon':icon,'type':'panel','theme':THEME,'cards':[ultra(cards,links)]})
    groups={k:defaultdict(list) for k in ('wartung','energie','sicherheit','surveillance')}
    for eid,e in visible.items():
        domain=eid.split('.')[0];state=hass.states.get(eid);dc=state.attributes.get('device_class') if state else None
        if domain=='update' or domain in ('sensor','binary_sensor') and dc in ('battery','problem'):groups['wartung'][domain].append(eid)
        if domain=='sensor' and dc in ('power','energy','gas','water'):groups['energie'][domain].append(eid)
        if domain in ('lock','alarm_control_panel','siren') or domain=='binary_sensor' and dc in ('door','window','opening','smoke','gas','moisture','safety','tamper','motion','occupancy'):groups['sicherheit'][domain].append(eid)
        if domain=='camera':groups['surveillance'][domain].append(eid)
    for path,title,icon in links[len(room_keys):]:
        cards=[{'type':'custom:dash6-area-header','title':title,'show_clock':True}]
        cards.extend(block(path,domain,sorted(ids)) for domain,ids in sorted(groups[path].items()))
        if len(cards)==1:cards.append({'type':'markdown','content':'Keine passenden sichtbaren Entities gefunden. Die Ansicht aktualisiert sich nach Registry-Änderungen.'})
        views.append({'title':title,'path':path,'icon':icon,'type':'panel','theme':THEME,'cards':[ultra(cards,links)]})
    return {'title':TITLE,'views':views}

class DiscoveryDashboard(LovelaceConfig):
    """Generated on the local HA server; never uploads registry information."""
    @property
    def mode(self):return 'yaml'
    async def async_load(self,force):return generate(self.hass)
    async def async_get_info(self):return {'mode':self.mode,'views':len((await self.async_load(False))['views'])}
    async def async_json(self,force):return json_fragment(json_bytes(await self.async_load(force)))
