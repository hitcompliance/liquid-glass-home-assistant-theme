from homeassistant.components.remote import RemoteEntity
from .demo import DemoEntity,setup_platform
class DemoRemote(DemoEntity,RemoteEntity):
    is_on=property(lambda s:s.data['on'])
    async def async_turn_on(self,**kwargs):
        self.change(on=True)
        self.coordinator.put('media_player',self.spec['key'],media_state='idle')
    async def async_turn_off(self,**kwargs):
        self.change(on=False)
        self.coordinator.put('media_player',self.spec['key'],media_state='off')
    async def async_send_command(self,command,**kwargs):
        self.change(last_command=list(command) if not isinstance(command,str) else command)
    @property
    def extra_state_attributes(self):
        return {**super().extra_state_attributes,'last_command':self.data.get('last_command')}
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'remote',DemoRemote)
