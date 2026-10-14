// Shadow DOM cannot inherit selectors. The theme owns each named class's CSS;
// the renderer only applies its stylesheet to the selected card shadow root.
export function decodeThemeClass(value){
 const text=String(value||'').trim();
 if(!text)return '';
 try{const decoded=JSON.parse(text);return typeof decoded==='string'?decoded:'';}catch{return '';}
}
export function themeClassCSS(host,classes){
 const computed=getComputedStyle(host);
 return [...new Set(String(classes||'').split(/\s+/))]
  .filter(name=>/^dash6-[a-z0-9-]+$/.test(name))
  .map(name=>decodeThemeClass(computed.getPropertyValue('--dash6-class-'+name.slice(6))))
  .filter(Boolean).join('\n');
}
