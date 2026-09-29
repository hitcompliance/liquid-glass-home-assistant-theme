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

## SVG glass optics for DASH5 — Chrome and Safari

The companion module uses [samasante/liquid-glass](https://github.com/samasante/liquid-glass) in its `refract` DOM-copy mode. It creates a viewport-aligned copy of the fixed wallpaper behind each visible card and applies an SVG displacement filter to that copy. This produces refraction, colour separation and specular light in **Chrome and Safari** without `backdrop-filter: url()`, WebGL, or dashboard screenshots. A small offscreen **2D canvas** generates the SVG displacement map; it does not render the dashboard. The published bundle excludes the upstream WebGL renderer entirely. The original Home Assistant card, including every button, graph, slider and tooltip, remains above the optical layer and keeps its own interaction. The module starts with at most eight visible lenses on desktop and four on phones; the GUI can lower these limits. Wide graph cards may look better with less `strength` and `curvature` via per-card settings.

HACS installs the YAML theme, so install this optional frontend resource separately:

1. Copy the bundled [`frontend/dash5-glass.js`](frontend/dash5-glass.js) into `/config/www/liquid-glass/`.
2. Copy the wallpaper to `/config/www/liquid-glass-living-room.jpg` as described above.
3. In **Settings → Dashboards → Resources**, add `/local/liquid-glass/dash5-glass.js` as a **JavaScript module**. Reload `/dash-5/wohnzimmer`.

The module is scoped to `/dash-5/wohnzimmer` and an active Liquid Glass theme. Rebuild from [`frontend/dash5-glass.source.jsx`](frontend/dash5-glass.source.jsx) with `npm ci && npm run build:glass`; the build script selects only the upstream SVG/DOM component and checks that WebGL APIs are absent. Set `window.__DASH5_LIQUID_GLASS_DISABLE__ = true` before loading the resource to disable it without removing the resource. The bundled upstream package is [@samasante/liquid-glass 0.1.1](https://www.npmjs.com/package/@samasante/liquid-glass); see [third-party licensing](frontend/THIRD-PARTY-LICENSE.md).

For a local browser check, run `npm ci`, `npx playwright install chromium webkit`, and `python3 -m http.server 8765 --bind 127.0.0.1` in this repository; then run `npm run test:browser` in another terminal. The smoke test checks DOM wallpaper copies, the absence of canvas, controls, per-card settings, light mode, and a phone-sized viewport in both browser engines. It is a local demo check; Home Assistant custom cards still need testing in the actual dashboard.

### Visual settings

Open `/dash-5/wohnzimmer` and tap the **✦** button at the bottom right. The panel gives immediate control over the refraction, edge bend, curvature, colour split, frost, shine, glow, saturation, light and dark tint, accent, button material, icon/graph glow, wallpaper URL, motion and maximum simultaneous lenses. `System / Theme`, `Dunkel` and `Hell` switch the current look without changing card behaviour. `Standardwerte` restores defaults; `JSON kopieren` exports the complete profile. The current GUI settings are saved **in the browser's local storage**, so use the export on another device to reproduce them there. The default values in the resource and theme YAML apply before a user customizes them.

The wallpaper remains fixed during scrolling. The optical layer lives in the same scrolling DOM container as the cards, so its panels move with the cards natively rather than chasing them with a delayed JavaScript position update. Only each wallpaper copy is offset to match the fixed photograph. This avoids relying on `background-attachment: fixed` inside the lens, which [WebKit does not reliably support on iOS](https://bugs.webkit.org/show_bug.cgi?id=275247). Set the same image URL in the GUI that Home Assistant uses as its dashboard background; the module updates `--lovelace-background` while this view is active. For a reliable visual match, the image should use `center / cover` like the included wallpaper.

### Per-card controls in Ultra Card

Embed `custom:liquid-glass-card` as an Ultra Card **external_card**. The wrapper accepts any installed Home Assistant card as `card` and adds a visual editor for its optical settings. Its host passes values through CSS variables to the SVG lens, without replacing the inner card controls:

```yaml
type: custom:liquid-glass-card
card:
  type: custom:button-card
  entity: switch.example
glass:
  enabled: true
  optics:
    strength: 0.24
    curvature: 0.12
    frost: 3
  tint: rgba(25, 42, 65, 0.30)
  outline: rgba(235, 247, 255, 0.35)
  radius: 16px
```

For an existing Ultra Card module that must keep its current nesting, set the inherited CSS properties `--lg-optic-strength`, `--lg-optic-depth`, `--lg-optic-curvature`, `--lg-optic-bend`, `--lg-optic-dispersion`, `--lg-optic-frost`, `--lg-optic-sheen`, `--lg-optic-specular`, `--lg-optic-glow`, `--lg-optic-brightness`, `--lg-optic-saturate`, `--lg-card-tint`, `--lg-card-outline`, `--lg-card-radius` or `--lg-optics-disabled: 1` on that card. This is compatible with Ultra Card's styling options and card-mod. The wrapper is optional; use it when its extra nesting does not disturb the card's layout. The GUI edits glass settings; the nested card configuration remains the card's own configuration.

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
| `lg-accent` / `lg-control-*` | Blue translucent controls | Generic button and range styling |
| `lg-icon-glow` / `lg-graph-glow` | Subtle blue glow | Icon styling and opt-in chart styling |

For a different background, replace the supplied JPG with your own image at the same `/config/www` path. The supplied image stays sharp; foreground cards apply their own backdrop blur. If a device struggles with blur, change `lg-blur` to `blur(10px) saturate(125%)` or choose a CSS gradient without a photograph.

## Custom-card behavior

The theme provides standard Home Assistant variables plus Mushroom tokens and `card-mod` hooks. It leaves the existing sliders, cover orientation, chart layers, tooltips, dimensions, and click actions alone. This matters for custom cards: a theme can style only variables a card consumes and elements card-mod can reach. A card with hard-coded inline styles or a closed shadow root may need an adapter in that card's own configuration. The generic button styling is deliberately limited to colour, blur and shadow; graph geometry and pointer layers are untouched. See [Card compatibility](docs/CARD-COMPATIBILITY.md) for the DASH5 card inventory and specific checks.

`card-mod` remains available for per-card adjustments. CSS cannot stop another `card-mod` rule from intentionally overriding the theme; the theme instead uses shared `lg-*` variables and a consistent border, surface, blur, and focus vocabulary that custom rules can reuse.

## Design and privacy

The wallpaper was generated for this project. The repository does not contain dashboard exports, entity IDs, credentials, or screenshots of a private Home Assistant installation. The theme is unofficial and is not affiliated with Apple or Home Assistant.

## Sources

- [Apple Liquid Glass design overview](https://developer.apple.com/documentation/technologyoverviews/liquid-glass)
- [Home Assistant frontend themes](https://www.home-assistant.io/integrations/frontend/)
- [HACS theme repository requirements](https://www.hacs.xyz/docs/publish/theme/)
- [card-mod theme variables](https://github.com/thomasloven/lovelace-card-mod/blob/master/README-themes.md)
- [WebKit SVG backdrop-filter limitation](https://bugs.webkit.org/show_bug.cgi?id=245510)
- [samasante browser notes and Safari workarounds](https://github.com/samasante/liquid-glass/blob/main/BROWSERS.md)
