from homeassistant.components.lock import LockEntity,LockEntityFeature
from .demo import DemoEntity,setup_platform
class DemoLock(DemoEntity,LockEntity):
    _attr_supported_features=LockEntityFeature.OPEN
    is_locked=property(lambda s:s.data['locked'])
    async def async_lock(self,**kwargs):
        self.coordinator.put('switch','turkontakt_simulation',on=False)
        self.change(locked=True)
        self.coordinator.put_entity(self.spec.get('contact_entity'),on=False)
        self.coordinator.put('binary_sensor','turkontakt',on=False)
    async def async_unlock(self,**kwargs): self.change(locked=False)
    async def async_open(self,**kwargs):
        self.coordinator.put('switch','turkontakt_simulation',on=True)
        self.change(locked=False)
        self.coordinator.put_entity(self.spec.get('contact_entity'),on=True)
        self.coordinator.put('binary_sensor','turkontakt',on=True)
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'lock',DemoLock)
