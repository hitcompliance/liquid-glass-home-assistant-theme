// Own only the first power/energy rows; optional values keep their flow space.
export function bindBackgroundMetrics(child){
 const owner={};
 const sync=()=>{
  const root=child.shadowRoot,values=root?.querySelector('#values'),frame=root?.querySelector('#card');if(!values||!frame)return;
  if(owner.child!==child){
   owner.resize?.disconnect();owner.mutation?.disconnect();owner.child=child;
   owner.resize=new ResizeObserver(()=>sync());owner.resize.observe(frame);
   owner.mutation=new MutationObserver(()=>sync());owner.mutation.observe(root,{subtree:true,childList:true,characterData:true});
  }
  const rows=[...values.children];
  values._dash6MetricOverflow??=values.style.overflow;values.style.overflow=frame.hasAttribute('data-dash6-graph-frame')||rows.length<=2?'visible':values._dash6MetricOverflow;
  if(frame.hasAttribute('data-dash6-graph-frame')){const width=Math.ceil(values.getBoundingClientRect().width)+12+'px';if(frame.style.getPropertyValue('--dash6-header-values-width')!==width)frame.style.setProperty('--dash6-header-values-width',width);}
  for(const [index,selector] of ['#title','#status'].entries()){
   const row=rows[index],reference=root.querySelector(selector);if(!row||!reference||!row.textContent.trim().match(index===0?/[-\d.,]+\s*(?:[kM]?W)\s*$/:/[-\d.,]+\s*(?:[kM]?Wh)\s*$/))continue;
   // Preserve the exact original flow space occupied by these values, so all
   // additional/conditional values retain their existing position and styles.
   row._dash6MetricHeight??=row.getBoundingClientRect().height;
   row.style.height=row._dash6MetricHeight+'px';row.style.font=getComputedStyle(reference).font;row.style.color=getComputedStyle(reference).color;
   row.style.position='relative';row.style.top='0';
   const ref=reference.getBoundingClientRect(),box=row.getBoundingClientRect();row.style.top=(ref.top+parseFloat(getComputedStyle(reference).paddingTop||0)-box.top)+'px';
  }
 };
 sync();return {sync,dispose(){owner.resize?.disconnect();owner.mutation?.disconnect();}};
}
