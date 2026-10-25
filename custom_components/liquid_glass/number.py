from homeassistant.components.number import NumberEntity,NumberMode
from .demo import DemoEntity,setup_platform
class DemoNumber(DemoEntity,NumberEntity):
    _attr_native_min_value=0
    _attr_native_max_value=60
    _attr_native_step=.1
    _attr_native_unit_of_measurement='min'
    _attr_mode=NumberMode.BOX
    native_value=property(lambda s:s.data['number'])
    async def async_set_native_value(self,value): self.change(number=value)
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'number',DemoNumber)
