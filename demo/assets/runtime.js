/* Standalone controls for the exported mockups. No Codex or device APIs. */
(() => {
  const key = 'liquid-glass-demo:' + document.documentElement.dataset.demo;
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
  window.demoState = {
    widgetState: saved,
    async setWidgetState(state) {
      this.widgetState = state;
      try { localStorage.setItem(key, JSON.stringify(state)); } catch {}
    }
  };
  const pendingTweaks = [];
  window.Tweak = class {
    constructor({ container, onChange }) { this.container = container; this.onChange = onChange; this.controls = []; pendingTweaks.push(this); }
    addSlider(object, property, options = {}) { this.controls.push({ object, property, options, type: 'range' }); }
    addColorPicker(object, property, options = {}) { this.controls.push({ object, property, options, type: 'color' }); }
    addToggle(object, property, options = {}) { this.controls.push({ object, property, options, type: 'checkbox' }); }
    addSelect(object, property, options = {}) { this.controls.push({ object, property, options, type: 'select' }); }
  };
  function tweaks() {
    const panel = document.querySelector('.demo-tweak-groups');
    if (!panel) return;
    for (const group of pendingTweaks) {
      const fieldset = document.createElement('fieldset'), legend = document.createElement('legend');
      legend.textContent = group.container.getAttribute('aria-label') || group.container.querySelector('.proposal-name')?.textContent || 'Material und Verhalten';
      fieldset.append(legend);
      for (const { object, property, options, type } of group.controls) {
        const label = document.createElement('label'), heading = document.createElement('span'), value = document.createElement('output');
        heading.textContent = options.label || property;
        const input = document.createElement(type === 'select' ? 'select' : 'input');
        if (type !== 'select') input.type = type;
        if (type === 'checkbox') input.checked = object[property];
        else if (type === 'select') {
          for (const item of options.options || []) { const option = document.createElement('option'); option.textContent = typeof item === 'string' ? item : item.label; option.value = typeof item === 'string' ? item : item.value; input.append(option); }
          input.value = object[property];
        } else { for (const name of ['min', 'max', 'step']) if (options[name] != null) input[name] = options[name]; input.value = object[property]; }
        const refresh = () => value.textContent = type === 'checkbox' ? (object[property] ? 'Ein' : 'Aus') : String(object[property]) + (options.unit ? ' ' + options.unit : '');
        input.addEventListener('input', () => { object[property] = type === 'checkbox' ? input.checked : type === 'range' ? Number(input.value) : input.value; group.onChange?.(); refresh(); });
        refresh(); heading.append(value); label.append(heading, input); fieldset.append(label);
      }
      panel.append(fieldset);
    }
    if (!pendingTweaks.length) document.getElementById('demo-design-controls').hidden = true;
  }
  function carousels() {
    for (const carousel of document.querySelectorAll('.viz-carousel')) {
      const variants = Array.from(carousel.children).filter(child => child.hasAttribute('data-variant'));
      if (variants.length < 2) continue;
      let active = variants.findIndex(child => !child.hidden); if (active < 0) active = 0;
      const controls = document.createElement('nav'); controls.className = 'demo-carousel-controls'; controls.setAttribute('aria-label', carousel.getAttribute('aria-label') || 'Entwürfe');
      const previous = document.createElement('button'), next = document.createElement('button'), select = document.createElement('select'), count = document.createElement('span');
      previous.type = next.type = 'button'; previous.textContent = '←'; next.textContent = '→'; previous.setAttribute('aria-label', 'Vorherige Variante'); next.setAttribute('aria-label', 'Nächste Variante'); select.setAttribute('aria-label', 'Variante auswählen'); count.setAttribute('aria-live', 'polite');
      for (const [index, variant] of variants.entries()) { const option = document.createElement('option'); option.value = index; option.textContent = variant.dataset.variant; select.append(option); }
      function show(index) { active = (index + variants.length) % variants.length; variants.forEach((variant, i) => variant.hidden = i !== active); select.value = active; count.textContent = (active + 1) + ' / ' + variants.length; }
      previous.addEventListener('click', () => show(active - 1)); next.addEventListener('click', () => show(active + 1)); select.addEventListener('change', () => show(Number(select.value)));
      controls.append(previous, select, next, count); carousel.append(controls); show(active);
    }
  }
  function tabs() {
    for (const list of document.querySelectorAll('[role="tablist"]')) for (const tab of list.querySelectorAll('[role="tab"]')) tab.addEventListener('click', () => {
      for (const item of list.querySelectorAll('[role="tab"]')) { const active = item === tab; item.setAttribute('aria-selected', active); item.classList.toggle('active', active); const panel = document.getElementById(item.getAttribute('aria-controls')); if (panel) panel.hidden = !active; }
    });
  }
  window.initializeDemo = () => {
    carousels(); tabs(); tweaks();
    globalThis.lucide?.createIcons({ attrs: { width: 17, height: 17 } });
    document.documentElement.dataset.ready = 'true';
  };
})();
