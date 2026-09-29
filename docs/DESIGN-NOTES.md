# Glass material and fixed wallpaper

The wallpaper stays stationary while the dashboard content scrolls. Home Assistant's native `hui-view-background` is a fixed viewport layer; do not apply a scrolling transform to this layer or duplicate the wallpaper on individual cards. The theme also keeps `fixed` in its wallpaper shorthand. Verified in Chrome on DASH5 on 2026-09-29.

The glass rim uses a stronger upper-left inset highlight, a weaker lower-right reflection and a very faint inner glow. These are carried by `lg-shadow` and `ha-card-box-shadow`, without extra DOM layers, pointer interception, clipping or changes to custom-card geometry.

## Reference review

- [Mindfulness concept](https://liquidglassdesign.com/gallery/minimal-dark-ui-concept-for-a-mindfulness-app-glassmorphism-design): restrained dark surfaces and layered contrast.
- [UI component reference](https://liquidglassdesign.com/gallery/ui-component-ux-ui-design-liquid-glass-ui): directional light and translucent surfaces over photography.
- [Base UI](https://github.com/mui/base-ui): accessible unstyled interaction primitives, not a glass renderer.
- [Liqui](https://liqui.design/): displacement-map refraction and separate optical controls; its live backdrop refraction requires Chromium, with frosted fallback elsewhere.
- [samasante/liquid-glass](https://github.com/samasante/liquid-glass): separates crisp controls from the refracted layer. Cross-browser refraction of a backdrop needs an explicit copy; ordinary live backdrop bending is Chromium-only.
- [Liquid Glass Studio](https://github.com/iyinchao/liquid-glass-studio): shader-based refraction, Fresnel reflection, directional glare and spring motion.

The YAML theme implements translucent frost and light reflections. The optional DASH5 frontend module adds real WebGL refraction of the stationary wallpaper using one renderer. It places lenses in a separate layer below the existing cards, so it does not move Home Assistant's custom-card shadow roots. The existing Motion variant retains restrained transitions and reduced-motion support; Reduce Motion also disables the optional renderer.
