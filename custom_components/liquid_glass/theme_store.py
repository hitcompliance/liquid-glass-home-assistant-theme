"""Integration-owned, backed-up theme settings. No Config Editor dependency."""
from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path
import re
from .installer import File, InstallError, apply_files

THEME='DASH6 Satin Glass'
STORE='liquid-glass/theme-defaults.json'

def validate_values(values):
    if not isinstance(values,dict) or len(json.dumps(values))>150000:
        raise InstallError('Invalid theme settings')
    for key,value in values.items():
        if key=='_controls':
            if not isinstance(value,dict) or any(not isinstance(v,(str,int,float,bool,type(None))) for v in value.values()):
                raise InstallError('Invalid theme controls')
        elif not re.fullmatch(r'(?:dash[56]-|lg-)[a-zA-Z0-9_-]+',key) or not isinstance(value,str):
            raise InstallError('Invalid theme variable: '+str(key))
    return deepcopy(values)

def read_stored(config_dir):
    path=Path(config_dir)/STORE
    if not path.exists(): return None
    if path.is_symlink(): raise InstallError('Theme settings path is a symlink')
    data=json.loads(path.read_text())
    validate_values(data['themes'][THEME]['values'])
    return data

def resolved_themes(themes,shared):
    themes=deepcopy(themes)
    if shared:
        values=validate_values(shared['themes'][THEME]['values'])
        themes[THEME].update({k:v for k,v in values.items() if k!='_controls'})
    return themes

def default_files(themes,shared):
    text=(json.dumps(shared,ensure_ascii=False,indent=2)+'\n').encode()
    native=(json.dumps({THEME:themes[THEME]},ensure_ascii=False,indent=2)+'\n').encode()
    return [File(STORE,text,'shared theme settings'),File('www/liquid-glass/theme-defaults.json',text,'shared theme settings'),
            File('themes/liquid-glass/liquid-glass.yaml',native,'shared native theme')]

def preserve_user_defaults(config_dir,files,themes):
    shared=read_stored(config_dir)
    if not shared:return files
    replacements=default_files(resolved_themes(themes,shared),shared)
    paths={f.path for f in replacements}
    return [f for f in files if f.path not in paths]+replacements

def save_defaults(config_dir,themes,values):
    values=validate_values(values)
    shared={'version':1,'themes':{THEME:{'revision':datetime.now(timezone.utc).isoformat(),'values':values}}}
    resolved=resolved_themes(themes,shared)
    report=apply_files(Path(config_dir),default_files(resolved,shared))
    return {'shared':shared,'theme':resolved[THEME],'backup':report.get('backup'),'changed':report['changed']}

def register_websocket(hass):
    from homeassistant.components import frontend,websocket_api
    from homeassistant.const import EVENT_THEMES_UPDATED
    import voluptuous as vol
    if hass.data.get('liquid_glass_theme_ws'):return
    hass.data['liquid_glass_theme_ws']=True

    @websocket_api.websocket_command({vol.Required('type'):'liquid_glass/theme_defaults',vol.Optional('values'):dict})
    @websocket_api.async_response
    async def handle(hass,connection,msg):
        states=list(hass.data.get('liquid_glass',{}).values())
        if not states:
            connection.send_error(msg['id'],'not_loaded','Set up the Liquid Glass integration first')
            return
        try:
            if 'values' not in msg:
                shared=await hass.async_add_executor_job(read_stored,hass.config.config_dir)
                if shared is None:
                    path=Path(__file__).parent/'bundle/dist/theme-defaults.json'
                    shared=await hass.async_add_executor_job(lambda:json.loads(path.read_text()))
                connection.send_result(msg['id'],{'shared':shared})
                return
            if not connection.user.is_admin:
                connection.send_error(msg['id'],'unauthorized','Administrator permission required')
                return
            report=await hass.async_add_executor_job(save_defaults,hass.config.config_dir,states[0]['themes'],msg['values'])
            for state in states:state['themes'][THEME]=report['theme']
            hass.data[frontend.DATA_THEMES][THEME]=report['theme']
            hass.bus.async_fire(EVENT_THEMES_UPDATED)
            connection.send_result(msg['id'],report)
        except Exception as error:
            connection.send_error(msg['id'],'save_failed',str(error))
    websocket_api.async_register_command(hass,handle)
