from homeassistant.components.update import UpdateEntity,UpdateEntityFeature
from .demo import DemoEntity,setup_platform
class DemoUpdate(DemoEntity,UpdateEntity):
    _attr_supported_features=UpdateEntityFeature.INSTALL
    installed_version=property(lambda s:'1.0.0')
    latest_version=property(lambda s:'1.1.0' if s.data['available_update'] else '1.0.0')
    async def async_install(self,version,backup,**kwargs): self.change(available_update=False)
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'update',DemoUpdate)
