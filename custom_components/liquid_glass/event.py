"""Virtual read-only doorbell event; never subscribes to physical devices."""
from homeassistant.components.event import EventEntity
from .demo import DemoEntity,setup_platform
class DemoEvent(DemoEntity,EventEntity):
    _attr_event_types=['press']
    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        self._trigger_event('press')
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'event',DemoEvent)
