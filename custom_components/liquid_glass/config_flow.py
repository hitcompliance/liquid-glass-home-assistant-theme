"""Single-instance installation and editable dashboard choices."""
import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from . import DOMAIN

def schema(data):
    return vol.Schema({vol.Optional('demo_dashboard',default=data.get('demo_dashboard',True)):bool,
                       vol.Optional('demo_mode',default=data.get('demo_mode','browser')):vol.In(['browser','entities']),
                       vol.Optional('hue_dashboard',default=data.get('hue_dashboard',False)):bool,
                       vol.Optional('dual_smart_thermostat',default=data.get('dual_smart_thermostat',False)):bool})

class LiquidGlassConfigFlow(config_entries.ConfigFlow,domain=DOMAIN):
    VERSION=2
    @staticmethod
    @callback
    def async_get_options_flow(config_entry):return LiquidGlassOptionsFlow()
    async def async_step_user(self,user_input=None):
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:return self.async_create_entry(title='Liquid Glass',data=user_input)
        return self.async_show_form(step_id='user',data_schema=schema({}))

class LiquidGlassOptionsFlow(config_entries.OptionsFlow):
    async def async_step_init(self,user_input=None):
        if user_input is not None:return self.async_create_entry(title='',data=user_input)
        return self.async_show_form(step_id='init',data_schema=schema({**self.config_entry.data,**self.config_entry.options}))
