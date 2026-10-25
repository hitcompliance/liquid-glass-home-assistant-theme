from homeassistant.components.select import SelectEntity
from .demo import DemoEntity,setup_platform
class DemoSelect(DemoEntity,SelectEntity):
    @property
    def options(self):
        if self.spec.get('attributes',{}).get('options'):return [v for v in self.spec['attributes']['options'] if v not in ('unknown','unavailable')] or ['Demo']
        key=self.spec['key']
        return (['vac_and_mop','vacuum','mop'] if 'reinigung' in key else
                ['off','mild','moderate','intense'] if 'wischintensitat' in key else
                ['standard','deep','deep_plus'] if 'wischroute' in key else
                ['smart','light','balanced','max'] if 'entleerungsmodus' in key else ['Lesen','Entspannen'])
    current_option=property(lambda s:s.data['option'] if s.data['option'] in s.options else s.options[0])
    async def async_select_option(self,option): self.change(option=option)
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'select',DemoSelect)
