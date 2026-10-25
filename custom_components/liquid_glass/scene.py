from homeassistant.components.scene import Scene
from .demo import DemoEntity,setup_platform
class DemoScene(DemoEntity,Scene):
    @property
    def extra_state_attributes(self):
        targets={}
        if 'scene_targets' in self.spec:return {**super().extra_state_attributes,'scene_targets':self.spec['scene_targets']}
        for key in ('schuhschrank','schuhschrank_links','schuhschrank_rechts'):
            targets['light.liquid_glass_demo_'+key]={'state':'on','brightness':255,'color_mode':'hs','hs_color':[215,70] if self.spec['key']=='bunt' else [0,0]}
        return {**super().extra_state_attributes,'scene_targets':targets}
    async def async_activate(self,**kwargs):
        for eid,target in self.extra_state_attributes['scene_targets'].items():
            if light:=self.coordinator.entities.get(eid):
                light.change(on=True,**{k:v for k,v in target.items() if k!='state'})
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'scene',DemoScene)
