# Card compatibility and design contract

This theme was mapped to the card families visible in a DASH5 living-room view on 29 September 2026. It preserves behavior. The matrix describes the styling path, not a guarantee that every version of every third-party card will expose the same CSS variables.

| Card family | Styling path | Preserved controls |
| --- | --- | --- |
| Native thermostat / climate features | Home Assistant palette, card-mod card surface | Dual setpoint control, HVAC and preset selection |
| More-info cover card | Palette and card-mod more-info surface | Vertical position slider and native actions |
| DASH5 Govee light v2 | `ha-card-background`, `secondary-background-color`, `divider-color`, accent tokens | Inline mode buttons to the right of the light slider, detail views, effects, segment selection |
| IKEA switch / fan button-card stacks | Palette, card-mod card surface | Full-width chart behind content, power at upper right, native hover tooltip |
| ApexCharts / mini-graph-card | Chart's own series styling, shared text and tooltip palette | Hover markers, layer order, data series, external tooltip positioning |
| Roborock vacuum card | Palette, card-mod card surface | Robot graphic, five dock controls, progress, maintenance and action buttons |
| Mushroom chips and button-card | Mushroom theme tokens, standard palette and card surface | Status colors, tap actions, card geometry |
| Media / Apple TV custom dialog | Palette and card-mod dialog surface | Wide playback/remote layout, all remote buttons and keyboard handling |

## Important layering rule

The IKEA and fan graph must stay a background layer across the full card width. Do not change `overflow`, `position`, `z-index`, `pointer-events`, or `transform` on their graph, card host, or tooltip via global theme CSS. The theme's animation is a short opacity fade, without a transform, for this reason. A per-card graph/tooltip rule already present in the dashboard takes precedence over the generic glass surface.

## Card-specific overrides

When a card uses hard-coded opaque colors, replace only that card's color declaration with theme variables. Keep all existing geometry and actions. Example for a `button-card` card style:

```yaml
styles:
  card:
    - background: var(--lg-surface)
    - border: 1px solid var(--lg-outline)
    - box-shadow: var(--lg-shadow)
```

For a custom button inside a card's own stylesheet, prefer `var(--lg-surface-raised)` and `var(--lg-outline)`; for an active control use `var(--lg-glow)`. Avoid replacing a light's own slider track or the graph background with a generic iOS component.

## Limits

- Theme variables cross open shadow roots only when the card actually uses them. A closed shadow root or hard-coded inline declaration needs a change in that card's source or configuration.
- Arbitrary `card-mod` CSS with `!important` can override any theme CSS. No Home Assistant theme can prohibit this through CSS. The theme's glass tokens make compatible custom rules straightforward.
- The optional wallpaper must be copied to `/config/www` manually; HACS theme downloads do not install it there.
