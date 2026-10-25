from homeassistant.components.sensor import SensorEntity
from .demo import DemoEntity, setup_platform
class DemoSensor(DemoEntity,SensorEntity):
    native_value=property(lambda s:s.data['value'])
    native_unit_of_measurement=property(lambda s:s.data['unit'])
    device_class=property(lambda s:s.data['device_class'])
    state_class=property(lambda s:s.data['state_class'])
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'sensor',DemoSensor)
