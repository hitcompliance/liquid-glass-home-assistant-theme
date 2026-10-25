from homeassistant.components.media_player import MediaPlayerEntity,MediaPlayerEntityFeature,MediaPlayerState,MediaType,BrowseMedia
from .demo import DemoEntity,setup_platform
class DemoMediaPlayer(DemoEntity,MediaPlayerEntity):
    _attr_supported_features=(MediaPlayerEntityFeature.TURN_ON|MediaPlayerEntityFeature.TURN_OFF|MediaPlayerEntityFeature.PLAY|MediaPlayerEntityFeature.PAUSE|MediaPlayerEntityFeature.STOP|MediaPlayerEntityFeature.NEXT_TRACK|MediaPlayerEntityFeature.PREVIOUS_TRACK|MediaPlayerEntityFeature.VOLUME_SET|MediaPlayerEntityFeature.VOLUME_MUTE|MediaPlayerEntityFeature.SELECT_SOURCE|MediaPlayerEntityFeature.PLAY_MEDIA|MediaPlayerEntityFeature.BROWSE_MEDIA)
    _attr_source_list=['AppleTV','HDMI 1','HDMI 3']
    _attr_media_content_type=MediaType.MUSIC
    _attr_media_image_url='/local/liquid-glass/assets/liquid-glass-living-room.jpg'
    _attr_media_artist='Liquid Glass Demo'
    state=property(lambda s:MediaPlayerState(s.data['media_state']))
    volume_level=property(lambda s:s.data['volume'])
    is_volume_muted=property(lambda s:s.data.get('muted',False))
    source=property(lambda s:s.data['source'])
    media_title=property(lambda s:s.data.get('title','Virtuelle Wiedergabe'))
    async def async_turn_on(self): self.change(media_state='idle')
    async def async_turn_off(self): self.change(media_state='off')
    async def async_media_play(self): self.change(media_state='playing')
    async def async_media_pause(self): self.change(media_state='paused')
    async def async_media_stop(self): self.change(media_state='idle')
    async def async_media_next_track(self): self.change(title='Nächster Demo-Titel')
    async def async_media_previous_track(self): self.change(title='Vorheriger Demo-Titel')
    async def async_set_volume_level(self,volume): self.change(volume=volume)
    async def async_mute_volume(self,mute): self.change(muted=mute)
    async def async_select_source(self,source): self.change(source=source)
    async def async_play_media(self,media_type,media_id,**kwargs): self.change(media_state='playing',title='Demo-Wiedergabe (ohne Netzwerkabruf)')
    async def async_browse_media(self,media_content_type=None,media_content_id=None):
        return BrowseMedia(title='Demo-Mediathek',media_class='directory',media_content_id='demo',media_content_type='directory',can_play=False,can_expand=True,children=[BrowseMedia(title='Virtueller Titel',media_class='music',media_content_id='demo-track',media_content_type='music',can_play=True,can_expand=False)])
async def async_setup_entry(hass,entry,async_add_entities):
    await setup_platform(hass,entry,async_add_entities,'media_player',DemoMediaPlayer)
