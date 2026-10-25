/** Use the outer, currently rendered HA view, never an embedded view's config. */
export function inLayoutScope(host) {
 let config;
 for (let node = host; node; node = node.assignedSlot || node.parentNode || node.host) {
  if (node.localName === 'hui-view') config = node._config ?? node.viewConfig;
  // The standalone showroom exposes the same view config on its container.
  if (node.localName === 'hui-view-container' && node.viewConfig) config = node.viewConfig;
 }
 return config?.type === 'panel'
  && config.cards?.[0]?.type === 'custom:dash6-ultra-card';
}
