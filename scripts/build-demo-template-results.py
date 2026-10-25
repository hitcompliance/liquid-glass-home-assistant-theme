#!/usr/bin/env python3
"""Render copied Jinja templates against isolated HA dummy registries for Pages."""
import asyncio,importlib.util,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
async def main():
    loader=importlib.util.spec_from_file_location('demo_test',ROOT/'scripts/test-demo.py');mod=importlib.util.module_from_spec(loader);loader.loader.exec_module(mod)
    test=mod.DemoTests();await test.asyncSetUp()
    from homeassistant.helpers import area_registry as ar,entity_registry as er,device_registry as dr
    from homeassistant.helpers.template import Template
    from homeassistant.helpers import label_registry as lr
    areas=ar.async_get(test.hass);entities=er.async_get(test.hass);devices=dr.async_get(test.hass)
    for spec in test.coordinator.specs:
        area=areas.async_get_or_create(spec.get('area','DASH6 Demo · '+spec['room']))
        row=entities.async_get(spec['entity_id'])
        if row:entities.async_update_entity(row.entity_id,area_id=area.id)
        dev=devices.async_get(row.device_id) if row and row.device_id else None
        if dev:devices.async_update_device(dev.id,area_id=area.id)
    strings=set()
    def walk(n):
        if isinstance(n,str) and ('{%' in n or '{{' in n):strings.add(n)
        elif isinstance(n,dict):
            for v in n.values():walk(v)
        elif isinstance(n,list):
            for v in n:walk(v)
    for name in ('examples/dash6-copy.json','support/demo-room-configs.json'):walk(json.loads((ROOT/name).read_text()))
    results={};sources={};fail=[]
    for s in sorted(strings):
        try:key=hashlib.sha256(s.encode()).hexdigest();results[key]=Template(s,test.hass).async_render(parse_result=False);sources[key]=s
        except Exception as e:fail.append(str(e)[:250])
    await test.asyncTearDown()
    (ROOT/'support/demo-template-sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'support/demo-template-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    print('Rendered',len(results),'templates; failures',len(fail));print('\n'.join(fail[:8]))
    if fail:raise SystemExit(1)
asyncio.run(main())
