/** Optional per-browser dashboard scope. The active theme remains the material gate. */
export function inDashboardScope(){
 const prefixes=window.__LIQUID_GLASS_DASHBOARD_PATHS__;
 if(!Array.isArray(prefixes)||prefixes.length===0)return true;
 return prefixes.some(prefix=>typeof prefix==='string'&&prefix.startsWith('/')&&(location.pathname===prefix||location.pathname.startsWith(prefix.endsWith('/')?prefix:prefix+'/')));
}
