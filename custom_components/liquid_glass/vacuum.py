from homeassistant.components.vacuum import StateVacuumEntity,VacuumEntityFeature,VacuumActivity
from .demo import DemoEntity,setup_platform
class DemoVacuum(DemoEntity,StateVacuumEntity):
    _attr_supported_features=VacuumEntityFeature.START|VacuumEntityFeature.PAUSE|VacuumEntityFeature.STOP|VacuumEntityFeature.RETURN_HOME|VacuumEntityFeature.FAN_SPEED|VacuumEntityFeature.SEND_COMMAND|VacuumEntityFeature.LOCATE
    _attr_fan_speed_list=['quiet','balanced','turbo','max']
    activity=property(lambda s:VacuumActivity(s.data['vacuum_state']))
    fan_speed=property(lambda s:s.data['fan_speed'])
    async def async_start(self):
        self.change(vacuum_state='cleaning')
        self.coordinator.put('sensor','roboter_fortschritt',value=1)
    async def async_pause(self): self.change(vacuum_state='paused')
    async def async_stop(self,**kwargs): self.change(vacuum_state='idle')
    async def async_return_to_base(self,**kwargs): self.change(vacuum_state='docked')
    async def async_locate(self,**kwargs): self.change(last_command='locate')
    async def async_set_fan_speed(self,fan_speed,**kwargs): self.change(fan_speed=fan_speed)
    async def async_send_command(self,command,params=None,**kwargs):
        self.change(last_command=command)
        if command in ('app_start','app_segment_clean'): await self.async_start()
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'vacuum',DemoVacuum)
