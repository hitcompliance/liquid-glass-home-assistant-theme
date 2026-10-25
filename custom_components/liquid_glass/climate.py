from homeassistant.components.climate import ClimateEntity,ClimateEntityFeature,HVACMode,HVACAction
from .demo import DemoEntity,setup_platform
class DemoClimate(DemoEntity,ClimateEntity):
    _attr_temperature_unit='°C'
    _attr_supported_features=ClimateEntityFeature.TARGET_TEMPERATURE|ClimateEntityFeature.TARGET_TEMPERATURE_RANGE|ClimateEntityFeature.PRESET_MODE|ClimateEntityFeature.TURN_ON|ClimateEntityFeature.TURN_OFF
    _attr_hvac_modes=[HVACMode.OFF,HVACMode.HEAT,HVACMode.COOL,HVACMode.HEAT_COOL]
    _attr_preset_modes=['comfort','eco']
    _attr_min_temp=5
    _attr_max_temp=30
    _attr_target_temperature_step=.5
    _attr_current_temperature=21.2
    hvac_mode=property(lambda s:HVACMode(s.data['hvac_mode']))
    hvac_action=property(lambda s:HVACAction.OFF if s.data['hvac_mode']=='off' else HVACAction.IDLE)
    target_temperature=property(lambda s:s.data['temperature'])
    target_temperature_low=property(lambda s:s.data['target_temp_low'])
    target_temperature_high=property(lambda s:s.data['target_temp_high'])
    preset_mode=property(lambda s:s.data['preset'])
    async def async_set_temperature(self,**kwargs): self.change(**{k:v for k,v in kwargs.items() if k in ('temperature','target_temp_low','target_temp_high')})
    async def async_set_hvac_mode(self,hvac_mode): self.change(hvac_mode=hvac_mode)
    async def async_set_preset_mode(self,preset_mode): self.change(preset=preset_mode)
    async def async_turn_on(self): self.change(hvac_mode='heat')
    async def async_turn_off(self): self.change(hvac_mode='off')
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'climate',DemoClimate)
