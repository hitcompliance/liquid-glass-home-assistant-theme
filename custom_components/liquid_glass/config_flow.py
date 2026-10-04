"""Single-instance UI installation flow."""
import voluptuous as vol
from homeassistant import config_entries
from . import DOMAIN

class LiquidGlassConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        await self.async_set_unique_id(DOMAIN)
        self._abort_if_unique_id_configured()
        if user_input is not None:
            return self.async_create_entry(title='Liquid Glass', data=user_input)
        return self.async_show_form(step_id='user', data_schema=vol.Schema({
            vol.Optional('demo_dashboard', default=True): bool,
            vol.Optional('dual_smart_thermostat', default=False): bool,
        }))
