from homeassistant.components.binary_sensor import BinarySensorEntity
from .demo import DemoEntity, setup_platform
class DemoBinarySensor(DemoEntity,BinarySensorEntity):
    is_on=property(lambda s:s.data['on'])
    @property
    def device_class(self):
        if self.spec.get('attributes',{}).get('device_class'):return self.spec['attributes']['device_class']
        key=self.spec['key']
        return 'occupancy' if key=='anwesenheit' else 'door' if 'tur' in key else 'moisture' if key=='wasser' else 'problem' if 'problem' in key or 'storung' in key else None
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'binary_sensor',DemoBinarySensor)
