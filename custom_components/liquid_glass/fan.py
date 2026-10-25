from homeassistant.components.fan import FanEntity,FanEntityFeature
from .demo import DemoEntity,setup_platform
class DemoFan(DemoEntity,FanEntity):
    _attr_supported_features=FanEntityFeature.SET_SPEED|FanEntityFeature.TURN_ON|FanEntityFeature.TURN_OFF
    is_on=property(lambda s:s.data['on'])
    percentage=property(lambda s:s.data['percentage'] if s.data['on'] else 0)
    async def async_turn_on(self,percentage=None,preset_mode=None,**kwargs): self.change(on=True,percentage=percentage or 50)
    async def async_turn_off(self,**kwargs): self.change(on=False)
    async def async_set_percentage(self,percentage): self.change(on=percentage>0,percentage=percentage)
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'fan',DemoFan)
