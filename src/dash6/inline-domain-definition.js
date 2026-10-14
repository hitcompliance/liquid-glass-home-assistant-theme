// Pure composition shared by the live domain renderer and Favorites snapshots.
const stacks=new Set(['custom:vertical-stack-in-card','custom:dash6-stack-card']);
const flatten=cards=>(cards||[]).flatMap(card=>stacks.has(card.type)?card.cards||[]:[card]);
export function inlineDomainGridDefinition(config,initial,extra){
 const originals=config.cards||[];
 const columns=Math.min(4,Math.max(1,Number(config.columns)||(config.combine?1:2)));
 const mobile=Math.min(columns,Math.max(1,Number(config.mobile_columns)||1));
 const breakpoint=Math.max(320,Number(config.mobile_breakpoint)||700);
 const base=originals.find(card=>stacks.has(card.type));
 const headings=flatten(originals).filter(card=>card.type==='heading');
 const headingNames=new Set(headings.map(card=>card.heading));
 const additions=extra.flatMap(card=>stacks.has(card.type)&&card.cards?.some(child=>child.type==='heading'&&headingNames.has(child.heading))?card.cards:[card]);
 const items=[...flatten(initial),...additions].filter(card=>card.type!=='heading');
 if(!items.length)return null;
 const flush=config.edge_alignment==='flush';
 const grid={type:'custom:layout-card',layout_type:flush||config.combine?'custom:dash6-inline-flush-grid-layout':'custom:grid-layout',layout:{'grid-template-columns':`repeat(${columns},minmax(0,1fr))`,'grid-auto-rows':'min-content',gap:'8px',card_margin:'0',margin:'0',padding:'0',mediaquery:{[`(max-width: ${breakpoint-1}px)`]:{'grid-template-columns':`repeat(${mobile},minmax(0,1fr))`}}},cards:items};
 return flush?{type:'custom:dash6-domain-grid',headings,grid,breakpoint}:{...(base||{type:'custom:vertical-stack-in-card'}),cards:[...headings,grid]};
}
