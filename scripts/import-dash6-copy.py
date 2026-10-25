#!/usr/bin/env python3
"""Explicit maintainer import. Private exports are inputs, never release assets."""
import argparse,json,re,hashlib
from pathlib import Path
from copy import deepcopy
ROOT=Path(__file__).resolve().parents[1]
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--source',type=Path,required=True);p.add_argument('--states',type=Path,required=True);p.add_argument('--config',type=Path,required=True)
a=p.parse_args(); source=json.loads(a.source.read_text()); states={s['entity_id']:s for s in json.loads(a.states.read_text())}
er=json.loads((a.config/'.storage/core.entity_registry').read_text())['data']['entities']; er={e['entity_id']:e for e in er}
dr=json.loads((a.config/'.storage/core.device_registry').read_text())['data']['devices']; dr={e['id']:e for e in dr}
ar=json.loads((a.config/'.storage/core.area_registry').read_text())['data']['areas']; ar={e['id']:e['name'] for e in ar}
profile_dir=a.config/'www/dash6-satin/profiles'; index=json.loads((profile_dir/'index.json').read_text()); profiles={}
for f in set(index.values()):profiles.update(json.loads((profile_dir/f).read_text()))
def materialize(n):
 if isinstance(n,dict):
  if n.get('type')=='custom:dash6-profile-card':
   definition={**deepcopy(profiles[n['profile']]),**n.get('overrides',{})}
   n={k:v for k,v in n.items() if k not in ('overrides','profile')};n.update(profile='demo-inline',definition=definition)
  return {k:materialize(v) for k,v in n.items()}
 if isinstance(n,list):return [materialize(v) for v in n]
 return n
source['views']=[v for v in source['views'] if v.get('path') not in ('florin','florin-inhalt')]
# Resolve uploaded room backdrops before anonymizing private image identifiers.
backgrounds=json.loads((ROOT/'support/demo-view-backgrounds.json').read_text())
for view in source['views']:
 path=view.get('path');background=view.get('background',{});image=background.get('image')
 if path in backgrounds:
  if isinstance(image,dict) and image.get('media_content_id','').startswith('media-source://image_upload/'):
   upload=image['media_content_id'].rsplit('/',1)[-1]
   destination=ROOT/'assets/backgrounds'/Path(backgrounds[path]['image']).name
   destination.write_bytes((a.config/'image'/upload/'original').read_bytes())
  view['background']=deepcopy(backgrounds[path])
source=materialize(source)
source['__demo_room_configs']={'buro':json.loads((a.config/'www/dash6-satin/room-loader-configs.json').read_text())['buro']}
# Drop links and their user conditions with the removed room, at any nesting level.
def prune(n):
 if isinstance(n,dict):
  if n.get('navigation_path','').startswith('/dash-6/florin') or (isinstance(n.get('tap_action'),dict) and n['tap_action'].get('navigation_path','').startswith('/dash-6/florin')):return None
  if isinstance(n.get('target'),dict) and n['target'].get('device_id'):
   ids=n['target']['device_id'];ids=[ids] if isinstance(ids,str) else ids
   domain=str(n.get('service',n.get('perform_action',''))).split('.')[0]
   targets=[eid for eid,e in er.items() if e.get('device_id') in ids and (not domain or eid.startswith(domain+'.')) and eid.split('.')[0] in ('light','switch','climate','fan','cover','media_player','remote','vacuum','lock')]
   n['target']={'entity_id':targets}
  out={k:prune(v) for k,v in n.items() if k not in ('users','user_id','device_id')}
  if n.get('condition')=='user':return None
  if n.get('type')=='conditional' and (not out.get('conditions') or not out.get('card')):return out.get('card')
  if n.get('type') in ('custom:dash6-direct-card','custom:dash6-render-card') and not out.get('card',out.get('definition')):return None
  return out
 if isinstance(n,list):return [v for x in n if (v:=prune(x)) is not None]
 return n
source=prune(source)
# Remove stale source registry; runtime cards rebuild it against the demo namespace.
source.pop('dash6_registry',None)
text=json.dumps(source,ensure_ascii=False)
domains='sensor|binary_sensor|light|switch|climate|fan|cover|media_player|remote|button|automation|vacuum|select|number|lock|event|camera|input_number|input_boolean|input_select|scene|weather|update|sun'
pattern=re.compile(r'\b('+domains+r')\.[a-z0-9_]+\b(?![A-Za-z0-9_])')
services={'turn_on','turn_off','toggle','set_hvac_mode','set_temperature','set_value','press','select_option','open','lock','unlock','start','stop','pause','return_to_base','send_command','volume_set','media_play','media_pause','media_play_pause','select_source','media_play_pause'}
ids=sorted({m[0] for m in pattern.finditer(text) if m[0].split('.')[1] not in services and (not m[0].startswith('event.') or m[0] in er)})
# Include entities discovered by the original dynamic room/domain templates too.
room_names={'Wohnzimmer','Küche','Schlafzimmer','Flur','Badezimmer','Büro','Waschkeller'}
supported=set(domains.split('|'))
for eid,row in er.items():
 room=ar.get(row.get('area_id') or dr.get(row.get('device_id'),{}).get('area_id'))
 if (room in room_names or (room is None and eid.startswith('scene.'))) and eid.split('.')[0] in supported-{'automation','input_boolean','input_number','input_select'} and not row.get('hidden_by') and not row.get('disabled_by') and row.get('platform')!='liquid_glass':ids.append(eid)
# Group members also receive dummy identities; no real ID may leak through attributes.
for eid in list(ids):
 members=states.get(eid,{}).get('attributes',{}).get('entity_id',[])
 if isinstance(members,list):ids.extend(x for x in members if isinstance(x,str) and pattern.fullmatch(x))
ids=sorted(set(ids))
mapping={};specs=[];counts={};device_map={}
rooms={'wohnzimmer':'Wohnzimmer','kuche':'Küche','schlafzimmer':'Schlafzimmer','flur':'Flur','badezimmer':'Badezimmer','buro':'Büro','waschkeller':'Waschkeller'}
area_map={name:'LIQUID GLASS DEMO · '+name for name in rooms.values()}
for eid in ids:
 domain,old=eid.split('.',1);domain={'input_boolean':'switch','automation':'switch','input_number':'number','input_select':'select','sun':'sensor'}.get(domain,domain)
 counts[domain]=counts.get(domain,0)+1;key='copy_'+domain+'_'+str(counts[domain]).zfill(3);mapped=f'{domain}.liquid_glass_demo_{key}';mapping[eid]=mapped
 reg=er.get(eid,{});dev=dr.get(reg.get('device_id'),{});room=ar.get(reg.get('area_id') or dev.get('area_id'))
 global_scene=domain=='scene' and room is None
 removed_room=bool(room and 'florin' in room.lower())
 if global_scene:room='Zuhause'
 elif removed_room:room='Nebenraum'
 elif room not in area_map:room=next((v for k,v in rooms.items() if k in old),'Wohnzimmer')
 device_key=reg.get('device_id') or eid
 if device_key not in device_map:device_map[device_key]='copy_device_'+str(len(device_map)+1).zfill(3)
 attrs=states.get(eid,{}).get('attributes',{}); safe={k:attrs[k] for k in ('device_class','unit_of_measurement','state_class','options','entity_id','min','max','step') if k in attrs}
 name=attrs.get('friendly_name',old.replace('_',' ').capitalize())
 name=re.sub(r'(?i)johns?|bj[oö]rns?|florin|fabi|[a-f0-9]{10,}|\d{8,}','Demo',name)
 spec={'entity_id':mapped,'domain':domain,'key':key,'room':room,'area':None if global_scene else area_map.get(room,'LIQUID GLASS DEMO · '+room),'device':device_map[device_key],'name':'Demo · '+name,'attributes':safe,'hidden':bool(removed_room or reg.get('hidden_by') or reg.get('disabled_by')),'no_dashboard':any(x in ('no-dboard','no_dboard') for x in reg.get('labels',[])+dev.get('labels',[]))}
 if domain=='sensor':
  dc=attrs.get('device_class');unit=attrs.get('unit_of_measurement') or {'energy':'kWh','power':'W','temperature':'°C','humidity':'%','battery':'%'}.get(dc);numeric=unit is not None or dc in ('power','energy','temperature','battery','humidity')
  spec['initial']={'value': {'temperature':22.1,'humidity':45,'battery':86,'energy':0,'power':24,'illuminance':18000}.get(dc,20 if numeric else 'Bereit'), 'unit':unit,'device_class':dc if dc!='timestamp' else None,'state_class':attrs.get('state_class') if numeric else None}
 if domain=='scene':spec['scene_targets']={}
 specs.append(spec)
def replace(s):
 if s=='dash-6':return 'liquid-glass-demo'
 s=pattern.sub(lambda m:mapping.get(m[0],m[0]),s)
 s=s.replace('/dash-6/','/liquid-glass-demo/').replace('"dash-6"','"liquid-glass-demo"')
 s=s.replace('/local/dash6/backgrounds/','/local/liquid-glass/assets/backgrounds/')
 # Stable demo names also work in server-side area helpers and dynamic room maps.
 for slug,name in rooms.items():
  for old in (name,slug):
   s=re.sub(r'([\'\"])'+re.escape(old)+r'([\'\"])',lambda m:m[1]+area_map[name]+m[2],s)
 s=re.sub(r'(?i)florin(?: & fabi)?','Nebenraum',s)
 s=re.sub(r'(?i)johns?|bj[oö]rns?','Demo',s)
 s=re.sub(r'(?<![a-z0-9])[a-f0-9]{32}(?![a-z0-9])','public-demo',s)
 if '{%' in s or '{{' in s:
  s=re.sub(r'\bstates\.([a-z_]+)\b',lambda m:"(states."+m[1]+" | selectattr('entity_id', 'match', '^[^.]+\\.liquid_glass_demo_') | list)",s)
  s=re.sub(r'\bstates\s*\|',"states | selectattr('entity_id', 'match', '^[^.]+\\\\.liquid_glass_demo_') |",s)
 s=s.replace('no-dboard','LIQUID GLASS DEMO · no-dboard')
 s=s.replace('automation.turn_on','switch.turn_on').replace('automation.turn_off','switch.turn_off').replace('input_boolean.','switch.').replace('input_number.','number.').replace('input_select.','select.')
 return s
def transform(n):
 if isinstance(n,str):return replace(n)
 if isinstance(n,list):return [transform(v) for v in n]
 if isinstance(n,dict):return {replace(k): (area_map.get(v,area_map.get(rooms.get(v,''),v)) if k in ('area','area_id') and isinstance(v,str) else transform(v)) for k,v in n.items()}
 return n
result=transform(source);result['title']='LIQUID-GLASS-DEMO'
room_configs=result.pop('__demo_room_configs')
(ROOT/'support/demo-room-configs.json').write_text(json.dumps(room_configs,ensure_ascii=False,indent=2)+'\n')
def room_sources(n):
 if isinstance(n,dict):
  if n.get('type')=='custom:dash6-room-slot-card':n['config_source']='/local/liquid-glass/demo-room-configs.json'
  for v in n.values():room_sources(v)
 elif isinstance(n,list):
  for v in n:room_sources(v)
room_sources(result)
for i,v in enumerate(result['views']):
 v['theme']='DASH6 Satin Glass';v.setdefault('path','buro-zusatz')
 # The scope changes only the HA context; the original card and its options remain inside.
 for container in [v,*v.get('sections',[])]:
  if 'cards' in container:container['cards']=[{**c,'liquid_glass_demo_mode':'browser'} if container is v and v.get('type')=='panel' and c.get('type')=='custom:dash6-ultra-card' else {'type':'custom:dash6-demo-scope','card':c,**({'grid_options':c['grid_options']} if 'grid_options' in c else {})} for c in container['cards']]
for spec in specs:spec['attributes']=transform(spec['attributes'])
by_id={spec['entity_id']:spec for spec in specs}
def link_controls(n):
 if isinstance(n,dict):
  if n.get('type')=='custom:dash6-door-card' and n.get('entity') in by_id:
   by_id[n['entity']]['contact_entity']=n.get('contact_entity')
   if n.get('kind')=='entrance':by_id[n['entity']]['demo_action']='open_door'
  for remote,player in [('apple_remote','apple_entity'),('tv_remote','tv_entity'),('homepod_remote_entity','entity')]:
   if n.get(remote) in by_id and n.get(player) in by_id:by_id[n[remote]]['linked_player']=n[player]
  for v in n.values():link_controls(v)
 elif isinstance(n,list):
  for v in n:link_controls(v)
link_controls(result)

# Confirmed, entirely virtual scene targets for every copied scene.
lights=[s for s in specs if s['domain']=='light']
for spec in specs:
 if spec['domain']=='scene':
  candidates=[s for s in lights if not s.get('hidden') and (spec['area'] is None or s['room']==spec['room'])]
  hue=int(hashlib.sha256(spec['entity_id'].encode()).hexdigest()[:4],16)%360
  white=any(word in spec['name'].lower() for word in ('weiss','weiß','white'))
  off=any(word in spec['name'].lower() for word in ('alles aus','all off'))
  spec['scene_targets']={s['entity_id']:{'state':'off' if off else 'on','brightness':220,'color_mode':'hs','hs_color':[0,0] if white else [(hue+index*45)%360,70]} for index,s in enumerate(candidates)}
# Room backgrounds are assets, not private runtime prerequisites.
for path in (a.config/'www/dash6/backgrounds').glob('*.webp'):
 if path.stem in rooms:
  dest=ROOT/'assets/backgrounds'/path.name;dest.parent.mkdir(exist_ok=True);dest.write_bytes(path.read_bytes())
(ROOT/'examples/dash6-copy.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(ROOT/'support/dash6-copy-entities.json').write_text(json.dumps(specs,ensure_ascii=False,indent=2)+'\n')
types=set()
def collect(n):
 if isinstance(n,dict):
  if str(n.get('type','')).startswith('custom:'):types.add(n['type'])
  for v in n.values():collect(v)
 elif isinstance(n,list):
  for v in n:collect(v)
collect(result)
(ROOT/'support/dash6-copy-inventory.json').write_text(json.dumps({'views':len(result['views']),'entities':len(specs),'card_types':sorted(types),'source_revision_sha256':hashlib.sha256(a.source.read_bytes()).hexdigest()},indent=2)+'\n')
print('Sanitized copy:',len(result['views']),'views,',len(specs),'entities,',len(types),'custom card types')
