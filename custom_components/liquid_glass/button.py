from homeassistant.components.button import ButtonEntity
from homeassistant.util import dt as dt_util
from .demo import DemoEntity,setup_platform
class DemoButton(DemoEntity,ButtonEntity):
    async def async_press(self):
        key=self.spec['key']
        if key=='zurucksetzen': self.coordinator.reset()
        elif key=='klingeln':
            self.coordinator.put('binary_sensor','klingel',on=True)
            self.coordinator.put('sensor','klingel_letzte_aktivitat',value=dt_util.utcnow())
        elif key=='turoffner':
            self.coordinator.put('switch','turkontakt_simulation',on=True)
            self.coordinator.put('binary_sensor','klingel',on=False)
            self.coordinator.put('binary_sensor','turkontakt',on=True)
        elif key=='update_verfugbar': self.coordinator.put('update','firmware',available_update=True)
        elif key.startswith('roboter_') and key.endswith('_zurucksetzen'):
            part=key.removesuffix('_zurucksetzen')
            self.coordinator.put('sensor',part+'_restzeit',value=300)
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'button',DemoButton)
