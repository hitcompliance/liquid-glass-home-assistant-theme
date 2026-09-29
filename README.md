# Liquid Glass for Home Assistant

A dark, spacious Home Assistant theme inspired by the optical layering and clear hierarchy of Apple's Liquid Glass. It was designed against a real DASH5 living-room dashboard with custom lights, a thermostat, vertical covers, background power graphs, media controls, and a Roborock card. The theme changes materials, color, focus, and motion. It deliberately does not replace card controls or rearrange their layout.

[![Add to Home Assistant](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=hitcompliance&repository=liquid-glass-home-assistant-theme&category=theme)

## Included themes

| Theme | Motion | Best for |
| --- | --- | --- |
| **Liquid Glass** | Off | Touch panels, low-power devices, or motion-sensitive users |
| **Liquid Glass Motion** | Subtle card fade and 180 ms focus/hover transitions | Desktop and modern mobile browsers |

Both variants respect the operating system's **Reduce Motion** setting. The motion version avoids scaling cards so graph markers, external tooltips, and compact controls stay in place.

## Installation with HACS

1. Open the button above and add this repository in HACS as a **Theme**. If the link does not open HACS, add `https://github.com/hitcompliance/liquid-glass-home-assistant-theme` as a custom Theme repository in HACS.
2. Ensure `configuration.yaml` contains the following. If `frontend:` already exists, add only its `themes:` line to that block.

   ```yaml
   frontend:
     themes: !include_dir_merge_named themes
   ```

3. In Home Assistant, run **Developer tools → Actions → Reload themes** (`frontend.reload_themes`). Select **Liquid Glass** or **Liquid Glass Motion** in your user profile. The theme's dark mode is selected automatically.
4. Optional wallpaper: copy [`assets/liquid-glass-living-room.jpg`](assets/liquid-glass-living-room.jpg) to `/config/www/liquid-glass-living-room.jpg`. It is then available at `/local/liquid-glass-living-room.jpg`. Without it, the dark gradient remains usable. HACS installs the theme YAML, but does not place the optional wallpaper in `/config/www`.

## Manual installation

1. Copy [`themes/liquid-glass.yaml`](themes/liquid-glass.yaml) into `/config/themes/liquid-glass.yaml`.
2. Add the `frontend:` configuration above if themes are not already enabled. Back up `configuration.yaml` before editing it.
3. Reload themes and select one of the two variants in your user profile.
4. Copy the wallpaper as described above if desired.

For the extra glass styling around cards and dialogs, install [card-mod](https://github.com/thomasloven/lovelace-card-mod). The palette, normal card backgrounds, and Mushroom colors still work without card-mod. Loading card-mod as a frontend module can improve application speed, especially for theme-wide styling; follow card-mod's current installation instructions and use the resource URL shown by your own HACS installation.

## Optional WebGL refraction for DASH5

The companion module adds real refraction of the supplied stationary wallpaper behind up to eight visible cards. The card text, sliders, graphs, and click targets remain in Home Assistant's normal DOM above the optical layer. It uses one WebGL context, does not capture private dashboard content, and falls back to the CSS theme when WebGL or the image is unavailable. At phone widths it limits rendering to four cards. Reduce Motion disables the enhancement.

HACS installs the YAML theme, so install this optional frontend resource separately:

1. Copy [`frontend/dash5-glass.js`](frontend/dash5-glass.js) and [`frontend/ybouane-liquidglass-1.0.3.js`](frontend/ybouane-liquidglass-1.0.3.js) into `/config/www/liquid-glass/`.
2. Copy the wallpaper to `/config/www/liquid-glass-living-room.jpg` as described above.
3. In **Settings → Dashboards → Resources**, add `/local/liquid-glass/dash5-glass.js` as a **JavaScript module**. Reload `/dash-5/wohnzimmer`.

The module is scoped to `/dash-5/wohnzimmer` and an active Liquid Glass theme. Change its `CONFIG` object to tune refraction, blur, edge lighting, or specular reflection. Set `window.__DASH5_LIQUID_GLASS_DISABLE__ = true` before loading the resource to disable it without removing the resource. Its pinned upstream package is [@ybouane/liquidglass 1.0.3](https://www.npmjs.com/package/@ybouane/liquidglass); see [third-party licensing](frontend/THIRD-PARTY-LICENSE.md).

## Configuration

Home Assistant themes are CSS-variable mappings. Edit your local copy of `themes/liquid-glass.yaml` to adjust these values, then reload themes:

| Variable | Default | Effect |
| --- | --- | --- |
| `lg-surface` | `rgba(21, 31, 44, 0.74)` | Main glass tint |
| `lg-surface-raised` | `rgba(31, 47, 66, 0.78)` | Dialog and lifted surface tint |
| `lg-outline` | `rgba(221, 239, 255, 0.34)` | Fine card edge |
| `lg-radius` | `16px` | Glass-card corners, even when a custom card sets its own radius token |
| `lg-blur` | `blur(20px) saturate(150%)` | Glass blur through card-mod |
| `lg-glow` | Blue focus glow | Accent for custom controls |
| `lg-icon-diameter` | `40px` | Shared icon diameter for compatible custom cards |
| `state-cover-shade-closed-color` | `rgba(88, 169, 249, 0.72)` | Translucent blue fill in native vertical cover controls |
| `lovelace-background` | Gradient plus local wallpaper | Dashboard backdrop |
| `lg-motion-duration` | `0ms` / `180ms` | Hover and focus transition |

For a different background, replace the supplied JPG with your own image at the same `/config/www` path. The supplied image stays sharp; foreground cards apply their own backdrop blur. If a device struggles with blur, change `lg-blur` to `blur(10px) saturate(125%)` or choose a CSS gradient without a photograph.

## Custom-card behavior

The theme provides standard Home Assistant variables plus Mushroom tokens and `card-mod` hooks. It leaves the existing sliders, cover orientation, chart layers, tooltips, dimensions, and click actions alone. This matters for custom cards: a theme can style only variables a card consumes and elements card-mod can reach. A card with hard-coded inline styles or a closed shadow root may need an adapter in that card's own configuration. See [Card compatibility](docs/CARD-COMPATIBILITY.md) for the DASH5 card inventory and specific checks.

`card-mod` remains available for per-card adjustments. CSS cannot stop another `card-mod` rule from intentionally overriding the theme; the theme instead uses shared `lg-*` variables and a consistent border, surface, blur, and focus vocabulary that custom rules can reuse.

## Design and privacy

The wallpaper was generated for this project. The repository does not contain dashboard exports, entity IDs, credentials, or screenshots of a private Home Assistant installation. The theme is unofficial and is not affiliated with Apple or Home Assistant.

## Sources

- [Apple Liquid Glass design overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- [Home Assistant frontend themes](https://www.home-assistant.io/integrations/frontend/)
- [HACS theme repository requirements](https://www.hacs.xyz/docs/publish/theme/)
- [card-mod theme variables](https://github.com/thomasloven/lovelace-card-mod/blob/master/README-themes.md)
