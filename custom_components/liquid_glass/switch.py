from homeassistant.components.switch import SwitchEntity
from .demo import DemoEntity, setup_platform
class DemoSwitch(DemoEntity,SwitchEntity):
    is_on=property(lambda s:s.data['on'])
    async def async_turn_on(self,**kwargs): self.change(on=True)
    async def async_turn_off(self,**kwargs): self.change(on=False)
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'switch',DemoSwitch)
