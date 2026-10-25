from homeassistant.components.number import NumberEntity,NumberMode
from .demo import DemoEntity,setup_platform
class DemoNumber(DemoEntity,NumberEntity):
    _attr_native_min_value=0
    _attr_native_max_value=60
    _attr_native_step=.1
    _attr_native_unit_of_measurement='min'
    _attr_mode=NumberMode.BOX
    native_min_value=property(lambda s:s.spec.get('attributes',{}).get('min',0))
    native_max_value=property(lambda s:s.spec.get('attributes',{}).get('max',60))
    native_step=property(lambda s:s.spec.get('attributes',{}).get('step',.1))
    native_unit_of_measurement=property(lambda s:s.spec.get('attributes',{}).get('unit_of_measurement','min'))
    native_value=property(lambda s:max(s.native_min_value,min(s.native_max_value,s.data['number'])))
    async def async_set_native_value(self,value): self.change(number=value)
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'number',DemoNumber)
