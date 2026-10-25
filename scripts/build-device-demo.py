#!/usr/bin/env python3
"""Build the public, backend-driven demo. Never reads private HA exports."""
import json
from copy import deepcopy
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'liquid_glass_demo_'

def entity(domain, key):
    return f'{domain}.{PREFIX}{key}'

def card(card_type, **config):
    return {'type': 'custom:dash6-' + card_type, **config}

def view(title, path, icon, cards):
    return {'title': title, 'path': path, 'icon': 'mdi:' + icon,
            'type': 'sections', 'max_columns': 2, 'theme': 'DASH6 Satin Glass',
            'sections': [{'type': 'grid', 'cards': cards[::2]}, {'type': 'grid', 'cards': cards[1::2]}]}

def domain_block(path, domain, heading, cards, area='Büro', columns=1, block_id=None):
    """The production pattern: native heading tab + one light shell + dark cards."""
    return card('domain-card', dashboard='liquid-glass-gallery', view=path,
                block_id=block_id or domain, area='DASH6 Demo · '+area,
                domain=domain, heading=heading, auto_entities=False,
                combine=True, columns=columns, mobile_columns=1,
                mobile_breakpoint=700, cards=cards)

def group_room_domains(v):
    sections=v['sections']; ordered=[sections[i%2]['cards'][i//2] for i in range(sum(len(s['cards']) for s in sections))]
    groups={}; output=[]
    kinds={'lightgroup-card-v2':('light','Licht'),'govee-light-card-v2':('light','Licht'),
           'shoe-cabinet-card':('light','Licht'),'appletv-card':('media_player','Medien'),
           'homepod-card':('media_player','Medien'),'ikea-card':('switch','Schalter & Geräte'),
           'plant-card':('sensor','Pflanzen'),'thermostat-card':('climate','Klima'),
           'cover-card':('cover','Verdunklungen'),'door-card':('lock','Türen'),
           'fan-card':('fan','Lüftung')}
    for c in ordered:
        kind=c['type'].removeprefix('custom:dash6-')
        if kind=='domain-card':
            c=domain_block(v['path'],'sensor','Sensoren',[
                {'type':'tile','entity':entity('sensor','temperatur')},
                {'type':'tile','entity':entity('sensor','batterie')}],v['title'])
            output.append(c); continue
        group=kinds.get(kind)
        if group:
            domain,heading=group
            if heading not in groups:
                groups[heading]=domain_block(v['path'],domain,heading,[],v['title'],block_id=domain+'-'+str(len(groups)))
                output.append(groups[heading])
            groups[heading]['cards'].append(c)
        else: output.append(c)
    v['sections']=[{'type':'grid','cards':output[::2]},{'type':'grid','cards':output[1::2]}]

def demo_door(kind):
    e=entity
    common={'kind':kind,'contact_entity':e('binary_sensor','turkontakt')}
    if kind=='apartment':
        return card('door-card',**common,entity=e('lock','tur'),name='Wohnungstür',
                    contact_battery_entity=e('sensor','turkontakt_batterie'),
                    battery_warning_entity=e('binary_sensor','schloss_batteriewarnung'))
    return card('door-card',**common,entity=e('button','turoffner'),name='Haustür',
                battery_entity=e('sensor','schloss_batterie'),
                activity_entity=e('sensor','klingel_letzte_aktivitat'),
                ring_entity=e('binary_sensor','klingel'),ring_entities=[e('binary_sensor','klingel')],
                cancel_entities=[e('button','turoffner'),e('lock','tur')])

def door_controls():
    return {'type':'entities','title':'Türzustände ausprobieren · nur Dummy-Geräte','entities':[
        entity('button','klingeln'),entity('switch','turkontakt_simulation'),
        entity('switch','schloss_batteriewarnung_simulation'),entity('lock','tur'),
        entity('button','turoffner'),entity('button','zurucksetzen')]}

def build():
    # The authored public example supplies the complete card/layout library.
    source = subprocess.run(['ruby', '-ryaml', '-rjson', '-e',
        'puts YAML.load_file(ARGV[0]).to_json', str(ROOT / 'examples/dashboard.yaml')],
        capture_output=True, text=True, check=True).stdout
    source = re.sub(r'\b(input_select|input_number|input_boolean)\.demo_',
                    lambda m: {'input_select':'select','input_number':'number','input_boolean':'switch'}[m[1]] + '.demo_', source)
    source = re.sub(r'\bevent\.demo_', 'binary_sensor.demo_', source)
    source = source.replace('demo_', PREFIX)
    dashboard = json.loads(source)
    library = deepcopy(dashboard)
    # Legacy SVG has its own obsolete theme and is outside the Satin release.
    dashboard['views'] = [v for v in dashboard['views'] if v.get('path') not in ('svg', 'svg-beispiel', 'kompatibilitat')]
    def clean(value):
        if isinstance(value, dict):
            if value.get('type') == 'markdown':
                value['content'] = value.get('content', '').replace(
                    'Dieses Dashboard ist ein Konfigurationsbeispiel.', 'Alle Geräte in diesem Dashboard sind virtuelle Demo-Entities.').replace(
                    'Ersetze alle ' + PREFIX + '…-Entitäten durch eigene vorhandene Entitäten.',
                    'Änderungen betreffen ausschließlich die mitgelieferten Dummy-Geräte.')
            if value.get('type') == 'custom:dash6-local-camera-card':
                # A demonstration must never request access to a real camera.
                value.clear()
                value.update(type='picture-entity', entity=entity('camera','kamera'), camera_view='auto', name='Virtuelle Kamera')
            for key, item in list(value.items()):
                if key in ('height','min_height') and isinstance(item, (int,float)) and item == 80:
                    value[key] = 100
                else:
                    clean(item)
        elif isinstance(value, list):
            for item in value:
                clean(item)
    clean(dashboard)
    e = entity
    rooms = [
        view('Zuhause', 'home', 'home-variant', [
            {'type':'markdown','content':'# DASH6 Satin Glass · Demo\nDie Geräte werden lokal im Browser simuliert. Es werden keine Home-Assistant-Entities oder Recorder-Daten angelegt. Karten, Regler, Szenen, Detailansichten und GUI-Editoren sind bedienbar; Werte und Verläufe sind ausdrücklich Beispieldaten. Neu laden setzt die Gerätezustände zurück. Die Räume zeigen die Kartenfamilien; weitere Views erklären Layouts und Editoren.'},
            card('theme-editor-card', title='Glas & Hintergrund', expanded=False),
            {'type':'entities','title':'Demo steuern','entities':[e('button','zurucksetzen'),e('switch','anwesenheit'),e('button','klingeln'),e('button','update_verfugbar')]},
            card('home-overview-card', kind='security', title='Sicherheit', navigation_path='/liquid-glass-demo/flur'),
            {'type':'weather-forecast','entity':e('weather','wetter'),'show_forecast':True,'forecast_type':'daily'},
        ]),
        view('Wohnzimmer','wohnzimmer','sofa',[
            card('area-header', title='Wohnzimmer · Demo', area='DASH6 Demo · Wohnzimmer', show_clock=True),
            {'type':'custom:mushroom-chips-card','chips':[{'type':'entity','entity':e('sensor','batterie'),'icon':'mdi:battery'},{'type':'entity','entity':e('binary_sensor','anwesenheit'),'icon':'mdi:motion-sensor'},{'type':'entity','entity':e('update','firmware'),'icon':'mdi:update'},{'type':'entity','entity':e('sensor','steckdose_leistung'),'icon':'mdi:flash'}]},
            card('lightgroup-card-v2', entity=e('light','gruppe'), name='Ambiente', segments=[{'entity':e('light','links'),'name':'Links'},{'entity':e('light','rechts'),'name':'Rechts'}], power_entity=e('sensor','lampe_leistung'), graph={'show':True,'height':100}),
            card('appletv-card', name='Fernseher & Apple TV', apple_entity=e('media_player','apple_tv'), apple_remote=e('remote','apple_tv'), fire_entity=e('media_player','fire_tv'), tv_entity=e('media_player','fernseher'), tv_remote=e('remote','fernseher'), tv_sources='AppleTV, HDMI 1, HDMI 3'),
            card('homepod-card', entity=e('media_player','homepod'), homepod_remote_entity=e('remote','homepod'), name='Demo Lautsprecher'),
            card('ikea-card', entity=e('switch','steckdose'), power_entity=e('sensor','steckdose_leistung'), child_lock_entity=e('switch','kindersicherung'), led_entity=e('switch','led'), name='Messsteckdose'),
        ]),
        view('Küche','kuche','countertop',[
            card('area-header', title='Küche · Demo', area='DASH6 Demo · Küche'),
            card('plant-card', name='Demo Pflanze', entities={k:e('sensor','pflanze_'+k) for k in ('temperature','moisture','illuminance','conductivity','battery')}, stale_hours=6, substrate='coco_or_soilless'),
            card('ikea-card', entity=e('switch','kuhlschrank'), name='Kühlschrank', power_entity=e('sensor','kuhlschrank_leistung'), door_entity=e('binary_sensor','kuhlschrank_tur'), temperature_entity=e('sensor','kuhlschrank_temperatur')),
            {'type':'entities','title':'Kühlschrank · simulierte Rückmeldungen','entities':[e('switch','kuhlschrank_tur_simulation'),e('sensor','kuhlschrank_temperatur')]},
        ]),
        view('Schlafzimmer','schlafzimmer','bed',[
            card('area-header', title='Schlafzimmer · Demo', area='DASH6 Demo · Schlafzimmer'),
            card('thermostat-card',entity=e('climate','thermostat'),modes=['off','heat','cool','heat_cool']),
            card('thermostat-card',entity=e('climate','dual_thermostat'),modes=['off','heat','cool','heat_cool']),
            card('cover-card',entity=e('cover','rollo'),name='Rollo'),
        ]),
        view('Flur','flur','door',[
            card('area-header', title='Flur · Demo', area='DASH6 Demo · Flur'),
            card('shoe-cabinet-card', entity=e('light','schuhschrank'), name='Schuhschrank', segments=[{'entity':e('light','schuhschrank_links'),'name':'Links'},{'entity':e('light','schuhschrank_rechts'),'name':'Rechts'}], scenes=[{'entity':e('scene','bunt'),'name':'Bunt','icon':'mdi:palette'},{'entity':e('scene','weiss'),'name':'Weiß','icon':'mdi:white-balance-sunny'}], power_entity=e('sensor','schuhschrank_leistung'),graph={'show':True,'height':100}),
            demo_door('apartment'),demo_door('entrance'),door_controls(),
        ]),
        view('Badezimmer','badezimmer','shower',[
            card('area-header', title='Badezimmer · Demo', area='DASH6 Demo · Badezimmer'),
            card('fan-card',entity=e('fan','luftung'),name='Lüftung · Aus / Auto / Ein',force_switch_entity=e('switch','luftung_force'),remaining_time_entity=e('number','luftung_restzeit'),running_switch_entity=e('switch','luftung_ausgang'),running_force_switch_entity=e('switch','luftung_force_ausgang'),presence_entity=e('binary_sensor','anwesenheit'),power_entity=e('sensor','luftung_leistung')),
            {'type':'entities','title':'Präsenz & Nachlauf ausprobieren','entities':[e('switch','anwesenheit'),e('number','luftung_restzeit')]},
        ]),
        view('Büro','buro','desk',[
            card('area-header', title='Büro · Demo', area='DASH6 Demo · Büro'),
            card('govee-light-card-v2',entity=e('light','lampe'),name='Farbe, Temperatur & Effekte',controls={'mode':'combo','buttons':'group'},power_entity=e('sensor','lampe_leistung'),graph={'show':True,'height':100}),
            card('domain-card',title='Dynamische Demo-Sensoren',domain='sensor',area='DASH6 Demo · Büro'),
            card('room-slot-card',room='demo',slot='lights',columns=2),
            {'type':'entities','title':'Batterie, Störung & Update','entities':[e('sensor','batterie'),e('binary_sensor','storung'),e('update','firmware')]},
        ]),
        view('Waschkeller','waschkeller','washing-machine',[
            card('area-header',title='Waschkeller · Demo',area='DASH6 Demo · Waschkeller'),
            card('ikea-card',entity=e('switch','waschmaschine'),name='Waschmaschine',power_entity=e('sensor','waschmaschine_leistung')),
            {'type':'entities','title':'Feuchtigkeit & Wasser','entities':[e('sensor','luftfeuchte'),e('binary_sensor','wasser')]},
        ]),
        view('Energie','energie','lightning-bolt',[
            {'type':'markdown','content':'# Demo-Energie\nWerte und Verläufe sind lokale Browser-Simulationen. Das native Energie-Dashboard und vorhandene Statistiken werden nicht verändert; die Demo legt keine Recorder-Daten an.'},
            {'type':'statistics-graph','title':'Virtueller Verbrauch','chart_type':'line','period':'5minute','stat_types':['mean'],'entities':[e('sensor','steckdose_leistung'),e('sensor','luftung_leistung')]},
            {'type':'entities','entities':[e('sensor','steckdose_energie'),e('sensor','lampe_energie')]},
        ]),
    ]
    dashboard['views'].append(view('Originale & Struktur','originale','puzzle-outline',[
        {'type':'custom:vertical-stack-in-card','cards':[{'type':'heading','heading':'Originaler Kartenstack'},{'type':'tile','entity':e('switch','steckdose')}]},
        {'type':'custom:auto-entities','card':{'type':'entities','title':'Original Auto Entities'},'filter':{'include':[{'entity_id':'sensor.liquid_glass_demo_*'}]}},
        {'type':'custom:layout-card','layout_type':'custom:grid-layout','layout':{'grid-template-columns':'repeat(2,minmax(0,1fr))','grid-gap':'8px'},'cards':[{'type':'tile','entity':e('light','links')},{'type':'tile','entity':e('light','rechts')}]},
        card('direct-card',card={'type':'entities','title':'Native Karte im direkten Adapter','entities':[e('sensor','temperatur'),e('sensor','luftfeuchte')]}),
        {'type':'custom:mod-card','card':{'type':'entities','title':'Card Mod · native Karte','entities':[e('sensor','batterie')]}},
        {'type':'custom:embedded-view-card','mode':'static','view':'eingebettet','ha_card':True},
        {'type':'custom:more-info-card','entity':e('cover','rollo')},
        {'type':'custom:apexcharts-card','header':{'show':True,'title':'Original ApexCharts'},'graph_span':'24h','series':[{'entity':e('sensor','steckdose_leistung')}]},
        {'type':'custom:mushroom-template-card','entity':e('switch','steckdose'),'primary':'Original Mushroom Template','secondary':'{{ states("sensor.liquid_glass_demo_steckdose_leistung") }} W','icon':'mdi:power-socket-eu','tap_action':{'action':'toggle'}},
    ]))
    dashboard['views'].append(view('Heizung & Klima','heizung-klima','thermostat',[
        {'type':'markdown','content':'# Heizung & Klima\nDie dekorative Klima-Hintergrundanimation gehört ebenfalls zum Paket. Sie liest keine Geräte und löst keine Aktionen aus; reduzierte Bewegung wird beachtet.'},
        card('thermostat-card',entity=e('climate','thermostat'),modes=['off','heat','cool','heat_cool']),
        card('thermostat-card',entity=e('climate','dual_thermostat'),modes=['off','heat','cool','heat_cool']),
    ]))
    dashboard['title']='DASH6 Satin Glass Demo'
    dashboard['views']=rooms+dashboard['views']
    # Keep all demo discovery queries inside its own entity namespace.
    def isolate(value):
        if isinstance(value,dict):
            if value.get('type') in ('custom:dash6-govee-light-card-v2','custom:dash6-lightgroup-card-v2'):
                value['discovery']={'enabled':False}
            if value.get('type') in ('custom:dash6-auto-entities','custom:auto-entities'):
                value.setdefault('filter',{}).setdefault('exclude',[]).append({'entity_id': '/^(?![^.]+\\.liquid_glass_demo_).*/'})
            if value.get('type')=='custom:dash6-profile-card':
                value['profile']='sample-button'
            for item in value.values(): isolate(item)
        elif isinstance(value,list):
            for item in value: isolate(item)
    isolate(dashboard)
    favorite_cards=[next(c for section in rooms[i]['sections'] for c in section['cards'] if c.get('type')=='custom:dash6-'+kind) for i,kind in [(1,'lightgroup-card-v2'),(3,'thermostat-card'),(4,'door-card')]]
    sources=[{'id':f'demo-{i}','card':c,'label':c.get('name',c['type']),'source':{'dashboard':'liquid-glass-demo','view':'home','title':'Demo','viewOrder':0},'children':[]} for i,c in enumerate(favorite_cards)]
    dashboard['views'].append(view('Favoriten','favoriten','star-outline',[
        card('favorites-card',title='Favoriten ausprobieren',dashboard='liquid-glass-demo',demo_gui=True,demo_backend=True,sources=sources,selected=[n['id'] for n in sources]),
        {'type':'markdown','content':'Mit dem Zahnrad Karten und Reihenfolge ändern. Die Auswahl wird nur in diesem Browser gespeichert. Gerätebefehle bleiben auf die virtuellen Demo-Entities begrenzt.'}]))
    # One visible entry view demonstrates the important cards and their actual
    # detail dialogs. Additional room/library views remain available below it.
    candidates={}
    def collect(node):
        if isinstance(node,dict):
            if str(node.get('type','')).startswith('custom:'): candidates.setdefault(node['type'],deepcopy(node))
            for child in node.values():collect(child)
        elif isinstance(node,list):
            for child in node:collect(child)
    collect(dashboard);collect(library)
    inventory=[
        ('Schuhschrank · Szenen & Segmente','custom:dash6-shoe-cabinet-card'),
        ('Fernseher / Apple TV · Player & Fernbedienungen','custom:dash6-appletv-card'),
        ('Staubsauger · Reinigung, Dock & Verschleißteile','custom:dash6-vacuum-card'),
        ('Lichtgruppe · Einzellichter im Detail','custom:dash6-lightgroup-card-v2'),
        ('Licht · Farbe, Temperatur & Effekte','custom:dash6-govee-light-card-v2'),
        ('Messsteckdose · Sperre, LED & Verlauf','custom:dash6-ikea-card'),
        ('Lüftung · Aus / Auto / Ein','custom:dash6-fan-card'),
        ('Thermostat · Sollwerte & Presets','custom:dash6-thermostat-card'),
        ('HomePod · Verbindung & Wiedergabe','custom:dash6-homepod-card'),
        ('Pflanzen · Zielbereiche & Historie','custom:dash6-plant-card'),
        ('Rollo · Position & Richtung','custom:dash6-cover-card'),
        ('Wohnungstür · Schloss, Kontakt & Batteriewarnung','custom:dash6-door-card'),
        ('Haustür · Türöffner, Klingeln & Aktivität','custom:dash6-door-card'),
        ('Auswahlgruppe · animierte Linse','custom:dash6-segmented-control-card'),
        ('Eigenständige Vacuum Dock Card','custom:vacuum-dock-card'),
        ('Theme-GUI · aktuelle Paketvorgaben','custom:dash6-theme-editor-card'),
        ('Domain-GUI · dynamische Bereichskarten','custom:dash6-domain-card'),
        ('Raumlader · kombinierte Spalten','custom:dash6-room-slot-card'),
        ('Favoriten · Auswahl, Gruppierung & Reihenfolge','custom:dash6-favorites-card'),
    ]
    samples=[];catalog=[]
    for title,kind in inventory:
        if kind not in candidates:raise ValueError('Demo is missing '+kind)
        config=deepcopy(candidates[kind])
        if kind=='custom:dash6-door-card':
            config=demo_door('entrance' if title.startswith('Haustür') else 'apartment')
        if kind=='custom:dash6-domain-card':
            config=domain_block('demo','light','Licht',[
                card('govee-light-card-v2',entity=e('light','lampe'),name='Leselicht',discovery={'enabled':False}),
                card('govee-light-card-v2',entity=e('light','tischlicht'),name='Tischlicht',discovery={'enabled':False})])
        if 'vacuum' in kind:
            config['areas']=[{'roborock_area_id':16,'name':'Demo Wohnzimmer'},{'roborock_area_id':17,'name':'Demo Küche'}]
            if kind=='custom:dash6-vacuum-card':
                config['reset_buttons']={'Filter':e('button','roboter_filter_zurucksetzen')}
                config['stats']['default'].append({'entity':e('sensor','roboter_burste_restzeit'),'title':'Bürste','unit':'h','scale':1})
                config['reset_buttons']['Bürste']=e('button','roboter_burste_zurucksetzen')
        samples.append(card('showcase-card',title=title,card=config))
        catalog.append({'title':title,'type':kind,'card':config})
    # Put the actual domain composition ahead of individual feature samples.
    domain_sample=next(c for c in samples if c['card']['type']=='custom:dash6-domain-card')
    samples.remove(domain_sample);samples.insert(0,domain_sample)
    doors=[c for c in samples if c['card']['type']=='custom:dash6-door-card']
    samples=[c for c in samples if c not in doors]
    samples[4:4]=doors
    domain_sample['title']='DASH6-Grundmuster · heller Domain-Block, dunkle Entity-Karten'
    intro={'type':'markdown','content':'# Alle Karten, Details & GUI\nDas DASH6-Grundmuster steht zuerst: **nativer Heading-Reiter → eine gemeinsame helle Glashülle → mehrere dunkle Entity-Karten** mit 8px Abstand. Die Raum-Views nutzen diese Domain-Blöcke ebenfalls; **Domain-Blöcke & Aufbau** erklärt die Konfiguration. Schuhschrank-Szenen, TV/Apple TV und Staubsauger stehen direkt hier. Kartenhintergründe und Detailknöpfe öffnen die echten Zusatzansichten. GUI konfigurieren öffnet den echten Karteneditor. Sämtliche Geräte und Aktionen sind simuliert.'}
    # Keep both doors and the controls directly after the three requested devices.
    main_cards=[intro,*samples];main_cards.insert(7,door_controls())
    dashboard['views'].insert(0,view('Alle Karten & Details','demo','view-gallery',main_cards))
    domain_view=view('Domain-Blöcke & Aufbau','domain-bloecke','tab',[
        {'type':'markdown','content':'# So sind DASH6-Domain-Blöcke aufgebaut\n1. Ein nativer Heading-Reiter benennt die Domain (z. B. Licht oder Medien).\n2. Eine gemeinsame helle Glasfläche umschließt alle zugehörigen Entity-Karten.\n3. Jede Entity behält ihre eigene dunkle Gerätekarte samt Bedienung und Detaildialogen.\n4. Kartenabstand 8px; die Hülle erzeugt keine zweite dunkle Fläche.\nKonfiguriert wird custom:dash6-domain-card mit heading, cards, area, domain, block_id und combine: true. heading erzeugt die native Überschrift; title ersetzt sie nicht. Die Domain-GUI verwaltet Überschrift, Raster und enthaltene Karten. In dieser Demo ist auto_entities: false, damit die festen Dummy-Beispiele nachvollziehbar bleiben. Eigene Räume können automatische Entity-Ergänzung nutzen. Helles und dunkles Glas folgen getrennt den Theme-Reglern. Das vollständige kopierbare Beispiel liegt unter /config/liquid-glass/examples/domain-blocks.yaml.'},
        {**deepcopy(domain_sample['card']),'view':'domain-bloecke'},
        domain_block('domain-bloecke','switch','Schalter',[
            card('ikea-card',entity=e('switch','steckdose'),name='Messsteckdose'),
            card('ikea-card',entity=e('switch','waschmaschine'),name='Waschmaschine')]),
        domain_block('domain-bloecke','media_player','Medien',[
            deepcopy(candidates['custom:dash6-appletv-card']),deepcopy(candidates['custom:dash6-homepod-card'])]),
    ])
    dashboard['views'].insert(1,domain_view)
    (ROOT/'examples/domain-blocks.yaml').write_text(json.dumps({'title':'DASH6 Domain-Muster','views':[deepcopy(domain_view)]},ensure_ascii=False,indent=2)+'\n')
    for room in rooms:group_room_domains(room)
    for v in dashboard['views']:
        for section in v.get('sections',[]):
            wrapped=[]
            for c in section.get('cards',[]):
                sample=c
                if c.get('type','').startswith('custom:') and c['type']!='custom:dash6-showcase-card':
                    sample=card('showcase-card',title=c.get('heading',c.get('name',c.get('title',c['type'].replace('custom:dash6-','')))),minimal=c['type']=='custom:dash6-domain-card',card=c)
                wrapped.append({'type':'custom:dash6-demo-scope','card':sample,**({'grid_options':c['grid_options']} if 'grid_options' in c else {})})
            section['cards']=wrapped
    (ROOT/'support/card-catalog.json').write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    text=json.dumps(dashboard,ensure_ascii=False,indent=2).replace('liquid-glass-demo','liquid-glass-gallery')+'\n'
    ids=sorted(set(re.findall(r'\b([a-z_]+\.'+PREFIX+r'[a-z0-9_]+)\b',text)))
    specs=[]
    for eid in ids:
        domain,key=eid.split('.',1);key=key.removeprefix(PREFIX)
        room=('Flur' if any(x in key for x in ('schuhschrank','tur','schloss','klingel','bunt','weiss')) else
              'Küche' if any(x in key for x in ('pflanze','kuhlschrank')) else
              'Badezimmer' if any(x in key for x in ('luftung','anwesenheit')) else
              'Schlafzimmer' if any(x in key for x in ('thermostat','rollo')) else
              'Waschkeller' if any(x in key for x in ('wasch','wasser','luftfeuchte')) else
              'Büro' if key in ('lampe','batterie','storung','firmware','temperatur') else 'Wohnzimmer')
        specs.append({'entity_id':eid,'key':key,'domain':domain,'room':room,'name':'Demo · '+key.replace('_',' ').capitalize()})
    types=set()
    def collect_types(node):
        if isinstance(node,dict):
            if str(node.get('type','')).startswith('custom:'):types.add(node['type'])
            for child in node.values():collect_types(child)
        elif isinstance(node,list):
            for child in node:collect_types(child)
    collect_types(dashboard)
    inventory={'schema_version':1,'theme':'DASH6 Satin Glass','entry_view':'demo','views':len(dashboard['views']),'virtual_entities':len(specs),'card_types':sorted(types)}
    (ROOT/'support/demo-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (ROOT/'examples/gallery-dashboard.yaml').write_text(text,encoding='utf-8') # JSON is valid YAML; no runtime YAML generator needed.
    (ROOT/'custom_components/liquid_glass/demo-entities.json').write_text(json.dumps(specs,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    copy=json.loads((ROOT/'examples/dash6-copy.json').read_text())
    (ROOT/'examples/demo-dashboard.yaml').write_text(json.dumps(copy,ensure_ascii=False,indent=2)+'\n')
    copied=json.loads((ROOT/'support/dash6-copy-entities.json').read_text())
    (ROOT/'custom_components/liquid_glass/demo-entities.json').write_text(json.dumps(specs+copied,ensure_ascii=False,indent=2)+'\n')
    # Standard examples use client-only states. Keep explicit entity variants
    # for installations that deliberately retain the legacy HA test platforms.
    for name in ('demo-dashboard','gallery-dashboard'):
        source=json.loads((ROOT/'examples'/f'{name}.yaml').read_text())
        def entity_mode(node):
            if isinstance(node,dict):
                if node.get('type')=='custom:dash6-demo-scope':node['mode']='entities'
                for value in node.values():entity_mode(value)
            elif isinstance(node,list):
                for value in node:entity_mode(value)
        entity_mode(source)
        (ROOT/'examples'/f'{name}-entities.yaml').write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')
    runtime_data={'specs':specs+copied,'dashboards':{'liquid-glass-demo':copy,'liquid-glass-gallery':json.loads(text)},
                  'template_sources':json.loads((ROOT/'support/demo-template-sources.json').read_text()),
                  'template_results':json.loads((ROOT/'support/demo-template-results.json').read_text()),
                  'shared_defaults':json.loads((ROOT/'support/theme-defaults.json').read_text())}
    room=json.loads((ROOT/'src/dash6/room-loader-configs.json').read_text())['demo']
    runtime_data['template_sources']['gallery-room-loader']=room['template']
    runtime_data['template_results']['gallery-room-loader']=json.dumps({'0':room['slots']['lights']['initial']},ensure_ascii=False)
    (ROOT/'support/demo-runtime-data.json').write_text(json.dumps(runtime_data,ensure_ascii=False,separators=(',',':'))+'\n')
    inventory.update(copy_views=len(copy['views']), copy_virtual_entities=len(copied), gallery_views=len(dashboard['views']), virtual_entities=len(specs)+len(copied), entry_view='home')
    (ROOT/'support/demo-inventory.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2)+'\n')
    print(f'Built backend demo: {len(dashboard["views"])} views, {len(specs)} isolated entities')

if __name__=='__main__': build()
