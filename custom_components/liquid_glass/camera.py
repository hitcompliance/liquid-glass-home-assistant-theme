from pathlib import Path
from homeassistant.components.camera import Camera
from .demo import DemoEntity,setup_platform
class DemoCamera(DemoEntity,Camera):
    def __init__(self,coordinator,spec):
        Camera.__init__(self)
        DemoEntity.__init__(self,coordinator,spec)
        self._image=None
    async def async_camera_image(self,width=None,height=None):
        if self._image is None:
            self._image=await self.hass.async_add_executor_job((Path(__file__).parent/'bundle/assets/liquid-glass-living-room.jpg').read_bytes)
        return self._image
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'camera',DemoCamera)
