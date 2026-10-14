// Pure composition shared by the live domain renderer and Favorites snapshots.
const stacks=new Set(['custom:vertical-stack-in-card','custom:dash6-stack-card']);
const flatten=cards=>(cards||[]).flatMap(card=>stacks.has(card.type)?card.cards||[]:[card]);
const thinShell=shell=>({...shell,dash6_css:{...shell.dash6_css,class:[...new Set([...(shell.card_mod?.class||'').split(/\s+/),...(shell.dash6_css?.class||'').split(/\s+/),'dash6-thin-glass'].filter(Boolean))].join(' ')}});
export function inlineDomainGridDefinition(config,initial,extra){
 const originals=config.cards||[];
 const columns=Math.min(10,Math.max(1,Number(config.columns)||(config.combine?1:2)));
 const mobile=config.area&&config.domain?1:Math.min(columns,Math.max(1,Number(config.mobile_columns)||1));
 const breakpoint=config.area&&config.domain?700:Math.max(320,Number(config.mobile_breakpoint)||700);
 const base=originals.find(card=>stacks.has(card.type));
 const headings=flatten(originals).filter(card=>card.type==='heading');
 const headingNames=new Set(headings.map(card=>card.heading));
 const additions=extra.flatMap(card=>stacks.has(card.type)&&card.cards?.some(child=>child.type==='heading'&&headingNames.has(child.heading))?card.cards:[card]);
 const items=[...flatten(initial),...additions].filter(card=>card.type!=='heading');
 if(!items.length){
  if(!config.keep_empty)return null;
  return headings.length?thinShell({...(base||{type:'custom:vertical-stack-in-card'}),cards:headings}):null;
 }
 const flush=config.edge_alignment==='flush';
 const layout=structuredClone(config.grid_layout||{}),narrow=`repeat(${mobile},minmax(0,1fr))`;
 const width=query=>Number(query.match(/max-width\s*:\s*([\d.]+)px/)?.[1])||Infinity;
 const queries={...layout.mediaquery,[`(max-width: ${breakpoint-1}px)`]:{...layout.mediaquery?.[`(max-width: ${breakpoint-1}px)`],'grid-template-columns':narrow}};
 for(const [query,values]of Object.entries(queries))if(width(query)<breakpoint)queries[query]={...values,'grid-template-columns':narrow};
 // layout-card uses the first matching query. Put the narrowest conditions first.
 const mediaquery=Object.fromEntries(Object.entries(queries).sort(([a],[b])=>width(a)-width(b)));
 const grid={type:'custom:layout-card',layout_type:flush||config.combine?'custom:dash6-inline-flush-grid-layout':'custom:grid-layout',layout:{...layout,'grid-template-columns':`repeat(${columns},minmax(0,1fr))`,'grid-auto-rows':layout['grid-auto-rows']||'min-content',gap:'8px',card_margin:'0',margin:'0',padding:'0',mediaquery},cards:items};
 return thinShell(flush?{type:'custom:dash6-domain-grid',headings,grid,breakpoint}:{...(base||{type:'custom:vertical-stack-in-card'}),cards:[...headings,grid]});
}
