/** Pure catalog, selection and ordering helpers; never alter source configurations. */
const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
const compare = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), 'de', {numeric: true, sensitivity: 'base'});
const childrenOf = node => node.children || [];
const asSet = ids => new Set(ids || []);
const walkNodes = (nodes, visit) => { for (const node of nodes || []) { visit(node); walkNodes(childrenOf(node), visit); } };
const STRUCTURAL_KEYS = new Set(['cards', 'card', 'definition', 'headings', 'grid', 'sections', 'rows', 'columns', 'modules', 'external_card', 'card_config', 'config', 'overrides', 'custom_fields', 'layout']);
export const GROUPINGS = ['source_view', 'source_view_domain', 'domain', 'domain_source_view', 'none'];
export const DEFAULT_DOMAIN_ORDER = ['climate', 'sensor', 'scene', 'light', 'cover', 'fan', 'media_player', 'vacuum', 'switch', 'lock', 'camera', 'binary_sensor', 'other'];

export function normalizeViewLabel(label) {
  return String(label || '').replace(/(?:[\s_-]+(?:inhalt|content|embedded))+(?=$|[\s_-]+\d+$)/i, '').trim();
}

/** Structural child paths are relative to the immediately enclosing card. */
export function extractCatalog(config, source = {}, options = {}) {
  const roots = []; let order = 0;
  const inferDomain = options.inferDomain || (card => {
    if (card.domain) return card.domain;
    const entities = [card.entity, ...(Array.isArray(card.entities) ? card.entities.map(e => typeof e === 'string' ? e : e?.entity) : [])].filter(e => typeof e === 'string' && /^[a-z_]+\./.test(e));
    const domains = [...new Set(entities.map(e => e.split('.')[0]))];
    return domains.length === 1 ? domains[0] : undefined;
  });
  const isCard = options.isCard || (value => typeof value?.type === 'string' && value.type !== 'external_card');
  function descend(value, absolutePath, relativePath, owner, metadata, cardPosition = false) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach((item, i) => descend(item, [...absolutePath, i], [...relativePath, i], owner, metadata, cardPosition)); return; }
    let nextOwner = owner; let childRelative = relativePath;
    if (cardPosition && isCard(value)) {
      const node = {
        id: `${options.idPrefix || ''}${metadata.dashboard || ''}/${metadata.view || ''}:${JSON.stringify(absolutePath)}`,
        label: options.cardLabel?.(value) || value.heading || value.title || value.name || value.entity || value.profile || value.type,
        card: clone(value), children: [], source: {...metadata}, domain: inferDomain(value),
        order: order++, path: [...relativePath], absolutePath: [...absolutePath],
      };
      (owner ? owner.children : roots).push(node); nextOwner = node; childRelative = [];
    }
    for (const [key, child] of Object.entries(value)) {
      if (!STRUCTURAL_KEYS.has(key)) continue;
      if (key === 'custom_fields' && child && typeof child === 'object') {
        for (const [fieldName, field] of Object.entries(child)) descend(field, [...absolutePath, key, fieldName], [...childRelative, key, fieldName], nextOwner, metadata, false);
        continue;
      }
      const position = ['cards', 'card', 'definition', 'headings', 'grid', 'card_config', 'overrides', 'external_card'].includes(key);
      descend(child, [...absolutePath, key], [...childRelative, key], nextOwner, metadata, position);
    }
    if (nextOwner && nextOwner !== owner && !nextOwner.domain) {
      const domains = [...new Set(nextOwner.children.map(n => n.domain).filter(Boolean))];
      nextOwner.domain = domains.length === 1 ? domains[0] : 'other';
    }
  }
  function viewCatalog(view, index, base = []) {
    const metadata = {...source, view: view.path ?? source.view ?? String(index), title: view.title ?? source.title ?? view.path ?? source.view ?? '', viewOrder: source.viewOrder ?? index};
    descend(view.cards, [...base, 'cards'], ['cards'], null, metadata, true);
    for (let i = 0; i < (view.sections || []).length; i++) descend(view.sections[i]?.cards, [...base, 'sections', i, 'cards'], ['sections', i, 'cards'], null, metadata, true);
  }
  if (Array.isArray(config?.views)) config.views.forEach((view, i) => viewCatalog(view, i, ['views', i]));
  else if (Array.isArray(config)) descend(config, [], [], null, source, true);
  else if (options.view || ((config?.cards || config?.sections) && (!config?.type || ['sections', 'panel', 'masonry'].includes(config.type)))) viewCatalog(config, source.viewOrder || 0);
  else descend(config, [], [], null, source, true);
  return roots;
}

/** Selecting a container selects all descendants; excluding a child keeps ancestors checked. */
export function toggleSelection(catalog, selectedIds, id, checked) {
  const selected = asSet(selectedIds); let target;
  walkNodes(catalog, node => { if (node.id === id) target = node; });
  if (!target) return [...selected];
  walkNodes([target], node => { if (checked) selected.add(node.id); else selected.delete(node.id); });
  return [...selected];
}

export function selectionState(node, selectedIds) {
  const selected = asSet(selectedIds); let count = 0; let total = 0;
  walkNodes([node], child => { total++; if (selected.has(child.id)) count++; });
  return {checked: selected.has(node.id), partial: count > 0 && count < total};
}

/** Retain checked/unchecked known cards when a user expands a dynamic source. */
export function reconcileDynamicSelection(previous,replacement,selectedIds){
 const selected=asSet(selectedIds),known=new Map(),oldIds=new Set();
 const identity=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
 walkNodes([previous],node=>{oldIds.add(node.id);if(node===previous)return;const key=identity(node.card);if(!known.has(key))known.set(key,[]);known.get(key).push(node);});
 const nextSelected=(selectedIds||[]).filter(id=>!oldIds.has(id));
 function visit(node,inherited,root=false){
  const match=root?previous:known.get(identity(node.card))?.shift();
  const checked=match?selected.has(match.id):inherited;
  const next={...node,id:match?.id||node.id,children:(node.children||[]).map(child=>visit(child,checked))};
  if(checked)nextSelected.push(next.id);return next;
 }
 return {node:visit(replacement,selected.has(previous.id),true),selected:[...new Set(nextSelected)]};
}

function replaceAtPath(root, path, value, remove = false) {
  if (!path.length) return remove ? undefined : value;
  let parent = root;
  for (let i = 0; i < path.length - 1; i++) { parent = parent?.[path[i]]; if (!parent) return root; }
  const key = path[path.length - 1];
  if (remove) { if (Array.isArray(parent)) parent.splice(key, 1); else delete parent[key]; }
  else parent[key] = value;
  return root;
}

function removalPath(card, path) {
  // An Ultra external-card module cannot be left behind with no card_config.
  let value = card;
  for (let i = 0; i < path.length; i++) {
    if (value?.type === 'external_card' && ['card_config', 'card', 'config'].includes(path[i])) return path.slice(0, i);
    value = value?.[path[i]];
  }
  return path;
}

/** Keep selected containers; promote selected descendants past unchecked wrappers. */
export function filterSelectedTree(catalog, selectedIds) {
  const selected = asSet(selectedIds);
  function collect(nodes) {
    return (nodes || []).flatMap(node => selected.has(node.id) ? materialize(node) : collect(childrenOf(node)));
  }
  function materialize(node) {
    const card = clone(node.card); const children = [], detached = [];
    // Reverse storage order prevents array removals from moving later child paths.
    const patches = childrenOf(node).map(child => {
      const kept = collect([child]);
      return {kept, path: kept.length ? child.path : removalPath(node.card, child.path)};
    });
    patches.sort((a, b) => {
      const limit = Math.min(a.path.length, b.path.length);
      for (let i = 0; i < limit; i++) { if (a.path[i] !== b.path[i]) return typeof a.path[i] === 'number' && typeof b.path[i] === 'number' ? b.path[i] - a.path[i] : compare(b.path[i], a.path[i]); }
      return b.path.length - a.path.length;
    });
    for (const {kept, path} of patches) {
      let parent = card;
      for (const key of path.slice(0, -1)) parent = parent?.[key];
      if (kept.length && Array.isArray(parent)) {
        parent.splice(path.at(-1), 1, ...kept.map(child => child.card));
        children.push(...kept);
      } else if (kept.length === 1) {
        replaceAtPath(card, path, kept[0].card); children.push(kept[0]);
      } else {
        // A single-card slot cannot contain several cards without inventing a wrapper.
        replaceAtPath(card, removalPath(node.card, path), undefined, true);
        detached.push(...kept);
      }
    }
    children.sort((a, b) => a.order - b.order);
    detached.sort((a, b) => a.order - b.order);
    return [{...node, card, children}, ...detached];
  }
  return collect(catalog);
}

export function normalizeOptions(options = {}) {
  const grouping = GROUPINGS.includes(options.grouping) ? options.grouping : 'source_view';
  let sort = ['alpha', 'source_domain_alpha', 'domain_alpha'].includes(options.sort) ? options.sort : 'domain_alpha';
  if (sort === 'source_domain_alpha' && grouping !== 'domain') sort = 'domain_alpha';
  let domainOrder = ['manual', 'alpha', 'source_view_order'].includes(options.domainOrder) ? options.domainOrder : 'source_view_order';
  if (domainOrder === 'source_view_order' && !['source_view', 'source_view_domain'].includes(grouping)) domainOrder = 'manual';
  return {...options, grouping, sort, domainOrder, headings: options.headings !== false,
    dashboard: options.dashboard ?? 'dash-6',
    viewOrderMode: options.viewOrderMode === 'manual' ? 'manual' : 'dashboard',
    manualViewOrder: [...new Set(Array.isArray(options.manualViewOrder) ? options.manualViewOrder.filter(key => typeof key === 'string') : [])],
    manualDomainOrder: [...new Set(Array.isArray(options.manualDomainOrder) ? options.manualDomainOrder : DEFAULT_DOMAIN_ORDER)]};
}

export const sourceViewKey = node => `${node.source?.dashboard || ''}/${normalizeViewLabel(node.source?.title || node.source?.view)}`;
const sourceLabel = node => normalizeViewLabel(node.source?.title || node.source?.view) || 'Ansicht';
const domainKey = node => node.domain || 'other';

/** Compare logical source views using dashboard order, with an optional manual override. */
export function compareSourceViews(a, b, options = {}, nodes = [a, b]) {
  const aKey = sourceViewKey(a), bKey = sourceViewKey(b);
  if (aKey === bKey) return 0;
  if (options.viewOrderMode === 'manual') {
    const keys = options.manualViewOrder || [], ai = keys.indexOf(aKey), bi = keys.indexOf(bKey);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1; if (bi >= 0) return 1;
  }
  const dashboard = options.dashboard ?? 'dash-6';
  const rank = (key, fallback) => {
    let minimum = Infinity;
    walkNodes(nodes || [], node => {
      const source = node.source;
      if (sourceViewKey(node) === key && source?.dashboard === dashboard && Number.isInteger(source.viewOrder) && source.viewOrder >= 0) minimum = Math.min(minimum, source.viewOrder);
    });
    const source = fallback.source;
    if (source?.dashboard === dashboard && Number.isInteger(source.viewOrder) && source.viewOrder >= 0) minimum = Math.min(minimum, source.viewOrder);
    return minimum;
  };
  const ar = rank(aKey, a), br = rank(bKey, b);
  if (ar !== br) return ar < br ? -1 : 1;
  return compare(sourceLabel(a), sourceLabel(b)) || compare(a.source?.dashboard, b.source?.dashboard) || compare(aKey, bKey);
}

/** Returns structural group nodes, with .children containing cards or nested groups. */
export function groupFavorites(nodes, rawOptions = {}) {
  const options = normalizeOptions(rawOptions);
  const orderedDomains = options.manualDomainOrder;
  const sourcePosition = (a, b) => {
    const logical = compareSourceViews(a, b, options, nodes); if (logical) return logical;
    const index = node => node.source?.dashboard === options.dashboard && Number.isInteger(node.source.viewOrder) && node.source.viewOrder >= 0 ? node.source.viewOrder : Infinity;
    const ai = index(a), bi = index(b); if (ai !== bi) return ai < bi ? -1 : 1;
    return (a.order ?? 0) - (b.order ?? 0);
  };
  const domainComparator = items => (a, b) => {
    if (options.domainOrder === 'alpha') return compare(a, b);
    if (options.domainOrder === 'manual') {
      const ai = orderedDomains.indexOf(a); const bi = orderedDomains.indexOf(b);
      const delta = (ai < 0 ? Infinity : ai) - (bi < 0 ? Infinity : bi);
      if (delta && Number.isFinite(delta)) return delta;
      if (ai >= 0 && bi < 0) return -1; if (bi >= 0 && ai < 0) return 1;
    }
    if (options.domainOrder === 'source_view_order') {
      const first = key => items.filter(node => domainKey(node) === key).sort(sourcePosition)[0];
      const x = first(a), y = first(b);
      const delta = sourcePosition(x, y); if (delta) return delta;
    }
    return compare(a, b);
  };
  function itemCompare(a, b, domainCompare) {
    if (options.sort === 'source_domain_alpha') { const delta = compareSourceViews(a, b, options, nodes); if (delta) return delta; }
    if (options.sort === 'domain_alpha') { const delta = domainCompare(domainKey(a), domainKey(b)); if (delta) return delta; }
    return compare(a.label, b.label) || compare(a.id, b.id);
  }
  function grouped(items, dimensions, prefix = '') {
    const domainCompare = domainComparator(items);
    if (!dimensions.length) return [...items].sort((a, b) => itemCompare(a, b, domainCompare));
    const [kind, ...rest] = dimensions; const map = new Map();
    for (const node of items) {
      const key = kind === 'source_view' ? sourceViewKey(node) : domainKey(node);
      if (!map.has(key)) map.set(key, []); map.get(key).push(node);
    }
    const groupSource = members => {
      const source = {...members[0].source};
      const indices = members.map(node => node.source?.viewOrder).filter(index => Number.isInteger(index) && index >= 0);
      if (indices.length) source.viewOrder = Math.min(...indices);
      return source;
    };
    const groups = [...map].map(([key, members]) => ({
      id: `${prefix}${kind}:${key}`, key, kind, label: kind === 'source_view' ? sourceLabel(members[0]) : (options.domainLabels?.[key] || key),
      heading: options.headings, source: kind === 'source_view' ? groupSource(members) : undefined,
      children: grouped(members, rest, `${prefix}${kind}:${key}/`),
    }));
    groups.sort((a, b) => kind === 'domain' ? domainCompare(a.key, b.key) : compareSourceViews(a, b, options, nodes));
    return groups;
  }
  const dimensions = {source_view: ['source_view'], source_view_domain: ['source_view', 'domain'], domain: ['domain'], domain_source_view: ['domain', 'source_view'], none: []};
  return grouped(nodes || [], dimensions[options.grouping]);
}
