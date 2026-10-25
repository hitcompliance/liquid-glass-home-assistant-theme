"""Provision real native storage dashboards without a client/WebSocket write."""
from copy import deepcopy
import hashlib
import json
from homeassistant.components import websocket_api,frontend
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.dashboard import DashboardsCollection, ConfigNotFound

META='liquid_glass_dashboard'

def fingerprint(config):
    content={key:value for key,value in config.items() if key!=META}
    return hashlib.sha256(json.dumps(content,sort_keys=True,separators=(',',':')).encode()).hexdigest()

def native_collection(hass):
    # HA keeps the native collection on the bound list handler rather than on
    # LovelaceData. Obtain that existing object; never invoke a socket handler
    # or create another Store for the same collection.
    handler=hass.data.get(websocket_api.DOMAIN,{}).get('lovelace/dashboards/list',(None,))[0]
    collection=getattr(getattr(handler,'__self__',None),'storage_collection',None)
    if not isinstance(collection,DashboardsCollection):
        raise RuntimeError('Native Lovelace dashboard collection is not ready')
    return collection

def generated(seed,owner):
    config=deepcopy(seed)
    config[META]={'owner':owner,'seed_hash':fingerprint(config)}
    return config

async def refresh_generated(dashboard,seed,owner):
    """Update untouched generated content; preserve every manual GUI edit."""
    current=await dashboard.async_load(False)
    meta=current.get(META,{})
    if meta.get('owner')!=owner or meta.get('seed_hash')!=fingerprint(current):return False
    updated=generated(seed,owner)
    if updated==current:return False
    await dashboard.async_save(updated)
    return True

async def owned(dashboard,owner):
    if getattr(dashboard,'mode',None)!='storage':return False
    try:config=await dashboard.async_load(False)
    except ConfigNotFound:return False
    return config.get(META,{}).get('owner')==owner

async def provision(hass,path,title,icon,seed,owner):
    dashboards=hass.data[LOVELACE_DATA].dashboards
    if dashboard:=dashboards.get(path):
        if not await owned(dashboard,owner):return None
        await refresh_generated(dashboard,seed,owner)
        return dashboard
    if frontend.async_panel_exists(hass,path):return None
    collection=native_collection(hass)
    existing_ids={item['id'] for item in collection.async_items()}
    try:
        item=await collection.async_create_item({
            'url_path':path,'title':title,'icon':icon,'show_in_sidebar':True,'require_admin':False})
        dashboard=dashboards[item['url_path']]
        if not frontend.async_panel_exists(hass,path):raise RuntimeError('Native dashboard panel was not registered')
        await dashboard.async_save(generated(seed,owner))
        return dashboard
    except Exception:
        # Only this newly created empty dashboard is rolled back on failure.
        for item in list(collection.async_items()):
            if item['id'] not in existing_ids and item['url_path']==path:await collection.async_delete_item(item['id'])
        raise
