from homeassistant.components.cover import CoverEntity,CoverEntityFeature
from .demo import DemoEntity,setup_platform
class DemoCover(DemoEntity,CoverEntity):
    _attr_supported_features=CoverEntityFeature.OPEN|CoverEntityFeature.CLOSE|CoverEntityFeature.STOP|CoverEntityFeature.SET_POSITION
    current_cover_position=property(lambda s:s.data['position'])
    is_closed=property(lambda s:s.data['position']==0)
    async def async_open_cover(self,**kwargs): self.change(position=100)
    async def async_close_cover(self,**kwargs): self.change(position=0)
    async def async_stop_cover(self,**kwargs): pass
    async def async_set_cover_position(self,**kwargs): self.change(position=kwargs['position'])
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'cover',DemoCover)
