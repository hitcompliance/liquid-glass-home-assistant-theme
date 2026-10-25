from homeassistant.components.light import LightEntity, LightEntityFeature, ColorMode
from .demo import DemoEntity, setup_platform

class DemoLight(DemoEntity, LightEntity):
    _attr_supported_color_modes={ColorMode.HS,ColorMode.COLOR_TEMP}
    _attr_supported_features=LightEntityFeature.EFFECT
    _attr_min_color_temp_kelvin=2000
    _attr_max_color_temp_kelvin=6500
    _attr_effect_list=['Solid','Aurora','Pulse']
    is_on=property(lambda s:s.data['on'])
    brightness=property(lambda s:s.data['brightness'])
    hs_color=property(lambda s:s.data['hs_color'])
    color_temp_kelvin=property(lambda s:s.data['color_temp_kelvin'])
    color_mode=property(lambda s:ColorMode(s.data['color_mode']))
    effect=property(lambda s:s.data['effect'])
    @property
    def extra_state_attributes(self):
        keys={'gruppe':['links','rechts'],'schuhschrank':['schuhschrank_links','schuhschrank_rechts']}.get(self.spec['key'],[])
        return {**super().extra_state_attributes,**({'entity_id':['light.liquid_glass_demo_'+k for k in keys]} if keys else {})}
    async def async_turn_on(self,**kwargs):
        changes={k:v for k,v in kwargs.items() if k in ('brightness','hs_color','color_temp_kelvin','effect')}
        if 'hs_color' in changes: changes['color_mode']='hs'
        if 'color_temp_kelvin' in changes: changes['color_mode']='color_temp'
        self.change(on=True,**changes)
        for eid in self.extra_state_attributes.get('entity_id',[]):
            if member:=self.coordinator.entities.get(eid): member.change(on=True,**changes)
    async def async_turn_off(self,**kwargs):
        self.change(on=False)
        for eid in self.extra_state_attributes.get('entity_id',[]):
            if member:=self.coordinator.entities.get(eid): member.change(on=False)

async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'light',DemoLight)
