// Generated project wallpaper. It is shared by all viewport sizes and never uploads dashboard imagery.
const assetRoot=new URL(import.meta.url.includes('/chunks/')?'../':'./',import.meta.url);
const style=document.createElement('style');style.dataset.dash6Background='portable';
style.textContent=`:root{--dash6-wohnzimmer-background:url("${new URL('backgrounds/living-room.jpg',assetRoot).href}")}`;
document.head.append(style);
