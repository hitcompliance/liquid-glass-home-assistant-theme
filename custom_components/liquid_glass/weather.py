from datetime import timedelta
from homeassistant.components.weather import WeatherEntity,WeatherEntityFeature
from homeassistant.util import dt as dt_util
from .demo import DemoEntity,setup_platform
class DemoWeather(DemoEntity,WeatherEntity):
    _attr_supported_features=WeatherEntityFeature.FORECAST_DAILY
    _attr_condition='partlycloudy'
    _attr_native_temperature=21.5
    _attr_native_temperature_unit='°C'
    _attr_humidity=58
    async def async_forecast_daily(self):
        return [{'datetime':(dt_util.utcnow()+timedelta(days=i)).isoformat(),'condition':'partlycloudy','native_temperature':22+i,'native_templow':13+i} for i in range(5)]
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'weather',DemoWeather)
