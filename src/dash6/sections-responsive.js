// One CSS contract for native and embedded Sections. The theme owns effective
// widths; the adapter only supplies configured widths, visibility and position.
export const sectionsResponsiveCSS = `
:host([data-dash6-sections-layout]) .container{padding:0!important}
:host([data-dash6-sections-layout]) .wrapper{padding:0!important;margin:0!important;max-width:none!important;--column-count:var(--dash6-section-columns,10)!important;--content-column-count:var(--dash6-section-columns,10)!important;--column-gap:8px!important;overflow-anchor:none!important}
:host([data-dash6-sections-layout]) .content{display:grid!important;grid-template-columns:repeat(var(--dash6-section-columns,10),minmax(0,1fr))!important;column-gap:8px!important;row-gap:8px!important;align-items:start!important}
:host([data-dash6-sections-layout]) .content>.section{
 --dash6-section-effective-span:var(--dash6-section-span,1);
 --dash6-section-expanded-span:var(--dash6-section-span,1);
 min-width:0!important;overflow-anchor:none!important;
 grid-column:var(--dash6-section-column,auto) / span var(--dash6-section-effective-span)!important;
 grid-row:var(--dash6-section-row,auto) / span var(--dash6-section-row-span,1)!important;
}
:host([data-dash6-sections-layout]) .content>.section[data-dash6-section-empty]{display:none!important}
@media(min-width:700px) and (max-width:899px){
 :host([data-dash6-sections-layout][data-dash6-section-mid-capacity]) .content>.section:is([data-dash6-section-configured-span="4"],[data-dash6-section-configured-span="6"]){--dash6-section-effective-span:var(--dash6-section-mid-span,5)}
}
@media(min-width:900px){
 :host([data-dash6-sections-layout]) .content>.section[data-dash6-section-configured-span="4"]{--dash6-section-expanded-span:var(--dash6-section-second-span,6)}
 :host([data-dash6-sections-layout]) .content>.section[data-dash6-section-expandable]{--dash6-section-effective-span:var(--dash6-section-expanded-span)}
}
@media(max-width:699px){
 :host([data-dash6-sections-layout]) .content{grid-template-columns:minmax(0,1fr)!important}
 :host([data-dash6-sections-layout]) .content>.section{--dash6-section-effective-span:1;--dash6-section-expanded-span:1;grid-column:1 / -1!important;grid-row:var(--dash6-section-row,auto)!important}
}`;

const integer = (value, fallback = 1) => Math.max(1, Math.floor(Number(value) || fallback));

// CSS Grid's row auto-placement, including optional dense backfill and row spans.
// No DOM geometry enters this calculation, so resize/visibility cannot oscillate.
export function planSectionPositions(items, columns, dense = false) {
 columns = integer(columns);
 const blocked = new Set();
 let result;
 // Dense backfill can put a later section before an expanded section. Revoke
 // that candidate and replan; each pass permanently removes one candidate.
 for (let pass = 0; pass <= items.length; pass++) {
  const occupied = [], placed = [];
  let cursorRow = 0, cursorColumn = 0;
  const fits = (row, column, span, rows) => {
   if (column + span > columns) return false;
   for (let r = row; r < row + rows; r++) for (let c = column; c < column + span; c++) if (occupied[r]?.[c]) return false;
   return true;
  };
  result = items.map((item, index) => {
   const span = Math.min(columns, integer(item.span));
   const expandedSpan = integer(item.expandedSpan, span);
   const rows = integer(item.rowSpan);
   let row = dense ? 0 : cursorRow, column = dense ? 0 : cursorColumn;
   while (!fits(row, column, span, rows)) {
    column++;
    if (column + span > columns) { row++; column = 0; }
   }
   const preceding = placed.filter(p => p.row <= row + 1 && row + 1 < p.row + p.rowSpan && p.column < column + 1);
   const expanded = item.configuredSpan === 4 && expandedSpan > span && !blocked.has(index)
    && preceding.length === 1 && fits(row, column, expandedSpan, rows);
   const effectiveSpan = expanded ? expandedSpan : span;
   for (let r = row; r < row + rows; r++) {
    occupied[r] ||= [];
    for (let c = column; c < column + effectiveSpan; c++) occupied[r][c] = true;
   }
   const position = {row: row + 1, column: column + 1, span: effectiveSpan, rowSpan: rows, expanded, index};
   placed.push(position);
   cursorRow = row; cursorColumn = column + effectiveSpan;
   return position;
  });
  let changed = false;
  for (const position of result) {
   const rowMembers = result.filter(p => p.row <= position.row && position.row < p.row + p.rowSpan).sort((a,b) => a.column-b.column);
   position.position = rowMembers.indexOf(position) + 1;
   if (position.expanded && position.position !== 2) {blocked.add(position.index); changed = true;}
  }
  if (!changed) return result;
 }
 return result;
}

const controllers = new WeakMap();
const setProperty = (node, name, value) => {value = String(value); if (node.style.getPropertyValue(name) !== value) node.style.setProperty(name, value);};
const setAttribute = (node, name, value) => {value = String(value); if (node.getAttribute(name) !== value) node.setAttribute(name, value);};

function scan(root, visit) {
 for (const node of root.querySelectorAll('*')) {
  if (visit(node) === false) continue;
  if (node.shadowRoot) scan(node.shadowRoot, visit);
 }
}

function dynamicEmpty(section) {
 const dynamic = [];
 let fixed = false;
 scan(section, node => {
  if (node.localName === 'dash6-auto-entities') {dynamic.push(Boolean(node._dash6Signature) && node.empty);return false;}
  if (['dash6-room-slot-card','dash6-domain-card'].includes(node.localName)) {dynamic.push(Boolean(node.empty));return false;}
  if (['dash6-media-card','dash6-appletv-card'].includes(node.localName)
   || (node.localName === 'dash6-fast-block-card' && node._child)) fixed = true;
  // A real static card beside an empty list keeps the section visible. Stack,
  // grid and profile adapters are structural wrappers, not static content.
  if (node.localName.endsWith('-card') && !['hui-card','hui-heading-card','hui-grid-card','hui-horizontal-stack-card',
   'hui-vertical-stack-card','dash6-stack-card','dash6-render-card','dash6-profile-card','dash6-direct-card','dash6-inline-layout','dash6-domain-grid','dash6-fast-block-card',
   'layout-card','mod-card'].includes(node.localName) && !node.hidden
   && getComputedStyle(node).display !== 'none') fixed = true;
 });
 return !fixed && dynamic.length > 0 && dynamic.every(Boolean);
}

export function syncResponsiveSections(host) {
 const content = host.shadowRoot?.querySelector('.content');
 if (!content) return;
 const enabled = host.localName === 'dash6-sections-view'
  || getComputedStyle(host).getPropertyValue('--dash6-satin-enabled').trim() === '1';
 host.toggleAttribute('data-dash6-sections-layout', enabled);
 if (!enabled) return;
 if (!host.shadowRoot.querySelector('style[data-dash6-sections-style]')) {
  const style = document.createElement('style');
  style.dataset.dash6SectionsStyle = ''; style.textContent = sectionsResponsiveCSS;
  host.shadowRoot.append(style);
 }
 const config = host._config || {};
 const columns = integer(config.max_columns, 10);
 const mobile = matchMedia('(max-width:699px)').matches;
 const midSpan = integer(getComputedStyle(host).getPropertyValue('--dash6-section-mid-span'), 5);
 host.toggleAttribute('data-dash6-section-mid-capacity', columns >= midSpan);
 setProperty(host, '--dash6-section-columns', columns);
 setProperty(content, '--dash6-section-columns', columns);
 const sections = [...content.querySelectorAll(':scope>.section')];
 const visible = [];
 sections.forEach((section,index) => {
  const sectionConfig = host.sections?.[index]?.config || config.sections?.[index] || {};
  const nativeSpan = section.style.getPropertyValue('--column-span');
  const inlineSpan = section.style.gridColumn.match(/span\s+(\d+)/)?.[1];
  const span = Math.min(columns, integer(sectionConfig.column_span || nativeSpan || inlineSpan));
  setProperty(section, '--dash6-section-span', span);
  setProperty(section, '--dash6-section-row-span', integer(sectionConfig.row_span || section.style.getPropertyValue('--row-span')));
  setAttribute(section, 'data-dash6-section-configured-span', span);
  section.toggleAttribute('data-dash6-section-empty', !host.lovelace?.editMode && dynamicEmpty(section));
  section.removeAttribute('data-dash6-section-expandable');
  const hidden = section.hidden || host.sections?.[index]?.hidden || section.querySelector('hui-section[hidden]')
   || getComputedStyle(section).display === 'none';
  if (hidden) {
   for (const attr of ['data-dash6-section-position','data-dash6-section-row','data-dash6-section-column']) section.removeAttribute(attr);
   for (const prop of ['--dash6-section-row','--dash6-section-column']) section.style.removeProperty(prop);
   return;
  }
  const style = getComputedStyle(section);
  visible.push({section, configuredSpan: span,
   span: integer(style.getPropertyValue('--dash6-section-effective-span'),span),
   expandedSpan: integer(style.getPropertyValue('--dash6-section-expanded-span'),span),
   rowSpan: mobile ? 1 : integer(sectionConfig.row_span || section.style.getPropertyValue('--row-span'))});
 });
 const plan = planSectionPositions(visible, mobile ? 1 : columns, Boolean(config.dense_section_placement || content.classList.contains('dense')));
 plan.forEach((position,index) => {
  const section = visible[index].section;
  section.toggleAttribute('data-dash6-section-expandable', position.expanded);
  setAttribute(section, 'data-dash6-section-position', position.position);
  setAttribute(section, 'data-dash6-section-row', position.row);
  setAttribute(section, 'data-dash6-section-column', position.column);
  setProperty(section, '--dash6-section-row', position.row);
  setProperty(section, '--dash6-section-column', position.column);
 });
}

export function connectResponsiveSections(host) {
 if (controllers.has(host)) return;
 let frame = 0;
 const schedule = () => {
  if (frame) return;
  frame = requestAnimationFrame(() => {frame = 0; if (host.isConnected) (host.syncSections || syncResponsiveSections).call(host, host);});
 };
 const observer = new MutationObserver(records => {
  // Our own metadata and style writes never schedule another layout pass.
  if (records.some(record => record.type === 'childList'
   || ['hidden','class','data-dash6-section-empty'].includes(record.attributeName))) schedule();
 });
 if (host.shadowRoot) observer.observe(host.shadowRoot, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class','data-dash6-section-empty']});
 for (const event of ['card-visibility-changed','section-visibility-changed']) host.addEventListener(event,schedule);
 window.addEventListener('resize', schedule);
 controllers.set(host, {schedule,observer,dispose() {
  cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('resize',schedule);
  for (const event of ['card-visibility-changed','section-visibility-changed']) host.removeEventListener(event,schedule);
 }});
 schedule();
}

export function disconnectResponsiveSections(host) {controllers.get(host)?.dispose(); controllers.delete(host);}

export function installNativeResponsiveSections() {
 customElements.whenDefined('hui-sections-view').then(() => {
  const prototype = customElements.get('hui-sections-view').prototype;
  if (Object.hasOwn(prototype,'_dash6SectionsResponsive')) return;
  prototype._dash6SectionsResponsive = true;
  for (const method of ['connectedCallback','updated','disconnectedCallback']) {
   const previous = prototype[method];
   prototype[method] = function (...args) {
    const result = previous?.apply(this,args);
    if (this.localName !== 'hui-sections-view') return result;
    if (method === 'disconnectedCallback') disconnectResponsiveSections(this);
    else {
     connectResponsiveSections(this); syncResponsiveSections(this);
     if (method === 'connectedCallback') this.updateComplete?.then(() => syncResponsiveSections(this));
    }
    return result;
   };
  }
 });
}
