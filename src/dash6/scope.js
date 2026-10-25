/** Optional per-browser dashboard scope. The active theme remains the material gate. */
export function inDashboardScope(){
 if(location.pathname==='/dash6-bkp-2'||location.pathname.startsWith('/dash6-bkp-2/'))return false;
 const prefixes=window.__LIQUID_GLASS_DASHBOARD_PATHS__;
 if(!Array.isArray(prefixes)||prefixes.length===0)return true;
 return prefixes.some(prefix=>typeof prefix==='string'&&prefix.startsWith('/')&&(location.pathname===prefix||location.pathname.startsWith(prefix.endsWith('/')?prefix:prefix+'/')));
}

/** DASH6 content geometry is shared by its installed and public demo copies. */
export function inDASH6ContentScope(){
 if(location.pathname==='/dash6-bkp-2'||location.pathname.startsWith('/dash6-bkp-2/'))return false;
 return ['/dash-6','/liquid-glass-demo','/liquid-glass-gallery','/liquid-glass-hue-demo'].some(prefix=>location.pathname===prefix||location.pathname.startsWith(prefix+'/'))||document.documentElement.hasAttribute('data-dash6-satin-preview');
}
